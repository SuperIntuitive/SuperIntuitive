
<?php
Tools::Autoload();
class Setup {

	public function __construct(){
		$domdir = $_SERVER["DOCUMENT_ROOT"].'/domains';
		if( is_dir($domdir) === false )
		{
			mkdir($domdir,0777);
		}
		$coredir = $_SERVER["DOCUMENT_ROOT"].'/core';
		chmod($coredir, 0777);
	}	
	public function __destruct(){
	}	

	static function Log($data){
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

	   //Get the supported pdo drivers

		return "<link rel='stylesheet' type='text/css' href='/style/setup.css'>
		<script src='/scripts/setup.js'></script>
		";			
	}			
	public function GetBody(){
		
		if(isset($_SESSION)){
			session_unset();
		}

		require_once "MiscData.php";
		$miscdata = new MiscData();
		//Get Languages
		$langs = $miscdata->Languages;
		$langoptions = "";
		$detectedlang = strtolower(explode(",",$_SERVER['HTTP_ACCEPT_LANGUAGE'])[0]);
		foreach($langs as $k=>$v){
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
			$dboptions.="<option>$v</option>";
		}
		
		$host = $_SERVER['HTTP_HOST'];
					
            return "<div>
					<header>
					  <h2>Setup <i>SuperIntuitive</i> CMS</h2>
					</header>
					<main>
						<section>
						    
							<nav>
								<ul>
									<li class='menuitem' id='mi_sysinfo' onclick='SI.Setup.MenuItemClick(this.id)'>System Info</li>
									<li class='menuitem' id='mi_database' onclick='SI.Setup.MenuItemClick(this.id)'>Database</li>
									<li class='menuitem' id='mi_local' onclick='SI.Setup.MenuItemClick(this.id)'>Location</li>
									<li class='menuitem' id='mi_admin' onclick='SI.Setup.MenuItemClick(this.id)'>Admin</li>
									<li class='menuitem' id='mi_review' onclick='SI.Setup.MenuItemClick(this.id)'>Review</li>
									<li class='menuitem' id='mi_install' onclick='SI.Setup.MenuItemClick(this.id)'>Install</li>
								</ul>
								<p>
									<button id='btnback' type='button' style='margin-top:100px; display:none' onclick='SI.Setup.ButtonClick(this);'>Back</button>
									<button id='btnnext' type='button' style='margin-top:100px' onclick='SI.Setup.ButtonClick(this);'>Next</button>
									<button id='si_setup_hiddenbtn' style='display:none;'/>
								</p>
							</nav>
							
							<form id='si_setup_form' onsubmit='SI.Setup.Submit(this)'>
								<article class='article' id='sysinfo'>
									<h1>System Info</h1><br />
									<p>Domain Name</p>
									<p><input id='si_setup_host' name='domain' value='$host' data-group='sysinfo'  onchange=' this.value = this.value.trim(); SI.Setup.TestDomain();'  required /><span id='si_setup_domainsuccess'></span>*</p> <br />
									<p>Notifications Email Address</p>
									<p><input id='si_setup_hostemail' type='email' name='noteemail' value='info@$host' data-group='sysinfo' /></p>
								</article>
					  
								<article class='article' id='database'>
									<h1>Database</h1><br />
									<p>Database Type</p>
									<p><select name='dbtype' id='si_setup_dbtype' required >$dboptions</select><b title='To enable more database connectors make sure the PDO driver is installed on your machine'>*</b></p><br />
									<p>Server</p>
									<p>
										<input name='dbserver' id='si_setup_dbserver' value='localhost' data-group='database' required/>
									</p>
									<br />
									<p>Port</p>
									<p>
										<input type='number' id='si_setup_dbport'  name='dbport' step='1' min='0' max='65535' value='3306' title='Defaults: My/MariaSQL is 3306, PostgreSQL is 5432, SQL Server is 1433, Oracle is 5121, and SQLite should be 0' id='si_setup_port' data-group='database' required/>
									</p>
									<br />

									<p>Database Login</p>
									<br />
									<input type='radio' value='privuser' checked name='dbuserradio' onchange='SI.Setup.ChangeDbLoginType(this)' data-group='database' id='si_setup_privuser'/>
									<label for='si_setup_privuser' >Use privlidged user</label>
									<br />
									<input type='radio' value='existuser' name='dbuserradio' onchange='SI.Setup.ChangeDbLoginType(this)' data-group='database' id='si_setup_existuser'/>
									<label for='si_setup_existuser'>Use existing user and database</label>
							
									<div id='si_prevuserbox'>
										<br />
										<p>Privlidged User</p>
										<p>This will use a privlidged user, usually root, to create a database and user with a long random password. The privlidged password is not stored and forgotten after the setup. The site password can be found in /core/DbCreds.php</p><br />
										<p><input  name='privuser' id='si_setup_pruser' value='root' required data-group='database' title='This user must be able to create databases, tables, user and grant access' /></p><br />
										<p>Privlidged Password</p>
										<p><input  name='privpass' type='password' value='x' id='si_setup_prpw' required data-group='database'/></p><br />	
										<p>New Database User</p>
										<p><input name='newuser' value='super_intuitive' id='si_setup_newun' data-group='database'/></p><br />
										<p>New Database</p>
										<p><input name='newdbname' value='super_intuitive' id='si_setup_newdb' data-group='database'/></p><br />					
									</div>
									<div id='si_existuserbox' style='display:none'>
										<br />
										<p>Existing Database</p>
										<p>This will use an existing database and user that you provide.</p><br />
										<p>Existing Database</p>
										<p><input name='existdb' value='database' id='si_setup_exdb' data-group='database'/></p><br />
										<p>Existing DB User</p>
										<p><input name='existuser' value='username' id='si_setup_exun' data-group='database'/></p><br />
										<p>Existing DB Password</p>
										<p><input name='existpass' value='x' type='password' id='si_setup_expw' data-group='database'/></p><br />					
									</div>
										<button type='button' onclick='SI.Setup.TestDatabase()'> Test Connection </button>
										<span id='si_setup_dbsuccess'></span>
								</article>
					  
								<article class='article' id='local'>
									<h1>Location</h1><br />
									<p>Primary Language</p>
									<p><select name='language' id='si_setup_lang' required data-group='local'>$langoptions</select></p><br />
									<p>Primary Timezone<b title='Use the timezone that you primaraly do business in. This may not be the same as the servers timezone'>*</b></p>
									<p><select name='timezone' id='si_setup_timezone' required data-group='local'>$timezonesoptions</select></p><br />
									<p>Primary Currency</p>
									<p><select name='currency'  id='si_setup_currency' required data-group='local'>$currenciesoptions</select></p><br />			 
								</article>
					  
								<article class='article' id='admin'>
									<h1>Administration</h1><br />
									<h6>Create top level user</h6><br />
									<p>Super User</p>
									<p><input name='adminuser' id='si_setup_adminuser' value='admin' data-group='admin'/></p><br />
									<p>Super User Password</p>
									<p><input name='adminpw' value='' minlength=8 id='si_setup_adminpassword' style='width:300px;' data-group='admin'/><button type='button' onclick='SI.Setup.SetRandomPassword(\"si_setup_adminpassword\")'>Generate Random</button></p>
									<p>Super User Email</p>
									<p><input name='adminemail' type='email' value='' id='si_setup_adminemail' style='width:300px;' data-group='admin'/></p>
								</article>
					  
								<article class='article' id='review'>
									<h1>Review</h1><br />
									<table id='reviewtable'>
									<tr><th colspan=2>Site Info</th><tr>
									<tr><td >Domain Name</td><td id='si_setup_host_rv'></td><tr>
									<tr><td >Notifications Email Address</td><td id='si_setup_hostemail_rv'></td><tr>
									<tr><th colspan=2>Database</th><tr>

									<tr><td >Database Type</td><td id='si_setup_dbtype_rv'></td><tr>
									<tr><td >Privlidged User</td><td id='si_setup_pruser_rv' ></td><tr>
									<tr><td >Privlidged User Password</td><td id='si_setup_prpw_rv' ></td><tr>

									<tr><td >Existing User</td><td id='si_setup_exdb_rv' ></td><tr>
									<tr><td >Existing User</td><td id='si_setup_exun_rv' ></td><tr>
									<tr><td >Existing User Password</td><td id='si_setup_expw_rv' ></td><tr>

									<tr><th colspan=2>Location</th><tr>
									<tr><td>Language</td><td id='si_setup_lang_rv'></td><tr>
									<tr><td>Timezone</td><td id='si_setup_timezone_rv'></td><tr>
									<tr><td>Currency</td><td id='si_setup_currency_rv'></td><tr>
									<tr><th colspan=2>Admin</th><tr>
									<tr><td>Super User Name</td><td id='si_setup_adminuser_rv'></td><tr>
									<tr><td>Super User Password</td><td id='si_setup_adminpassword_rv'></td><tr>
									<tr><td>Super User Email</td><td id='si_setup_adminemail_rv'></td><tr>
									</table>
								</article>	
								
								<article class='article' id='install'>
									<h1>Installing</h1><br />
									<p id='progressupdate'></p>
									<p>Progress</p>
									<p>
										<progress value=0 max=100 id='progressmeter'></progress>
									</p>
									<br />
								</article>
							</form>
						</section>
					</main>
					<footer>
					  <small>&copy; Copyright 2018, Super Intuitive</small>
					</footer>
					</div>
					<script>
						SI.Setup.Init();
					</script>
					";	
	}	

