<?php
Tools::Autoload();
class Sessions {
	private $sessionId;
	private $sessionEntId = null;
	private $sessionTimeout = 2326000;

	public function __construct(){
	   
	    /*
		session_set_save_handler(
			array($this, 'Open'),
			array($this, 'Close'),
			array($this, 'Read'),
			array($this, 'Write'),
			array($this, 'Destroy'),
			array($this, 'Garbage')
		);
		*/

		if (session_status() == PHP_SESSION_NONE) {
		    
			session_start();
		    $this->sessionid = session_id();
			//$this->Open('foo', 'bar');
			//$this->Read($this->sessionid);
		}
		
		if(!isset($_SESSION['SI'])){
			$_SESSION['SI'] = array();
		}
	}

	public function Open($path, $name) {
		$id = $this->sessionId;
		$session = new Entity('sessions');
		$session->Attributes->Add(new Attribute('sessionid', $id));
		$found = $session->Retrieve('id');
		if($found){
			$this->sessionEntId = $found[0]['id'];
			$session->Attributes->Add(new Attribute('lastaccesstime', time()));
			$session->Update();
		}else{
			$session->Attributes->Add(new Attribute('sessiondata', ''));
			$session->Create();
		}

 
	}
	public function Read($id) { 
		echo $id;
		if($this->sessionEntId != null){
			$session = new Entity('sessions');
			$session->Id = $this->sessionEntId;
			$found = $session->Retrieve('sessiondata');
			if($found){
				return $found[0]['sessiondata'];
			}
		}

		return false;
    }
	public function Close(){
		return true;
	}

    public function Write($id, $data){
		if($this->sessionEntId != null){
			$session = new Entity('sessions');
			$session->Id = $this->sessionEntId;
			$session->Attributes->Add(new Attribute('sessiondata', $data));
			$session->Attributes->Add(new Attribute('lastaccesstime', time()));
			return $session->Update();
		}
		return false;
	}
    public function Destroy($id){
		if($this->sessionEntId != null){
			$session = new Entity('sessions');
			$session->Id = $this->sessionEntId;
			$session->Delete();
			return true;
		}
		return false;
	}
    public function Garbage($maxlifetime){
		//this need to happen in a cron job
		$db = new Database();
		$dbc = $db->DBC();
		$timeout= time() - $this->$sessiontimeout;
		$sql = $dbc->prepare('DELETE FROM sessions WHERE lastaccesstime < :timeout');
		$sql->bind(':timeout', $timeout);
		if($sql->execute()){
			return true;
		}
		return false;
	}


	public function SetDomain(){
		$overwrite = FALSE;
		if(!isset($_SESSION['SI']['domains'])){
			$_SESSION['SI']['domains'] = array();
		}
		if(defined(SI_DOMAIN_ID) && defined(SI_DOMAIN_NAME)){
			if(empty($_SESSION['SI']['domains'][SI_DOMAIN_ID]) || $overwrite){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['name'] = SI_DOMAIN_NAME;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['id'] = SI_DOMAIN_ID;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'] = array();
			}
		}
	}
	public function SetSubDomain(){
		if( defined(SI_DOMAIN_ID) && isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains']) && defined(SI_SUBDOMAIN_ID) ){
			if( empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]) ){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['name']= SI_SUBDOMAIN_NAME;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['id']= SI_SUBDOMAIN_ID;
			}
		}
	}
	public function SetDeployment(){
		$overwrite = FALSE;
		if( empty( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] ) || $overwrite){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] = "live";
		}
				//define the deployment state
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'])){
			define('SI_DEPLOYMENT',  $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment']);
		}else{
			define('SI_DEPLOYMENT',  'live');
		}

	}
	public function SetInitialUser(){
		$overwrite = FALSE;
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME])){				
			if(!isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']) || $overwrite){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user'] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['name'] = 'guest';
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'] = '0x00000000000000000000000000000000';
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs'] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['loggedin'] = false;

				$db = new Database();
				$guestrules = $db->GetGuestRules(); //special case lookup functions because we dont have teh entities yet. 
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['permissions'] = $guestrules;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'][] = "Guest";
			}else{
				//We have a user and know and know it is. Lets proceed with the users data
				if(count($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'])==0 ){
					$db = new Database();
					$guestrules = $db->GetGuestRules(); //special case lookup functions because we dont have teh entities yet. 
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['permissions'] = $guestrules;
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'][] = "Guest";

				}
			}
		}
		else{
			// Not enough data to proceed
		}
	}
	
	//dupe function??
	public function LogClient(){
		$db = new Database();
		//$this->Connect();
	    $ip = Tools::GetIpAddress();
		$sid =session_id();
		if($this->entityLookup != null &&  isset($this->entityLookup["sessions"])){	
			$entityId = $this->entityLookup["sessions"];	
			$serverCols = "";
			$serverVals = "";
			$binds = array(":sessionid"=>$sid,":ipaddress"=>$ip);
			foreach($_SERVER as $k=>$v){
				$serverCols.=",`$k`";
				$serverVals.=",:$k";
				$binds[":$k"]=$v;
			}
			$guid = new Guid(true);
			$g = $guid->ToString();
			$insert = "INSERT INTO `sessions`(`id`,`entity_id`,`sessionid`,`ipaddress` $serverCols ) 
						VALUES ($g,$entityId,:sessionid,:ipaddress $serverVals ) ON DUPLICATE KEY UPDATE count = count + 1;";
			//$sql = $this->pdo->prepare($insert);
			//$sql->execute($binds);
			$sql = null;
		}
	}
} 