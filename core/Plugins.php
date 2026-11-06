<?php
namespace SuperIntuitive; 
Tools::Autoload();
class Plugins {
	private $pluginRepoHost = 'plugins.superintuitive.net';
	private $zipMagicHeaders = array('504b0304', '504b0506', '504b0708');
	

	public function __construct(){
		$plugdir = $_SERVER["DOCUMENT_ROOT"] . "/plugins";
		if (!is_dir($plugdir)) {
			mkdir($plugdir,0755,true);
		}

		$dwnlddir = $_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded";
		if (!is_dir($dwnlddir)) {
			mkdir($dwnlddir,0755,true);
		}

		$instdir = $_SERVER["DOCUMENT_ROOT"] . "/plugins/installed";
		if (!is_dir($instdir)) {
			mkdir($instdir,0755,true);
		}			
			
	}
	
	public function __destruct(){

    }
    
    public function GetLocalPlugins($status){
		if($status ==='downloaded'){
			$files = array();
			$plugins = glob($_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded/*.zip");
			foreach($plugins as &$v){
				$v = basename ( $v );
			}
			return $plugins;
		}
        else if ($status === 'installed') { return PluginManager::current()->ids(); }
    }

	private function SetPluginError($message, $key = 'ERROR'){
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'][$key] = $message;
		return false;
	}
	private function RequirePluginStoreAccess(){
		if(!Tools::CanAccessPluginStore()){
			return $this->SetPluginError('Plugin management is only available to logged-in admins while the site is in dev deployment.');
		}

		return true;
	}
	private function NormalizePluginName($plugin){
		$plugin = basename(str_replace('\\', '/', trim((string)$plugin)));
		if(Tools::EndsWith(strtolower($plugin), '.zip')){
			$plugin = substr($plugin, 0, -4);
		}

		if($plugin === '' || preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/', $plugin) !== 1){
			return null;
		}

		return $plugin;
	}
	private function ResolveDownloadRequest($appname){
		$appname = trim((string)$appname);
		if($appname === ''){
			return null;
		}

		$filename = basename(str_replace('\\', '/', $appname));
		$url = null;
		$parsed = parse_url($appname);
		if($parsed !== false && !empty($parsed['scheme'])){
			$scheme = strtolower($parsed['scheme']);
			$host = strtolower($parsed['host'] ?? '');
			if($scheme !== 'https' || $host !== $this->pluginRepoHost
				|| isset($parsed['user']) || isset($parsed['pass'])
				|| (isset($parsed['port']) && $parsed['port'] !== 443)){
				return null;
			}
			$filename = basename((string)($parsed['path'] ?? ''));
			$url = $appname;
		}

		$filename = basename(str_replace('\\', '/', $filename));
		if(!Tools::EndsWith(strtolower($filename), '.zip')){
			$filename .= '.zip';
		}

		$plugin = $this->NormalizePluginName($filename);
		if($plugin === null){
			return null;
		}

		$filename = $plugin.'.zip';
		if($url === null){
			$url = 'https://'.$this->pluginRepoHost.'/plugins/'.rawurlencode($filename);
		}

		return array(
			'plugin' => $plugin,
			'filename' => $filename,
			'url' => $url,
		);
	}
	private function IsSafeArchiveEntry($entryName){
		if(!is_string($entryName) || $entryName === '' || strpos($entryName, "\0") !== false){
			return false;
		}

		$entryName = str_replace('\\', '/', $entryName);
		if(substr($entryName, 0, 1) === '/' || preg_match('/^[A-Za-z]:\//', $entryName) === 1){
			return false;
		}

		$parts = explode('/', $entryName);
		foreach($parts as $part){
			if($part === '..'){
				return false;
			}
		}

		return true;
	}
	private function ArchiveIsSafe($zip){
		for($index = 0; $index < $zip->numFiles; $index++){
			$entryName = $zip->getNameIndex($index);
			if(!$this->IsSafeArchiveEntry($entryName)){
				return false;
			}
		}

		return true;
	}
	private function UploadErrorMessage($errorCode){
		switch((int)$errorCode){
			case UPLOAD_ERR_OK:
				return null;
			case UPLOAD_ERR_INI_SIZE:
			case UPLOAD_ERR_FORM_SIZE:
				return 'The uploaded plugin zip exceeds the server upload size limit.';
			case UPLOAD_ERR_PARTIAL:
				return 'The uploaded plugin zip was only partially received.';
			case UPLOAD_ERR_NO_FILE:
				return 'Select a plugin zip file to upload.';
			default:
				return 'The plugin zip could not be uploaded.';
		}
	}
	private function LooksLikeZipFile($tmpPath){
		if(!is_file($tmpPath) || !is_readable($tmpPath)){
			return false;
		}

		$signature = @file_get_contents($tmpPath, false, null, 0, 4);
		if($signature === false || strlen($signature) < 4){
			return false;
		}

		return in_array(bin2hex($signature), $this->zipMagicHeaders, true);
	}

	public function GetMorePlugins(){
		if(!$this->RequirePluginStoreAccess()){
			return false;
		}
		
		//Go to the si plugin repo and get the Plugins
		//TODO add paging and a tracker so this can be fired when the repo is opened and if the user scrolls down the repo
		$plugins = file_get_contents('https://plugins.superintuitive.net?');
		if($plugins === false){
			return $this->SetPluginError('Unable to reach the plugin repository right now.');
		}

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['MOREPLUGINS']= $plugins;

	}

	public function DownloadPlugin($post){
		if(!$this->RequirePluginStoreAccess()){
			return false;
		}
	    if(isset( $post['appname'])){
			set_time_limit(0);
			$download = $this->ResolveDownloadRequest($post['appname']);
			if($download === null){
				return $this->SetPluginError('Invalid plugin package request.');
			}

			$fname = $download['filename'];
			$url = $download['url'];
			$path = $_SERVER["DOCUMENT_ROOT"] . '/plugins/downloaded/'.$fname;
			$file = fopen($path, 'w+b');
			if($file === false){
				return $this->SetPluginError('Unable to create the downloaded plugin package.');
			}
			Tools::Log($path );
			$curl = curl_init();

			// Update as of PHP 5.4 array() can be written []
			curl_setopt_array($curl, [
				CURLOPT_URL            => $url,
				CURLOPT_RETURNTRANSFER => 1,
				CURLOPT_FILE           => $file,
				CURLOPT_FOLLOWLOCATION => false,
				CURLOPT_TIMEOUT        => 50,
				CURLOPT_SSL_VERIFYPEER => true,
				CURLOPT_SSL_VERIFYHOST => 2,
				CURLOPT_USERAGENT      => 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)'
			]);

			Tools::Log("Getting the $fname zipfile");
			$response = curl_exec($curl);
			$httpCode = (int)curl_getinfo($curl, CURLINFO_HTTP_CODE);

			if($response === false) {
				Tools::Log("FAILED to get the plugin ".curl_error($curl));
				fclose($file);
				curl_close($curl);
				@unlink($path);
				return $this->SetPluginError('Unable to download the requested plugin package.');
			}
			if($httpCode < 200 || $httpCode >= 300){
				fclose($file);
				curl_close($curl);
				@unlink($path);
				return $this->SetPluginError('The plugin repository did not accept the download request.');
			}

			fclose($file);
			curl_close($curl);

			//Tools::Log($response); // Do something with the response.
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['DOWNLOADEDPLUGIN']= $fname;
		}else{
			return $this->SetPluginError('No plugin package was specified.');
		}
	}
	public function UploadPluginPackage($post){
		if(!$this->RequirePluginStoreAccess()){
			return false;
		}

		if(empty($_FILES['pluginzip']) || !is_array($_FILES['pluginzip'])){
			return $this->SetPluginError('Select a plugin zip file to upload.');
		}

		$file = $_FILES['pluginzip'];
		$error = $this->UploadErrorMessage($file['error'] ?? UPLOAD_ERR_NO_FILE);
		if($error !== null){
			return $this->SetPluginError($error);
		}

		if(empty($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])){
			return $this->SetPluginError('The uploaded plugin package could not be verified.');
		}

		$originalName = basename((string)($file['name'] ?? ''));
		if(!Tools::EndsWith(strtolower($originalName), '.zip')){
			return $this->SetPluginError('Plugin packages must be uploaded as .zip files.');
		}

		$plugin = $this->NormalizePluginName($originalName);
		if($plugin === null){
			return $this->SetPluginError('Plugin zip filenames may only use letters, numbers, dashes, and underscores.');
		}

		if(!$this->LooksLikeZipFile($file['tmp_name'])){
			return $this->SetPluginError('The uploaded file is not a valid zip archive.');
		}

		$filename = $plugin.'.zip';
		$targetPath = $_SERVER["DOCUMENT_ROOT"].'/plugins/downloaded/'.$filename;
		if(!@move_uploaded_file($file['tmp_name'], $targetPath)){
			return $this->SetPluginError('The plugin package could not be saved to the server.');
		}
		@chmod($targetPath, 0644);

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['DOWNLOADEDPLUGIN'] = $filename;
		return true;
	}

    private function Managed($action, $post) {
        if (!$this->RequirePluginStoreAccess()) return false;
        try {
            $manager = PluginManager::current();
            $id = PluginManifest::name($post['plugin'] ?? '');
            if (in_array($action, ['InstallPlugin','UpdatePlugin'], true)) $result = $manager->install($id, $_SERVER['DOCUMENT_ROOT'].'/plugins/downloaded/'.$id.'.zip');
            else $result = $manager->lifecycle($id, $action);
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = $result;
            return true;
        } catch (\Throwable $e) { return $this->SetPluginError($e->getMessage()); }
    }
    public function InstallPlugin($post) { return $this->Managed('InstallPlugin', $post); }
    public function UpdatePlugin($post) { return $this->Managed('UpdatePlugin', $post); }
    public function EnablePlugin($post) { return $this->Managed('EnablePlugin', $post); }
    public function DisablePlugin($post) { return $this->Managed('DisablePlugin', $post); }
    public function UninstallPlugin($post) { return $this->Managed('UninstallPlugin', $post); }
    public function Action($post) {
        try {
            if (!Tools::UserHasRole('Admin') && !RateLimit::RequireAllowance('plugin-action:'.SI_DOMAIN_NAME.':'.SI_SUBDOMAIN_NAME,60,300)) {
                $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']=['ERROR'=>'RATE_LIMITED']; return;
            }
            $result = PluginManager::current()->action($post['plugin'] ?? '', $post['action'] ?? '', $post); }
        catch (\Throwable $e) { $code=preg_match('/^[A-Z0-9_]+$/D',$e->getMessage()) ? $e->getMessage() : 'PLUGIN_HANDLER_FAILED'; http_response_code($code==='FORBIDDEN'?403:400); $result=['ERROR'=>$code]; }
        if (isset($result['__httpStatus'])) {
            if (in_array($result['__httpStatus'],[400,403,404,409,429,500,503],true)) http_response_code($result['__httpStatus']);
            unset($result['__httpStatus']);
        }
        $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = $result;
    }
    public function EditorData() {
        $manager=PluginManager::current(); $data=[];
        foreach ($manager->ids() as $id) {
            $data[$id]=['scripts'=>[], 'styles'=>[], 'enabled'=>$manager->enabled($id), 'pages'=>[]];
            foreach ($manager->navigation() as $page) if ($page['plugin']===$id) $data[$id]['pages'][]=$page;
            foreach (['script'=>'scripts','style'=>'styles'] as $kind=>$field) foreach (self::SourceFiles($manager->package($id),$kind,'dev') as $file) $data[$id][$field][pathinfo($file, PATHINFO_FILENAME)]=file_get_contents($file);
        }
        return $data;
    }
    public static function SourceFiles($root,$kind,$level) {
        $extension=$kind==='style'?'css':'js'; $folders=$kind==='style'?['styles','css']:['scripts','js'];$files=[];
        foreach ($folders as $folder) {
            $variants=[];
            foreach (glob($root.'/'.$folder.'/*.'.$extension) ?: [] as $file) {
                $base=preg_replace('/-min(?=\.(?:js|css)$)/i','',basename($file));
                $variant=preg_match('/-min\.(?:js|css)$/i',$file)?'min':'normal';$variants[$base][$variant]=$file;
            }
            foreach ($variants as $options) $files[]=$level==='dev'?($options['normal']??$options['min']):($options['min']??$options['normal']);
        }
        sort($files);return $files;
    }
    public static function Bundle($kind) {
        $manager=PluginManager::current();$combined='';$level=Tools::GetCurrentDeployment();
        foreach ($manager->ids() as $id) if ($manager->enabled($id)) {
            try { $manager->manifest($id); } catch (\Throwable $e) { continue; }
            foreach (self::SourceFiles($manager->package($id),$kind,$level) as $file) {
                $source=file_get_contents($file);if (strpos($source,'<?')!==false) continue;
                if ($kind==='style') {
                    $folder=basename(dirname($file));
                    $source=preg_replace_callback('~url\(\s*([\"\']?)([^)\"\']+)\1\s*\)~i',function($match) use($id,$folder) {
                        $target=trim($match[2]);if (preg_match('~^(?:/|#|[A-Za-z][A-Za-z0-9+.-]*:)~',$target)) return $match[0];
                        return 'url("/plugin-asset.php?plugin='.rawurlencode($id).'&file='.rawurlencode(PluginManifest::assetPath($folder,$target)).'")';
                    },$source);
                    $source=(new Deployment())->DeployMediaPaths($source);
                }
                $combined.="\n/*__PLUGIN=".$id." */\n".$source."\n";
            }
        }
        return $combined;
    }
}