	public function TestDatabase($post){
	    $connect = null;
		$user = null;
		$pw = null;
		if(isset($post["dbtype"]) && isset($post["dbserver"]) && isset($post["dbport"]) && isset($post["dbuserradio"])){
			$connect = $post["dbtype"].":host=".$post["dbserver"].":".$post["dbport"].';';
			if($post["dbuserradio"]=='privuser' && isset($post["privuser"]) && isset($post["privpass"])){
				$user = $post["privuser"];
				$pw = $post["privpass"];
			}
			else if($post["dbuserradio"]=='existuser' && isset($post["existdb"]) && isset($post["existuser"]) && isset($post["existpass"])){
			    $connect .="dbname=".$post["existdb"];
				$user = $post["existuser"];
				$pw = $post["existpass"];
			}
		}
		Tools::Log($connect, true);
		
		try{
			$db = new pdo( $connect,
							$user,
							$pw,
							array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION));
			Tools::Log("Database Test OK for: ".$connect,true);
			die(json_encode(array('outcome' => true)));
		}
		catch(PDOException $ex){
		    Tools::Log("Database Test FAIL for: ".$connect."  Error:".$ex->getMessage(),true);
			die(json_encode(array('outcome' => false, 'message' => 'Unable to connect:'.$ex->getMessage())));
		}	
	}
	public function TestDomain($domain){
		$dirExists = file_exists($_SERVER["DOCUMENT_ROOT"].'/domains/'.$domain);

		if($dirExists ){
			return false;
		}	
		//do some other spec char checks
		return true;
	}
	private function CreateDomainFolder($domain){
		//PRE CONDITION: We already asked if they want to delete it by this point;
		if(!$this->TestDomain($domain)){
			$this->DeleteDomainFolder($domain);
		}
		
		$domdirectory = $_SERVER["DOCUMENT_ROOT"].'/domains';
		if (!is_dir($domdirectory)) {
			mkdir($domdirectory, 0755);
		} 

		$source = $_SERVER["DOCUMENT_ROOT"].'/core/setup/domaintemplate/';
		$dest= $_SERVER["DOCUMENT_ROOT"].'/domains/'.$domain;
		//Make the domain folder
		mkdir($dest, 0755);
		//Copy the setup/media folder into the new domain folder
		foreach ($iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS), RecursiveIteratorIterator::SELF_FIRST) as $item) {
			if ($item->isDir()) {
				mkdir($dest . DIRECTORY_SEPARATOR . $iterator->getSubPathName(), 0755);
			} else {
				copy($item, $dest . DIRECTORY_SEPARATOR . $iterator->getSubPathName());
			}
		}

	}
	private function DeleteDomainFolder($domain){
		$dir = $_SERVER["DOCUMENT_ROOT"].'/domains/'.$domain;
		$di = new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS);
		$ri = new RecursiveIteratorIterator($di, RecursiveIteratorIterator::CHILD_FIRST);
		foreach ( $ri as $file ) {
			$file->isDir() ?  rmdir($file) : unlink($file);
		}
		return true;  //SO-4594180
	}
	private $guidTokens = array();
	private $total = 0; //preg_match_all('(_SI_GUID_[1234567890]+)', $sqlstr, $matches2);
	private $unique = 0;
	private function ReplaceTokens(&$sqlstr, $post){
	    Tools::Log("In Replace Tokens");
		Tools::Log($sqlstr);
		Tools::Log("In Replace Guids");
		$sqlstr = preg_replace_callback(
			"(_SI_GUID_[1234567890]+)",
			function ($matches) {
				if(count($matches)>0){

					$match = $matches[0];
					Tools::Log("Matches:".$match);
					Tools::Log("Matches:".print_r($matches,true));
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
						//Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
						return $guid;
					}
					Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
				}
				Tools::Log("GuidTokens: ".print_r($this->guidTokens,true));
			},
			$sqlstr
		);
		Tools::Log("Afterreplace Guids");
		Tools::Log($sqlstr);
		//replace all of the created on 
		$sqlstr = str_replace("_SI_NOWTIME_"," CURRENT_TIMESTAMP() ",$sqlstr);
		
		//set the user password
		$hash = password_hash($post['adminpw'], PASSWORD_DEFAULT);
		Tools::Log("PW Hash: ".$hash, true);
		$sqlstr= str_replace('__SI_USER_PASSWORD__',$hash,$sqlstr);
		//set the host email
		$sqlstr= str_replace('__SI_USER_EMAIL__',$post['adminemail'],$sqlstr);
		//set the admin user name
		$sqlstr= str_replace('__SI_USER_NAME__',$post['adminuser'],$sqlstr);
		//set the domain
		$sqlstr= str_replace('__SI_DOMAIN_NAME__',$post['domain'],$sqlstr);
		//set the language
		$deflang = $post['language'];
		$sqlstr= str_replace('__SI_DEFAULT_LANGUAGE__',$deflang ,$sqlstr);

		$installedlanguages = ['ar','zh','en','fr','de','hi','it','ja','ko','es'];
		//if the selected language is not in the default languages list, we should add it.
		if(!in_array($post['language'],$installedlanguages)){
		    $miscdata = new MiscData();
		    $langname = $miscdata->languages[$deflang];
			$sqlstr= str_replace('__SI_DEFAULT_LANGUAGE_COLUMN__',   ", `_$deflang` longtext COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '{\"Name\":\"$langname\"}'"  ,$sqlstr);
			Tools::Error($sqlstr);
		}else{
		    //remove the token
		    $sqlstr= str_replace('__SI_DEFAULT_LANGUAGE_COLUMN__','',$sqlstr);
		}
		

		//set the dollars
		$sqlstr= str_replace('__SI_DEFAULT_CURRENCY__',$post['currency'],$sqlstr);
		//set the timezone
		$sqlstr= str_replace('__SI_DEFAULT_TIMEZONE__',$post['timezone'],$sqlstr);
		//set the timezone
		$sqlstr= str_replace('__SI_DEFAULT_NOTEEMAIL__',$post['noteemail'],$sqlstr);

		Tools::Log("GuidTokens:".print_r($this->guidTokens,true));
		Tools::Log("Total: ".$this->total);
		Tools::Log("Unique: ".$this->unique);

	}
	private function CreateDbForRoot($connection,$post){
		$pw = $this->RandomString();

		try {
			$root = $post['privuser'];
			$root_password = $post['privpass'];
			$user = $post['newuser'];
			$dbname = $post['newdbname'];
			$dbh = new PDO($connection, $root, $root_password);
			$dbserver = $post['dbserver'];
			Tools::Log($dbserver,true);
			$sql = " DROP DATABASE IF EXISTS `$dbname`;
			        DROP USER IF EXISTS '$user'@'$dbserver';
					CREATE DATABASE `$dbname` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;				
					CREATE USER '$user'@'$dbserver' IDENTIFIED BY '$pw';
					GRANT ALL PRIVILEGES ON $dbname.* TO '$user'@'$dbserver';
					FLUSH PRIVILEGES;";
			Tools::Log($sql,true);
			$dbh->exec($sql);
			//Tools::Log("Logging Error info for create db for root",true);
		//	Tools::Log($dbh->errorInfo(),true);
			//Tools::Log("Logged",true);
			Tools::Log("Created New User and Database for the website!",true);
		} catch (PDOException $e) {
		    Tools::Log("Failed to Create a New User and Database for the website :( ",true);
			echo json_encode(array('outcome' => false, 'message' => 'Unable to setup database or user: '.$e->getMessage()));
			$pw = false;
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
	private function RandomString()  {
	    //generate a random password between 24 and 32 chars
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';//!@#%^&*()_-+={[]}|';
		$charlen = strlen($characters)-1;
        $randstring = '';
		$len = rand(24,32);
        for ($i = 0; $i < $len; $i++) {
            $randstring .= $characters[rand(0,$charlen)];
        }

        return $randstring;
    }
	public function CreateDomain($domain){
	
		Tools::Log($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql', true);

		//$sqlfile = file_get_contents($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql');
		$sqlfile = file($_SERVER["DOCUMENT_ROOT"].'/core/setup/super_intuitive_install.sql', FILE_SKIP_EMPTY_LINES);
		



		//set the user password
		$hash = password_hash($post['adminpw'], PASSWORD_DEFAULT);
		Tools::Log("PW Hash: ".$hash, true);

		array_unshift($sqlfile, "USE $db;\n");


		$this->RemoveBlanksAndComments($sqlfile);

		//change it into a string to do the replaces
		$sqlstr = implode($sqlfile);

		//This allows new installs to have their own fresh guids and not old ones that were made when I made the installer sql script.

		//$guidTokens = array();

		$this->ReplaceTokens($sqlstr, $post);

		Setup::Log($sqlstr);
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
			try {
				$dbc->exec($sql);
			
			} catch (PDOException $ex) {
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
			echo json_encode(array('outcome' => false, 'message' => 'Error adding data to database: '.$msg));
		}

	}


    public function SetupSuperIntuitive($post){		
		$connect = null;
		$user = null;
		$pw = null;
		$db = null;
		$domain = null;
		if(isset($post["dbtype"]) && isset($post["dbserver"]) && isset($post["dbport"]) && isset($post["dbuserradio"])){
			$connect = $post["dbtype"].":host=".$post["dbserver"].":".$post["dbport"].';';
			if($post["dbuserradio"]=='privuser' && isset($post["privuser"]) && isset($post["privpass"])){
				$user = $post["privuser"];
				$pw = $post["privpass"];
			}
			else if($post["dbuserradio"]=='existuser' && isset($post["existdb"]) && isset($post["existuser"]) && isset($post["existpass"])){
			    $connect .="dbname=".$post["existdb"];
				$user = $post["existuser"];
				$pw = $post["existpass"];
				$db = $post["existdb"];
			}
		}

		if($post["dbuserradio"]=='privuser'){
		    Tools::Log("about to create the user/db for root", true);
			

			$pw = $this->CreateDbForRoot($connect,$post); 

			if($pw === false){
			    Tools::Log("pw was false. epic fail", true);
				return;
			}

			//Now that the database and user is setup, overwrite the root creds with the si creds.
			Tools::Log("created the new si db with pw:".$pw, true);
			$user = $post["newuser"];
			$db = $post["newdbname"];
			$connect .="dbname=$db";
		}

		//setup the /domain/hostname directory
		if(isset($post['domain'])){
		    $domain = $post['domain'];
		}else{
		    $domain = 'localhost'; //this should never happen if I validated right on the form
		}
		//
		$this->CreateDomainFolder($domain);
		
		//move the current DbCreds file to an incremented one as to not overwrite any passwords
		$dbcrds =  $_SERVER["DOCUMENT_ROOT"].'/core/DbCreds';
		if(file_exists($dbcrds.".php"))
		{
			$test = trim(file_get_contents($dbcrds.".php"));
			Tools::Log("Logging Test");
			Tools::Log($test);
			Tools::Log("Done Loggin Test");
			if($test != "<?php class DbCreds { }"){
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

				//Create new dbcreds
		$newcreds = '<?php
		class DbCreds {
			protected $servername = "'.$post['dbserver'].'";
			protected $username = "'.$user.'";
			protected $password = "'.$pw.'"; 
			protected $database = "'.$db.'";
			protected $dbtype = "'.$post["dbtype"].'";
		} ';
		file_put_contents($dbcrds.".php", $newcreds);
		Tools::Log("Built new Creds file",true);

		chmod($_SERVER["DOCUMENT_ROOT"].'/core', 0755);
		//$dbms_schema = $_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql';
		


		//$sqls = explode(';',$sql_query);
		//this is the dbc to build the database
		$dbc=null;
		try{
		Tools::Log("Try to connect",true);
			$dbc = new PDO($connect, $user, $pw);
			Tools::Log("Connected with db string: ".$connect, true);
		} catch (PDOException $e) {
			Tools::Log("New Database login error: ". $e->getMessage());
			die("DB ERROR: ". $e->getMessage());
		}

		Tools::Log($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql', true);

		//$sqlfile = file_get_contents($_SERVER["DOCUMENT_ROOT"].'/sql/super_intuitive-.sql');
		$sqlfile = file($_SERVER["DOCUMENT_ROOT"].'/core/setup/super_intuitive_install.sql', FILE_SKIP_EMPTY_LINES);
		


		array_unshift($sqlfile, "USE $db;\n");

		$this->RemoveBlanksAndComments($sqlfile);

		//change it into a string to do the replaces
		$sqlstr = implode($sqlfile);

		//This allows new installs to have their own fresh guids and not old ones that were made when I made the installer sql script.

		//$guidTokens = array();

		$this->ReplaceTokens($sqlstr, $post);


		Setup::Log($sqlstr);
		//split again but this time by semicolons followed by newlines
		$sqlfile = explode(';'.PHP_EOL,$sqlstr);
		Tools::Log($sqlfile,true);

		$outcome = true;
		$msg = "";
		foreach($sqlfile as $sql){
			try {
				$dbc->exec($sql);
			} catch (PDOException $ex) {
				Tools::Log("Error performing Query: " . $sql . "   Message: " . $ex->getMessage() . "\n",true);
				$msg .= $ex->getMessage()." ";
				$outcome = false;
			}
		}
	
		if($outcome){
			$result = array("outcome" => true, "time" => "5000", "message"=>"Congratulations!<br />Setup is Complete.<br />Welcome to Super Intuitive!" );
			echo json_encode($result);
			session_unset(); 
		}else{
			echo json_encode(array('outcome' => false, 'message' => 'Error adding data to database: '.$msg));
		}
	}

} 