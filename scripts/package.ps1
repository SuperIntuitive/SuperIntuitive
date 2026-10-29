# Builds clean distributions from packaging/files.json; never reads live credentials.
[CmdletBinding()]
param(
    [string]$OutputDirectory,
    [string]$SourceRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
if (-not $SourceRoot) { $SourceRoot = Split-Path -Parent $PSScriptRoot }
$SourceRoot = [IO.Path]::GetFullPath($SourceRoot)
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $SourceRoot 'dist' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$utf8 = New-Object Text.UTF8Encoding($false)
$manifest = Get-Content -LiteralPath (Join-Path $SourceRoot 'packaging/files.json') -Raw | ConvertFrom-Json
$work = Join-Path $OutputDirectory ('.package-' + [guid]::NewGuid().ToString('N'))
$builtAt = [DateTime]::UtcNow.ToString('o')

function Get-PackageFileSha256([string]$LiteralPath) {
    # Stream through .NET so packaging also works without Get-FileHash.
    $stream = [IO.File]::OpenRead($LiteralPath)
    $hasher = $null
    try {
        $hasher = [Security.Cryptography.SHA256]::Create()
        return [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
    } finally {
        if ($hasher) { $hasher.Dispose() }
        $stream.Dispose()
    }
}

function Test-Excluded([string]$Relative) {
    $Relative = $Relative.Replace('\', '/')
    $name = [IO.Path]::GetFileName($Relative)
    return ($Relative -match '(^|/)(\.git|\.vs|\.vscode|\.agents|\.codex|\.aws|__pycache__|node_modules|runtime|backups|downloaded|installed)(/|$)' -or
        $name -like '.env*' -or $name -like 'DbCreds*' -or $name -like '*cookies*.txt' -or
        $name -like 'config*.local.json' -or $name -like 'setup-config*' -or $name -match '^(install|setup)\.(lock|token)$' -or
        $name -match '\.(bak|old|tmp|log|pyc)$' -or $Relative -eq 'core/test.php')
}

function Assert-SafeRelative([string]$Relative) {
    if ([string]::IsNullOrWhiteSpace($Relative) -or $Relative -match '(^/|\\|:|(^|/)\.\.(/|$))') {
        throw "Unsafe package manifest path: $Relative"
    }
}

function Assert-RegularPath([string]$Relative) {
    Assert-SafeRelative $Relative
    $current = $SourceRoot
    foreach ($part in $Relative.Split('/')) {
        $current = Join-Path $current $part
        $item = Get-Item -LiteralPath $current -Force
        if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked package input is not allowed: $Relative" }
    }
}

function Copy-PackageFile([string]$Relative, [string]$Destination, [string]$Stage) {
    Assert-SafeRelative $Destination
    Assert-RegularPath $Relative
    if (Test-Excluded $Relative) { throw "Private file explicitly selected by package manifest: $Relative" }
    $target = Join-Path $Stage $Destination
    if (Test-Path -LiteralPath $target) { throw "Duplicate package destination: $Destination" }
    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
    [IO.File]::Copy((Join-Path $SourceRoot $Relative), $target, $false)
}

function Copy-Selection($Selection, [string]$Stage) {
    $relative = [string]$Selection.source
    Assert-RegularPath $relative
    $inputItem = Get-Item -LiteralPath (Join-Path $SourceRoot $relative) -Force
    $destination = $relative
    if ($Selection.PSObject.Properties.Name -contains 'destination') { $destination = [string]$Selection.destination }
    if (-not $inputItem.PSIsContainer) {
        Copy-PackageFile $relative $destination $Stage
        return
    }
    if (-not ($Selection.PSObject.Properties.Name -contains 'extensions')) { throw "Tree selection needs explicit extensions: $relative" }
    $shallow = ($Selection.PSObject.Properties.Name -contains 'shallow') -and $Selection.shallow
    $pending = New-Object 'Collections.Generic.Stack[string]'
    $pending.Push($relative)
    $copied = 0
    while ($pending.Count) {
        $folder = $pending.Pop()
        foreach ($item in (Get-ChildItem -LiteralPath (Join-Path $SourceRoot $folder) -Force | Sort-Object Name)) {
            $child = $folder + '/' + $item.Name
            if (Test-Excluded $child) { continue }
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked package input is not allowed: $child" }
            if ($item.PSIsContainer) {
                if (-not $shallow) { $pending.Push($child) }
            } elseif ($Selection.extensions -contains $item.Extension.ToLowerInvariant()) {
                Copy-PackageFile $child ($destination + $child.Substring($relative.Length)) $Stage
                $copied++
            }
        }
    }
    if (-not $copied) { throw "No matching files in required package input: $relative" }
}

function Write-PackageManifest([string]$Stage, [string]$Backend) {
    $files = @(Get-ChildItem -LiteralPath $Stage -Force -Recurse -File | Sort-Object FullName | ForEach-Object {
        [ordered]@{
            path = $_.FullName.Substring($Stage.Length + 1).Replace('\', '/')
            bytes = $_.Length
            sha256 = (Get-PackageFileSha256 -LiteralPath $_.FullName)
        }
    })
    $metadata = [ordered]@{format = 1; backend = $Backend; builtAtUtc = $builtAt; files = $files}
    [IO.File]::WriteAllText((Join-Path $Stage 'PACKAGE.json'), ($metadata | ConvertTo-Json -Depth 6) + "`n", $utf8)
    return $files.Count
}

try {
    $compiled = Get-Content -LiteralPath (Join-Path $SourceRoot 'core_sipl/generated/installer-schema.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($inputFile in $compiled.inputs.PSObject.Properties) {
        Assert-RegularPath $inputFile.Name
        $path = Join-Path $SourceRoot $inputFile.Name
        if ($inputFile.Value.text) {
            $text = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8).Replace("`r`n", "`n")
            $hasher = [Security.Cryptography.SHA256]::Create()
            try { $hash = [BitConverter]::ToString($hasher.ComputeHash($utf8.GetBytes($text))).Replace('-', '').ToLowerInvariant() }
            finally { $hasher.Dispose() }
        } else { $hash = Get-PackageFileSha256 -LiteralPath $path }
        if ($hash -ne $inputFile.Value.sha256) { throw "Native installer assets are stale: $($inputFile.Name). Run python core_sipl/tools/build_installer.py and rebuild." }
    }
    [IO.Directory]::CreateDirectory($work) | Out-Null
    $packages = @()
    foreach ($backend in @('php', 'sipl')) {
        $stage = Join-Path $work ($backend + '/SuperIntuitive')
        [IO.Directory]::CreateDirectory($stage) | Out-Null
        Write-Host "Building $backend edition..."
        foreach ($selection in (@($manifest.shared) + @($manifest.$backend))) { Copy-Selection $selection $stage }
        $directories = @($manifest.directories)
        if ($backend -eq 'php') {
            $directories += @($manifest.phpDirectories)
            # Fresh bootstrap only. The installed credential class is never opened.
            [IO.File]::WriteAllText((Join-Path $stage 'core/DbCreds.php'), "<?php`nnamespace SuperIntuitive;`nclass DbCreds { }`n", $utf8)
        }
        foreach ($directory in $directories) {
            Assert-SafeRelative $directory
            [IO.Directory]::CreateDirectory((Join-Path $stage $directory)) | Out-Null
        }
        if ($backend -eq 'sipl' -and (Get-ChildItem -LiteralPath $stage -Recurse -File -Filter '*.php')) {
            throw 'The native SIPL distribution must not contain PHP files.'
        }
        if (Get-ChildItem -LiteralPath $stage -Recurse -File | Where-Object { $_.Extension.ToLowerInvariant() -in @('.exe', '.dll', '.msi') }) {
            throw 'Application ZIPs must not bundle language runtimes or runtime installers.'
        }
        if ($backend -eq 'sipl') {
            foreach ($required in @('core_sipl/generated/editor.js.tmpl', 'core_sipl/generated/installer-schema.json', 'core_sipl/generated/installer.html.tmpl', 'core_sipl/generated/installer-media.zip')) {
                if (-not (Test-Path -LiteralPath (Join-Path $stage $required) -PathType Leaf)) { throw "Missing native asset: $required" }
            }
        }
        $count = Write-PackageManifest $stage $backend
        $filename = 'SuperIntuitive-' + $backend + '.zip'
        $archive = Join-Path $work $filename
        # Unlike Compress-Archive, this preserves hidden files such as .htaccess.
        $stream = [IO.File]::Open($archive, [IO.FileMode]::CreateNew)
        $outputZip = $null
        try {
            $outputZip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
            foreach ($directory in (Get-ChildItem -LiteralPath $stage -Force -Recurse -Directory | Sort-Object FullName)) {
                $entry = 'SuperIntuitive/' + $directory.FullName.Substring($stage.Length + 1).Replace('\', '/') + '/'
                $outputZip.CreateEntry($entry) | Out-Null
            }
            foreach ($file in (Get-ChildItem -LiteralPath $stage -Force -Recurse -File | Sort-Object FullName)) {
                $entry = 'SuperIntuitive/' + $file.FullName.Substring($stage.Length + 1).Replace('\', '/')
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($outputZip, $file.FullName, $entry, [IO.Compression.CompressionLevel]::Optimal) | Out-Null
            }
        } finally {
            if ($outputZip) { $outputZip.Dispose() }
            $stream.Dispose()
        }
        $zip = [IO.Compression.ZipFile]::OpenRead($archive)
        try {
            $fileEntries = @($zip.Entries | Where-Object { -not $_.FullName.EndsWith('/') })
            if ($fileEntries.Count -ne ($count + 1) -or -not ($zip.Entries.FullName -contains 'SuperIntuitive/PACKAGE.json')) {
                throw "Incomplete ZIP: $filename (files=$($fileEntries.Count), expected=$($count + 1), first entries=$((@($zip.Entries.FullName) | Select-Object -First 4) -join ', '))"
            }
        } finally { $zip.Dispose() }
        $packages += [pscustomobject]@{Name = $filename; Archive = $archive; Count = $count}
    }
    # Both ZIPs must build successfully before replacing earlier release files.
    foreach ($package in $packages) {
        $target = Join-Path $OutputDirectory $package.Name
        Move-Item -LiteralPath $package.Archive -Destination $target -Force
        Write-Host ("Created {0} ({1} files, {2:N1} MB)" -f $target, $package.Count, ((Get-Item -LiteralPath $target).Length / 1MB))
    }
    Write-Host 'Done. These packages contain application files, not your running site data.'
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
} finally {
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