/** install.json extends the original components manifest; info.conf remains metadata. */
class PluginManifest {
    public static function name($value) {
        if (!is_string($value) || !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/D', $value)) throw new \RuntimeException('INVALID_PLUGIN_NAME');
        return $value;
    }
    public static function relative($value) {
        if (!is_string($value) || !preg_match('~^[A-Za-z0-9_-]+(?:[./][A-Za-z0-9_-]+)*$~D', $value) || strpos($value, '..') !== false) throw new \RuntimeException('UNSAFE_PLUGIN_PATH');
        return $value;
    }
    public static function assetPath($folder,$target) {
        $parts=[];
        foreach (explode('/',$folder.'/'.$target) as $part) {
            if ($part==='.' || $part==='') continue;
            if ($part==='..') { if (!$parts) throw new \RuntimeException('UNSAFE_PLUGIN_ASSET'); array_pop($parts); }
            else $parts[]=$part;
        }
        return self::relative(implode('/',$parts));
    }
    public static function file($root, $relative) {
        self::relative($relative);
        $real = realpath($root.'/'.$relative);
        if (!$real || !is_file($real) || strpos($real, realpath($root).DIRECTORY_SEPARATOR) !== 0) throw new \RuntimeException('PLUGIN_FILE_MISSING');
        $current = $root;
        foreach (explode('/', $relative) as $part) { $current .= '/'.$part; if (is_link($current)) throw new \RuntimeException('UNSAFE_PLUGIN_PATH'); }
        return $real;
    }
    public static function read($root, $id, $backend = 'php', $activate = false) {
        self::name($id);
        $m = [];
        if (is_file($root.'/install.json')) {
            $source=file_get_contents($root.'/install.json');
            if (!(json_decode($source, false, 64, JSON_THROW_ON_ERROR) instanceof \stdClass)) throw new \RuntimeException('INVALID_PLUGIN_MANIFEST');
            $m = json_decode($source, true, 64, JSON_THROW_ON_ERROR);
            if (!is_array($m)) throw new \RuntimeException('INVALID_PLUGIN_MANIFEST');
        }
        $m += ['id'=>$id, 'version'=>'0.0.0', 'backend'=>[], 'actions'=>[], 'permissions'=>[], 'pages'=>[], 'migrations'=>[]];
        if ($m['id'] !== $id || !is_string($m['version']) || !preg_match('/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9.-]+)?$/D', $m['version'])) throw new \RuntimeException('INVALID_PLUGIN_ID_OR_VERSION');
        foreach (['backend','actions','permissions','pages','migrations'] as $field) if (!is_array($m[$field])) throw new \RuntimeException('INVALID_PLUGIN_MANIFEST');
        $required = !empty($m['backend']['required']) || count($m['actions']) > 0;
        if ($required && empty($m['backend'][$backend])) throw new \RuntimeException('PLUGIN_REQUIRES_'.strtoupper($backend).'_HANDLER');
        if (!empty($m['backend'][$backend])) {
            $entry = $m['backend'][$backend];
            if (!is_string($entry) || strpos($entry, $backend.'/') !== 0 || substr($entry, -strlen('.'.$backend)) !== '.'.$backend) throw new \RuntimeException('INVALID_PLUGIN_HANDLER');
            try { $filename=self::file($root, $entry); }
            catch (\Throwable $e) { throw new \RuntimeException('PLUGIN_REQUIRES_'.strtoupper($backend).'_HANDLER'); }
            if ($backend==='php' && $activate) {
                try { token_get_all(file_get_contents($filename), TOKEN_PARSE); $handler=(static function($path) { return require $path; })($filename); }
                catch (\Throwable $e) { throw new \RuntimeException('INVALID_PLUGIN_PHP_HANDLER'); }
                if (!is_callable($handler)) throw new \RuntimeException('INVALID_PLUGIN_PHP_HANDLER');
            }
        }
        foreach ($m['permissions'] as $permission=>$roles) { self::name($permission); if (!is_array($roles) || !$roles) throw new \RuntimeException('INVALID_PLUGIN_PERMISSION'); foreach ($roles as $role) if (!is_string($role)) throw new \RuntimeException('INVALID_PLUGIN_PERMISSION'); }
        foreach ($m['actions'] as $action=>$rule) {
            self::name($action);
            if (!is_array($rule) || !isset($rule['permission']) || !array_key_exists($rule['permission'], $m['permissions'])) throw new \RuntimeException('INVALID_PLUGIN_ACTION_PERMISSION');
        }
        $keys=[]; $paths=[];
        foreach ($m['pages'] as $page) {
            self::name($page['key'] ?? '');
            if (strlen($page['key'])>64 || isset($keys[$page['key']]) || !isset($page['path']) || !preg_match('~^[A-Za-z0-9_-]+(?:/[A-Za-z0-9_-]+)*$~D', $page['path']) || isset($paths[$page['path']])) throw new \RuntimeException('INVALID_PLUGIN_PAGE');
            $keys[$page['key']]=true; $paths[$page['path']]=true;
            if (isset($page['permission']) && !isset($m['permissions'][$page['permission']])) throw new \RuntimeException('INVALID_PLUGIN_PAGE_PERMISSION');
            foreach (['html'=>'html','style'=>'css','script'=>'js'] as $field=>$folder) if (isset($page[$field])) { if (strpos($page[$field], $folder.'/') !== 0) throw new \RuntimeException('INVALID_PLUGIN_PAGE_SOURCE'); self::file($root, $page[$field]); }
        }
        $seen=[];
        foreach ($m['migrations'] as $migration) {
            self::name($migration['id'] ?? '');
            if (isset($seen[$migration['id']]) || strpos($migration['sql'] ?? '', 'sql/') !== 0) throw new \RuntimeException('INVALID_PLUGIN_MIGRATION');
            $seen[$migration['id']]=true; self::file($root, $migration['sql']);
        }
        return $m;
    }
}

/** The SDK never accepts ownership from action input. */
class PluginStorage {
    private $db, $tenant, $plugin;
    public function __construct($db, $tenant, $plugin) { $this->db=$db; $this->tenant=$tenant; $this->plugin=$plugin; }
    private function key($collection, $id='all') { foreach ([$collection,$id] as $key) if (!is_string($key) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/D',$key)) throw new \RuntimeException('INVALID_STORAGE_KEY'); return ['tenant'=>$this->tenant,'plugin'=>$this->plugin,'collection'=>$collection]; }
    public function put($collection,$id,$value) {
        $p=$this->key($collection,$id)+['id'=>$id,'value'=>json_encode($value,JSON_THROW_ON_ERROR)];
        $s=$this->db->prepare('INSERT INTO si_plugin_data (tenant,plugin,collection,record_id,value) VALUES (:tenant,:plugin,:collection,:id,:value) ON DUPLICATE KEY UPDATE value=VALUES(value)'); $s->execute($p); return $id;
    }
    public function list($collection) {
        $s=$this->db->prepare('SELECT record_id AS id,value,created_at FROM si_plugin_data WHERE tenant=:tenant AND plugin=:plugin AND collection=:collection ORDER BY created_at DESC,record_id LIMIT 200'); $s->execute($this->key($collection));
        $rows=$s->fetchAll(\PDO::FETCH_ASSOC); foreach ($rows as &$row) $row['value']=json_decode($row['value'],true); return $rows;
    }
    public function delete($collection,$id) { $s=$this->db->prepare('DELETE FROM si_plugin_data WHERE tenant=:tenant AND plugin=:plugin AND collection=:collection AND record_id=:id'); $s->execute($this->key($collection,$id)+['id'=>$id]); return $s->rowCount()>0; }

    public function get($collection, $id) {
        $s=$this->db->prepare('SELECT record_id AS id,value,created_at FROM si_plugin_data WHERE tenant=:tenant AND plugin=:plugin AND collection=:collection AND record_id=:id');
        $s->execute($this->key($collection,$id)+['id'=>$id]);
        $row=$s->fetch(\PDO::FETCH_ASSOC);
        if (!$row) return null;
        $row['value']=json_decode($row['value'],true,512,JSON_THROW_ON_ERROR);return $row;
    }
    private function integer($value,$min,$max) {
        if (!is_int($value) || $value<$min || $value>$max) throw new \RuntimeException('INVALID_STORAGE_RANGE');
        return $value;
    }
    public function page($collection,$offset=0,$limit=20) {
        $this->integer($offset,0,100000);$this->integer($limit,1,200);
        $s=$this->db->prepare('SELECT record_id AS id,value,created_at FROM si_plugin_data WHERE tenant=:tenant AND plugin=:plugin AND collection=:collection ORDER BY created_at DESC,record_id DESC LIMIT :limit OFFSET :offset');
        foreach ($this->key($collection) as $key=>$value) $s->bindValue(':'.$key,$value);
        $s->bindValue(':limit',$limit,\PDO::PARAM_INT);$s->bindValue(':offset',$offset,\PDO::PARAM_INT);$s->execute();
        $rows=$s->fetchAll(\PDO::FETCH_ASSOC);foreach ($rows as &$row) $row['value']=json_decode($row['value'],true,512,JSON_THROW_ON_ERROR);return $rows;
    }
    public function count($collection,$seconds=0,$field='', $value=null) {
        $this->integer($seconds,0,86400);
        $p=$this->key($collection);$where='';
        if ($seconds) { $where.=' AND created_at>=DATE_SUB(CURRENT_TIMESTAMP,INTERVAL :seconds SECOND)';$p['seconds']=$seconds; }
        if ($field!=='') {
            if (!is_string($field) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,63}$/D',$field)) throw new \RuntimeException('INVALID_STORAGE_FIELD');
            $where.=" AND BINARY JSON_UNQUOTE(JSON_EXTRACT(value,:field))=BINARY JSON_UNQUOTE(JSON_EXTRACT(:expected,'$')) AND JSON_TYPE(JSON_EXTRACT(value,:fieldType))=JSON_TYPE(JSON_EXTRACT(:expectedType,'$'))";
            $p['field']=$p['fieldType']='$.'.$field;$p['expected']=$p['expectedType']=json_encode($value,JSON_THROW_ON_ERROR);
        }
        $s=$this->db->prepare('SELECT COUNT(*) FROM si_plugin_data WHERE tenant=:tenant AND plugin=:plugin AND collection=:collection'.$where);$s->execute($p);return (int)$s->fetchColumn();
    }
    public function atomic($name,$operation) {
        $this->key('locks',$name);
        $lock='si-plug:'.substr(hash('sha256',$this->tenant.'|'.$this->plugin.'|'.$name),0,56);
        $s=$this->db->prepare('SELECT GET_LOCK(:name,10)');$s->execute(['name'=>$lock]);
        if ((int)$s->fetchColumn()!==1) throw new \RuntimeException('PLUGIN_BUSY');
        try {
            $this->db->beginTransaction();
            try { $result=$operation();$this->db->commit();return $result; }
            catch (\Throwable $error) { $this->db->rollBack();throw $error; }
        } finally { $s=$this->db->prepare('SELECT RELEASE_LOCK(:name)');$s->execute(['name'=>$lock]); }
    }
}

/** Shared SQL state; new packages are immutable, private, and selected per tenant. */
class PluginManager {
    public $db, $root, $tenant, $scopes, $roles;
    public function __construct($db, $root, $scopes, $roles=[]) {
        $this->db=$db; $this->root=$root; $this->scopes=$scopes; $this->roles=$roles;
        $this->tenant=strtolower(preg_replace('/^0x/','',$scopes['blocks'] ?? ''));
        if (!preg_match('/^[a-f0-9]{32}$/D',$this->tenant)) throw new \RuntimeException('SITE_NOT_FOUND');
    }
    public static function current() {
        $db=(new Database())->DBC();
        $s=$db->prepare("SELECT e.name,LOWER(HEX(e.id)) AS id FROM entities e JOIN domains d ON d.id=e.domain_id JOIN subdomains s ON s.id=e.subdomain_id AND s.domain_id=d.id WHERE d.name=:domain AND s.name=:subdomain AND e.status='active' AND d.status='active' AND s.status='active'");
        $s->execute(['domain'=>SI_DOMAIN_NAME,'subdomain'=>SI_SUBDOMAIN_NAME]); $scopes=$s->fetchAll(\PDO::FETCH_KEY_PAIR);
        $roles=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'] ?? [];
        return new self($db,$_SERVER['DOCUMENT_ROOT'],$scopes,$roles);
    }
    public function query($sql,$p=[]) { $s=$this->db->prepare($sql);$s->execute($p);return $s->fetchAll(\PDO::FETCH_ASSOC); }
    public function execute($sql,$p=[]) { $s=$this->db->prepare($sql);$s->execute($p);return $s->rowCount(); }
    public function ready() { return (bool)$this->query("SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='si_plugin_installations'"); }
    public function bootstrap() { foreach (explode(';',file_get_contents($this->root.'/core/plugin-schema.sql')) as $sql) if (trim($sql)!=='') $this->db->exec($sql); }
    public function state($id) { PluginManifest::name($id); if (!$this->ready()) return null; return $this->query('SELECT * FROM si_plugin_installations WHERE tenant=:tenant AND plugin=:plugin',['tenant'=>$this->tenant,'plugin'=>$id])[0] ?? null; }
    public function package($id) {
        $row=$this->state($id);
        if ($row) { PluginManifest::relative($row['package']); return $this->root.'/'.$row['package']; }
        return $this->root.'/plugins/installed/'.PluginManifest::name($id);
    }
    public function enabled($id) { $row=$this->state($id); if ($row) return (bool)$row['installed'] && (bool)$row['enabled']; return is_dir($this->root.'/plugins/installed/'.$id); }
    public function ids() {
        $ids=[];
        foreach (glob($this->root.'/plugins/installed/*',GLOB_ONLYDIR) ?: [] as $dir) if (preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/D',basename($dir))) $ids[]=basename($dir);
        if ($this->ready()) foreach ($this->query('SELECT plugin FROM si_plugin_installations WHERE tenant=:tenant AND installed=1',['tenant'=>$this->tenant]) as $row) $ids[]=$row['plugin'];
        $ids=array_values(array_filter(array_unique($ids),function($id) { $row=$this->state($id); return !$row || (bool)$row['installed']; }));sort($ids);return $ids;
    }
    public function manifest($id) { return PluginManifest::read($this->package($id),$id); }
    public function allowed($manifest,$permission) { return (bool)array_intersect($manifest['permissions'][$permission] ?? [],array_merge(['Guest'],$this->roles)); }
    private function lock($operation) {
        // Database-wide lock covers DDL and both backends; no filesystem lock race.
        $name='si-plugin-lifecycle';
        if ((int)$this->query('SELECT GET_LOCK(:name,10) AS acquired',['name'=>$name])[0]['acquired']!==1) throw new \RuntimeException('PLUGIN_BUSY');
        try { return $operation(); } finally { $this->query('SELECT RELEASE_LOCK(:name)',['name'=>$name]); }
    }
    private function migrations($id,$m,$root) {
        foreach ($m['migrations'] as $migration) {
            $sql=trim(file_get_contents(PluginManifest::file($root,$migration['sql'])));
            // One SQL statement per migration. MySQL DDL cannot be rolled back.
            if (strpos(rtrim($sql,';'),';')!==false) throw new \RuntimeException('ONE_STATEMENT_PER_MIGRATION');
            $p=['tenant'=>$this->tenant,'plugin'=>$id,'migration'=>$migration['id']]; $checksum=hash('sha256',$sql);
            $old=$this->query('SELECT checksum,status FROM si_plugin_migrations WHERE tenant=:tenant AND plugin=:plugin AND migration=:migration',$p)[0] ?? null;
            if ($old) { if ($old['checksum']!==$checksum) throw new \RuntimeException('MIGRATION_CHECKSUM_CHANGED'); if ($old['status']!=='applied') throw new \RuntimeException('MIGRATION_REPAIR_REQUIRED'); continue; }
            $this->execute("INSERT INTO si_plugin_migrations (tenant,plugin,migration,checksum,status) VALUES (:tenant,:plugin,:migration,:checksum,'pending')",$p+['checksum'=>$checksum]);
            $this->db->exec($sql);
            $this->execute("UPDATE si_plugin_migrations SET status='applied' WHERE tenant=:tenant AND plugin=:plugin AND migration=:migration",$p);
        }
    }
    public function install($id,$zipPath) {
        PluginManifest::name($id);
        return $this->lock(function() use($id,$zipPath) {
            $this->bootstrap(); $old=$this->state($id);
            $relative='core/plugin-packages/'.$id.'/'.bin2hex(random_bytes(16)); $stage=$this->root.'/'.$relative;
            if (!mkdir($stage,0700,true)) throw new \RuntimeException('PLUGIN_STAGING_FAILED');
            $zip=new \ZipArchive(); if ($zip->open($zipPath)!==true) throw new \RuntimeException('INVALID_PLUGIN_ZIP');
            $total=0;$seen=[];
            try {
                if ($zip->numFiles>2048) throw new \RuntimeException('PLUGIN_ARCHIVE_TOO_LARGE');
                for ($i=0;$i<$zip->numFiles;$i++) {
                    $stat=$zip->statIndex($i);$name=rtrim($stat['name'],'/');PluginManifest::relative($name);
                    $key=strtolower($name); if (isset($seen[$key])) throw new \RuntimeException('DUPLICATE_ARCHIVE_PATH');$seen[$key]=true;
                    $zip->getExternalAttributesIndex($i,$os,$attr);$mode=($attr>>16)&0170000;
                    if ($mode && $mode!==0100000 && $mode!==0040000) throw new \RuntimeException('UNSAFE_ARCHIVE_FILE');
                    $total+=$stat['size']; if ($total>33554432 || $stat['size']>4194304) throw new \RuntimeException('PLUGIN_ARCHIVE_TOO_LARGE');
                    if (substr($stat['name'],-1)==='/') { if (!is_dir($stage.'/'.$name)) mkdir($stage.'/'.$name,0700,true);continue; }
                    if (!is_dir(dirname($stage.'/'.$name))) mkdir(dirname($stage.'/'.$name),0700,true);
                    $body=$zip->getFromIndex($i);if ($body===false || strlen($body)!==$stat['size'] || file_put_contents($stage.'/'.$name,$body)===false) throw new \RuntimeException('PLUGIN_EXTRACTION_FAILED');
                }
            } finally { $zip->close(); }
            $m=PluginManifest::read($stage,$id,'php',true);
            if ($old && version_compare($m['version'],$old['version'],'<')) throw new \RuntimeException('PLUGIN_DOWNGRADE_REJECTED');
            $this->migrations($id,$m,$stage);
            $this->db->beginTransaction();
            try {
                $conflicts=$this->pages($id,$m,$stage);
                $this->execute('INSERT INTO si_plugin_installations (tenant,plugin,version,package,installed,enabled) VALUES (:tenant,:plugin,:version,:package,1,:enabled) ON DUPLICATE KEY UPDATE version=VALUES(version),package=VALUES(package),installed=1,enabled=VALUES(enabled)', ['tenant'=>$this->tenant,'plugin'=>$id,'version'=>$m['version'],'package'=>$relative,'enabled'=>$old && $old['installed'] ? $old['enabled'] : 1]);
                $this->db->commit();return ['INSTALLPLUGIN'=>$id,'PLUGINCONFLICTS'=>$conflicts];
            } catch (\Throwable $e) { $this->db->rollBack();throw $e; }
        });
    }
    public function lifecycle($id,$action) {
        PluginManifest::name($id);
        return $this->lock(function() use($id,$action) {
            $this->bootstrap();$row=$this->state($id);$root=$this->package($id);
            if (!is_dir($root) || ($row && !$row['installed'])) throw new \RuntimeException('PLUGIN_NOT_INSTALLED');
            if ($action==='EnablePlugin') $m=PluginManifest::read($root,$id,'php',true);
            else $m=['version'=>$row['version'] ?? '0.0.0'];
            $relative=$row['package'] ?? 'plugins/installed/'.$id;
            $enabled=$action==='EnablePlugin'?1:0;$installed=$action==='UninstallPlugin'?0:1;
            $this->execute('INSERT INTO si_plugin_installations (tenant,plugin,version,package,installed,enabled) VALUES (:tenant,:plugin,:version,:package,:installed,:enabled) ON DUPLICATE KEY UPDATE installed=VALUES(installed),enabled=VALUES(enabled)', ['tenant'=>$this->tenant,'plugin'=>$id,'version'=>$m['version'],'package'=>$relative,'installed'=>$installed,'enabled'=>$enabled]);
            return [$action==='UninstallPlugin'?'UNINSTALLPLUGIN':'PLUGINSTATE'=>$id];
        });
    }
    public function action($id,$action,$post) {
        PluginManifest::name($id);if (!$this->enabled($id)) throw new \RuntimeException('PLUGIN_DISABLED');
        $m=$this->manifest($id);$rule=$m['actions'][$action] ?? null;
        if (!$rule || !$this->allowed($m,$rule['permission'])) throw new \RuntimeException('FORBIDDEN');
        $entry=PluginManifest::file($this->package($id),$m['backend']['php']);
        // PHP includes only the declared PHP entry, never SIPL or SQL.
        $handler=(static function($filename) { return require $filename; })($entry);
        if (!is_callable($handler)) throw new \RuntimeException('INVALID_PLUGIN_PHP_HANDLER');
        return $handler(new PluginStorage($this->db,$this->tenant,$id),$action,$post);
    }
    private function insertCms($table,$id,$values) {
        $columns=['id','entity_id'];$expressions=['UNHEX(:id)','UNHEX(:scope)'];$params=['id'=>$id,'scope'=>$this->scopes[$table]];
        foreach ($values as $key=>$value) { $columns[]=$key;$expressions[]=':p'.count($params);$params['p'.count($params)]=$value; }
        $this->execute('INSERT INTO `'.$table.'` (`'.implode('`,`',$columns).'`) VALUES ('.implode(',',$expressions).')',$params);
    }
    private function pages($id,$m,$root) {
        $conflicts=[];
        foreach ($m['pages'] as $page) {
            $p=['tenant'=>$this->tenant,'plugin'=>$id,'key'=>$page['key']];
            $old=$this->query('SELECT * FROM si_plugin_pages WHERE tenant=:tenant AND plugin=:plugin AND page_key=:key',$p)[0] ?? null;
            $sources=[];foreach (['html','style','script'] as $field) $sources[$field]=isset($page[$field])?file_get_contents(PluginManifest::file($root,$page[$field])):'';
            if (!$old) {
                if ($this->query('SELECT id FROM pages WHERE entity_id=UNHEX(:scope) AND path=:path',['scope'=>$this->scopes['pages'],'path'=>$page['path']])) throw new \RuntimeException('PLUGIN_PAGE_PATH_CONFLICT');
                $pageId=bin2hex(random_bytes(16));$blockId=bin2hex(random_bytes(16));$relId=bin2hex(random_bytes(16));
                $pv=['name'=>$page['title'] ?? $page['key'],'path'=>$page['path']];$bv=['name'=>$id.'-'.$page['key']];
                $rv=['parententity_id'=>hex2bin($this->scopes['pages']),'childentity_id'=>hex2bin($this->scopes['blocks']),'parent_id'=>hex2bin($pageId),'child_id'=>hex2bin($blockId),'note'=>'pages_blocks'];
                foreach (['dev','test','live','rollback'] as $level) {
                    if ($level!=='rollback') { $pv[$level.'-options']='{}';$rv[$level.'-order']=0;$rv[$level.'-options']='{"tag":"div"}'; }
                    $bv[$level.'-order']=0;$bv[$level.'-options']='{}';$bv[$level.'-modified']='1970-01-01 00:00:00';
                    foreach ($sources as $field=>$value) $bv[$level.'-'.$field]=$value;
                }
                $this->insertCms('pages',$pageId,$pv);$this->insertCms('blocks',$blockId,$bv);$this->insertCms('relations',$relId,$rv);
                $this->execute('INSERT INTO si_plugin_pages (tenant,plugin,page_key,page_id,block_id,sources) VALUES (:tenant,:plugin,:key,:page,:block,:sources)',$p+['page'=>$pageId,'block'=>$blockId,'sources'=>json_encode($sources)]);
            } else {
                $previous=json_decode($old['sources'],true);$sets=[];$params=['block'=>$old['block_id'],'scope'=>$this->scopes['blocks']];
                $block=$this->query('SELECT * FROM blocks WHERE id=UNHEX(:block) AND entity_id=UNHEX(:scope)',$params)[0] ?? null;
                if (!$block) throw new \RuntimeException('PLUGIN_BLOCK_MISSING');
                foreach (['dev','test','live','rollback'] as $level) foreach ($sources as $field=>$value) {
                    $column=$level.'-'.$field;
                    if ($block[$column]===($previous[$field] ?? '')) { $key='v'.count($params);$sets[]='`'.$column.'`=:'.$key;$params[$key]=$value; }
                    elseif ($block[$column]!==$value) $conflicts[]=$page['key'].':'.$column;
                }
                if ($sets) $this->execute('UPDATE blocks SET '.implode(',',$sets).' WHERE id=UNHEX(:block) AND entity_id=UNHEX(:scope)',$params);
                $this->execute('UPDATE si_plugin_pages SET sources=:sources WHERE tenant=:tenant AND plugin=:plugin AND page_key=:key',$p+['sources'=>json_encode($sources)]);
            }
        }
        return $conflicts;
    }
    public function pageAccess($path) {
        if (!$this->ready()) return true;
        $rows=$this->query('SELECT pp.plugin,pp.page_key FROM si_plugin_pages pp JOIN pages p ON p.id=UNHEX(pp.page_id) AND p.entity_id=UNHEX(:scope) WHERE pp.tenant=:tenant AND p.path=:path',['scope'=>$this->scopes['pages'],'tenant'=>$this->tenant,'path'=>$path]);
        foreach ($rows as $row) {
            if (!$this->enabled($row['plugin'])) return false;
            foreach ($this->manifest($row['plugin'])['pages'] as $page) if ($page['key']===$row['page_key']) return !isset($page['permission']) || $this->allowed($this->manifest($row['plugin']),$page['permission']);
            return false;
        }
        return true;
    }
    public function navigation() {
        $items=[];foreach ($this->ids() as $id) if ($this->enabled($id)) { try { $m=$this->manifest($id);foreach ($m['pages'] as $page) if (!empty($page['admin']) && isset($page['permission']) && $this->allowed($m,$page['permission'])) $items[]=['key'=>$page['key'],'plugin'=>$id,'title'=>$page['title'] ?? $page['key'],'path'=>'/'.$page['path']]; } catch (\Throwable $e) {} } foreach ($items as &$item) {
            $actual=$this->query('SELECT p.path FROM si_plugin_pages pp JOIN pages p ON p.id=UNHEX(pp.page_id) AND p.entity_id=UNHEX(:scope) WHERE pp.tenant=:tenant AND pp.plugin=:plugin AND pp.page_key=:key',['scope'=>$this->scopes['pages'],'tenant'=>$this->tenant,'plugin'=>$item['plugin'],'key'=>$item['key']]);
            if ($actual) $item['path']='/'.$actual[0]['path'];
        }
        return $items;
    }
}
