<?php
/** PHP integration fixtures. No site configuration is loaded or copied. */
require_once __DIR__.'/../packaging/Package.php';
final class FixtureClient {
    public array $cookies=[]; public string $csrf='';
    public function __construct(public string $base) {}
    public function request(string $path='/',?array $post=null,bool $csrf=true,array $extra=[]): array {
        $headers=['Host: '.($extra['Host'] ?? 'localhost')]; foreach ($extra as $key=>$value) if(strtolower($key)!=='host')$headers[]=$key.': '.$value;
        if ($this->cookies) $headers[]='Cookie: '.implode('; ',array_map(fn($key)=>$key.'='.$this->cookies[$key],array_keys($this->cookies)));
        if ($post!==null) { $headers[]='Content-Type: application/json'; if ($csrf) $headers[]='X-SI-CSRF: '.$this->csrf; }
        $context=stream_context_create(['http'=>['method'=>$post===null?'GET':'POST','header'=>implode("\r\n",$headers),'content'=>$post===null?'':json_encode($post,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),'ignore_errors'=>true,'timeout'=>30]]);
        $stream=@fopen($this->base.$path,'rb',false,$context); if (!$stream) throw new RuntimeException('Fixture HTTP connection failed');
        $text=stream_get_contents($stream); $metadata=stream_get_meta_data($stream); fclose($stream); $status=0; $received=[];
        foreach ($metadata['wrapper_data'] as $line) {
            if (preg_match('~^HTTP/\S+ (\d+)~',$line,$m)) $status=(int)$m[1];
            elseif (str_contains($line,':')) { [$key,$value]=explode(':',$line,2); $received[strtolower($key)][]=trim($value); if (strtolower($key)==='set-cookie') { [$cookie]=explode(';',trim($value)); [$name,$value]=explode('=',$cookie,2); $this->cookies[$name]=$value; } }
        }
        $value=json_decode($text,true); if (is_array($value) && array_is_list($value)) $value=$value[0] ?? [];
        return ['status'=>$status,'text'=>$text,'value'=>$value,'headers'=>$received];
    }
    public function bootstrap(string $path='/contact-form'): array {
        $response=$this->request($path);
        if (!preg_match('/SI\.CSRF(?:\.Token\s*=|\s*=\s*\{\s*Token:)\s*("[^"]+")/',$response['text'],$m)) throw new RuntimeException('Fixture CSRF token missing from HTTP '.$response['status'].': '.substr(strip_tags($response['text']),0,700));
        $this->csrf=json_decode($m[1],true); return $response;
    }
}
final class Fixture {
    public bool $frameworkMode=false;
    public ?string $nativeBase=null;
    public ?int $responseLimit=null;
    public string $root,$folder,$site,$name,$network,$database,$password,$base='';
    public array $containers=[],$processes=[],$results=[]; public int $checks=0; public bool $networkCreated=false;
    public string $adminPassword='Plugin-fixture-2026!';
    public function __construct() {
        $this->root=dirname(__DIR__); $this->name='si-php-fixture-'.bin2hex(random_bytes(6));
        $this->folder=$this->root.'/core_sipl/runtime/'.$this->name; $this->site=$this->folder.'/SuperIntuitive';
        $this->network=$this->name.'-net'; $this->database=$this->name.'-db'; $this->password=bin2hex(random_bytes(24));
        Package::directory($this->folder);
    }
    public function environment(): array { return array_filter(getenv(),fn($key)=>!str_starts_with($key,'SI_SIPL_')&&$key!=='SI_SETUP_TOKEN',ARRAY_FILTER_USE_KEY); }
    public function process(array $command,?string $input=null): array {
        $id=bin2hex(random_bytes(8)); $output=$this->folder.'/command-'.$id.'.out'; $error=$this->folder.'/command-'.$id.'.err';
        $process=proc_open($command,[0=>['pipe','r'],1=>['file',$output,'w'],2=>['file',$error,'w']],$pipes,$this->root,$this->environment(),['bypass_shell'=>true]);
        if (!is_resource($process)) throw new RuntimeException('Fixture process launch failed');
        if ($input!==null) fwrite($pipes[0],$input); fclose($pipes[0]); return [$process,$pipes,$output,$error];
    }
    public function collect(array $running,bool $required=true,bool $includeError=false): string {
        [$process,$pipes,$stdout,$stderr]=$running; $status=proc_close($process);
        $output=file_get_contents($stdout); $error=file_get_contents($stderr); unlink($stdout); unlink($stderr);
        if ($required && $status!==0) throw new RuntimeException(substr($output.$error,-8000)); return $output.($includeError?$error:'');
    }
    public function run(array $command,?string $input=null,bool $required=true): string { return $this->collect($this->process($command,$input),$required); }
    public function docker(array $arguments,?string $input=null,bool $required=true): string { return $this->run(array_merge(['docker'],$arguments),$input,$required); }
    public function logs(string $container):string{return $this->collect($this->process(['docker','logs',$container]),true,true);}
    public function check(bool $value,string $message): void { if (!$value) throw new RuntimeException($message); $this->checks++; echo 'PASS '.$message.PHP_EOL; }
    public function sql(string $sql): string { return trim($this->docker(['exec','-i',$this->database,'sh','-c','exec mariadb --batch --skip-column-names --user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"'],$sql)); }
    public function test(string $name,array $command,?string $input=null): string {
        $output=$this->run($command,$input); echo $output; preg_match_all('/^PASS /m',$output,$matches);
        $this->results[]=['name'=>$name,'status'=>'passed','checks'=>count($matches[0])]; return $output;
    }
    public function extract(string $archive): void {
        $zip=new ZipArchive(); if ($zip->open($archive)!==true) throw new RuntimeException('Fixture archive missing');
        Package::directory($this->site);
        try { for ($index=0;$index<$zip->numFiles;$index++) {
            $name=$zip->getNameIndex($index); if (!str_starts_with($name,'SuperIntuitive/')) throw new RuntimeException('Unsafe fixture archive');
            $relative=substr($name,15); if ($relative==='' || str_ends_with($relative,'/')) continue;
            Package::write(Package::confined($this->site,$relative),$zip->getFromIndex($index));
        } } finally { $zip->close(); }
    }
    public function package(string $id,array $files): void {
        $path=$this->site.'/plugins/downloaded/'.$id.'.zip'; Package::directory(dirname($path));
        $zip=new ZipArchive(); $zip->open($path,ZipArchive::CREATE|ZipArchive::OVERWRITE);
        foreach ($files as $name=>$value) $zip->addFromString($name,$value); $zip->close();
    }
    public function prepare(bool $both): void {
        $this->extract($this->root.'/dist/SuperIntuitive-php.zip'); if ($both) $this->extract($this->root.'/dist/SuperIntuitive-sipl.zip');
        foreach (['plugins.php','contact_spec.php'] as $name) { Package::directory($this->site.'/tests'); copy($this->root.'/tests/'.$name,$this->site.'/tests/'.$name); }
        if ($both) foreach (['plugins.sipl','contact_spec.sipl'] as $name) { Package::directory($this->site.'/core_sipl/tests'); copy($this->root.'/core_sipl/tests/'.$name,$this->site.'/core_sipl/tests/'.$name); }
        $contact=[]; $iterator=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->root.'/plugin-packages/contact',FilesystemIterator::SKIP_DOTS));
        foreach ($iterator as $file) { $relative=str_replace('\\','/',substr($file->getPathname(),strlen($this->root.'/plugin-packages/contact/'))); $contact[$relative]=file_get_contents($file->getPathname()); Package::write($this->site.'/plugin-packages/contact/'.$relative,$contact[$relative]); }
        $this->package('contact',$contact); $drift=$contact; $drift['sql/001-contact.sql'].=' -- changed migration'; $this->package('contact-drift',$drift);
        foreach (['info.conf'=>"name:Legacy frontend\nversion:old",'scripts/legacy.js'=>'window.SILegacy="dev";','scripts/legacy-min.js'=>'window.SILegacy="min";','styles/legacy.css'=>'body{background:url(../image.png)}','image.png'=>'PNG fixture'] as $name=>$value) Package::write($this->site.'/plugins/installed/legacy/'.$name,$value);
        $manifest=fn($id,$backend)=>json_encode(['id'=>$id,'version'=>'1.0.0','backend'=>['required'=>true]+$backend]);
        $this->package('frontend',['install.json'=>'{"id":"frontend","version":"1.0.0"}','scripts/legacy.js'=>'window.legacyPlugin=true;','styles/legacy.css'=>'body{color:inherit}']);
        $this->package('traversal',['../escaped.txt'=>'must not extract']);
        $this->package('phponly',['install.json'=>$manifest('phponly',['php'=>'php/main.php']),'php/main.php'=>'<?php return fn()=>[];']);
        $this->package('siplonly',['install.json'=>$manifest('siplonly',['sipl'=>'sipl/main.sipl']),'sipl/main.sipl'=>'fn handle(api, action, post) { return {:} }']);
        $this->package('invalidphp',['install.json'=>$manifest('invalidphp',['php'=>'php/main.php']),'php/main.php'=>'<?php return 42;']);
        $this->package('missingphp',['install.json'=>$manifest('missingphp',['php'=>'php/missing.php'])]);
        $this->package('invalidsipl',['install.json'=>$manifest('invalidsipl',['sipl'=>'sipl/main.sipl']),'sipl/main.sipl'=>'fn handle( broken invalid']);
        $this->package('broken',['install.json'=>'{"id":"broken","version":"1.0.0","migrations":[{"id":"001","sql":"sql/broken.sql"}]}','sql/broken.sql'=>'INVALID SQL']);
        $zip=new ZipArchive(); $zip->open($this->site.'/plugins/downloaded/symlink.zip',ZipArchive::CREATE); $zip->addFromString('link','../escape'); $zip->setExternalAttributesName('link',ZipArchive::OPSYS_UNIX,0120777<<16); $zip->close();
        Package::write($this->site.'/core/install.lock','disposable fixture'); Package::directory($this->site.'/domains/localhost');
        $this->docker(['network','create',$this->network]); $this->networkCreated=true;
        $env=$this->folder.'/db.env'; Package::write($env,"MARIADB_DATABASE=si_plugins\nMARIADB_USER=si_plugins\nMARIADB_PASSWORD=".$this->password."\nMARIADB_ROOT_PASSWORD=".bin2hex(random_bytes(24))."\n");
        $this->docker(['run','-d','--name',$this->database,'--network',$this->network,'--network-alias','plugin-db','--env-file',$env,'-p','127.0.0.1::3306','mariadb:11.4']); $this->containers[]=$this->database;
        $deadline=microtime(true)+60;
        do { $ready=trim($this->docker(['exec',$this->database,'sh','-c','healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1; echo $?'],null,false)); if ($ready==='0') break; usleep(200000); } while (microtime(true)<$deadline);
        if ($ready!=='0') throw new RuntimeException('Disposable database startup timed out');
        $port=substr(strrchr(trim($this->docker(['port',$this->database,'3306/tcp'])),':'),1);
        $sql=file_get_contents($this->site.'/core/setup/super_intuitive_install.sql'); preg_match_all('/_SI_GUID_\d+/',$sql,$tokens); $ids=[];
        foreach (array_unique($tokens[0]) as $token) $ids[$token]=bin2hex(random_bytes(16));
        $sql=preg_replace_callback('/_SI_GUID_\d+/',fn($m)=>'0x'.$ids[$m[0]],$sql); $sql=str_replace("'_SI_NOWTIME_'",'CURRENT_TIMESTAMP()',$sql);
        foreach (['DOMAIN_NAME'=>'localhost','USER_NAME'=>'Plugin Administrator','USER_EMAIL'=>'admin@example.test','USER_PASSWORD'=>password_hash($this->adminPassword,PASSWORD_BCRYPT),'DEFAULT_NOTEEMAIL'=>'info@example.test','DEFAULT_LANGUAGE'=>'en','DEFAULT_TIMEZONE'=>'UTC','DEFAULT_CURRENCY'=>'USD'] as $name=>$value) $sql=str_replace("'__SI_".$name."__'",'0x'.bin2hex($value),$sql);
        $this->sql($sql."\nUPDATE relations SET parent_id=0x".$ids['_SI_GUID_53']." WHERE child_id=0x".$ids['_SI_GUID_54']." AND note='users_securityroles';\nCOMMIT;\n");
        $config=['root'=>$this->site,'dsn'=>'mysql:host=127.0.0.1;port='.$port.';dbname=si_plugins;charset=utf8mb4','dbUser'=>'si_plugins','dbPassword'=>$this->password,'phpDsn'=>'mysql:host=plugin-db;dbname=si_plugins;charset=utf8mb4','domain'=>'localhost','subdomain'=>'','host'=>'127.0.0.1','port'=>0,'secureCookies'=>false,'contactSpecTenant'=>bin2hex(random_bytes(16)),'contactSpecToken'=>bin2hex(random_bytes(16)),'contactRaceTenant'=>bin2hex(random_bytes(16)),'contactRaceToken'=>bin2hex(random_bytes(16))];
        if($this->responseLimit!==null)$config['maxResponseBody']=$this->responseLimit;
        Package::write($this->site.'/plugin-test.json',json_encode($config,JSON_UNESCAPED_SLASHES));
    }
    public function php(string $source,array $arguments=[]): array { return array_merge(['docker','run','--rm','--network',$this->network,'--entrypoint','php','-v',$this->site.':/workspace','superintuitive-security-check','/workspace/'.$source,'/workspace/plugin-test.json'],$arguments); }
    public function plugins(bool $both,bool $browser,string $runtime): void {
        $this->prepare($both);
        if(!$this->frameworkMode){
        $this->test('php-plugin-lifecycle',$this->php('tests/plugins.php'));
        if ($both) { $this->test('native-plugin-lifecycle',[$runtime,'run',$this->site.'/core_sipl/tests/plugins.sipl',$this->site.'/plugin-test.json']); $this->test('shared-state',$this->php('tests/plugins.php',['after-sipl'])); }
        $this->test('php-contact-workflow',$this->php('tests/contact_spec.php'));
        if ($both) {
            copy($this->site.'/plugin-packages/contact/sipl/contact.sipl',$this->site.'/core_sipl/tests/contact_spec_handler.sipl');
            $this->test('native-contact-workflow',[$runtime,'run',$this->site.'/core_sipl/tests/contact_spec.sipl',$this->site.'/plugin-test.json']);
            $one=$this->process($this->php('tests/contact_spec.php',['race'])); $two=$this->process([$runtime,'run',$this->site.'/core_sipl/tests/contact_spec.sipl',$this->site.'/plugin-test.json','race']);
            $php=json_decode($this->collect($one),true); $native=json_decode($this->collect($two),true); $this->check($php['CONTACTSENT']===$native['CONTACTSENT'],'simultaneous PHP/SIPL retries return the same receipt');
            $this->test('cross-backend-contact',$this->php('tests/contact_spec.php',['after-sipl']));
        }
        }
        $creds="<?php namespace SuperIntuitive; class DbCreds { public \$servername='plugin-db'; public \$username='si_plugins'; public \$password='".$this->password."'; public \$database='si_plugins'; public \$dbtype='mysql'; }";
        Package::write($this->site.'/core/DbCreds.php',$creds);
        foreach (['php/main.php','sipl/main.sipl','sql/schema.sql'] as $path) Package::write($this->site.'/plugins/installed/example/'.$path,'PRIVATE SOURCE SENTINEL');
        // CLI regressions run as the container's root; the HTTP server runs as
        // www-data. Transfer fixture ownership while retaining private modes.
        Package::directory($this->site.'/core/plugin-requests');
        Package::directory($this->site.'/core/plugin-packages');
        $this->docker(['run','--rm','--network','none','--entrypoint','chown','-v',$this->site.':/workspace','superintuitive-security-check','-R','www-data:www-data','/workspace/core/plugin-packages','/workspace/core/plugin-requests']);
        $web=$this->name.'-web'; $this->docker(['run','-d','--name',$web,'--network',$this->network,'-p','127.0.0.1::80','-v',$this->site.':/var/www/html','superintuitive-security-check']); $this->containers[]=$web;
        $port=substr(strrchr(trim($this->docker(['port',$web,'80/tcp'])),':'),1); $this->base='http://127.0.0.1:'.$port; usleep(500000);
        if(!$this->frameworkMode)$this->httpPlugins($browser);
        $nativeBase=null;
        if ($both) {
            $nativeBase=$this->startNative($runtime);
            if(!$this->frameworkMode)$this->test('native-http',['node',$this->root.'/tests/plugins_http.cjs'],json_encode(['disposable'=>true,'base'=>$nativeBase,'password'=>$this->adminPassword]));
        }
        $this->nativeBase=$nativeBase;
        if ($browser) {
            $this->test('browser-seed',$this->php('tests/contact_spec.php',['browser-seed'])); $screenshots=$this->folder.'/previews'; Package::directory($screenshots);
            foreach (['php'=>$this->base]+($both?['sipl'=>$nativeBase]:[]) as $backend=>$base) {
                $browserConfig=json_encode(['disposable'=>true,'base'=>$base,'backend'=>$backend,'email'=>'admin@example.test','password'=>$this->adminPassword,'screenshotDir'=>$screenshots]);
                $this->test($backend.'-contact-browser',['node',$this->root.'/tests/contact_browser.cjs'],$browserConfig);
                $this->test($backend.'-admin-browser',['node',$this->root.'/tests/editor_browser.cjs','--admin'],$browserConfig);
            }
        }
    }
    public function startNative(string $runtime): string {
        // Read a fresh log: Windows PHP process pipes cannot be nonblocking.
        $log=$this->folder.'/native-server.log';
        $process=proc_open([$runtime,'run',$this->site.'/core_sipl/main.sipl',$this->site.'/plugin-test.json'],[0=>['pipe','r'],1=>['file',$log,'w'],2=>['file',$log,'a']],$pipes,$this->root,$this->environment(),['bypass_shell'=>true]);
        if (!is_resource($process)) throw new RuntimeException('Native fixture launch failed');
        fclose($pipes[0]);$this->processes[]=[$process,$pipes];$deadline=microtime(true)+30;$output='';
        do {
            $output=is_file($log)?file_get_contents($log):'';
            if(preg_match('~https?://(?:127\.0\.0\.1|localhost):\d+~',$output,$match))return $match[0];
            usleep(50000);
        }while(microtime(true)<$deadline&&proc_get_status($process)['running']);
        throw new RuntimeException('Native fixture startup failed: '.$output);
    }
    public function widgets(string $runtime): void {
        $this->frameworkMode=true; $this->plugins(true,false,$runtime);
        $scopes=[];foreach(explode("\n",$this->sql("SELECT name,HEX(id) FROM entities WHERE domain_id=(SELECT id FROM domains WHERE name='localhost' LIMIT 1)"))as$line){[$key,$id]=explode("\t",$line);$scopes[$key]=$id;}
        $lookupRows=[];
        for($index=0;$index<55;$index++)$lookupRows[]=[sprintf('Lookup Alpha %02d',$index),sprintf('lookup-alpha-%02d',$index),'active'];
        $lookupRows=[...$lookupRows,['Shared lookup name','lookup-duplicate-a','active'],['Shared lookup name','lookup-duplicate-b','active'],['Lookup Archived','lookup-archived','inactive'],['100% Real','lookup-percent-real','active'],['100X Wrong','lookup-percent-wrong','active']];
        foreach($lookupRows as[$label,$path,$status])$this->sql("INSERT INTO pages(id,entity_id,name,path,status,`dev-options`,`test-options`,`live-options`) VALUES(UNHEX('".bin2hex(random_bytes(16))."'),0x".$scopes['pages'].",0x".bin2hex($label).",0x".bin2hex($path).",'".$status."','{}','{}','{}')");
        $foreignId=bin2hex(random_bytes(16));
        $this->sql("INSERT INTO pages(id,entity_id,name,path,status,`dev-options`,`test-options`,`live-options`) VALUES(0x".$foreignId.",0x".$scopes['blocks'].",'Lookup Private foreign record','lookup-private-foreign','active','{}','{}','{}')");
        $limited=bin2hex(random_bytes(16));$role=bin2hex(random_bytes(16));$password=password_hash($this->adminPassword,PASSWORD_BCRYPT);
        $this->sql("INSERT INTO users(id,entity_id,name,email,password,preferences) VALUES(0x".$limited.",0x".$scopes['users'].",'Restricted Lookup Admin','restricted-lookup@example.test',0x".bin2hex($password).",'{}')");
        $rules=json_encode(['0x'.strtolower($scopes['pages'])=>['read'=>'false']]);
        $this->sql("INSERT INTO securityroles(id,entity_id,name,rules) VALUES(0x".$role.",0x".$scopes['securityroles'].",'Admin',0x".bin2hex($rules).")");
        $this->sql("INSERT INTO relations(id,entity_id,parent_id,parententity_id,child_id,childentity_id,note) VALUES(0x".bin2hex(random_bytes(16)).",0x".$scopes['relations'].",0x".$limited.",0x".$scopes['users'].",0x".$role.",0x".$scopes['securityroles'].",'users_securityroles')");
        $defaults=[]; foreach(glob($this->site.'/scripts/widgets/*.js')as$file)$defaults[$file]=hash_file('sha256',$file);
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $guest=new FixtureClient($base);$guest->bootstrap('/');
            $this->check($guest->request('/widget-asset.php?kind=script')['status']===200,$backend.' public widget bundle loads');
            $this->check($guest->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>'Template','kind'=>'script','source'=>'bad'])['status']===403,$backend.' guest cannot save widgets');
            $admin=new FixtureClient($base);$admin->bootstrap('/');
            $admin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]);$admin->bootstrap('/');
            $admin->request('/delegate.php',['KEY'=>'ChangeDeployment','Deployment'=>'dev']);$admin->bootstrap('/');
            $lookup=['Operation'=>'Lookup','Entity'=>['Name'=>'pages'],'Search'=>'Lookup Alpha','PageSize'=>10];
            $this->check($guest->request('/api.v1.php',$lookup)['status']===403,$backend.' lookup rejects guests');
            $this->check($admin->request('/api.v1.php',$lookup,false)['status']===403,$backend.' lookup requires CSRF');
            $first=$admin->request('/api.v1.php',$lookup);$records=$first['value']['Records']??[];
            $this->check($first['status']===200&&count($records)===10&&$first['value']['More']&&$records[0]['name']==='Lookup Alpha 00',$backend.' lookup performs bounded prefix search');
            $second=$admin->request('/api.v1.php',$lookup+['Page'=>1])['value'];
            $this->check(count($second['Records']??[])===10&&$second['Records'][0]['id']!==$records[0]['id'],$backend.' lookup pages without repeating the first row');
            $wild=$admin->request('/api.v1.php',array_replace($lookup,['Search'=>'*Alpha 04']))['value'];
            $this->check(count($wild['Records']??[])===1&&$wild['Records'][0]['name']==='Lookup Alpha 04',$backend.' lookup supports CRM asterisk wildcard search');
            $percent=$admin->request('/api.v1.php',array_replace($lookup,['Search'=>'100%']))['value'];
            $this->check(count($percent['Records']??[])===1&&$percent['Records'][0]['name']==='100% Real',$backend.' lookup treats SQL wildcard characters literally');
            $related=$admin->request('/api.v1.php',$lookup+['Filters'=>['path'=>'lookup-alpha-04']])['value'];
            $this->check(count($related['Records']??[])===1,$backend.' lookup applies related filters on the server');
            $foreign=$admin->request('/api.v1.php',array_replace($lookup,['Search'=>'','Ids'=>[$foreignId]]))['value'];
            $this->check(($foreign['Records']??null)===[],$backend.' lookup cannot resolve a reference outside its scope');
            foreach([['DisplayColumn'=>'password'],['SortColumn'=>'name DESC; DROP TABLE pages'],['PageSize'=>100000],['Filters'=>['entity_id'=>$scopes['blocks']]],['Columns'=>['dev-html']]]as$invalid)$this->check($admin->request('/api.v1.php',array_replace($lookup,$invalid))['status']===400,$backend.' lookup rejects unsafe query options');
            $restricted=new FixtureClient($base);$restricted->bootstrap('/');$restricted->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'restricted-lookup@example.test','password'=>$this->adminPassword]);$restricted->bootstrap('/');
            $this->check($restricted->request('/api.v1.php',$lookup)['status']===403,$backend.' lookup enforces an Admin account’s false read grant');
            $sources=$admin->request('/delegate-admin.php',['KEY'=>'GetWidgetSources'])['value']['PARAMETER']??[];
            $this->check(count($sources)>=14&&$sources['Tabs']['type']==='Tab'&&$sources['Accordion']['type']==='Accordian',$backend.' catalog discovers constructors including legacy names');
            $this->check($admin->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>'Template','kind'=>'script','source'=>'bad'],false)['status']===403,$backend.' widget changes require CSRF');
            $invalid=$admin->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>'../Window','kind'=>'script','source'=>'bad']);
            $this->check(!isset($invalid['value']['PARAMETER']['saved']),$backend.' rejects widget path traversal');
            $marker='/* WIDGET_'.$backend.'_DEV */';
            $save=$admin->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>'Template','kind'=>'script','source'=>$sources['Template']['script']."\n".$marker]);
            $this->check(($save['value']['PARAMETER']['saved']??false)===true,$backend.' saves widget override');
            $foreign=bin2hex(random_bytes(16));
            $foreignSource=json_encode(['script'=>'/* FOREIGN_WIDGET_SOURCE */ SI.Widget.ForeignWidget=SI.Tools.Widget.Derive("ForeignWidget");']);
            $this->sql("INSERT INTO si_widget_sources (tenant,name,level,source) VALUES ('".$foreign."','ForeignWidget','live',0x".bin2hex($foreignSource).")");
            $this->check(!str_contains($guest->request('/widget-asset.php?kind=script')['text'],'FOREIGN_WIDGET_SOURCE'),$backend.' widget assets exclude other tenants');
            $this->check(!isset($admin->request('/delegate-admin.php',['KEY'=>'GetWidgetSources','tenant'=>$foreign])['value']['PARAMETER']['ForeignWidget']),$backend.' catalog scope cannot be selected by the caller');
            $this->check(!str_contains($guest->request('/widget-asset.php?kind=script')['text'],$marker),$backend.' public Live bundle excludes Dev source');
            $this->check(str_contains($admin->request('/widget-asset.php?kind=script')['text'],$marker),$backend.' administrator Dev bundle contains override');
            $this->test($backend.'-widget-editor-browser',['node',$this->root.'/tests/editor_browser.cjs','--widgets'],json_encode(['disposable'=>true,'base'=>$base,'backend'=>$backend,'email'=>'admin@example.test','password'=>$this->adminPassword]));
            $name='BrowserWidget'.($backend==='php'?'Php':'Sipl');
            $this->check(!str_contains($guest->request('/widget-asset.php?kind=script')['text'],'SI.Widget.'.$name),$backend.' new widget is private to Dev before promotion');
            foreach(['test','live']as$target)$this->check(($admin->request('/delegate-admin.php',['KEY'=>'PromoteWidgetSource','name'=>$name,'target'=>$target])['value']['PARAMETER']['saved']??false)===true,$backend.' promotes widget to '.$target);
            $this->check(str_contains($guest->request('/widget-asset.php?kind=script')['text'],'SI.Widget.'.$name),$backend.' public bundle loads published custom widget');
            $admin->request('/delegate.php',['KEY'=>'ChangeDeployment','Deployment'=>'test']);$admin->bootstrap('/');
            $denied=$admin->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>$name,'kind'=>'style','source'=>'bad']);
            $this->check(!isset($denied['value']['PARAMETER']['saved']),$backend.' rejects widget editing outside Dev');
        }
        foreach($defaults as$file=>$hash)$this->check(hash_file('sha256',$file)===$hash,'widget edits leave shipped default unchanged: '.basename($file));
    }
    public function language(string $runtime): void {
        $this->frameworkMode=true;
        $this->responseLimit=4194304;
        $this->plugins(true,false,$runtime);
        $scope=$this->sql("SELECT HEX(id) FROM entities WHERE name='localtext' AND domain_id=(SELECT id FROM domains WHERE name='localhost' LIMIT 1)");
        $role=$this->sql("SELECT HEX(id) FROM securityroles WHERE name='Admin' LIMIT 1");
        $rules=json_decode(hex2bin($this->sql('SELECT HEX(rules) FROM securityroles WHERE id=0x'.$role)),true);
        $this->check(is_array($rules)&&count($rules)>0,'Language permission fixture reads the exact stored rules');
        $login=function(string $base):FixtureClient {
            $client=new FixtureClient($base);$client->bootstrap('/');
            $result=$client->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]);
            $this->check(!empty($result['value']['REFRESH']),'Language fixture administrator login');
            $client->bootstrap('/');return $client;
        };
        $failed=function(array $response,string $message):void {
            $value=$response['value'];
            $this->check(is_array($value)&&(!empty($value['ERROR'])||!empty($value['EXCEPTION']))&&!isset($value['NEWLOCALTEXT'])&&!isset($value['ADDEDLANGUAGE'])&&!isset($value['LOCALTEXTUPDATED']),$message);
        };
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $guest=new FixtureClient($base);$guest->bootstrap('/');
            $failed($guest->request('/delegate-admin.php',['KEY'=>'LocaltextNew','language'=>'en','text'=>'Denied']),$backend.' guests cannot create local text');
            $admin=$login($base);
            $failed($admin->request('/delegate-admin.php',['KEY'=>'AddLanguage','langcode'=>'af'],false),$backend.' language writes require CSRF');
            $code=$backend==='php'?'af':'zu';$name=$backend==='php'?'Afrikaans':'Zulu';
            $added=$admin->request('/delegate-admin.php',['KEY'=>'AddLanguage','langcode'=>strtoupper($code),'name'=>'Forged label']);
            $this->check(($added['value']['ADDEDLANGUAGE']??null)===['langcode'=>$code,'name'=>$name],$backend.' language installation returns canonical code and name');
            $duplicate=$admin->request('/delegate-admin.php',['KEY'=>'AddLanguage','langcode'=>$code]);
            $this->check(($duplicate['value']['ADDEDLANGUAGE']??null)===['langcode'=>$code,'name'=>$name],$backend.' duplicate language installation is idempotent');
            $column=json_decode($this->sql("SELECT COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME='_$code'"),true);
            $this->check(($column['Name']??null)===$name&&$this->sql("SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME='_$code'")==='YES',$backend.' new language columns allow absent translations and retain their catalog metadata');
            foreach([['KEY'=>'AddLanguage','langcode'=>'zz'],['KEY'=>'AddLanguage','langcode'=>[]],['KEY'=>'LocaltextNew','language'=>'vi','text'=>'Not installed'],['KEY'=>'LocaltextNew','language'=>'en','text'=>''],['KEY'=>'LocaltextNew','language'=>'en','text'=>['bad']],['KEY'=>'LocaltextNew','language'=>'en','text'=>'Bad options','options'=>[]]]as$post){
                $failed($admin->request('/delegate-admin.php',$post),$backend.' rejects invalid Language request '.json_encode($post));
            }
            $text="<b>Quoted ' text</b> \u{1F680}";
            $created=$admin->request('/delegate-admin.php',['KEY'=>'LocaltextNew','language'=>$code,'text'=>$text]);
            $row=$created['value']['NEWLOCALTEXT']??[];
            $this->check(($row['text']??null)===$text&&($row['language']??null)==='_'.$code&&preg_match('/^[A-Z]{20}$/D',$row['token']??'')===1,$backend.' creates a scoped HTML translation with a valid token');
            $id=preg_replace('/^0x/i','',$row['id']??'');
            $stored=$this->sql("SELECT HEX(`_$code`) FROM localtext WHERE id=0x$id AND entity_id=0x$scope");
            $this->check(preg_match('/^[a-f0-9]{32}$/Di',$id)===1&&strtolower($stored)===bin2hex($text),$backend.' created translation persists without changing its bytes: '.json_encode(['stored'=>$stored,'expected'=>bin2hex($text)]));
            foreach(['Changed','','']as$value){
                $updated=$admin->request('/delegate-admin.php',['KEY'=>'UpdateLocaltext','id'=>$id,'language'=>$code,'text'=>$value]);
                $this->check(($updated['value']['LOCALTEXTUPDATED']??false)===true&&$this->sql("SELECT `_$code` FROM localtext WHERE id=0x$id")===$value,$backend.' saves changed, cleared, and unchanged translations');
            }
            foreach([['id'=>bin2hex(random_bytes(16)),'language'=>$code,'text'=>'Missing'],['id'=>$id,'language'=>'vi','text'=>'Uninstalled'],['id'=>$id,'language'=>$code,'text'=>[]],['id'=>'invalid','language'=>$code,'text'=>'Invalid ID']]as$post){
                $failed($admin->request('/delegate-admin.php',['KEY'=>'UpdateLocaltext']+$post),$backend.' rejects invalid translation update');
            }
            $foreign=bin2hex(random_bytes(16));$otherScope=$this->sql("SELECT HEX(id) FROM entities WHERE name='blocks' LIMIT 1");
            $this->sql("INSERT INTO localtext(id,entity_id,name,`_$code`) VALUES(0x$foreign,0x$otherScope,'".strtoupper(bin2hex(random_bytes(10)))."',0x".bin2hex('Foreign').")");
            $failed($admin->request('/delegate-admin.php',['KEY'=>'UpdateLocaltext','id'=>$foreign,'language'=>$code,'text'=>'Forbidden']),$backend.' cannot update a record from another entity scope');
            $this->check($this->sql("SELECT `_$code` FROM localtext WHERE id=0x$foreign")==='Foreign',$backend.' rejected update leaves foreign text unchanged');
        }
        $page=bin2hex(random_bytes(16));$block=bin2hex(random_bytes(16));$relation=bin2hex(random_bytes(16));
        $scopes=[];
        foreach(['pages','blocks','relations','settings']as$name)$scopes[$name]=$this->sql("SELECT HEX(id) FROM entities WHERE name='$name' AND domain_id=(SELECT id FROM domains WHERE name='localhost' LIMIT 1) LIMIT 1");
        $token=$this->sql("SELECT name FROM localtext WHERE id=0x$id");$foreignToken=str_repeat('Z',20);
        $html='<p id="language-preview">SI_MULTILANG_'.$token.'</p><p id="foreign-preview">SI_MULTILANG_'.$foreignToken.'</p>';
        $pageOptions=bin2hex(json_encode(['head'=>['title'=>'SI_MULTILANG_'.$token,'meta'=>['name'=>['description'=>'SI_MULTILANG_'.$token],'property'=>['og:title'=>'SI_MULTILANG_'.$token]]],'body'=>['style'=>(object)[]]]));
        $blockOptions=bin2hex('{"tag":"div","style":{},"settings":{},"widgets":{}}');
        $this->sql("UPDATE localtext SET _en=0x".bin2hex('English fallback').",_fr=0x".bin2hex("Fran\u{E7}ais").",`_en-us`='' WHERE id=0x$id; INSERT INTO localtext(id,entity_id,name,_en) VALUES(0x".bin2hex(random_bytes(16)).",0x".$scopes['blocks'].",'$foreignToken','FOREIGNLEAK_SENTINEL'); INSERT INTO pages(id,entity_id,name,path,`dev-options`,`test-options`,`live-options`) VALUES(0x$page,0x".$scopes['pages'].",'LanguagePreview','language-preview',0x$pageOptions,0x$pageOptions,0x$pageOptions)");
        $blockFields=['id'=>'0x'.$block,'entity_id'=>'0x'.$scopes['blocks'],'name'=>"'LanguagePreview'"];
        foreach(['dev','test','live','rollback']as$level){
            $blockFields[$level.'-order']='0';$blockFields[$level.'-modified']='CURRENT_TIMESTAMP()';
            $blockFields[$level.'-html']='0x'.bin2hex($html);$blockFields[$level.'-options']='0x'.$blockOptions;
        }
        $this->sql('INSERT INTO blocks ('.implode(',',array_map(fn($column)=>'`'.$column.'`',array_keys($blockFields))).') VALUES ('.implode(',',$blockFields).')');
        $this->sql("INSERT INTO relations(id,entity_id,parententity_id,childentity_id,parent_id,child_id,note,`dev-order`,`test-order`,`live-order`,`dev-options`,`test-options`,`live-options`) VALUES(0x$relation,0x".$scopes['relations'].",0x".$scopes['pages'].",0x".$scopes['blocks'].",0x$page,0x$block,'pages_blocks',0,0,0,0x$blockOptions,0x$blockOptions,0x$blockOptions)");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $guest=new FixtureClient($base);
            foreach(['fr-CA,fr;q=0.9,en;q=0.8'=>"Fran\u{E7}ais",'zz-ZZ'=>'English fallback','EN-us,en;q=0.9'=>'English fallback']as$header=>$expected){
                $response=$guest->request('/language-preview',null,true,['Accept-Language'=>$header]);
                $this->check($response['status']===200&&str_contains($response['text'],'id="language-preview">'.$expected.'</p>'),$backend.' rendered language uses regional/base/default fallback: '.$header);
                $this->check(!str_contains($response['text'],'FOREIGNLEAK_SENTINEL'),$backend.' rendered translation never reads another entity scope');
                $documentLanguage=str_starts_with(strtolower($header),'fr')?'fr':(str_starts_with(strtolower($header),'en-us')?'en-us':'en');
                $this->check(preg_match('/<html[^>]*lang=[\'"]'.preg_quote($documentLanguage,'/').'[\'"]/',$response['text'])===1,$backend.' document language uses installed preferences');
                $this->check(str_contains($response['text'],'>'.$expected.'</title>')&&str_contains($response['text'],"content='$expected'")&&str_contains($response['text'],"data-si_ml_source='SI_MULTILANG_$token'"),$backend.' title and metadata translate while retaining their source');
            }
        }
        $this->sql("UPDATE settings SET settingvalue='FR' WHERE entity_id=0x".$scopes['settings']." AND settingname='DefaultLanguage'");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $guest=new FixtureClient($base);
            $response=$guest->request('/language-preview',null,true,['Accept-Language'=>'zz-ZZ']);
            $this->check($response['status']===200&&str_contains($response['text'],'id="language-preview">'."Fran\u{E7}ais".'</p>'),$backend.' configured default language fallback');
        }
        $this->sql("UPDATE settings SET settingvalue='en' WHERE entity_id=0x".$scopes['settings']." AND settingname='DefaultLanguage'");
        $this->sql("UPDATE blocks SET `live-html`='SI_MULTILANG_$token' WHERE id=0x$block");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $response=(new FixtureClient($base))->request('/language-preview',null,true,['Accept-Language'=>'fr']);
            $this->check(str_contains($response['text'],"class='si-block si-multilingual si-multilingual-$token'")&&str_contains($response['text'],"data-si_ml_token='$token'"),$backend.' whole-block translation renders without inserting a layout wrapper');
        }
        $largeId=bin2hex(random_bytes(16));$largeToken=str_repeat('Q',20);
        $this->sql("INSERT INTO localtext(id,entity_id,name,_en) VALUES(0x$largeId,0x$scope,'$largeToken',REPEAT('a',2097152))");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $admin=$login($base);$catalog=$admin->request('/editor/editor.js');
            $this->check($catalog['status']===200&&strlen($catalog['text'])>2097152&&str_contains($catalog['text'],$largeToken),$backend.' configured multilingual editor catalog serves more than two MiB without truncation');
        }
        $this->sql("UPDATE localtext SET _af='' WHERE _af IS NULL; ALTER TABLE localtext MODIFY _af MEDIUMTEXT NOT NULL");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $admin=$login($base);
            $created=$admin->request('/delegate-admin.php',['KEY'=>'LocaltextNew','language'=>'en','text'=>'Legacy required column '.$backend]);
            $this->check(isset($created['value']['NEWLOCALTEXT']),$backend.' creation remains compatible with older required language columns');
        }
        $restricted=$rules;
        foreach($restricted as$key=>&$permission)if(strcasecmp(preg_replace('/^0x/i','',$key),$scope)===0){$permission['write']='false';$permission['create']='false';}
        unset($permission);
        $this->sql('UPDATE securityroles SET rules=0x'.bin2hex(json_encode($restricted)).' WHERE id=0x'.$role);
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $admin=$login($base);
            foreach([['KEY'=>'AddLanguage','langcode'=>'af'],['KEY'=>'LocaltextNew','language'=>'en','text'=>'Denied'],['KEY'=>'UpdateLocaltext','id'=>$id,'language'=>'en','text'=>'Denied']]as$post){
                $failed($admin->request('/delegate-admin.php',$post),$backend.' Language operation honors entity permissions');
            }
        }
        $this->sql('UPDATE securityroles SET rules=0x'.bin2hex(json_encode($rules)).' WHERE id=0x'.$role);
        $otherSubdomain=bin2hex(random_bytes(16));$otherLocaltext=bin2hex(random_bytes(16));$otherSettings=bin2hex(random_bytes(16));
        $domain=$this->sql("SELECT HEX(id) FROM domains WHERE name='localhost' LIMIT 1");
        $this->sql("INSERT INTO subdomains(id,domain_id,name) VALUES(0x$otherSubdomain,0x$domain,'language-guard'); INSERT INTO entities(id,domain_id,subdomain_id,name,options) VALUES(0x$otherLocaltext,0x$domain,0x$otherSubdomain,'localtext',''),(0x$otherSettings,0x$domain,0x$otherSubdomain,'settings',''); INSERT INTO settings(id,entity_id,settingname,settingvalue) VALUES(0x".bin2hex(random_bytes(16)).",0x$otherSettings,'DefaultLanguage','fr')");
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $admin=$login($base);
            foreach([['KEY'=>'RemoveLanguage','langcode'=>'en','confirm'=>true],['KEY'=>'RemoveLanguage','langcode'=>'fr','confirm'=>true],['KEY'=>'RemoveLanguage','langcode'=>'zu'],['KEY'=>'RemoveLanguage','langcode'=>'zu','confirm'=>'true'],['KEY'=>'RemoveLanguage','langcode'=>'vi','confirm'=>true]]as$post){
                $failed($admin->request('/delegate-admin.php',$post),$backend.' removal protects defaults, requires confirmation, and validates installed languages');
            }
            $code=$backend==='php'?'fi':'pl';$name=$backend==='php'?'Finnish':'Polish';
            $added=$admin->request('/delegate-admin.php',['KEY'=>'AddLanguage','langcode'=>$code]);
            $translated=$admin->request('/delegate-admin.php',['KEY'=>'UpdateLocaltext','id'=>$id,'language'=>$code,'text'=>'Delete only this language']);
            $this->check(isset($added['value']['ADDEDLANGUAGE'])&&($translated['value']['LOCALTEXTUPDATED']??false)===true,$backend.' removal fixture contains a saved translation');
            $count=$this->sql('SELECT COUNT(*) FROM localtext');
            $removed=$admin->request('/delegate-admin.php',['KEY'=>'RemoveLanguage','langcode'=>$code,'confirm'=>true]);
            $this->check(($removed['value']['REMOVEDLANGUAGE']??null)===['langcode'=>$code,'name'=>$name]&&$this->sql("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME='_$code'")==='0',$backend.' confirmed removal drops the selected column');
            $this->check($this->sql('SELECT COUNT(*) FROM localtext')===$count&&$this->sql("SELECT COUNT(*) FROM localtext WHERE id=0x$id")==='1',$backend.' removal preserves local-text records and other languages');
            $admin->request('/delegate-admin.php',['KEY'=>'AddLanguage','langcode'=>$code]);
            $this->check($this->sql("SELECT COUNT(*) FROM localtext WHERE `_$code` IS NOT NULL")==='0',$backend.' reinstalling a removed language starts empty');
        }
        $phpAdmin=$login($this->base);$nativeAdmin=$login($this->nativeBase);
        $columns=explode("\n",$this->sql("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND LEFT(COLUMN_NAME,1)='_'"));
        $this->sql('RENAME TABLE localtext TO fixture_localtext; CREATE TABLE localtext LIKE fixture_localtext');
        try{
            foreach($columns as$column)if(!in_array($column,['_af','_zu'],true))$this->sql('ALTER TABLE localtext DROP COLUMN `'.$column.'`');
            $requests=[];
            foreach([[$phpAdmin,'af'],[$nativeAdmin,'zu']]as[$client,$code]){
                $requests[]=['url'=>$client->base.'/delegate-admin.php','headers'=>['Host'=>'localhost','Content-Type'=>'application/json','X-SI-CSRF'=>$client->csrf,'Cookie'=>implode('; ',array_map(fn($key)=>$key.'='.$client->cookies[$key],array_keys($client->cookies)))],'body'=>json_encode(['KEY'=>'RemoveLanguage','langcode'=>$code,'confirm'=>true])];
            }
            $parallel=$this->run(['node','-e','const fs=require("node:fs");const requests=JSON.parse(fs.readFileSync(0,"utf8"));Promise.all(requests.map(async request=>{const response=await fetch(request.url,{method:"POST",headers:request.headers,body:request.body});return response.json();})).then(results=>console.log(JSON.stringify(results))).catch(error=>{console.error(error);process.exitCode=1;});'],json_encode($requests));
            $results=json_decode($parallel,true);
            $this->check(count(array_filter($results,fn($value)=>isset($value['REMOVEDLANGUAGE'])))===1&&count(array_filter($results,fn($value)=>isset($value['ERROR'])))===1,'simultaneous PHP/SIPL removals cannot delete the last language');
            $this->check($this->sql("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND LEFT(COLUMN_NAME,1)='_'")==='1','the final language remains after simultaneous removals');
        }finally{
            $this->sql('DROP TABLE localtext; RENAME TABLE fixture_localtext TO localtext');
        }
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $this->sql("UPDATE blocks SET `dev-html`='SI_MULTILANG_$token',`test-html`='SI_MULTILANG_$token' WHERE id=0x$block");
            $admin=$login($base);
            $relation=$this->sql("SELECT HEX(id) FROM relations WHERE parent_id=0x$page AND child_id=0x$block");
            $before=$this->sql("SELECT HEX(`dev-html`) FROM blocks WHERE id=0x$block");
            $textBefore=$this->sql("SELECT HEX(_en) FROM localtext WHERE id=0x$id");
            $failed($admin->request('/delegate-admin.php',['KEY'=>'BlockSave','guid'=>$block,'relationsId'=>$relation,'html'=>'must roll back','localtext'=>[['id'=>$id,'language'=>'en','text'=>'must also roll back'],['id'=>str_repeat('0',32),'language'=>'en','text'=>'missing record']]]),$backend.' translated block save rejects a missing translation');
            $this->check($this->sql("SELECT HEX(`dev-html`) FROM blocks WHERE id=0x$block")===$before&&$this->sql("SELECT HEX(_en) FROM localtext WHERE id=0x$id")===$textBefore,$backend.' translation failure rolls back block and prior translation writes together');
            $this->test($backend.'-language-browser',['node',$this->root.'/tests/editor_browser.cjs','--language-fixture'],json_encode(['disposable'=>true,'base'=>$base,'backend'=>$backend,'email'=>'admin@example.test','password'=>$this->adminPassword,'languageToken'=>$token,'languageBlock'=>$block,'languagePage'=>$page]));
        }
        echo 'Packaged Language checks passed: '.$this->checks.PHP_EOL;
    }
    public function framework(string $runtime): void {
        $this->frameworkMode=true;
        $this->plugins(true,false,$runtime);
        foreach(['core_sipl/src/DemoPolicy.sipl','core_sipl/src/Sample.sipl','editor/sample-prelude.js','editor/sample-mode.js']as$name)$this->check(!file_exists($this->site.'/'.$name),'CMS releases exclude website-specific file '.$name);
        foreach(array_keys(Package::json($this->site.'/core_sipl/config.example.json'))as$name)$this->check(!str_starts_with($name,'demo'),'CMS example configuration excludes website demo settings: '.$name);
        $scope=[]; foreach (explode("\n",$this->sql("SELECT name,HEX(id) FROM entities WHERE domain_id=(SELECT id FROM domains WHERE name='localhost' LIMIT 1)")) as $line) { [$name,$id]=explode("\t",$line); $scope[$name]=$id; }
        $this->sql("CREATE TABLE libraries (id BINARY(16) PRIMARY KEY,entity_id BINARY(16) NOT NULL,status VARCHAR(20) NOT NULL DEFAULT 'active',name TEXT,`dev-css` MEDIUMTEXT,`live-css` MEDIUMTEXT,`dev-js` MEDIUMTEXT,`live-js` MEDIUMTEXT)");
        $record=function(string $table,array $values): string {
            $id=bin2hex(random_bytes(16)); $values=['id'=>'0x'.$id]+$values;
            $columns=[];$encoded=[];
            foreach ($values as $name=>$value) { $columns[]='`'.$name.'`';$encoded[]=$value===''?"''":(str_starts_with($value,'0x')?$value:'0x'.bin2hex($value)); }
            $this->sql('INSERT INTO `'.$table.'` ('.implode(',',$columns).') VALUES ('.implode(',',$encoded).')');
            return $id;
        };
        $relation=function($parentType,$parent,$childType,$child)use($record,$scope):void{
            $values=['entity_id'=>'0x'.$scope['relations'],'parententity_id'=>'0x'.$scope[$parentType],'childentity_id'=>'0x'.$scope[$childType],'parent_id'=>'0x'.$parent,'child_id'=>'0x'.$child,'note'=>$parentType.'_'.$childType];
            foreach(['dev','test','live']as$level){$values[$level.'-options']=$childType==='blocks'?'{"tag":"div","style":{},"settings":{},"widgets":{}}':'{}';$values[$level.'-order']='0';}
            $record('relations',$values);
        };
        $ids=[];
        foreach (['A','B','Private'] as $name) {
            $path=['A'=>'asset-a','B'=>'asset-b','Private'=>'asset-private'][$name];
            $options=json_encode(['head'=>['title'=>'Fixture '.$name],'body'=>['style'=>(object)[]]]);
            $values=['entity_id'=>'0x'.$scope['pages'],'name'=>'Fixture '.$name,'path'=>$path];
            foreach(['dev','test','live']as$level)$values[$level.'-options']=$options;
            $page=$ids[$name]=$record('pages',$values);
            $html='<h2 id="framework_title_'.$name.'">Published '.$name.'</h2>';
            $script='window.frameworkAsset='.json_encode($name).';';
            $values=['entity_id'=>'0x'.$scope['blocks'],'name'=>'Framework'.$name];
            foreach(['dev','test','live','rollback']as$level){$values[$level.'-html']=$html;$values[$level.'-style']='/*ASSET_'.$name.'*/ :root { --fixture-tone: #25384c; } #framework_title_'.$name.' { color: rgb(80, 130, 180); text-underline-offset: .2em; }';$values[$level.'-script']=$script;$values[$level.'-order']='0';$values[$level.'-options']='{}';$values[$level.'-modified']='2026-11-04 12:00:00';}
            $block=$record('blocks',$values);$relation('pages',$page,'blocks',$block);
            if(in_array($name,['A','B'],true)){
                $library=$record('libraries',['entity_id'=>'0x'.$scope['libraries'],'name'=>'Fixture library '.$name,'dev-css'=>'/*LIBRARY_'.$name.'*/','live-css'=>'/*LIBRARY_'.$name.'*/','dev-js'=>'','live-js'=>'']);
                $relation('pages',$page,'libraries',$library);
            }
            if($name==='Private')$relation('pages',$page,'securityroles',$this->sql("SELECT HEX(id) FROM securityroles WHERE name='Admin' AND entity_id=0x".$scope['securityroles']));
        }
        $checkAssets=function(string $backend,string $base):void{
            $guest=new FixtureClient($base);$guest->bootstrap('/');
            $a=$guest->request('/asset-a');$guest->request('/asset-b');
            foreach(['/style/page.css','/scripts/page.js','/style/libraries.css']as$route){
                $response=$guest->request($route.'?page=asset-a');
                $marker=$route==='/style/libraries.css'?'LIBRARY_A':($route==='/scripts/page.js'?'"A"':'ASSET_A');
                $this->check($response['status']===200&&str_contains($response['text'],$marker),$backend.' page-specific '.$route.' HTTP '.$response['status']);
                $this->check($guest->request($route.'?page=asset-private')['status']===403,$backend.' private page asset denied '.$route);
                $this->check($guest->request($route.'?page=asset-a&page=asset-b')['status']===400,$backend.' ambiguous page asset rejected '.$route);
            }
            $this->check(str_contains($a['text'],'page=asset-a'),$backend.' HTML links identify their page');
            $admin=new FixtureClient($base);$admin->bootstrap('/');
            $login=$admin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]);$this->check(!empty($login['value']['REFRESH']),$backend.' normal administrator login');
            $admin->bootstrap('/asset-a');$admin->request('/asset-b');
            $editor=$admin->request('/editor/editor.js?page=asset-a');
            $this->check($editor['status']===200&&str_contains($editor['text'],'FrameworkA'),$backend.' editor reads requested page blocks');
            $beforeLocales=$this->sql('SELECT COUNT(*) FROM localtext');
            foreach(['es-MX'=>'es','zh-CN'=>'zh','tl-PH'=>'tl','en-US'=>'en','de-DE'=>'en','es;q=0.2,zh;q=0.9'=>'zh','zh;q=0,en;q=1'=>'en']as$header=>$code){
                $response=$admin->request('/editor/editor.js?page=asset-a',null,true,['Accept-Language'=>$header]);
                $this->check($response['status']===200&&preg_match('/SI\.EditorLanguage\s*=\s*(".*?");/',$response['text'],$locale)&&json_decode($locale[1],true)===$code,$backend.' editor locale negotiation '.$header);
                $this->check(str_contains(implode(' ',$response['headers']['cache-control']??[]),'no-store'),$backend.' locale response is uncached '.$code);
            }
            $this->check($this->sql('SELECT COUNT(*) FROM localtext')===$beforeLocales&&$this->sql("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME='_tl'")==='0',$backend.' UI translations leave website local-text records and installed languages unchanged');
            $row=json_decode($admin->request('/api.v1.php',['Operation'=>'Retrieve','Entity'=>['Name'=>'blocks','Attributes'=>['name'=>'FrameworkA']],'Columns'=>['id','dev-html']])['text'],true)['0'];
            $changed=$admin->request('/api.v1.php',['Operation'=>'Update','Entity'=>['Name'=>'blocks','Id'=>$row['id'],'Attributes'=>['dev-html'=>'<h2 id="framework_title_A">Administrator edit</h2>']]]);
            $rendered=$admin->request('/asset-a');
            if($changed['status']!==200||!str_contains($rendered['text'],'Administrator edit'))throw new RuntimeException($backend.' administrator edit failed: '.$changed['text'].'; page '.$rendered['status']);
            $this->check(true,$backend.' normal administrator edits persist');
        };
        $checkAssets('php',$this->base);$checkAssets('sipl',$this->nativeBase);
        $this->sql('RENAME TABLE libraries TO fixture_libraries');
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $guest=new FixtureClient($base);$guest->bootstrap('/');
            $this->check($guest->request('/style/libraries.css?page=asset-a')['status']===200,$backend.' missing optional library table returns an empty bundle');
            $this->check($guest->request('/style/libraries.css?page=asset-private')['status']===403,$backend.' missing library table still enforces page access');
        }
        $this->sql('RENAME TABLE fixture_libraries TO libraries');
        $this->test('php-normal-editor-browser',['node',$this->root.'/tests/editor_browser.cjs','--framework'],json_encode(['disposable'=>true,'base'=>$this->base,'backend'=>'php','email'=>'admin@example.test','password'=>$this->adminPassword]));
        $browserConfig=json_encode(['disposable'=>true,'base'=>$this->nativeBase,'backend'=>'sipl','email'=>'admin@example.test','password'=>$this->adminPassword]);
        $this->test('sipl-normal-editor-browser',['node',$this->root.'/tests/editor_browser.cjs','--framework'],$browserConfig);
        $widgetAdmin=new FixtureClient($this->base);$widgetAdmin->bootstrap('/');
        $widgetAdmin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]);$widgetAdmin->bootstrap('/');
        $this->check(($widgetAdmin->request('/delegate-admin.php',['KEY'=>'CreateWidget','name'=>'UpgradeWidget'])['value']['PARAMETER']['saved']??false)===true,'create widget definition before CMS update');
        $this->check(($widgetAdmin->request('/delegate-admin.php',['KEY'=>'SaveWidgetSource','name'=>'UpgradeWidget','kind'=>'style','source'=>'[data-si-widget="UpgradeWidget"] { --upgrade-preserved: 1; }'])['value']['PARAMETER']['saved']??false)===true,'save widget source before CMS update');
        $dump=fn()=>hash('sha256',$this->docker(['exec',$this->database,'sh','-c','exec mariadb-dump --compact --skip-comments --no-create-info --skip-extended-insert --order-by-primary --user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"']));
        $connections=$this->sql("SELECT ID FROM INFORMATION_SCHEMA.PROCESSLIST WHERE USER='si_plugins' AND COMMAND='Sleep'");
        foreach(explode("\n",$connections)as$id)if(ctype_digit($id))$this->sql('KILL CONNECTION '.$id);
        $this->check((new FixtureClient($this->nativeBase))->request('/asset-a')['status']===200,'native backend reconnects before work after an idle SQL disconnect');
        // Stop only this fixture's servers before exercising the offline updaters.
        foreach($this->processes as[$process,$pipes]){if(proc_get_status($process)['running'])proc_terminate($process);foreach($pipes as$pipe)if(is_resource($pipe))fclose($pipe);proc_close($process);}
        $this->processes=[];$this->docker(['stop',$this->name.'-web']);
        $config=Package::json($this->site.'/plugin-test.json');$config['customSetting']='preserve-upgrade-configuration';
        Package::write($this->site.'/core_sipl/config.local.json',json_encode($config));
        Package::write($this->site.'/domains/localhost/media/images/preserved.bin','preserved upload');
        Package::write($this->site.'/plugins/installed/customer/js/site.js','window.customerPlugin=true;');
        $protected=['core/DbCreds.php','core_sipl/config.local.json','domains/localhost/media/images/preserved.bin','plugins/installed/customer/js/site.js'];
        foreach(['domains/localhost/media','plugins/installed','core/plugin-packages']as$directory){
            if(!is_dir($this->site.'/'.$directory))continue;
            foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->site.'/'.$directory,FilesystemIterator::SKIP_DOTS))as$file)if($file->isFile())$protected[]=str_replace('\\','/',substr($file->getPathname(),strlen($this->site)+1));
        }
        $protected=array_unique($protected);
        $hashes=[];foreach($protected as$name)$hashes[$name]=hash_file('sha256',$this->site.'/'.$name);
        $before=$dump();
        $nativeFiles=['Server','Render','Assets','Page','Library','Database','RateLimit'];
        foreach($nativeFiles as$name)Package::write($this->site.'/core_sipl/src/'.$name.'.sipl',$this->run(['git','show','HEAD:core_sipl/src/'.$name.'.sipl']));
        $phpFiles=['core/Page.php','core/Admin.php','core/Database.php','scripts/page.js','style/page.css','style/libraries.css','editor/editor.js'];
        foreach($phpFiles as$name)Package::write($this->site.'/'.$name,$this->run(['git','show','HEAD:'.$name]));
        $native=$this->site.'/packaging/Package.sipl';$archive=$this->root.'/dist/SuperIntuitive-sipl.zip';
        $this->test('native-update-preview',[$runtime,'run',$native,'upgrade',$archive,'--target',$this->site]);
        $this->test('native-update-apply',[$runtime,'run',$native,'upgrade',$archive,'--target',$this->site,'--apply']);
        $this->test('php-update-preview',[PHP_BINARY,'-d','extension_dir='.ini_get('extension_dir'),'-d','extension=zip',$this->site.'/packaging/Package.php','upgrade',$this->root.'/dist/SuperIntuitive-php.zip','--target',$this->site]);
        $this->test('php-update-apply',[PHP_BINARY,'-d','extension_dir='.ini_get('extension_dir'),'-d','extension=zip',$this->site.'/packaging/Package.php','upgrade',$this->root.'/dist/SuperIntuitive-php.zip','--target',$this->site,'--apply']);
        foreach($hashes as$name=>$hash)$this->check(hash_file('sha256',$this->site.'/'.$name)===$hash,'updater preserves '.$name);
        $this->check($dump()===$before,'updaters preserve all database data');
        $this->check($this->sql("SELECT COUNT(*) FROM si_widget_sources WHERE name='UpgradeWidget' AND source LIKE '%upgrade-preserved%'")==='1','updaters preserve widget definitions and source edits');
        foreach($nativeFiles as$name)$this->check(hash_file('sha256',$this->site.'/core_sipl/src/'.$name.'.sipl')===hash_file('sha256',$this->root.'/core_sipl/src/'.$name.'.sipl'),'updater replaces older native '.$name.' core');
        foreach($phpFiles as$name)$this->check(hash_file('sha256',$this->site.'/'.$name)===hash_file('sha256',$this->root.'/'.$name),'updater replaces older PHP '.$name);
        $this->nativeBase=$this->startNative($runtime);
        $this->docker(['start',$this->name.'-web']);
        $port=substr(strrchr(trim($this->docker(['port',$this->name.'-web','80/tcp'])),':'),1);$this->base='http://127.0.0.1:'.$port;
        $deadline=microtime(true)+10;
        do{$socket=@fsockopen('127.0.0.1',(int)$port,$error,$message,.2);if($socket){fclose($socket);break;}usleep(50000);}while(microtime(true)<$deadline);
        $checkAssets('php',$this->base);$checkAssets('sipl',$this->nativeBase);
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base)$this->test('updated-'.$backend.'-editor-browser',['node',$this->root.'/tests/editor_browser.cjs','--framework'],json_encode(['disposable'=>true,'base'=>$base,'backend'=>$backend,'email'=>'admin@example.test','password'=>$this->adminPassword]));
    }
    public function demo(string $runtime):void {
        $this->frameworkMode=true;$this->plugins(true,false,$runtime);
        copy($this->root.'/dist/editor-demo.zip',$this->site.'/plugins/downloaded/editor-demo.zip');
        $admins=[];
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){
            $admin=new FixtureClient($base);$admin->bootstrap('/');
            $this->check(!empty($admin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword])['value']['REFRESH']),$backend.' demo administrator login');
            $admin->bootstrap('/');$admins[$backend]=$admin;
        }
        $install=$admins['sipl']->request('/delegate-admin.php',['KEY'=>'InstallPlugin','plugin'=>'editor-demo']);
        $this->check($install['status']===200,'native host installs the dual-backend demo: '.$install['text']);
        $install=$admins['php']->request('/delegate-admin.php',['KEY'=>'UpdatePlugin','plugin'=>'editor-demo']);
        $this->check($install['status']===200,'PHP host validates and updates the same demo package: '.$install['text']);
        $tenant=$this->sql("SELECT LOWER(HEX(id)) FROM entities WHERE name='blocks' AND domain_id=(SELECT id FROM domains WHERE name='localhost' LIMIT 1)");
        $package=$this->sql("SELECT package FROM si_plugin_installations WHERE tenant='".$tenant."' AND plugin='editor-demo'");
        $this->check(str_starts_with($package,'core/plugin-packages/editor-demo/'),'demo code is installed privately');
        $guest=new FixtureClient($this->base);$guest->bootstrap('/');
        $this->check($guest->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'editor-demo','action'=>'settings'])['status']===403,'Guest cannot read demo settings');
        $this->check($guest->request('/admin/editor-demo')['status']===403,'Guest cannot open the demo Admin page');
        $this->check($admins['php']->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'editor-demo','action'=>'configure','config'=>[]],false)['status']===403,'demo configuration requires CSRF');
        $this->check($admins['sipl']->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'editor-demo','action'=>'configure','config'=>['origin'=>'http://localhost:8096','parents'=>['http://localhost'],'page'=>'editor-demo-source']])['status']===400,'same-host demo origin rejected');
        $readerPassword=bin2hex(random_bytes(24));
        $this->docker(['exec','-i',$this->database,'sh','-c','exec mariadb --user=root --password="$MARIADB_ROOT_PASSWORD"'],"CREATE USER 'demo_reader'@'%' IDENTIFIED BY '".$readerPassword."'; GRANT SELECT ON si_plugins.* TO 'demo_reader'@'%';");
        $config=Package::json($this->site.'/plugin-test.json');
        $service=['root'=>$this->site,'domain'=>'localhost','subdomain'=>'','host'=>'127.0.0.1','dsn'=>$config['dsn'],'dbUser'=>'demo_reader','dbPassword'=>$readerPassword,'requestBurst'=>2000,'requestsPerMinute'=>10000,'contentBurst'=>64,'contentPerMinute'=>1000];
        $limitConfig=$service;$limitConfig['dsn']='mysql:host=127.0.0.1;port=1;dbname=unreachable';$limitConfig['requestBurst']=1;$limitConfig['domain']='limit-fixture';
        Package::write($this->site.'/core/demo-limits.local.json',json_encode($limitConfig));
        Package::write($this->site.'/'.$package.'/sipl/limits_test.sipl',"use demo\nuse ../../../../../core_sipl/src/Config\nfn start() {\n let settings=json.parse(fs.readText(system.args[0]))\n Config.install(settings)\n let request=".json_encode(['method'=>'POST','path'=>'/api.v1.php','query'=>''],JSON_UNESCAPED_SLASHES)."\n assert(demo.request(request)[\"status\"]==403)\n assert(demo.request(request)[\"status\"]==429)\n print(\"PASS SIPL demo rejects writes and limits requests without connecting to the unreachable database\")\n}\n");
        $this->test('native-demo-before-database',[$runtime,'run',$this->site.'/'.$package.'/sipl/limits_test.sipl',$this->site.'/core/demo-limits.local.json']);
        $limitPhp='<?php require dirname(__DIR__,2)."/'.$package.'/php/demo.php";$config=json_decode(file_get_contents(dirname(__DIR__)."/demo-limits.local.json"),true);$config["root"]="/workspace";$plugin=new SIEditorDemoPlugin($config);if($plugin->response("POST","/api.v1.php","demo.localhost")[0]!==403||$plugin->response("POST","/api.v1.php","demo.localhost")[0]!==429)throw new RuntimeException("Early demo protection failed");echo "PASS PHP demo rejects writes and limits requests without connecting to the unreachable database\n";';
        Package::write($this->site.'/core/plugin-requests/demo-limits-test.php',$limitPhp);
        $this->test('php-demo-before-database',$this->php('core/plugin-requests/demo-limits-test.php'));
        Package::write($this->site.'/'.$package.'/sipl/reader_test.sipl',"use demo\nfn start() {\n var rejected=false\n try {demo.start()} fail {rejected=fail.why==\"DEMO_REQUIRES_SELECT_ONLY_DATABASE_USER\"}\n assert(rejected)\n print(\"PASS SIPL demo refuses a write-capable database account\")\n}\n");
        $this->test('native-demo-readonly-account',[$runtime,'run',$this->site.'/'.$package.'/sipl/reader_test.sipl',$this->site.'/plugin-test.json']);
        $readerPhp='<?php require dirname(__DIR__,2)."/'.$package.'/php/demo.php";$root=dirname(__DIR__,2);$config=json_decode(file_get_contents($root."/plugin-test.json"),true);$config["root"]="/workspace";$config["dsn"]=$config["phpDsn"];$config["domain"]="reader-probe";$log=$root."/core/plugin-requests/reader-probe.log";ini_set("error_log",$log);$plugin=new SIEditorDemoPlugin($config);$response=$plugin->response("GET","/cms/sample/canvas","demo.localhost");if($response[0]!==403||!str_contains(file_get_contents($log),"DEMO_REQUIRES_SELECT_ONLY_DATABASE_USER"))throw new RuntimeException("Writable account was not rejected");unlink($log);echo "PASS PHP demo refuses a write-capable database account\n";';
        Package::write($this->site.'/core/plugin-requests/demo-reader-test.php',$readerPhp);
        $this->test('php-demo-readonly-account',$this->php('core/plugin-requests/demo-reader-test.php'));
        $dump=fn(bool $sessions=true)=>hash('sha256',$this->docker(array_merge(['exec',$this->database,'sh','-c'],['exec mariadb-dump --compact --skip-comments --no-create-info --skip-extended-insert --order-by-primary '.($sessions?'':'--ignore-table=si_plugins.sessions ').'--user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"'])));
        $run=function(string $phase)use($runtime,$package,$service,&$admins,$dump):void{
            foreach(['sipl','php']as$backend){
                $server=null;$process=null;$pipes=[];$serviceConfig=$service;
                if($backend==='sipl'){
                    $socket=stream_socket_server('tcp://127.0.0.1:0');$address=stream_socket_get_name($socket,false);fclose($socket);$port=(int)substr(strrchr($address,':'),1);
                    $demoBase='http://127.0.0.1:'.$port;$serviceConfig['port']=$port;
                }else{
                    $serviceConfig['root']='/var/www/html';
                    $serviceConfig['dsn']='mysql:host=plugin-db;dbname=si_plugins;charset=utf8mb4';
                    Package::write($this->site.'/core/editor-demo.local.json',json_encode($serviceConfig));
                    $server=$this->name.'-demo-'.$phase;$this->docker(['run','-d','--name',$server,'--network',$this->network,'-p','127.0.0.1::80','-v',$this->site.':/var/www/html','-e','SI_DEMO_CONFIG=/var/www/html/core/editor-demo.local.json','--entrypoint','php','superintuitive-security-check','-S','0.0.0.0:80','/var/www/html/'.$package.'/php/demo.php']);$this->containers[]=$server;
                    $port=(int)substr(strrchr(trim($this->docker(['port',$server,'80/tcp'])),':'),1);$demoBase='http://127.0.0.1:'.$port;
                }
                $origin='http://demo.localhost:'.$port;$base=$backend==='sipl'?$this->nativeBase:$this->base;
                $settings=['origin'=>$origin,'parents'=>[$this->base,$this->nativeBase],'page'=>'editor-demo-source'];
                $response=$admins[$backend]->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'editor-demo','action'=>'configure','config'=>$settings]);
                $this->check($response['status']===200,$backend.' demo settings use ordinary plugin actions: '.$response['status'].' '.$response['text']);
                if($backend==='sipl'){
                    Package::write($this->site.'/core/editor-demo.local.json',json_encode($serviceConfig));
                    $log=$this->folder.'/demo-'.$phase.'.log';
                    $process=proc_open([$runtime,'run',$this->site.'/'.$package.'/sipl/demo.sipl',$this->site.'/core/editor-demo.local.json'],[0=>['pipe','r'],1=>['file',$log,'w'],2=>['file',$log,'a']],$pipes,$this->root,$this->environment(),['bypass_shell'=>true]);fclose($pipes[0]);$this->processes[]=[$process,$pipes];
                }
                $deadline=microtime(true)+20;
                do{$ready=@fsockopen('127.0.0.1',$port,$error,$message,.2);if($ready){fclose($ready);break;}usleep(50000);}while(microtime(true)<$deadline);
                if(!$ready)throw new RuntimeException('Demo startup failed: '.($backend==='sipl'?file_get_contents($log):$this->logs($server)));
                $demo=new FixtureClient($demoBase);$demo->cookies=$admins[$backend]->cookies;$demo->csrf=$admins[$backend]->csrf;
                $headers=['Host'=>'demo.localhost:'.$port];
                $canvas=$demo->request('/cms/sample/canvas',null,true,$headers);
                if($canvas['status']!==200)throw new RuntimeException('Demo canvas failed: '.$canvas['text'].' '.($backend==='sipl'?file_get_contents($log):$this->logs($server)));
                $this->check(!isset($canvas['headers']['set-cookie'])&&str_contains($canvas['headers']['content-security-policy'][0],'sandbox allow-scripts;'),$backend.' demo uses a session-free sandbox response');
                $before=$dump(false);
                try{$this->test($phase.'-'.$backend.'-demo-browser',['node',$this->root.'/tests/editor_browser.cjs','--demo-plugin'],json_encode(['disposable'=>true,'base'=>$base,'backend'=>$backend,'email'=>'admin@example.test','password'=>$this->adminPassword,'expectCustom'=>$phase==='updated']));}
                catch(Throwable $error){throw new RuntimeException($error->getMessage()."\nDemo log:\n".($backend==='sipl'?file_get_contents($log):$this->logs($server)));}
                $this->check($dump(false)===$before,$backend.' demo browser leaves all content, users, roles and plugin data unchanged');
                $before=$dump();
                foreach(['/delegate.php','/delegate-admin.php','/api.v1.php','/filehandeler.php','/core/DbCreds.php','/editor/editor.js','/plugin-asset.php','/php/demo.php','/sipl/demo.sipl','/sql/schema.sql']as$path){
                    $this->check($demo->request($path,['Operation'=>'Update','KEY'=>'BlockSave'],true,$headers)['status']===403,$backend.' plugin service rejects forged write '.$path);
                    $this->check($demo->request($path,null,true,$headers)['status']===403,$backend.' plugin service denies private route '.$path);
                }
                $this->check($dump()===$before,$backend.' forged demo HTTP requests leave the entire database unchanged');
                $disabled=$admins[$backend]->request('/delegate-admin.php',['KEY'=>'DisablePlugin','plugin'=>'editor-demo']);$this->check($disabled['status']===200&&$demo->request('/cms/sample/canvas',null,true,$headers)['status']===403,$backend.' disable immediately closes the running demo');
                $admins[$backend]->request('/delegate-admin.php',['KEY'=>'EnablePlugin','plugin'=>'editor-demo']);
                if($backend==='sipl'){proc_terminate($process);foreach($this->processes as$i=>[$p,$unused])if($p===$process){proc_close($p);unset($this->processes[$i]);}}
                else{$this->docker(['rm','-f',$server]);$this->containers=array_values(array_diff($this->containers,[$server]));}
            }
        };
        $run('installed');
        $sourceBlock=$this->sql("SELECT block_id FROM si_plugin_pages WHERE tenant='".$tenant."' AND plugin='editor-demo' AND page_key='source'");
        $edits=[];foreach(['dev','test','live','rollback']as$level)$edits[]='`'.$level.'-html`=CONCAT(`'.$level."-html`,'<p id=\"cms_custom_demo_note\">Kept after CMS update</p>')";
        $this->sql('UPDATE blocks SET '.implode(',',$edits).' WHERE id=UNHEX(\''.$sourceBlock.'\')');
        $protected=[$this->site.'/core/editor-demo.local.json'];
        foreach(new RecursiveIteratorIterator(new RecursiveDirectoryIterator($this->site.'/'.$package,FilesystemIterator::SKIP_DOTS))as$file)if($file->isFile())$protected[]=$file->getPathname();
        $hashes=[];foreach($protected as$file)$hashes[$file]=hash_file('sha256',$file);
        foreach($this->processes as[$process,$pipes]){if(proc_get_status($process)['running'])proc_terminate($process);foreach($pipes as$pipe)if(is_resource($pipe))fclose($pipe);proc_close($process);}$this->processes=[];
        $this->docker(['stop',$this->name.'-web']);
        $before=$dump();
        foreach(['core_sipl/src/Server.sipl','core_sipl/src/Render.sipl','core_sipl/src/Assets.sipl','core_sipl/src/Page.sipl','core_sipl/src/Library.sipl','core/Page.php','core/Admin.php','core/Database.php','scripts/page.js','style/page.css','style/libraries.css','editor/editor.js']as$name)Package::write($this->site.'/'.$name,$this->run(['git','show','HEAD:'.$name]));
        $this->test('demo-native-cms-update',[$runtime,'run',$this->site.'/packaging/Package.sipl','upgrade',$this->root.'/dist/SuperIntuitive-sipl.zip','--target',$this->site,'--apply']);
        $this->test('demo-php-cms-update',[PHP_BINARY,'-d','extension_dir='.ini_get('extension_dir'),'-d','extension=zip',$this->site.'/packaging/Package.php','upgrade',$this->root.'/dist/SuperIntuitive-php.zip','--target',$this->site,'--apply']);
        foreach($hashes as$file=>$hash)$this->check(hash_file('sha256',$file)===$hash,'CMS update preserves installed demo '.basename($file));
        $this->check($dump()===$before,'CMS updates preserve all demo settings and published Blocks');
        $this->nativeBase=$this->startNative($runtime);$this->docker(['start',$this->name.'-web']);
        $port=substr(strrchr(trim($this->docker(['port',$this->name.'-web','80/tcp'])),':'),1);$this->base='http://127.0.0.1:'.$port;usleep(300000);
        foreach(['php'=>$this->base,'sipl'=>$this->nativeBase]as$backend=>$base){$admin=new FixtureClient($base);$admin->bootstrap('/');$admin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]);$admin->bootstrap('/');$admins[$backend]=$admin;}
        foreach($admins as$backend=>$admin){
            $response=$admin->request('/api.v1.php',['Operation'=>'Update','Entity'=>['Name'=>'blocks','Id'=>'0x'.$sourceBlock,'Attributes'=>['dev-html'=>'<p>ADMIN_ONLY_DEMO_DRAFT</p>']]]);
            $this->check($response['status']===200&&$this->sql("SELECT `dev-html` FROM blocks WHERE id=UNHEX('".$sourceBlock."')")==='<p>ADMIN_ONLY_DEMO_DRAFT</p>',$backend.' administrator editing still persists after the CMS update');
        }
        $run('updated');
        $uninstall=$admins['sipl']->request('/delegate-admin.php',['KEY'=>'UninstallPlugin','plugin'=>'editor-demo']);
        $this->check($uninstall['status']===200,'demo uninstalls through the generic host');
        $this->check($this->sql("SELECT COUNT(*) FROM si_plugin_data WHERE tenant='".$tenant."' AND plugin='editor-demo'")==='1','uninstall preserves demo configuration');
        foreach(['core_sipl/src/DemoPolicy.sipl','core_sipl/src/Sample.sipl','editor/sample-mode.js','editor/sample-prelude.js']as$name)$this->check(!file_exists($this->site.'/'.$name),'demo plugin does not add core file '.$name);
    }
    public function httpPlugins(bool $syntax=false): void {
        $guest=new FixtureClient($this->base); $guest->bootstrap();
        $response=$guest->request('/plugin-asset.php?plugin=legacy&file=image.png'); $this->check($response['status']===200 && $response['text']==='PNG fixture','PHP legacy inert asset loads');
        $response=$guest->request('/contact-form'); $this->check($response['status']===200 && str_contains($response['text'],'Let&rsquo;s talk.'),'PHP SQL form renders');
        $data=['KEY'=>'PluginAction','plugin'=>'contact','action'=>'submit','name'=>'HTTP sender','email'=>'http@example.test','subject'=>'PHP HTTP','message'=>'Saved through PHP'];
        $this->check($guest->request('/delegate.php',$data,false)['status']===403,'PHP action requires CSRF');
        $response=$guest->request('/delegate.php',$data); $this->check($response['status']===200 && $response['value']['submitted'],'PHP generic action dispatch works');
        $data+=['topic'=>'SIPL','submission'=>bin2hex(random_bytes(16))]; unset($data['subject']); $data['email']='status-php@example.test';
        $response=$guest->request('/delegate.php',$data); $receipt=$response['value']['CONTACTSENT']; $this->check($response['status']===200,'PHP topic/token submission succeeds');
        $this->check($guest->request('/delegate.php',$data)['value']['CONTACTSENT']===$receipt,'PHP retries preserve receipt');
        $this->check($guest->request('/delegate.php',array_replace($data,['message'=>'changed']))['status']===409,'PHP conflicting token returns 409');
        $response=$guest->request('/delegate.php',array_replace($data,['topic'=>'unknown'])); $this->check($response['status']===400 && $response['value']['field']==='topic','PHP validation returns HTTP 400 and field');
        $this->check($guest->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'contact','action'=>'update','id'=>$receipt['id'],'state'=>'read'])['status']===403,'PHP guest cannot change message state');
        $this->check($guest->request('/admin/contact')['status']===403,'PHP guest cannot view inbox');
        $this->check($guest->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'contact','action'=>'inbox'])['status']===403,'PHP guest cannot read inbox action');
        foreach (['/plugins/installed/example/php/main.php','/plugins/installed/example/sipl/main.sipl','/plugins/installed/example/sql/schema.sql','/core/plugin-schema.sql','/core/plugin-packages/contact/install.json','/plugin-packages/contact/php/contact.php'] as $path) $this->check($guest->request($path)['status']===403,'PHP source blocked '.$path);
        $admin=new FixtureClient($this->base); $admin->bootstrap(); $response=$admin->request('/delegate.php',['KEY'=>'LoginAttempt','email'=>'admin@example.test','password'=>$this->adminPassword]); $this->check($response['status']===200 && isset($response['value']['REFRESH']),'PHP administrator authenticates'); $admin->bootstrap();
        $this->check($admin->request('/admin/contact')['status']===200,'PHP Admin inbox renders');
        $response=$admin->request('/delegate.php',['KEY'=>'PluginAction','plugin'=>'contact','action'=>'inbox']); $this->check($response['status']===200 && count($response['value']['messages'])>=3,'PHP Admin reads shared inbox');
        $response=$admin->request('/delegate-admin.php',['KEY'=>'PluginAction','plugin'=>'contact','action'=>'update','id'=>$receipt['id'],'state'=>'read']); $this->check($response['value']['CONTACTMESSAGEUPDATED']['state']==='read','PHP Admin marks read');
        $this->check($admin->request('/delegate.php',['KEY'=>'ChangeDeployment','Deployment'=>'dev'])['status']===200,'PHP Admin enters Dev');
        $this->check($admin->request('/delegate-admin.php',['KEY'=>'DisablePlugin','plugin'=>'contact'])['status']===200,'PHP Admin disables plugin');
        $this->check($guest->request('/delegate.php',$data)['status']>=400,'PHP disabled action fails');
        $this->check($guest->request('/contact-form')['status']===403,'PHP disabled page fails');
        $this->check($admin->request('/delegate-admin.php',['KEY'=>'EnablePlugin','plugin'=>'contact'])['status']===200,'PHP Admin enables plugin');
        $this->check(str_contains($guest->request('/scripts/plugins.js')['text'],'SIContact'),'PHP plugin assets remain bundled');
        if ($syntax) {
            $editor=$admin->request('/editor/editor.js'); Package::write($this->folder.'/editor.js',$editor['text']);
            $this->test('php-editor-syntax',['node','--check',$this->folder.'/editor.js']);
        }
    }
    public function apache(): void {
        $this->extract($this->root.'/dist/SuperIntuitive-php.zip'); $this->extract($this->root.'/dist/SuperIntuitive-sipl.zip');
        copy($this->root.'/core_sipl/.htaccess',$this->site.'/core_sipl/.htaccess');
        Package::write($this->site.'/core_sipl/config.local.json','PRIVATE NATIVE CONFIG SENTINEL');
        $web=$this->name.'-apache'; $this->docker(['run','-d','--name',$web,'--entrypoint','apache2-foreground','-p','127.0.0.1::80','-v',$this->site.':/var/www/html','superintuitive-security-check']); $this->containers[]=$web;
        $port=substr(strrchr(trim($this->docker(['port',$web,'80/tcp'])),':'),1); $client=new FixtureClient('http://127.0.0.1:'.$port);
        $deadline=microtime(true)+10;
        do { try { $client->request('/core_sipl/switch.html'); break; } catch (Throwable $error) { usleep(100000); if (microtime(true)>$deadline) throw $error; } } while (true);
        foreach (['switch.html','public/backend-switch.js','public/switch.css'] as $path) $this->check($client->request('/core_sipl/'.$path)['status']===200,'Apache native launcher asset '.$path);
        foreach (['main.sipl','config.local.json','php-baseline.json','generated/editor.js.tmpl','src/Plugins.sipl','tests/unit.sipl','tools/runtime_probe.sipl','.htaccess'] as $path) {
            $response=$client->request('/core_sipl/'.$path); $this->check($response['status']===403 && !str_contains($response['text'],'PRIVATE NATIVE CONFIG SENTINEL'),'Apache native source blocked '.$path);
        }
        foreach (['info.conf','install.json','php/contact.php','sipl/contact.sipl','sql/001-contact.sql'] as $path) $this->check($client->request('/plugin-packages/contact/'.$path)['status']===403,'Apache plugin source blocked '.$path);
        foreach (['Package.php','Package.sipl','package.ps1'] as $path) $this->check($client->request('/packaging/'.$path)['status']===403,'Apache offline tool blocked '.$path);
        echo 'Apache isolation checks passed: '.$this->checks.PHP_EOL;
    }
    public function passwords(string $runtime): void {
        $passwords=['Sipl-interop-2026','abcdefghij',str_repeat('é',36),'Quotes-\\-"-日本語'];
        $vectors=[]; foreach ($passwords as $password) $vectors[]=['password'=>$password,'hash'=>password_hash($password,PASSWORD_BCRYPT,['cost'=>10])];
        $source=$this->folder.'/vectors.json'; $target=$this->folder.'/native.json'; Package::write($source,json_encode($vectors,JSON_UNESCAPED_UNICODE));
        $output=$this->test('native-bcrypt',[$runtime,'run',$this->root.'/core_sipl/tests/passwords.sipl',$source,$target]);
        $generated=Package::json($target); foreach ($generated as $row) $this->check(password_verify($row['password'],$row['hash']) && !password_verify('wrong',$row['hash']),'PHP verifies native bcrypt fixture');
        preg_match('/checks passed:\s*(\d+)/',$output,$matches);
        Package::write($this->root.'/core_sipl/password-validation.json',json_encode(['runtimeSha256'=>hash_file('sha256',$runtime),'status'=>'passed','checks'=>(int)$matches[1]+$this->checks,'phpToSipl'=>count($vectors),'siplToPhp'=>count($generated)],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n");
    }
    public function cleanup(): void {
        foreach ($this->processes as [$process,$pipes]) { if (proc_get_status($process)['running']) proc_terminate($process); foreach ($pipes as $pipe) if (is_resource($pipe)) fclose($pipe); proc_close($process); }
        foreach (array_reverse($this->containers) as $container) $this->docker(['rm','-f','-v',$container],null,false);
        if ($this->networkCreated) $this->docker(['network','rm',$this->network],null,false);
        Package::remove($this->folder);
    }
}
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '')===__FILE__) {
    $fixture=new Fixture(); $report=['results'=>[]];
    $runtime=getenv('SI_SIPL_RUNTIME') ?: $fixture->root.'/sipl.exe'; $index=array_search('--runtime',$argv,true); if ($index!==false) $runtime=$argv[$index+1] ?? throw new RuntimeException('Runtime path required');
    try {
        if (in_array('--widgets',$argv,true)) $fixture->widgets($runtime);
        elseif (in_array('--language',$argv,true)) $fixture->language($runtime);
        elseif (in_array('--demo',$argv,true)) $fixture->demo($runtime);
        elseif (in_array('--framework',$argv,true)) $fixture->framework($runtime);
        elseif (in_array('--apache',$argv,true)) $fixture->apache();
        elseif (in_array('--passwords',$argv,true)) $fixture->passwords($runtime);
        else $fixture->plugins(in_array('--both',$argv,true),in_array('--browser',$argv,true),$runtime);
        $report['status']='passed';
    }
    catch (Throwable $error) { $report['status']='failed'; $report['error']=$error->getMessage(); fwrite(STDERR,$error->getMessage().PHP_EOL); $status=1; }
    finally {
        $report['results']=$fixture->results; $report['httpChecks']=$fixture->checks; $fixture->cleanup();
        if (!in_array('--apache',$argv,true) && !in_array('--passwords',$argv,true)){
            $report['runtimeSha256']=is_file($runtime)?hash_file('sha256',$runtime):null;
            foreach(['php','sipl']as$edition){$archive=dirname(__DIR__).'/dist/SuperIntuitive-'.$edition.'.zip';if(is_file($archive))$report['archives'][$edition]=hash_file('sha256',$archive);}
            if(in_array('--demo',$argv,true)){$report['scope']='editor-demo-plugin';$report['pluginArchive']=['file'=>'editor-demo.zip','sha256'=>hash_file('sha256',dirname(__DIR__).'/dist/editor-demo.zip')];}
            if(in_array('--widgets',$argv,true))$report['scope']='widget-editor';
            if(in_array('--language',$argv,true))$report['scope']='language-tool';
            file_put_contents(dirname(__DIR__).'/core_sipl/'.((in_array('--framework',$argv,true)||in_array('--demo',$argv,true)||in_array('--widgets',$argv,true)||in_array('--language',$argv,true))?'site-validation.json':'plugin-validation.json'),json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n");
        }
    }
    exit($status ?? 0);
}
