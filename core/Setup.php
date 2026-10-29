<?php
namespace SuperIntuitive; 
use \PDO;
Tools::Autoload();
class Setup {

	public function __construct(){
		PhpRuntime::RequirePatched();
		$domdir = $_SERVER["DOCUMENT_ROOT"].'/domains';
		if( is_dir($domdir) === false )
		{
			mkdir($domdir,0755,true);
		}
	}	
	public function __destruct(){
	}	

	static function Log($data){
		if(getenv('SI_DEBUG_LOG') !== '1'){
			return;
		}
		$log = $_SERVER["DOCUMENT_ROOT"].'/logs/setup.log';
		if(file_exists($log)){
			if (time() - filemtime($log) > 5000) {
				unlink($log);
			} 
		}else{
		    mkdir($_SERVER["DOCUMENT_ROOT"].'/logs', 0755, true);
			fopen($_SERVER["DOCUMENT_ROOT"].'/logs/setup.log', "w");
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
		$output =  date("Y-m-d H:i:s").":$milliseconds\r\n$data \r\n$debuginfo---------------------------------\r\n";

		file_put_contents($log,$output,FILE_APPEND);
	}

	public function GetHead(){

		$styleVersion = Tools::GetStaticAssetVersion($_SERVER['DOCUMENT_ROOT'].'/style/setup.css');
		return "<meta charset='utf-8'>
		<meta name='viewport' content='width=device-width, initial-scale=1'>
		<meta name='theme-color' content='#0b1120'>
		<title>Set up your website | Super Intuitive</title>
		<link rel='stylesheet' type='text/css' href='/style/setup.css?$styleVersion'>
		<script src='/scripts/setup.js?".rand()."'></script>
		";			
	}			
	public function GetBody(){
		
		$csrf = htmlspecialchars(Tools::EnsureCsrfToken(), ENT_QUOTES, 'UTF-8');
		$setupAuthorized = SetupAuthorization::IsAuthorized();

		require_once "MiscData.php";
		$miscdata = new MiscData();
		//Get Languages
		$langs = $miscdata->Languages;
		$langoptions = "";
		$detectedlang = explode('-', Tools::GetBrowserLanguage())[0];
		if(!isset($langs[$detectedlang])) $detectedlang = 'en';
		foreach($langs as $k=>$v){
			if(!preg_match('/^[a-z]{2,3}$/D', $k)) continue;
			$selected = (strtolower($k) == $detectedlang ? "selected='selected'" : "");
			$langoptions.="<option value='$k' $selected >$v</option>";
		}
		//Get timezones
		$timezones = $miscdata->TimeZones;
		$timezonesoptions = "<option disabled selected value> -- select a timezone -- </option>";
		foreach($timezones as $k=>$v){
			$selected = (strtolower($k) == $detectedlang ? "selected='selected'" : "");
			$timezonesoptions.="<option value='$k' $selected >$k</option>";
		}	
		//Get timezones
		$currencies = $miscdata->Currencies;
		$currenciesoptions = "<option disabled selected value> -- select a currency -- </option>";
		foreach($currencies as $k=>$v){
		//	$selected = (strtolower($k) == $detectedlang ? "selected='selected'" : "");
		    $k2 = strtoupper($k);
			$currenciesoptions.="<option value='$k' $selected >$k2 - $v</option>";
		}			
		
		$dbavail = PDO::getAvailableDrivers();
		$dboptions = "";
		foreach($dbavail as $v){
			if($v === 'mysql'){
				$dboptions.="<option>$v</option>";
			}
		}
		$year = date('Y');
		$host = htmlspecialchars(SI_DOMAIN_NAME, ENT_QUOTES, 'UTF-8');
		$notificationEmail = filter_var('info@'.SI_DOMAIN_NAME, FILTER_VALIDATE_EMAIL)
			? htmlspecialchars('info@'.SI_DOMAIN_NAME, ENT_QUOTES, 'UTF-8') : '';
					
		ob_start();
		require __DIR__.'/setup/installer.php';
		return ob_get_clean();
	}	

    private function RejectInput($message, $details = array()){
        http_response_code(400);
        echo json_encode(array_merge(array('outcome' => false, 'message' => $message), $details));
        return false;
    }
		
    private function DatabaseInputErrors($post){
        $errors = array();
        if(!is_array($post)) return array('si_setup_dbserver' => 'Database settings must be an object.');
        if(($post['dbtype'] ?? null) !== 'mysql') $errors['si_setup_dbtype'] = 'Select MySQL as the database type.';
        if(!Tools::IsSafeDomain($post['dbserver'] ?? null)) $errors['si_setup_dbserver'] = 'Enter a database hostname or IP address without a protocol or port.';
        if(filter_var($post['dbport'] ?? null, FILTER_VALIDATE_INT, array('options' => array('min_range' => 1, 'max_range' => 65535))) === false) $errors['si_setup_dbport'] = 'Enter a database port between 1 and 65535.';
        $mode = $post['dbuserradio'] ?? null;
        if($mode !== 'privuser' && $mode !== 'existuser'){
            $errors['si_setup_privuser'] = 'Select a database login method.';
            return $errors;
        }
        $existing = $mode === 'existuser';
        $user = $post[$existing ? 'existuser' : 'privuser'] ?? null;
        $password = $post[$existing ? 'existpass' : 'privpass'] ?? null;
        $database = $post[$existing ? 'existdb' : 'newdbname'] ?? null;
        if(!is_string($user) || $user === '') $errors[$existing ? 'si_setup_exun' : 'si_setup_pruser'] = 'Enter the database account username.';
        if(!is_string($password) || strlen($password) > 4096 || strpos($password, "\0") !== false) $errors[$existing ? 'si_setup_expw' : 'si_setup_prpw'] = 'Enter a valid database account password.';
        if(!is_string($database) || !preg_match('/^[A-Za-z0-9_]{1,64}$/D', $database)) $errors[$existing ? 'si_setup_exdb' : 'si_setup_newdb'] = 'Use a database name of 1 to 64 letters, numbers, or underscores.';
        if(!$existing && (!is_string($post['newuser'] ?? null) || !preg_match('/^[A-Za-z0-9_.-]{1,32}$/D', $post['newuser']))) $errors['si_setup_newun'] = 'Use a new database username of 1 to 32 letters, numbers, underscores, dots, or hyphens.';
        return $errors;
    }

    private function ValidateDatabaseInput($post){
        return count($this->DatabaseInputErrors($post)) === 0;
    }

    private function DatabaseDsn($post, $database = null){
        $dsn = 'mysql:host='.$post['dbserver'].';port='.$post['dbport'].';charset=utf8mb4';
        return $database === null ? $dsn : $dsn.';dbname='.$database;
    }
		
    private function BuildCredentials($post, $user, $pw, $db){
        $source = "<?php\nnamespace SuperIntuitive;\nclass DbCreds {\n";
        foreach(array('servername' => $post['dbserver'], 'username' => $user, 'password' => $pw,
            'database' => $db, 'dbtype' => $post['dbtype'], 'port' => (int)$post['dbport']) as $key => $value){
            $source .= '    protected $'.$key.' = '.var_export($value, true).";\n";
        }
        return $source."}\n";
    }

    private function NormalizeInstallInput($post){
        if(is_array($post) && is_string($post['language'] ?? null)){
            $language = strtolower($post['language']);
            $base = explode('-', $language)[0];
            $misc = new MiscData();
            if(isset($misc->Languages[$language], $misc->Languages[$base])
                && preg_match('/^[a-z]{2,3}$/D', $base)){
                $post['language'] = $base;
            }
        }
        return $post;
    }

    private function InstallInputErrors($post){
        $post = $this->NormalizeInstallInput($post);
        $errors = $this->DatabaseInputErrors($post);
        if(!is_array($post)) return $errors;
        $misc = new MiscData();
        if(!Tools::IsSafeDomain($post['domain'] ?? null)) $errors['si_setup_host'] = 'Enter a valid site domain without a protocol or port.';
        $user = $post['adminuser'] ?? null;
        if(!is_string($user) || trim($user) === '' || strlen($user) > 255 || strpos($user, "\0") !== false) $errors['si_setup_adminuser'] = 'Enter an administrator username of 1 to 255 bytes.';
        if(!Tools::IsValidPassword($post['adminpw'] ?? null)) $errors['si_setup_adminpassword'] = 'Use an administrator password of 10 to 72 bytes.';
        $email = $post['adminemail'] ?? null;
        if(!is_string($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) $errors['si_setup_adminemail'] = 'Enter a valid administrator email address, such as you@example.com.';
        $note = $post['noteemail'] ?? null;
        if(!is_string($note) || ($note !== '' && !filter_var($note, FILTER_VALIDATE_EMAIL))) $errors['si_setup_hostemail'] = 'Enter a complete notifications email address, such as you@example.com, or leave it blank.';
        $language = $post['language'] ?? null;
        if(!is_string($language) || !isset($misc->Languages[$language]) || !preg_match('/^[a-z]{2,3}$/D', $language)) $errors['si_setup_lang'] = 'Select a supported primary language in the Location step.';
        $currency = $post['currency'] ?? null;
        if(!is_string($currency) || !isset($misc->Currencies[$currency])) $errors['si_setup_currency'] = 'Select a primary currency in the Location step.';
        $timezone = $post['timezone'] ?? null;
        if(!is_string($timezone) || !in_array($timezone, \DateTimeZone::listIdentifiers(), true)) $errors['si_setup_timezone'] = 'Select a primary timezone in the Location step.';
        return $errors;
    }

    private function ValidateInstallInput($post){
        return count($this->InstallInputErrors($post)) === 0;
    }

    private function DatabaseConnectionError($error, $post){
        $code = (int)($error->errorInfo[1] ?? 0);
        $user = $post[$post['dbuserradio'] === 'existuser' ? 'existuser' : 'privuser'];
        $server = $post['dbserver'].':'.$post['dbport'];
        switch($code){
            case 1130:
                $name = 'DB_HOST_NOT_ALLOWED';
                $message = 'The database server at '.$server.' does not allow connections from this web server.';
                if(preg_match("/Host '([^']+)' is not allowed/", $error->errorInfo[2] ?? '', $match)) $message .= ' Allow client host '.$match[1].' in the database account host permissions.';
                break;
            case 1045:
                $name = 'DB_LOGIN_DENIED';
                $message = 'Access denied for database user "'.$user.'" at '.$server.'. Check this account\'s username, password, and allowed client hosts.';
                break;
            case 1044:
                $name = 'DB_ACCESS_DENIED';
                $message = 'Database user "'.$user.'" does not have access to the selected database. Check its database grants.';
                break;
            case 1049:
                $name = 'DB_NOT_FOUND';
                $message = 'The selected database does not exist at '.$server.'. Enter an existing database name or select Create a database and user.';
                break;
            case 2002: case 2003: case 2005:
                $name = 'DB_UNREACHABLE';
                $message = 'Cannot reach the database at '.$server.'. Check the server address, port, network, and database listener.';
                break;
            default:
                $name = 'DB_CONNECTION_FAILED';
                $message = 'Database connection failed at '.$server.($code ? ' (database error '.$code.')' : '').'. Check the database settings and server logs.';
        }
        return array('outcome' => false, 'code' => $name, 'message' => $message);
    }

    public function TestDatabase($post){
        if(!$this->ValidateDatabaseInput($post)){
            return $this->RejectInput('Invalid database settings.');
        }
        $existing = $post['dbuserradio'] === 'existuser';
        try{
            $db = new PDO($this->DatabaseDsn($post, $existing ? $post['existdb'] : null),
                $post[$existing ? 'existuser' : 'privuser'], $post[$existing ? 'existpass' : 'privpass'],
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 5));
            echo json_encode(array('outcome' => true));
        } catch(\PDOException $ex){
            echo json_encode($this->DatabaseConnectionError($ex, $post));
        }
    }

    private function StarterFileMatches($path, $template){
        if(is_link($path) || is_link($template) || !is_file($path) || !is_file($template)) return false;
        $hash = hash_file('sha256', $path);
        return $hash !== false && $hash === hash_file('sha256', $template);
    }

    public function TestDomain($domain){
        if(!Tools::IsSafeDomain($domain)) return false;
        $root = $_SERVER['DOCUMENT_ROOT'].'/domains';
        $path = $root.'/'.$domain;
        if(is_link($root) || is_link($path)) return false;
        if(!file_exists($path)) return true;
        if(!is_dir($path)) return false;
        $source = $_SERVER['DOCUMENT_ROOT'].'/core/setup/domaintemplate';
        if(!is_dir($source) || is_link($source)) return false;
        // A fresh checkout can already contain the starter folder. Only known,
        // unchanged template entries may be reused; user content still blocks setup.
        foreach($iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::SELF_FIRST) as $item){
            $template = $source.DIRECTORY_SEPARATOR.$iterator->getSubPathName();
            if($item->isLink() || is_link($template)) return false;
            if($item->isDir()){
                if(!is_dir($template)) return false;
            } elseif(!$this->StarterFileMatches($item->getPathname(), $template)){
                return false;
            }
        }
        return true;
    }

