# Windows launcher only. Each edition builds itself in its own language.
[CmdletBinding()]
param(
    [ValidateSet('all','php','sipl')][string]$Backend = 'all',
    [string]$OutputDirectory,
    [string]$SourceRoot,
    [string]$SiplRuntime
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
if (-not $SourceRoot) { $SourceRoot = Split-Path -Parent $PSScriptRoot }
$SourceRoot = [IO.Path]::GetFullPath($SourceRoot)
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $SourceRoot 'dist' }
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$work = Join-Path $OutputDirectory ('.package-' + [guid]::NewGuid().ToString('N'))
$previous = Get-Location
Write-Host "Source: $SourceRoot"
Write-Host "Output: $OutputDirectory"
try {
    Set-Location -LiteralPath $SourceRoot
    $editions = @('php','sipl')
    if ($Backend -ne 'all') { $editions = @($Backend) }
    # Validate the selected interpreter before spending time building either ZIP.
    if ($editions -contains 'sipl') {
        $runtime = $SiplRuntime
        if (-not $runtime) { $runtime = [Environment]::GetEnvironmentVariable('SI_SIPL_RUNTIME') }
        if (-not $runtime) {
            # A sibling SIPL checkout is the authoritative local development build.
            $developmentRuntime = Join-Path (Split-Path -Parent $SourceRoot) 'sipl\build\sipl.exe'
            if (Test-Path -LiteralPath $developmentRuntime -PathType Leaf) { $runtime = $developmentRuntime }
        }
        if (-not $runtime) {
            $installedRuntime = Get-Command sipl -ErrorAction SilentlyContinue
            if ($installedRuntime) { $runtime = $installedRuntime.Source }
        }
        if (-not $runtime) { $runtime = Join-Path $SourceRoot 'sipl.exe' }
        $runtime = (Get-Item -LiteralPath $runtime -ErrorAction Stop).FullName
        Write-Host "SIPL runtime: $runtime"
        foreach ($symbol in @('fs.sha256','fs.stat','fs.chmod')) {
            $contract = & $runtime api $symbol --json
            if ($LASTEXITCODE -ne 0) { throw "SIPL runtime '$runtime' lacks $symbol. Select the updated interpreter with -SiplRuntime or SI_SIPL_RUNTIME." }
            $definition = $contract | ConvertFrom-Json
            if (-not $definition.ok -or @($definition.entries | Where-Object { $_.symbol -eq $symbol }).Count -ne 1) {
                throw "SIPL runtime '$runtime' does not declare $symbol."
            }
        }
        & $runtime run (Join-Path $SourceRoot 'packaging/Package.sipl') runtime-check --root $SourceRoot
        if ($LASTEXITCODE -ne 0) { throw "SIPL runtime validation failed for '$runtime'. Fix the reported issue in the SIPL project; previous releases were preserved." }
    }
    [IO.Directory]::CreateDirectory($work) | Out-Null
    foreach ($edition in $editions) {
        Write-Host "Building $edition edition with its native tools..."
        if ($edition -eq 'php') {
            $php = (Get-Command php -ErrorAction Stop).Source
            $arguments = @()
            $zipEnabled = & $php -r 'echo extension_loaded("zip") ? "yes" : "no";'
            # Portable Windows PHP often ships the DLL without a php.ini.
            if ($zipEnabled -ne 'yes') {
                $extensionDirectory = Join-Path (Split-Path -Parent $php) 'ext'
                if (Test-Path -LiteralPath (Join-Path $extensionDirectory 'php_zip.dll')) {
                    $arguments += @('-d', ('extension_dir=' + $extensionDirectory), '-d', 'extension=zip')
                }
            }
            & $php @arguments (Join-Path $SourceRoot 'packaging/Package.php') build --root $SourceRoot --output $work
        } else {
            & $runtime run (Join-Path $SourceRoot 'packaging/Package.sipl') build --root $SourceRoot --output $work
        }
        if ($LASTEXITCODE -ne 0) { throw "$edition native build failed; previous releases were preserved." }
    }
    # Publish only after every requested edition has built successfully.
    foreach ($edition in $editions) {
        $filename = 'SuperIntuitive-' + $edition + '.zip'
        $archive = Join-Path $work $filename
        if (-not (Test-Path -LiteralPath $archive -PathType Leaf)) { throw "Missing release: $filename" }
        Move-Item -LiteralPath $archive -Destination (Join-Path $OutputDirectory $filename) -Force
        Write-Host "Created $(Join-Path $OutputDirectory $filename)"
    }
    Write-Host 'Done. Python is not required. Plugins remain separate downloads.'
} catch {
    Write-Error -Message $_.Exception.Message -ErrorAction Continue
    exit 1
} finally {
    Set-Location -LiteralPath $previous
    if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
