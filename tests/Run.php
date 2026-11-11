<?php
/** Windows test orchestration only; application backends retain native tooling. */
if (PHP_SAPI!=='cli') { http_response_code(403); exit; }
function capture(array $command): array {
    $process=proc_open($command,[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes);
    if (!is_resource($process)) throw new RuntimeException('Cannot start prerequisite check: '.$command[0]);
    fclose($pipes[0]); $output=stream_get_contents($pipes[1]); fclose($pipes[1]);
    $error=stream_get_contents($pipes[2]); fclose($pipes[2]);
    return [proc_close($process),$output.$error];
}
function executable(string $name): ?string {
    [$status,$output]=capture(['where.exe',$name]);
    if ($status!==0) return null;
    foreach (preg_split('/\r?\n/',trim($output)) as $path) if (is_file($path)) return $path;
    return null;
}
function step(string $name,array|string $command): bool {
    echo "\n=== ".$name." ===\n";
    $process=proc_open($command,[0=>STDIN,1=>STDOUT,2=>STDERR],$pipes);
    if (!is_resource($process)) {
        fwrite(STDERR,"FAIL: could not start ".(is_array($command)?$command[0]:$command)."\n");
        return false;
    }
    $status=proc_close($process);
    echo ($status===0?'PASS: ':'FAIL: ').$name.' (exit '.$status.")\n";
    return $status===0;
}
function main(array $arguments): int {
    $quick=false; $list=false; $selected=null;
    for ($i=0;$i<count($arguments);$i++) {
        switch ($arguments[$i]) {
            case '--help':
            case '-h':
                echo "Usage: test.bat [--quick] [--list] [--runtime PATH]\n";
                echo "Default: build both editions and run the maintained PHP/SIPL/Node fixture suites.\n";
                echo "--quick: compile, PHP security/packaging, native units/parameters/packaging/HTTP and hash guard.\n";
                echo "--list: print the selected steps without building or running tests.\n";
                echo "Full runs require Docker, PHP with ZIP, Node.js 22+, Chrome and SIPL. Python is not used.\n";
                echo "Historical Python-only fixtures are not run; their remaining coverage has not been ported.\n";
                echo "No live site is targeted. Fixture suites use disposable containers/data.\n";
                return 0;
            case '--quick': $quick=true; break;
            case '--list': $list=true; break;
            case '--runtime':
                $selected=$arguments[++$i] ?? '';
                if ($selected==='' || str_starts_with($selected,'--')) throw new RuntimeException('--runtime requires an executable path.');
                break;
            default: throw new RuntimeException('Unknown option: '.$arguments[$i].'. Use --help.');
        }
    }
    $root=dirname(__DIR__);
    if (!chdir($root)) throw new RuntimeException('Cannot enter the repository root.');
    $runtime=$selected ?? (getenv('SI_SIPL_RUNTIME') ?: null);
    if ($runtime===null) {
        $development=dirname($root).'\\sipl\\build\\sipl.exe';
        $runtime=is_file($development)?$development:(executable('sipl') ?? $root.'\\sipl.exe');
    }
    $runtime=realpath($runtime) ?: $runtime;
    if (!$list && !is_file($runtime)) {
        throw new RuntimeException('SIPL runtime not found: '.$runtime.'. Run test.bat for automatic selection, or pass the actual executable with --runtime.');
    }
    $php=[PHP_BINARY];
    if (capture([PHP_BINARY,'-r','exit(extension_loaded("zip") ? 0 : 1);'])[0]!==0) {
        $php=array_merge($php,['-d','extension_dir='.ini_get('extension_dir'),'-d','extension=zip']);
    }
    $bootstrap=[
        ['Build isolated PHP test image',['docker','build','-t','superintuitive-security-check','.']],
        ['Build both release ZIPs','call "'.$root.'\\package.bat" -SiplRuntime "'.$runtime.'"']
    ];
    if (!$quick) {
        $bootstrap[]=['Build separate Contact plugin',[$runtime,'run','packaging\\Package.sipl','contact']];
        $bootstrap[]=['Build separate Editor Demo plugin',[$runtime,'run','packaging\\Package.sipl','plugin','editor-demo']];
    }
    $steps=[];
    foreach (['core_sipl\\main.sipl','core_sipl\\tests\\unit.sipl','core_sipl\\tests\\native_params.sipl','core_sipl\\tests\\mysql.sipl','core_sipl\\tests\\passwords.sipl','core_sipl\\tools\\verify.sipl','packaging\\Package.sipl','tests\\package.sipl'] as $file) {
        $steps[]=['Compile '.$file,[$runtime,'check',$file]];
    }
    $steps[]=['PHP security (Linux symlink semantics)',['docker','run','--rm','--network','none','--mount','type=bind,source='.$root.',target=/workspace,readonly','--entrypoint','php','superintuitive-security-check','/workspace/tests/security.php']];
    $steps[]=['PHP packaging/upgrades',array_merge($php,['tests\\package.php'])];
    foreach (['core_sipl\\tests\\unit.sipl','core_sipl\\tests\\native_params.sipl','tests\\package.sipl'] as $file) {
        $steps[]=['Native '.$file,[$runtime,'run',$file]];
    }
    $http=['node','core_sipl\\tests\\http.cjs','--runtime',$runtime];
    if (!$quick) $http[]='--browser';
    $steps[]=['Native HTTP/session'.($quick?'':'/browser'),$http];
    if (!$quick) {
        foreach (['--scripter','--styler','--language','--save'] as $mode) $steps[]=['Isolated editor '.$mode,['node','tests\\editor_browser.cjs',$mode]];
        foreach (['--apache','--passwords','--framework','--widgets','--language','--demo'] as $mode) {
            $steps[]=['Packaged fixture '.$mode,array_merge($php,['tests\\Fixture.php',$mode,'--runtime',$runtime])];
        }
        $steps[]=['Cross-edition plugins/Contact/browser',array_merge($php,['tests\\Fixture.php','--both','--browser','--runtime',$runtime])];
        $steps[]=['Native-only packaged plugin/browser',['node','tests\\sipl_package_plugins.cjs','--fixture','--browser','--runtime',$runtime]];
        $steps[]=['Packaged SIPL verification',[$runtime,'run','packaging\\Package.sipl','verify']];
    }
    $steps[]=['Historical PHP preservation guard',[$runtime,'run','packaging\\Package.sipl','preservation']];
    if ($list) {
        foreach (array_merge($bootstrap,$steps) as [$name,$command]) echo $name."\n  ".(is_array($command)?implode(' ',array_map(fn($part)=>'"'.$part.'"',$command)):$command)."\n";
        return 0;
    }
    if (!extension_loaded('zip')) throw new RuntimeException('Enable the PHP ZIP extension before running tests.');
    foreach (['docker','node'] as $name) if (executable($name)===null) throw new RuntimeException('Required command not found: '.$name);
    [$status,$version]=capture(['node','--version']);
    if ($status!==0 || !preg_match('/^v(\d+)/',trim($version),$match) || (int)$match[1]<22) throw new RuntimeException('Node.js 22+ is required.');
    if (capture(['docker','info','--format','{{.ServerVersion}}'])[0]!==0) throw new RuntimeException('Start Docker Desktop with Linux containers before running tests.');
    if (!$quick) {
        $chrome=getenv('CHROME') ?: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (!is_file($chrome)) throw new RuntimeException('Chrome is required. Set CHROME to its executable path.');
        putenv('CHROME='.$chrome);
    }
    echo "Source: ".$root."\nSIPL runtime: ".$runtime."\nMode: ".($quick?'quick':'full native suites')."\n";
    foreach ($bootstrap as [$name,$command]) if (!step($name,$command)) {
        fwrite(STDERR,"Bootstrap failed; tests were not run against stale images or ZIPs.\n");
        return 1;
    }
    $failed=[];
    foreach ($steps as [$name,$command]) if (!step($name,$command)) $failed[]=$name;
    echo "\n=== Test summary ===\n".(count($steps)-count($failed)).' passed, '.count($failed)." failed.\n";
    foreach ($failed as $name) echo 'FAIL: '.$name."\n";
    if (in_array('Historical PHP preservation guard',$failed,true)) echo "The migration baseline may contain pre-existing mismatches. Review them; do not reset hashes merely to pass.\n";
    return $failed?1:0;
}
try { exit(main(array_slice($argv,1))); }
catch (Throwable $error) { fwrite(STDERR,'Test runner: '.$error->getMessage()."\n"); exit(2); }
