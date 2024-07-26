<?php
namespace SuperIntuitive; 

Tools::Autoload();
class Tools{
	static $autoloaded = false;
	static function Autoload($flag = 'core'){

		
		/*$allowedEntries = ["/index.php",
						   "/delegate.php",
						   "/style/plugins.css",
						   "/scripts/plugins.js",
						   "/scripts/page.js ",
						   "/style/page.css", 
						   "/delegate-admin.php"]; */
		//if(!in_array ($_SERVER['PHP_SELF'], $allowedEntries )  ){
			unset($_POST);
			unset($_GET);
		//}

		if(Tools::$autoloaded == false){
			spl_autoload_register(function ($class) use ($flag) {
				//These help 
				$webroot = dirname(__DIR__);
			
				//dump the namespace in the class name
				$class = str_replace('SuperIntuitive\\', "", $class);

				//Map classes that exist in files named other than the class.php
				if($class === "DataTable" || $class === "DataColumn" || $class === "DataRow" || $class === "DataSet" ){
					$class = "Datatable";
				}
				if($class === "Entity" || $class === "EntityReference" || $class === "EntityCollection" || $class === "Attribute" || $class === "Filter" ){
					$class = "Entity";
				}
				if($class == "QueryParameter"){
					$class = "Database";
				}
				if($class == "Role"){
					$class = "Security";
				}


				$includeFile = $webroot.DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.$class . '.php';
				if (file_exists($includeFile)) {
					require_once $includeFile;
					Tools::$autoloaded = true;
				} else {
					Tools::Log("The file $includeFile does not exist <br/>");
				}

				//echo $includeFile."<br>";
			});
		}
	}
	static function DefineServer(){

		$url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
		//since we do not use apache virtual hosts to partition the domains, this could be anything. If it was bad it wouldnt get by the vhosts.
		//DO NOT TRUST THIS URL. DO NOT MAKE IT PART OF ANYTHING UNTILL IT IS VERIFIED TO BE IN THE DATABASE.
		$scheme = parse_url($url, PHP_URL_SCHEME);  //http or https
		$user = parse_url($url, PHP_URL_USER); //we'll probably never use
		$pass = parse_url($url, PHP_URL_PASS); //we'll probably never use
		$host = parse_url($url, PHP_URL_HOST); //The domain address
		$port = parse_url($url, PHP_URL_PORT); //will return to
		$path = parse_url($url, PHP_URL_PATH); //the directory path
		$query = parse_url($url, PHP_URL_QUERY); //anything after the ? 
		$fragment = parse_url($url, PHP_URL_FRAGMENT); //anything after the #
		//Tools::Log("scheme:$scheme,user:$user,pass:$pass,host:$host,port:$port,path:$path,query:$query,fragment:$fragment", true);
		$languages = ['en'];
		if(isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])){
			$languages = explode( ';',$_SERVER['HTTP_ACCEPT_LANGUAGE'])[0];
		}
		
		//$host = "some.sub.that.is.stupid.superintuitive.com"; //check to make sure sillyness works when im programming this thing on localhost
		//Make the host as usable as we can.
		//remove any www bs subdomain.
		$host = ltrim($host,"www."); //figure out if we are a localhost
		$host = strtolower($host); //i dont want to deal with any caps in the domain name and the path. just incase.
	    $path = ltrim($path,"/");
	    //	$path = strtolower($path);
		$subdomain = "";
		if(Tools::IsLocalhost() === TRUE ){
			$host = str_replace('127.0.0.1', 'localhost',$host); 
			$subdomain = str_replace('.localhost', '',$host); 
			$subdomain = str_replace('localhost', '',$host); //if there is no subdomain we need to lose the localhost too
		}else{
			$hostparts = explode(".",$host);
			if(count($hostparts)>1){
			    $host = $hostparts[count($hostparts)-2].".".$hostparts[count($hostparts)-1];
			}
			if(count($hostparts)>2){
			   $subsects = count($hostparts)-2;
			   $subdomainarr = array_slice($hostparts,0,$subsects);
			   $subdomain = implode('.',$subdomainarr);
			}
		}
		//dont deal with www as a subdomain. 
		$subdomain = str_replace("www","",$subdomain);
	    //	echo "Sub: $subdomain -";
		define('SI_DOMAIN_NAME', $host);
		define('SI_SUBDOMAIN_NAME', $subdomain);
		define('SI_PAGE_PATH',$path);
		define('SI_NET_SCHEME',$scheme);
		define('SI_API_QUERY', $query);
		define('SI_API_FRAGMENT', $fragment);
		define('SI_URI',  SI_PAGE_PATH);
		define('SI_LANGS',  $languages);



		//hackety hack time: github forces that I either dont have DbCreds.php or I do, but I can't have it online and ignore it from what Ive seen so Ill get rid of it onlie and do this hack. 
		//If it does not exist i need to make a blank one before the db is called.
		//if(!file_exists("core/DbCreds.php")){
		//	file_put_contents("core/DbCreds.php", '<?php class DbCreds { }');
		//}
		
		if(!is_file($_SERVER["DOCUMENT_ROOT"]."/core/DbCreds.php")){
			$dbcreds = "<?php\nnamespace SuperIntuitive;\nclass DbCreds { }";
			file_put_contents($_SERVER["DOCUMENT_ROOT"]."/core/DbCreds.php", $dbcreds);     // Save our content to the file.
		}
	}
	static function IsLocalhost($whitelist = ['127.0.0.1', '::1']) {
		return in_array($_SERVER['REMOTE_ADDR'], $whitelist);
	}
	static function Log($data,$filetype='log'){
		$log = $_SERVER["DOCUMENT_ROOT"].'/logs/dev.'.$filetype;
		if(file_exists($log)){
			if (time() - filemtime($log) > 5) {
				unlink($log);
			} 
		}else{
		    mkdir($_SERVER["DOCUMENT_ROOT"].'/logs', 0755, true);
			fopen($log, "w");
		}
	    $back = debug_backtrace(2);
		$debuginfo='';
		if($back!= null){		
			foreach($back as $i=>$bt){
				if( $i===0){ //dont care about the tracking the Tools::Log function. 
				}else{
					if( isset($bt['class']) && isset($bt['function'])&& isset($back[$i-1]['line']) ){
						$debuginfo .= "line:".$back[$i-1]['line']." ".$bt['class'].'->'.$bt['function'].'()';
					}
				}
			}
		}
		if(is_array($data) || gettype($data) ==="object"){
			$data = print_r($data, true);
		}
		$milliseconds = round(microtime(true) * 1000);
		$output =  "/*\r\n".date("Y-m-d H:i:s").":$milliseconds\r\n$debuginfo\r\n-----------------------------------------------------------------------\r\n*/\r\n$data\r\n/*-------------------------------------------------------------------*/\r\n";

		file_put_contents($log,$output,FILE_APPEND);
	}
	//Tools::Error esentaillay the same as Tools::Log but used for catches and other error outputs.
	//Logs should be used to log dev data. This makes finding logs and commenting them out easier as we dont have to look at errors. 
	static function Error($data,$tofile=false){
		$err = $_SERVER["DOCUMENT_ROOT"].'/logs/dev.err';
		if(file_exists($err)){
			if (time() - filemtime($err) > 5) {
				unlink($err);
			} 
		}else{
		    mkdir($_SERVER["DOCUMENT_ROOT"].'/logs', 0755, true);
			fopen($_SERVER["DOCUMENT_ROOT"].'/logs/err.log', "w");
		}
	    $back = debug_backtrace(2);
		$debuginfo='';
		if($back!= null){		
			foreach($back as $i=>$bt){
				if( $i===0){ //dont care about the tracking the Tools::Log function. 
				}else{
					if( isset($bt['class']) && isset($bt['function'])&& isset($back[$i-1]['line']) ){
						$debuginfo .= "line:".$back[$i-1]['line']." ".$bt['class'].'->'.$bt['function'].'()'."\r\n";
					}
				}
			}
		}
		if(is_array($data) || gettype($data) ==="object"){
			$data = print_r($data, true);
		}
		$milliseconds = round(microtime(true) * 1000);
		$output =  date("Y-m-d H:i:s").":".$milliseconds."\r\n $debuginfo $data \r\n-----------------------------\r\n";

		file_put_contents($err,$output,FILE_APPEND);
	}
	static function LogTrace(){
		$dbt=debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS,2);
		// $caller = isset($dbt[1]['function']) ? $dbt[1]['function'] : null;
		$funcpath = "";
		$onepath = "";
		foreach($dbt as $k=>$trace){

			$tmp = '';
			if(!empty($trace['class'])){
				$onepath.=$trace['class'];
			}
			if(!empty($trace['type'])){
				$onepath.=$trace['type'];
			}
			if(!empty($trace['function'])){
				$onepath.=$trace['function'];
			}
			if(!empty($dbt[$k+1])){
				$onepath=' >-> '.$onepath;
			}
			if(!empty($trace['function'] && $trace['function']==='LogTrace')){
				$onepath="";
			}
			$funcpath = $onepath.$funcpath;
		}
		if(!empty($dbt))
		file_put_contents($_SERVER["DOCUMENT_ROOT"].'/logs/dev.log',$funcpath."\n\r", FILE_APPEND);
	}
	static function GetFileTypeData($ext) {
	    $allowedFileTypes = explode(',',$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings']['AllowedFileTypes']);
		//Tools::Log($allowedFileTypes);
		if($allowedFileTypes == null){
			Tools::Log("AllowedFileTypes Setting cannot be found. please try loggin in again.");
			return false;
		}
		if(!in_array ($ext,  $allowedFileTypes)){
			Tools::Log($ext." is not a allowed file type");
			return false;
		}

		$md = new MiscData();
		$mimes = $md->MimeTypes;
		Tools::Log($ext);
		if (array_key_exists($ext,$mimes))
		{
		    $filedata = $mimes[$ext];
			return explode('|',$filedata);
		}
		return false;
		/*
		if (function_exists('finfo_file')) {
			$finfo = finfo_open(FILEINFO_MIME_TYPE);
			$type = finfo_file($finfo, $file);
			finfo_close($finfo);
		} else {
		//	require_once 'upgradephp/ext/mime.php'; //this line crashed the removed block below. It will probably crash this
			$type = mime_content_type($file);
		}
		//Tools::Log($type,true);
		if (!$type || in_array($type, array('application/octet-stream', 'text/plain'))) {
			$secondOpinion = exec('file -b --mime-type ' . escapeshellarg($file), $foo, $returnCode);
			if ($returnCode === 0 && $secondOpinion) {
				$type = $secondOpinion;
			}
		}
		
		return $type;
		*/
	}
	static function GetIpAddress(){
		if (!empty($_SERVER['HTTP_CLIENT_IP']))   //check ip from share internet
		{
		  $ip=$_SERVER['HTTP_CLIENT_IP'];
		}
		elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR']))   //to check ip is pass from proxy
		{
		  $ip=$_SERVER['HTTP_X_FORWARDED_FOR'];
		}
		else
		{
		  $ip=$_SERVER['REMOTE_ADDR'];
		}
		return $ip;
	}
	static function SetDefaults($options,$defaults){
		if($options == null){
			$options = $defaults;
		}else{
			foreach($defaults as $k=>$v){
				if(!isset($options[$k])){
					$options[$k] = $v;
				}
			}
		}
		return $options;
	}
	static function RandomString($length = 11, $flag='ALL') {
		$characters = '';
		switch($flag){
			case "ALL":$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
			case "NUMS":$characters = '0123456789'; break;
			case "CAPS":$characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
			case "LOWER":$characters = 'abcdefghijklmnopqrstuvwxyz'; break;
			case "ALPHA":$characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
			default :$characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'; break;
		}
		$charactersLength = strlen($characters);
		$randomString = '';
		for ($i = 0; $i < $length; $i++) {
			$randomString .= $characters[mt_rand(0, $charactersLength - 1)];
		}
		return $randomString;
	}
	static function SortArray($array, $on, $order='ASC'){
		$new_array = array();
		$sortable_array = array();

		if (count($array) > 0) {
			foreach ($array as $k => $v) {
				if (is_array($v)) {
					foreach ($v as $k2 => $v2) {
						if ($k2 == $on) {
							$sortable_array[$k] = $v2;
						}
					}
				} else {
					$sortable_array[$k] = $v;
				}
			}

			switch ($order) {
				case 'ASC':
					asort($sortable_array);
				break;
				case 'DESC':
					arsort($sortable_array);
				break;
			}

			foreach ($sortable_array as $k => $v) {
				$new_array[$k] = $array[$k];
			}
		}

		return $new_array;
	}
	static function StartsWith($haystack, $needle){
		if($haystack != null && $needle != null){
			$length = strlen($needle);
		    return (substr($haystack, 0, $length) === $needle);
		}
	}
	static function EndsWith($haystack, $needle){
		if($haystack != null && $needle != null){
			$length = strlen($needle);
			return $length === 0 || 
			(substr($haystack, -$length) === $needle);
		}
	}
	static function RemoveArrayValue($value,&$array){
		if (($key = array_search($value, $array)) !== false) {
			unset($array[$key]);
			return TRUE;
		}
		return FALSE;
	}
	static function StartsWithNumber($string) {
		return strlen($string) > 0 && ctype_digit(substr($string, 0, 1));
    }
	static function FixGuid($guid){
	
		if(strlen($guid)== 32 || strlen($guid)== 34){
			$guid = strtolower($guid);
			if(!Tools::StartsWith($guid,'0x') ){
				$guid = '0x'.$guid;
			}else{

			}
			return $guid;
		//	Tools::Log("Error! The Guid: ".$guid." is not the right length",true);
		}
		return false;
	}
	static function NeedsHex($column){
		$r = null;
		if(Tools::EndsWith($column, '_id') || $column=='id'|| $column=='createdby'|| $column=='modifiedby' || $column=='hash'){
			$r = "HEX(".$column.")";
		}else{
			$r = $column;
		}
		return $r;
	}	
	static function OkForElementId($string){
		$okid = preg_replace('/[^\w]/', '_', $string);
		if(Tools::StartsWithNumber($okid)){
			$okid = 'id'.$okid;
		}
		return $okid;
	}
	static function CleanDeployableField($field){
		if(Tools::StartsWith($field,"live-")){
			return substr($field, 5);
		}
		else if(Tools::StartsWith($field,"test-")){
			return substr($field, 5);
		}
		else if(Tools::StartsWith($field,"dev-")){
			return substr($field, 4);
		}
		else{
			return $field;
		}
	}
	static function UserHasRole($checkroles){
		
		//Tools::Log('The current users roles are: '.implode(',',$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles']));
		$roles = array();
	    if(is_array($checkroles)){
			$roles = $checkroles;			
		}else{
		    $roles = array_map('trim', explode(',', $checkroles)); //so19347005
		}
		//Tools::Log('The roles we are looking for are: '.implode(',',$roles));
		//even if the user does not have the Guest role, we act like they all do. 
		if(array_search("Guest",$roles)!==false){
		//	Tools::Log("The Guest role is OK for all users. Returning true");
		//	Tools::Log("");
			return TRUE;
		}
		//Tools::Log($roles);
		$usersRoles = array();
		//This SHOULD be able to be done in one line with array_intersect but I cant get it working this second

		if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles']))
		{
			$userRoles = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'];

			$cross = array_intersect($userRoles, $roles);
			

			if(count($cross)>0){
				//Tools::Log("User HAS Role(s):".implode($cross) );
				return TRUE;
			}else{
				//Tools::Log("User DOES NOT HAVE Role(s):".implode($roles) );	
				return FALSE;
			}

			foreach($roles as $role){
				$result = array_search($role,$userRoles);
				if($result!==false){
				//	Tools::Log("Role ".$role." found. Returning true",true);
				//	Tools::Log($userRoles);
				//	Tools::Log("");
					return TRUE;
				}
			}
		}
		//Tools::Log("Role NOT found. Returning false");
		//Tools::Log("");
		return FALSE;
	}
	static function GetEntityNameFromGuid($guid){
		$entities = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'];
		foreach($entities as $k=>$v){
			if(!empty($v['instanceid'])){
				if($v['instanceid'] == $guid){
					return $k;
				}
			}
		}
		return null;
	}
	static function GetEntityGuidFromName($name){
		$name = strtolower($name);
		if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$name]['instanceguid'])){
			return $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$name]['instanceguid'];
		}
		return null;
	}
	static function ReplaceConstants($text){
		
		$text = str_replace("__NOW.YEAR__",date("Y"), $text);
		$text = str_replace("__NOW.MONTH__",date("n"), $text);
		$text = str_replace("__NOW.MONTHSHORT__",date("M"), $text);
		$text = str_replace("__NOW.MONTHLONG__",date("F"), $text);
		$text = str_replace("__NOW.DAY__",date("j"), $text);
		$text = str_replace("__NOW.DAYSHORT__",date("jS"), $text);
		$text = str_replace("__NOW.DATLONG__",date("l"), $text);
		$text = str_replace("__NOW.DBTIME__",date("Y-m-d H:i:s"), $text);
		$text = str_replace("__NOW.DATEPATH__",date("Y/m/d"), $text);
		//allow the user to make replacements with Settings
		if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings'])){
			$settings = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings'];
			//Tools::Log($settings);		
			foreach($settings as $k=>$v){

			    $match = preg_match('/^(__\w*__)$/', $k, $matches, PREG_UNMATCHED_AS_NULL);
				//Tools::Log("match");
				//Tools::Log($match);
				if($match > 0){
					//Tools::Log($k." ".$v);
					//Tools::Log($text);
					$text = str_replace($k,$v, $text);
				}

			}
		}

		return $text;
	}
	static function GetPhpInfo(){
		ob_start();
		phpinfo();
		$phpinfo = ob_get_contents();
		ob_end_clean();
		$phpinfo = preg_replace('%^.*<body>(.*)</body>.*$%ms', '$1', $phpinfo);
		$ret = "
			<style type='text/css'>
				#phpinfo {}
				#phpinfo pre {margin: 0; font-family: monospace;}
				#phpinfo a:link {color: #009; text-decoration: none; background-color: #fff;}
				#phpinfo a:hover {text-decoration: underline;}
				#phpinfo table {border-collapse: collapse; border: 0; width: 934px; box-shadow: 1px 2px 3px #ccc;}
				#phpinfo .center {text-align: center;}
				#phpinfo .center table {margin: 1em auto; text-align: left;}
				#phpinfo .center th {text-align: center !important;}
				#phpinfo td {border: 1px solid #666; font-size: 75%; vertical-align: baseline; padding: 4px 5px;}
				#phpinfo th {border: 1px solid #666; font-size: 75%; vertical-align: baseline; padding: 4px 5px;}
				#phpinfo h1 {font-size: 150%;color:black}
				#phpinfo h2 {font-size: 125%;color:rgb(24,49,107)}
				#phpinfo .p {text-align: left;}
				#phpinfo .e {background-color: #ccf; color:#000; width: 300px; font-weight: bold;}
				#phpinfo .h {background-color: #99c; font-weight: bold;}
				#phpinfo .v {background-color: #ddd; color:#000; max-width: 300px; overflow-x: auto; word-wrap: break-word;}
				#phpinfo .v i {color: #999;}
				#phpinfo img {float: right; border: 0;}
				#phpinfo hr {width: 934px; background-color: #ccc; border: 0; height: 1px;}
			</style>
			<div id='phpinfo'>
				$phpinfo
			</div>
			";
		return addslashes($ret);
	}
	static function ConvertBytes( $value ) {
		if ( is_numeric( $value ) ) {
			return $value;
		} 
		else {
			$len = strlen($value);
			$qty = substr( $value, 0, $len - 1 );
			$unit = strtolower( substr( $value, $len - 1 ) );
			switch ( $unit ) {
				case 'k':
					$qty *= 1024;
					break;
				case 'm':
					$qty *= 1048576;
					break;
				case 'g':
					$qty *= 1073741824;
					break;
			}
			return $qty;
		}
	}
	static function GetUploadMaxFilesize(){
	   return Tools::ConvertBytes(ini_get('upload_max_filesize'));
	}
	static function Trace(){
		Tools::Log( debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS,3));
	}
	/// <summary>
	/// SafeKey is designed to generate a safe (unique) key for an array to avoid overwriting existing keys. 
	/// </summary>
	/// <param name="$key">The initial key that you want to check or use.</param>
	/// <param name="$array">The array in which you want to ensure the key is unique.</param>
	static function SafeKey($key, $array){
		if(!isset($array[$key])){
			return $key;
		}
		else{
		//now we know the key is already in the array. lets loop a guess untill we find one that is not in the array
			$i = 2;
			while (true){
				if(!isset($array[$key.$i])){
					return $key.$i;
				}
				$i++;
			}
		}		
	}
	static function DeleteDirectory($dir){
		Tools::Log("IN DeleteDirectory:  ".$dir);
			$files = new \RecursiveIteratorIterator(
				new \RecursiveDirectoryIterator($dir, \RecursiveDirectoryIterator::SKIP_DOTS),
				\RecursiveIteratorIterator::CHILD_FIRST
			);

			foreach ($files as $fileinfo) {
				$todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
				$todo($fileinfo->getRealPath());
			}

			rmdir($dir);
	}
	/// <summary>
	/// SafeKey is designed to generate a safe (unique) key for an array to avoid overwriting existing keys. 
	/// </summary>
	/// <param name="$key">The initial key that you want to check or use.</param>
	/// <param name="$array">The array in which you want to ensure the key is unique.</param>
	static function ReplaceMultilangs($text){
		//Gets all of the multilingual tags that appear in the text,
		$matches = array();
		//Tools::Log($text);
		if (defined('SI_LANGS') && ( strpos ($text,'SI_MULTILANG_')> - 1 ) )
		{
		    $localtextattr = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes'];
			$langs = strtolower(SI_LANGS);
			$lanarr = explode(',',$langs);
			$lanarr = preg_filter('/^/', '_', $lanarr);
			$filtLanArr = array();
			foreach($lanarr as $lan){
				if(isset($localtextattr[$lan])){
				   $filtLanArr[] = $lan;
				}
			}
			//Tools::Log($localtextattr);
			//Tools::Log($lanarr);
			//Tools::Log($filtLanArr);

			$cols = implode("`,`",$filtLanArr);

			preg_match_all('/SI_MULTILANG_([A-Z]){20}/', $text, $matches);
			if(count($matches)>0){
				$inset = str_replace('SI_MULTILANG_','',$matches[0]);
				
				//Tools::Log("sql: ".$sql);

				$db = new Database();
				$placeholders = str_repeat ('?, ',  count ($inset) - 1) . '?';
				$pdo = $db->DBC();
				$sql = "SELECT `$cols`,`name` FROM `localtext` WHERE `name` IN($placeholders);";
				//Tools::Log($sql);
				$query = $pdo->prepare($sql);
				if ($query->execute($inset)) {
					$data = $query->fetchAll();
					foreach($data as $v){
						$tmp=$v;
						if(isset($tmp['name'])){
							$token = "SI_MULTILANG_".$tmp['name'];
							$value = '';
							unset($tmp['name']);
							//Tools::Log($tmp);
							foreach($tmp as $v){
								if(strlen($v)>0){
									$value = $v;
									break;
								}
							}
							$text = str_replace($token,$value,$text);
						}
					}
					//we have data!!!
					//Tools::Log($data);
				}
			}
		}
		return $text;
	}
	static function IsJson($string){
		//return \json_validate($string);
		$tmp = trim($string);
		return (substr($string, 0, 1) == "{" ? TRUE : FALSE);
	}

	/// <summary>
	/// JsonValidate validates a JSON string and handles various JSON parsing errors. Then return the decoded data in
	/// </summary>
	/// <param name="$string">The JSON string that needs to be validated and decoded.</param>
	static function JsonValidate($string)  //SO-6041741
	{
		$result = json_decode($string);
		switch (json_last_error()) {
			case JSON_ERROR_NONE:
				$error = '';
				break;
			case JSON_ERROR_DEPTH:
				$error = 'The maximum stack depth has been exceeded.';
				break;
			case JSON_ERROR_STATE_MISMATCH:
				$error = 'Invalid or malformed JSON.';
				break;
			case JSON_ERROR_CTRL_CHAR:
				$error = 'Control character error, possibly incorrectly encoded.';
				break;
			case JSON_ERROR_SYNTAX:
				$error = 'Syntax error, malformed JSON.';
				break;
			case JSON_ERROR_UTF8:
				$error = 'Malformed UTF-8 characters, possibly incorrectly encoded.';
				break;
			case JSON_ERROR_RECURSION:
				$error = 'One or more recursive references in the value to be encoded.';
				break;
			case JSON_ERROR_INF_OR_NAN:
				$error = 'One or more NAN or INF values in the value to be encoded.';
				break;
			case JSON_ERROR_UNSUPPORTED_TYPE:
				$error = 'A value of a type that cannot be encoded was given.';
				break;
			default:
				$error = 'Unknown JSON error occured.';
				break;
		}
		if ($error !== '') {
			exit($error);
		}
		return $result;
	}
	static function GetBrowserLanguage( $available = [], $default = 'en' ) {
		//https://gist.github.com/LucaRosaldi/5676962
		if ( isset( $_SERVER['HTTP_ACCEPT_LANGUAGE'] ) ) {
			$langs = explode( ',', $_SERVER['HTTP_ACCEPT_LANGUAGE'] );
			if ( empty( $available ) ) {
			  return $langs[0];
			}
			foreach ( $langs as $lang ){
				$lang = substr( $lang, 0, 2 );
				if( in_array( $lang, $available ) ) {
					return $lang;
				}
			}
		}
		return $default;
	}
}