    private function CreateDomainFolder($domain){
        if(!$this->TestDomain($domain)){
            throw new \RuntimeException('The domain folder contains existing site content or is invalid.');
        }
        $root = $_SERVER['DOCUMENT_ROOT'].'/domains';
        if(is_link($root)) throw new \RuntimeException('The domains directory must not be a symlink.');
        if(!is_dir($root) && !mkdir($root, 0755)) throw new \RuntimeException('Unable to create the domains directory.');
        $source = $_SERVER['DOCUMENT_ROOT'].'/core/setup/domaintemplate';
        if(!is_dir($source) || is_link($source)) throw new \RuntimeException('The starter template is unavailable.');
        $dest = $root.'/'.$domain;
        if(!is_dir($dest) && !mkdir($dest, 0755)) throw new \RuntimeException('Unable to create the domain folder.');
        foreach($iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($source, \FilesystemIterator::SKIP_DOTS), \RecursiveIteratorIterator::SELF_FIRST) as $item){
            $target = $dest.DIRECTORY_SEPARATOR.$iterator->getSubPathName();
            if($item->isLink() || is_link($target)) throw new \RuntimeException('Starter files must not be symlinks.');
            if($item->isDir()){
                if(!is_dir($target) && !mkdir($target, 0755)) throw new \RuntimeException('Unable to create a starter directory.');
            } elseif(file_exists($target)){
                if(!$this->StarterFileMatches($target, $item->getPathname())) throw new \RuntimeException('Existing domain content must not be overwritten.');
            } else {
                // Exclusive creation also prevents overwriting a file created after preflight.
                $input = fopen($item->getPathname(), 'rb');
                if($input === false) throw new \RuntimeException('Unable to read a starter file.');
                $output = @fopen($target, 'xb');
                if($output === false){
                    fclose($input);
                    throw new \RuntimeException('Unable to write a starter file.');
                }
                try {
                    if(stream_copy_to_stream($input, $output) !== $item->getSize()) throw new \RuntimeException('Unable to finish copying a starter file.');
                } finally {
                    fclose($input);
                    fclose($output);
                }
            }
        }
    }
	private $guidTokens = array();
	private $total = 0; //preg_match_all('(_SI_GUID_[1234567890]+)', $sqlstr, $matches2);
	private $unique = 0;
	private function ReplaceTokens(&$sqlstr, $post){
	    Tools::Log("In Replace Tokens");

		Tools::Log("Replacing Guids");

		try {
			$sqlstr = preg_replace_callback(
				"/(_SI_GUID_[1234567890]+)/",
				function ($matches) {
					if(count($matches)>0){
	
						$match = $matches[0];
						//Tools::Log("Matches:".$match);
						//Tools::Log("Matches:".print_r($matches,true));
						$this->total++;
						if(isset($this->guidTokens[$match])){
							Tools::Log("Guid Match Exists for: ".$match.' Returning Guid: '.$this->guidTokens[$match]);
							$found = $this->guidTokens[$match];
							return $found;
						}else{
							$this->unique++;
							$guid = new Guid(true);
							$guid = $guid->ToString();
							$this->guidTokens[$match] = $guid;
							Tools::Log("Added Guid To List: ".$match.'->'.$guid);
							Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
							return $guid;
						}
						Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
					}
					Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
				},
				$sqlstr,-1
			);
		} catch (Exception $ex) {
			Tools::Log( $ex->getMessage() );
		}


        // Replace complete SQL literals, using hex so quotes, backslashes and
        // semicolon/newline combinations in submitted values cannot become SQL.
        $tokens = array("'_SI_NOWTIME_'" => 'CURRENT_TIMESTAMP()', '_SI_NOWTIME_' => 'CURRENT_TIMESTAMP()');
        $values = array(
            '__SI_USER_PASSWORD__' => password_hash($post['adminpw'], PASSWORD_DEFAULT),
            '__SI_USER_EMAIL__' => $post['adminemail'],
            '__SI_USER_NAME__' => $post['adminuser'],
            '__SI_DOMAIN_NAME__' => $post['domain'],
            '__SI_DEFAULT_LANGUAGE__' => $post['language'],
            '__SI_DEFAULT_CURRENCY__' => $post['currency'],
            '__SI_DEFAULT_TIMEZONE__' => $post['timezone'],
            '__SI_DEFAULT_NOTEEMAIL__' => $post['noteemail'],
        );
        foreach($values as $token => $value){
            $tokens["'".$token."'"] = $value === '' ? "''" : '0x'.bin2hex($value);
        }
        $deflang = $post['language'];
        $tokens['__SI_DEFAULT_LANGUAGE_COLUMN__'] = in_array($deflang, array('ar','zh','en','fr','de','hi','it','ja','ko','es'), true)
            ? '' : ', `_'.$deflang.'` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL';
        $sqlstr = strtr($sqlstr, $tokens);
    }

	private function ReplaceTokensCallback(){
		
	}
    private function CreateDbForRoot($connection, $post){
        $pw = Tools::RandomString(32);
        try{
            $dbh = new PDO($connection, $post['privuser'], $post['privpass'], array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
            $dbname = $post['newdbname']; // Validated as a SQL identifier before any side effects.
            $clientHost = $dbh->query("SELECT SUBSTRING_INDEX(USER(), '@', -1)")->fetchColumn();
            $account = $dbh->quote($post['newuser']).'@'.$dbh->quote($clientHost);
            // Existing databases/users must never be dropped by the installer.
            $dbh->exec("CREATE DATABASE `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $dbh->exec('CREATE USER '.$account.' IDENTIFIED BY '.$dbh->quote($pw));
            $dbh->exec("GRANT ALL PRIVILEGES ON `$dbname`.* TO ".$account);
        } catch(\PDOException $ex){
            $this->RejectInput('Unable to create the database and user. Check the settings and use new names.');
            return false;
        }
        return $pw;
    }
	private function RemoveBlanksAndComments($sqlfile){
		$clean = array();
		foreach($sqlfile as $line){
			//first trim the whitespace, then check the first two chars. if false, we have a blank or a line with 1 char which does not make sense			
			$twochars = substr(trim($line), 0, 2); 
			$keep = true;
			switch($twochars){
				case false:$keep=false;break;
				case "--":$keep=false;break;
				case "/*":$keep=false;break;
			}
			if($keep){
				$clean[] = trim($line).PHP_EOL;
			}
		}

		$sqlfile = $clean;
	}
	private function WriteInstallLock(){
		$payload = array(
			'installed_on' => date('c'),
			'domain' => defined('SI_DOMAIN_NAME') ? SI_DOMAIN_NAME : null,
		);
		if(file_put_contents(Database::GetInstallLockPath(), json_encode($payload), LOCK_EX) === false){
			throw new \RuntimeException('Unable to persist the installation lock.');
		}
	}
	private function PersistInstallMarkers($dbc){
		try{
			$check = $dbc->prepare("SELECT COUNT(*) FROM `settings` WHERE `settingname` = :settingname");
			$check->execute(array(':settingname' => 'SiteInstalled'));
			if((int)$check->fetchColumn() === 0){
				$settingId = (new Guid(true))->ToString();
				$insert = "INSERT INTO `settings` (`id`,`status`,`createdon`,`modifiedon`,`entity_id`,`settingname`,`settingvalue`)
					SELECT $settingId, 'active', CURRENT_TIMESTAMP(), NULL, `id`, :settingname, :settingvalue
					FROM `entities`
					WHERE `name` = 'settings'
					LIMIT 1";
				$stmt = $dbc->prepare($insert);
				$stmt->execute(array(':settingname' => 'SiteInstalled', ':settingvalue' => '1'));
			}
		}
		catch(\PDOException $ex){
			Tools::Log("Failed to persist SiteInstalled marker: ".$ex->getMessage(), true);
		}

		try{
			$this->WriteInstallLock();
			return true;
		}
		catch(\Throwable $ex){
			Tools::Log("Failed to write install lock: ".$ex->getMessage(), true);
			return false;
		}
	}
	public function CreateDomain($domain){
	
		Tools::Log($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql', true);

		//$sqlfile = file_get_contents($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql');
		$sqlfile = file($_SERVER["DOCUMENT_ROOT"].'/core/setup/super_intuitive_install.sql', FILE_SKIP_EMPTY_LINES);
		



		//set the user password
		$hash = password_hash($post['adminpw'], PASSWORD_DEFAULT);


		array_unshift($sqlfile, "USE `$db`;\n");


		$this->RemoveBlanksAndComments($sqlfile);

		//change it into a string to do the replaces
		$sqlstr = implode($sqlfile);

		//This allows new installs to have their own fresh guids and not old ones that were made when I made the installer sql script.

		//$guidTokens = array();

		$this->ReplaceTokens($sqlstr, $post);

		// Never log SQL containing account credentials or password hashes.
		//split again but this time by semicolons followed by newlines
		$sqlfile = explode(';'.PHP_EOL,$sqlstr);

		//get rid of all the NON INSERT INTOs
		$inserts = array();
		foreach($sqlfile as $line){
			//first trim the whitespace, then check the first two chars. if false, we have a blank or a line with 1 char which does not make sense			
			$elevenchars = substr($line, 0, 11); 
			$keep = false;
			if($elevenchars === "INSERT INTO"){
				$inserts[] = $line;
			}
		}
		$sqlfile =  $inserts;

		$outcome = true;
		$msg = "";
		foreach($sqlfile as $sql){
			if(trim($sql) === ''){
				continue;
			}
			try {
				$dbc->exec($sql);
			
			} catch (\PDOException $ex) {
				Tools::Log("Error performing Query: " . $sql . "   Message: " . $ex->getMessage() . "\n",true);
				$msg .= $ex->getMessage()." ";
				$outcome = false;
			}
		}
	
		if($outcome){
			$result = array("outcome" => true, "time" => "7000" );
			echo json_encode($result);
			session_unset(); 
		}else{
			echo json_encode(array('outcome' => false, 'message' => 'Unable to complete installation. An administrator must check the database.'));
		}

	}

/**
 * Setup SuperIntuitive
 */
    public function SetupSuperIntuitive($post){
        $post = $this->NormalizeInstallInput($post);
        $errors = $this->InstallInputErrors($post);
        if($errors){
            return $this->RejectInput(reset($errors), array('code' => 'SETUP_VALIDATION_FAILED', 'field' => array_key_first($errors), 'errors' => $errors));
        }
        if(!$this->TestDomain($post['domain'])){
            return $this->RejectInput('This domain folder contains existing site content or is invalid. Choose an unused domain; custom files will not be overwritten.', array('code' => 'SETUP_VALIDATION_FAILED', 'field' => 'si_setup_host'));
        }

		
		$connect = null;
		$user = null;
		$pw = null;
		$db = null;
		$domain = null;
		
		if(isset($post["dbtype"]) && isset($post["dbserver"]) && isset($post["dbport"]) && isset($post["dbuserradio"])){
			$connect = $this->DatabaseDsn($post);
			//If we are using a root or similar db user to setup and we want to setup a user and database
			if($post["dbuserradio"]=='privuser' && isset($post["privuser"]) && isset($post["privpass"])){
				$user = $post["privuser"];
				$pw = $post["privpass"];
			} //If we already have a user and database setup to use,
			else if($post["dbuserradio"]=='existuser' && isset($post["existdb"]) && isset($post["existuser"]) && isset($post["existpass"])){
			    $connect .= ";dbname=".$post["existdb"];
				$user = $post["existuser"];
				$pw = $post["existpass"];
				$db = $post["existdb"];
			}
		}
		//If we need a user/db, creat it here
		if($post["dbuserradio"]=='privuser'){
		    Tools::Log("about to create the user/db for root", true);
			

			$pw = $this->CreateDbForRoot($connect,$post); 

			if($pw === false){
			    Tools::Log("pw was false. epic fail", true);
				return;
			}

			//Now that the database and user is setup, overwrite the root creds with the si creds.
			Tools::Log("Created the new database user.");
			$user = $post["newuser"];
			$db = $post["newdbname"];
			$connect .= ";dbname=$db";
		}

		//setup the /domain/hostname directory
		if(isset($post['domain'])){
		    $domain = $post['domain'];
		}else{
		    $domain = 'localhost'; //this should never happen if I validated right on the form
		}
		//
		try{
			$this->CreateDomainFolder($domain);
		}catch(\RuntimeException $ex){
			return $this->RejectInput('Unable to create the domain folder. Check its name and permissions.');
		}
		
		//move the current DbCreds file to an incremented one as to not overwrite any passwords
		$dbcrds =  $_SERVER["DOCUMENT_ROOT"].'/core/DbCreds';
		if(file_exists($dbcrds.".php"))
		{
			$test = trim(file_get_contents($dbcrds.".php"));
			Tools::Log("Logging Test");

			Tools::Log("Done Loggin Test");
			if($test != "<?php\nnamespace SuperIntuitive;\nclass DbCreds { }"){
				$counter=1;
				while (file_exists($dbcrds."_".$counter.".php")) {
						$counter++;
				}

				if (!copy($dbcrds.".php", $dbcrds."_".$counter.".php")) {
					Tools::Log("Failed to copy file",true);
				}else{
					Tools::Log("Copy success",true);
				}
			}

		}

        $newcreds = $this->BuildCredentials($post, $user, $pw, $db);
        if(file_put_contents($dbcrds.'.php', $newcreds, LOCK_EX) === false){
            return $this->RejectInput('Unable to write database configuration.');
        }
        chmod($dbcrds.'.php', 0640);
        if(function_exists('opcache_invalidate')){
            opcache_invalidate($dbcrds.'.php', true);
        }
		chmod($_SERVER["DOCUMENT_ROOT"].'/core', 0755);
		//$dbms_schema = $_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql';
		


		//$sqls = explode(';',$sql_query);
		//this is the dbc to build the database
		$dbc=null;
		try{
		    Tools::Log("Try to connect",true);
			$dbc = new PDO($connect, $user, $pw, array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
			Tools::Log("Connected with db string: ".$connect, true);
		} catch (\PDOException $e) {
			Tools::Log("New Database login error: ". $e->getMessage());
			return $this->RejectInput('Unable to connect to the installation database.');
		}

		Tools::Log($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql', true);

		//$sqlfile = file_get_contents($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql');
		$sqlfile = file($_SERVER["DOCUMENT_ROOT"].'/core/setup/super_intuitive_install.sql', FILE_SKIP_EMPTY_LINES);
		


		array_unshift($sqlfile, "USE `$db`;\n");

		$this->RemoveBlanksAndComments($sqlfile);

		//change it into a string to do the replaces
		$sqlstr = implode($sqlfile);

		//This allows new installs to have their own fresh guids and not old ones that were made when I made the installer sql script.

		//$guidTokens = array();

		$this->ReplaceTokens($sqlstr, $post);


		// Never log SQL containing account credentials or password hashes.
		//split again but this time by semicolons followed by newlines
		$sqlfile = explode(';'.PHP_EOL,$sqlstr);
		//Tools::Log($sqlfile,true);

		$outcome = true;
		$msg = "";
		foreach($sqlfile as $sql){
			if(trim($sql) === ''){
				continue;
			}
			try {
				$dbc->exec($sql);
			} catch (\PDOException $ex) {
				Tools::Log("Error performing Query: " . $sql . "   Message: " . $ex->getMessage() . "\n",true);
				$msg .= $ex->getMessage()." ";
				$outcome = false;
			}
		}
	
		if($outcome){
			$dbc->exec('COMMIT');
			$dbc->exec('SET autocommit = 1');
			if(!$this->PersistInstallMarkers($dbc)){
                return $this->RejectInput('Installation completed but its lock could not be saved. An administrator must repair the installation.');
            }
            SetupAuthorization::Revoke();
			$result = array("outcome" => true, "time" => "5000", "message"=>"Congratulations!<br />Setup is Complete.<br />Welcome to Super Intuitive!" );
			echo json_encode($result);
			session_unset(); 
		}else{
			echo json_encode(array('outcome' => false, 'message' => 'Unable to complete installation. An administrator must check the database.'));
		}
	}

}
