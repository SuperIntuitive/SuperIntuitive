<?php
/** PHP-edition release tools. CLI only; no application configuration is loaded. */
final class Package {
    public string $root;
    public function __construct(?string $root=null) { $this->root=realpath($root ?? dirname(__DIR__)) ?: throw new RuntimeException('Source directory missing'); }
    public static function relative(string $name): string {
        if ($name==='' || str_contains($name,'\\') || str_contains($name,':') || str_starts_with($name,'/')) throw new RuntimeException('Unsafe path: '.$name);
        foreach (explode('/',$name) as $part) if ($part==='' || $part==='.' || $part==='..' || preg_match('/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i',$part)) throw new RuntimeException('Unsafe path: '.$name);
        return $name;
    }
    public static function confined(string $root,string $name): string {
        self::relative($name); $current=$root;
        if (is_link($root)) throw new RuntimeException('Linked root');
        foreach (explode('/',$name) as $part) { $current.='/'.$part; if (is_link($current)) throw new RuntimeException('Linked path: '.$name); }
        return $current;
    }
    public static function directory(string $folder): void { if (!is_dir($folder) && !mkdir($folder,0755,true) && !is_dir($folder)) throw new RuntimeException('Cannot create directory'); }
    public static function remove(string $path): void {
        for ($attempt=0;$attempt<8;$attempt++) {
            clearstatcache(true,$path);
            if (is_link($path) || is_file($path)) { if (@unlink($path)) return; }
            elseif (is_dir($path)) {
                foreach (scandir($path) as $name) if ($name!=='.' && $name!=='..') self::remove($path.'/'.$name);
                if (@rmdir($path)) return;
            } else return;
            // Docker Desktop can release a bind-mounted Windows file shortly
            // after container removal. Retry cleanup without hiding failures.
            usleep(100000);
        }
        throw new RuntimeException('Could not remove temporary path: '.$path);
    }
    public static function write(string $path,string $content): void {
        self::directory(dirname($path)); if (file_put_contents($path,$content)!==strlen($content)) throw new RuntimeException('File write failed: '.$path);
    }
    public static function json(string $file): array { return json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR); }
    public static function excluded(string $name): bool {
        return (bool)preg_match('~(^|/)(\.git|\.vs|\.vscode|\.agents|\.codex|\.aws|__pycache__|node_modules|runtime|backups|downloaded|installed)(/|$)|(^|/)(\.env[^/]*|DbCreds[^/]*|[^/]*cookies\.txt|config[^/]*\.local\.json|setup-config[^/]*|(install|setup)\.(lock|token))$|\.(bak|old|tmp|log|pyc|py)$~i',$name) || $name==='core/test.php';
    }
    public function files(string $relative,bool $shallow=false): array {
        $folder=self::confined($this->root,$relative); $result=[];
        foreach (scandir($folder) as $name) {
            if ($name==='.' || $name==='..') continue;
            $child=$relative.'/'.$name;
            if (self::excluded($child)) continue;
            $file=self::confined($this->root,$child);
            if (is_file($file)) $result[]=$child;
            elseif (is_dir($file) && !$shallow) $result=array_merge($result,$this->files($child));
        }
        sort($result); return $result;
    }
    private static function zip(): ZipArchive {
        if (!class_exists(ZipArchive::class)) throw new RuntimeException('Enable the PHP zip extension (also required by the CMS plugin installer).');
        return new ZipArchive();
    }
    public function build(string $output): string {
        $manifest=self::json($this->root.'/packaging/files.json'); $selected=[];
        foreach (array_merge($manifest['shared'],$manifest['php']) as $selection) {
            $name=$selection['source']; $source=self::confined($this->root,$name);
            if (!file_exists($source)) throw new RuntimeException('Missing package input: '.$name);
            $destination=$selection['destination'] ?? $name;
            $files=is_file($source)?[$name]:$this->files($name,$selection['shallow'] ?? false); $count=0;
            foreach ($files as $file) {
                if (is_dir($source) && !in_array('.'.strtolower(pathinfo($file,PATHINFO_EXTENSION)),$selection['extensions'],true)) continue;
                if (self::excluded($file)) throw new RuntimeException('Private package input: '.$file);
                $target=$destination.substr($file,strlen($name)); self::relative($target);
                if (isset($selected[strtolower($target)])) throw new RuntimeException('Duplicate package destination');
                $selected[strtolower($target)]=['path'=>$target,'source'=>$file]; $count++;
            }
            if (!$count) throw new RuntimeException('Empty required package input: '.$name);
        }
        self::directory($output); $target=$output.'/SuperIntuitive-php.zip'; $temporary=$target.'.'.bin2hex(random_bytes(8)).'.tmp';
        $zip=self::zip(); $records=[];
        try {
            if ($zip->open($temporary,ZipArchive::CREATE|ZipArchive::EXCL)!==true) throw new RuntimeException('Cannot create release ZIP');
            ksort($selected);
            foreach ($selected as $entry) {
                $file=$this->root.'/'.$entry['source']; $relative=$entry['path'];
                if (preg_match('/\.(exe|dll|msi|py|pyc)$/i',$relative)) throw new RuntimeException('Runtime/tool must not be bundled: '.$relative);
                $records[]=['path'=>$relative,'bytes'=>filesize($file),'sha256'=>hash_file('sha256',$file)];
                if (!$zip->addFile($file,'SuperIntuitive/'.$relative)) throw new RuntimeException('ZIP add failed');
            }
            $creds="<?php\nnamespace SuperIntuitive;\nclass DbCreds { }\n";
            $zip->addFromString('SuperIntuitive/core/DbCreds.php',$creds);
            $records[]=['path'=>'core/DbCreds.php','bytes'=>strlen($creds),'sha256'=>hash('sha256',$creds)];
            foreach (array_merge($manifest['directories'],$manifest['phpDirectories']) as $folder) $zip->addEmptyDir('SuperIntuitive/'.self::relative($folder));
            $zip->addFromString('SuperIntuitive/PACKAGE.json',json_encode(['format'=>1,'backend'=>'php','builtAtUtc'=>gmdate('c'),'files'=>$records],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n");
            if (!$zip->close()) throw new RuntimeException('Cannot finalize ZIP');
            $this->verify($temporary,true);
            if (!rename($temporary,$target)) throw new RuntimeException('Cannot publish release ZIP');
        } finally { if (is_file($temporary)) unlink($temporary); }
        echo 'Created '.$target.' SHA256 '.hash_file('sha256',$target).PHP_EOL; return $target;
    }
    public function verify(string $archive,bool $quiet=false): array {
        $zip=self::zip(); if ($zip->open($archive)!==true) throw new RuntimeException('Cannot open release ZIP');
        try {
            $meta=json_decode($zip->getFromName('SuperIntuitive/PACKAGE.json'),true,512,JSON_THROW_ON_ERROR);
            if ($meta['format']!==1 || $meta['backend']!=='php') throw new RuntimeException('Expected a PHP release');
            $seen=[];
            foreach ($meta['files'] as $record) {
                $name=self::relative($record['path']); $key=strtolower($name);
                if (isset($seen[$key])) throw new RuntimeException('Duplicate release path'); $seen[$key]=true;
                $content=$zip->getFromName('SuperIntuitive/'.$name);
                if (!is_string($content) || strlen($content)!==$record['bytes'] || !hash_equals($record['sha256'],hash('sha256',$content))) throw new RuntimeException('Release checksum mismatch: '.$name);
                if (preg_match('/\.(py|pyc|exe|dll|msi)$/i',$name) || str_starts_with($name,'core_sipl/')) throw new RuntimeException('Foreign runtime/source in PHP release');
            }
            for ($i=0;$i<$zip->numFiles;$i++) {
                $name=$zip->getNameIndex($i); if (!str_starts_with($name,'SuperIntuitive/')) throw new RuntimeException('Unsafe archive root');
                $relative=substr($name,15); if ($relative==='') continue;
                if (str_ends_with($relative,'/')) { self::relative(substr($relative,0,-1)); continue; }
                self::relative($relative); if ($relative!=='PACKAGE.json' && !isset($seen[strtolower($relative)])) throw new RuntimeException('Unlisted release file');
            }
            foreach (['core/Plugins.php','core/Tools.php','core/plugin-schema.sql','packaging/Package.php','editor/media/data/js_methods.js'] as $required) if (!isset($seen[strtolower($required)])) throw new RuntimeException('Incomplete release: '.$required);
            if (!$quiet) echo 'PASS PHP release hashes, paths, file list and native tooling'.PHP_EOL; return $meta;
        } finally { $zip->close(); }
    }
    public function contact(string $output): void {
        $this->plugin('contact',$output);
    }
    public function plugin(string $id,string $output): void {
        if(!preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/D',$id))throw new RuntimeException('Invalid plugin ID');
        $base='plugin-packages/'.$id; $manifest=self::json($this->root.'/'.$base.'/install.json'); $info=[];
        if(($manifest['id']??'')!==$id)throw new RuntimeException('Manifest plugin ID mismatch');
        foreach (file($this->root.'/'.$base.'/info.conf',FILE_IGNORE_NEW_LINES) as $line) if (str_contains($line,':')) { [$key,$value]=explode(':',$line,2); $info[$key]=$value; }
        foreach (['name','version','author','type','shortdesc','longdesc'] as $key) if (empty($info[$key])) throw new RuntimeException('Missing info.conf field: '.$key);
        if ($info['version']!==$manifest['version']) throw new RuntimeException('Manifest version mismatch');
        self::directory(dirname($output)); $temporary=$output.'.'.bin2hex(random_bytes(8)).'.tmp'; $zip=self::zip();
        try {
            if ($zip->open($temporary,ZipArchive::CREATE|ZipArchive::EXCL)!==true) throw new RuntimeException('Cannot create plugin ZIP');
            foreach ($this->files($base) as $file) $zip->addFile($this->root.'/'.$file,substr($file,strlen($base)+1));
            if (!$zip->close() || !rename($temporary,$output)) throw new RuntimeException('Cannot publish plugin ZIP');
        } finally { if (is_file($temporary)) unlink($temporary); }
        echo $output.PHP_EOL;
    }
    public static function protected(string $relative): bool {
        $parts=explode('/',self::relative($relative)); $name=strtolower(end($parts));
        foreach ($parts as $part) if (str_starts_with($part,'.')) return true;
        return in_array($parts[0],['domains','plugins','logs','lib','sql','dist'],true) || preg_match('/^(dbcreds|config\.local|setup-config)/',$name) || str_contains($name,'.local.') || in_array($name,['install.lock','setup.lock','setup.token','docker-compose.yml','dockerfile','readme.txt'],true) || preg_match('~^(core/(plugin-packages|plugin-requests|upgrade-backups|setup/domaintemplate)|core_sipl/runtime|docker)/~',$relative);
    }
    public function upgrade(string $archive,string $target,bool $apply): array {
        $this->verify($archive,true); $root=realpath($target);
        if (!$root || !is_dir($root) || is_link($target)) throw new RuntimeException('Target must be an existing regular site directory');
        $zip=self::zip(); $zip->open($archive); $plan=[]; $journal=[]; $backup='';
        try {
            $meta=json_decode($zip->getFromName('SuperIntuitive/PACKAGE.json'),true,512,JSON_THROW_ON_ERROR);
            foreach ($meta['files'] as $record) {
                $name=$record['path']; if (self::protected($name)) continue;
                $file=self::confined($root,$name);
                if (file_exists($file) && !is_file($file)) throw new RuntimeException('Upgrade file conflicts with directory');
                if (is_file($file) && hash_file('sha256',$file)===$record['sha256']) continue;
                $plan[]=$name;
            }
            if (!$apply) return ['applied'=>false,'files'=>$plan,'preserved'=>'configuration, media, plugins, CMS data and server configuration'];
            $backup='core/upgrade-backups/'.bin2hex(random_bytes(12)); self::directory(self::confined($root,$backup));
            try {
                foreach ($plan as $name) {
                    $file=self::confined($root,$name); self::directory(dirname($file)); $old=null;
                    if (is_file($file)) { $old=self::confined($root,$backup.'/'.$name); self::directory(dirname($old)); if (!copy($file,$old) || !chmod($old,fileperms($file)&0777)) throw new RuntimeException('Backup failed'); }
                    $staged=tempnam(dirname($file),'.upgrade-');
                    try {
                        self::write($staged,$zip->getFromName('SuperIntuitive/'.$name)); chmod($staged,is_file($file)?fileperms($file)&0777:0644);
                        if (!rename($staged,$file)) throw new RuntimeException('Replacement failed'); $journal[]=[$file,$old];
                    } finally { if (is_file($staged)) unlink($staged); }
                }
            } catch (Throwable $error) {
                foreach (array_reverse($journal) as [$file,$old]) { if ($old!==null) copy($old,$file); else unlink($file); }
                throw $error;
            }
            self::write($root.'/'.$backup.'/journal.json',json_encode(['files'=>$plan],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES));
            return ['applied'=>true,'files'=>count($plan),'backup'=>$root.'/'.$backup];
        } finally { $zip->close(); }
    }
    private static function seedTokens(string $line): array {
        $result=[]; $index=1; $length=strlen($line);
        while ($index<$length) {
            while ($index<$length && ctype_space($line[$index])) $index++;
            if ($index===$length || $line[$index]===')') break;
            $start=$index;
            if ($line[$index]==="'") {
                $index++;
                while ($index<$length) {
                    if ($line[$index]==='\\') { $index+=2; continue; }
                    if ($line[$index++]==="'") break;
                }
            } else { while ($index<$length && $line[$index]!==',' && $line[$index]!==')') $index++; }
            $value=rtrim(substr($line,$start,$index-$start)); $result[]=[$value,$start];
            while ($index<$length && ctype_space($line[$index])) $index++;
            if ($index<$length && $line[$index]===',') $index++;
            elseif ($index<$length && $line[$index]!==')') throw new RuntimeException('Unexpected SQL value separator');
        }
        return $result;
    }
    public function theme(): void {
        $folder=$this->root.'/core/setup/default-theme/'; $read=fn($name)=>trim(file_get_contents($folder.$name));
        [$header,$home,$footer,$css,$script]=array_map($read,['header.html','home.html','footer.html','site.css','site.js']);
        $blocks=['_SI_GUID_5'=>[$header,$css,$script],'_SI_GUID_6'=>[$home,'',''],'_SI_GUID_2'=>[$footer,'','']];
        $options=json_encode(['tag'=>'div','style'=>['position'=>'relative','width'=>'100%','height'=>'auto']],JSON_UNESCAPED_SLASHES);
        $source=file_get_contents($this->root.'/core/setup/super_intuitive_install.sql'); $table=''; $columns=[]; $updated=[]; $lines=[];
        $quote=fn($value)=>"'".str_replace(['\\',"'","\r","\n"],['\\\\',"\\'",'\\r','\\n'],$value)."'";
        $patch=function($line,$values) use(&$columns,$quote) {
            $tokens=self::seedTokens($line);
            if (count($tokens)!==count($columns)) throw new RuntimeException('Unexpected seed row shape');
            $changes=[]; foreach ($values as $key=>$value) { $index=array_search($key,$columns,true); if ($index===false) throw new RuntimeException('Unknown seed column'); $changes[$index]=$quote($value); }
            krsort($changes); foreach ($changes as $index=>$value) { [$token,$offset]=$tokens[$index]; $line=substr_replace($line,$value,$offset,strlen($token)); } return $line;
        };
        foreach (explode("\n",$source) as $line) {
            if (preg_match('/^INSERT INTO `(\w+)`/',$line,$m)) { $table=$m[1]; preg_match_all('/`([^`]+)`/',$line,$m); $columns=array_slice($m[1],1); }
            if ($table==='blocks' && str_starts_with($line,'(')) {
                $guid=substr($line,1,strpos($line,',')-1); $values=[];
                foreach (['live','test','dev','rollback'] as $stage) {
                    if (isset($blocks[$guid])) { [$html,$style,$behavior]=$blocks[$guid]; $values+=[$stage.'-html'=>$html,$stage.'-style'=>$style,$stage.'-script'=>$behavior,$stage.'-options'=>$options]; }
                    elseif ($guid==='_SI_GUID_8') $values+=[$stage.'-style'=>$read('login.css'),$stage.'-script'=>$read('login.js')];
                }
                if ($values) { $line=$patch($line,$values); $updated[$guid]=true; }
            } elseif ($table==='relations' && str_starts_with($line,'(')) {
                $tokens=self::seedTokens($line);
                if (count($tokens)===count($columns)) {
                    $row=array_combine($columns,array_column($tokens,0));
                    if ($row['parent_id']==='_SI_GUID_40' && isset($blocks[$row['child_id']])) {
                        $value=json_encode(['tag'=>'div','style'=>['position'=>'relative','width'=>'100%','height'=>'auto'],'options'=>[]],JSON_UNESCAPED_SLASHES);
                        $line=$patch($line,['live-options'=>$value,'test-options'=>$value,'dev-options'=>$value]);
                    }
                }
            } elseif ($table==='pages' && str_starts_with($line,'(_SI_GUID_40,')) $line=str_replace('#101827','#0b1120',$line);
            $lines[]=$line;
        }
        if (count($updated)!==4) throw new RuntimeException('Missing theme blocks');
        self::write($this->root.'/core/setup/super_intuitive_install.sql',implode("\n",$lines));
        $preview="<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"theme-color\" content=\"#0b1120\">\n<meta name=\"description\" content=\"Super Intuitive: a visual workspace for building your own website.\">\n<title>Super Intuitive — Visual website platform</title>\n<style>\n".$css."\n</style>\n</head>\n<body class=\"si-home\" data-si-preview>\n";
        foreach (['Header'=>$header,'Menu'=>$home,'Footer'=>$footer] as $name=>$html) $preview.='<div id="si_block_'.$name.'" class="si-block">'.$html."</div>\n";
        self::write($this->root.'/default-page-preview.html',$preview."<script>\n".$script."\n</script>\n</body>\n</html>\n"); echo "Updated installer theme and preview\n";
    }
    public static function main(array $args): void {
        $command=array_shift($args) ?? 'help'; $options=[]; $positional=[];
        for ($i=0;$i<count($args);$i++) { if (str_starts_with($args[$i],'--')) { $name=substr($args[$i],2); $options[$name]=$name==='apply'?true:($args[++$i] ?? throw new RuntimeException('Missing option value')); } else $positional[]=$args[$i]; }
        $tool=new self($options['root'] ?? null);
        switch ($command) {
            case 'build': $tool->build($options['output'] ?? $tool->root.'/dist'); break;
            case 'contact': $tool->contact($options['output'] ?? $tool->root.'/dist/contact.zip'); break;
            case 'plugin': $id=$positional[0]??throw new RuntimeException('Plugin ID required');$tool->plugin($id,$options['output']??$tool->root.'/dist/'.$id.'.zip');break;
            case 'theme': $tool->theme(); break;
            case 'verify': $tool->verify($positional[0] ?? $tool->root.'/dist/SuperIntuitive-php.zip'); break;
            case 'upgrade': echo json_encode($tool->upgrade($positional[0] ?? throw new RuntimeException('Release ZIP required'),$options['target'] ?? throw new RuntimeException('--target required'),isset($options['apply'])),JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL; break;
            default: echo "PHP edition: php packaging/Package.php build|contact|plugin ID|theme|verify|upgrade [ZIP] [--root DIR] [--output PATH] [--target DIR] [--apply]\n";
        }
    }
}
if (PHP_SAPI!=='cli') { http_response_code(403); exit; }
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '')===__FILE__) {
    try { Package::main(array_slice($argv,1)); } catch (Throwable $error) { fwrite(STDERR,$error->getMessage().PHP_EOL); exit(1); }
}
