<?php
Tools::Autoload();
class Sessions {
	public function __construct(){
		//Tools::Log("In Session constructor");
		if (session_status() == PHP_SESSION_NONE) {
		   // ini_set('session.cookie_domain', '.'.SI_DOMAIN_NAME ); //this line fucks things up
			session_start();
		}

		if(!isset($_SESSION['SI'])){
			$_SESSION['SI'] = array();
		}
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
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'] = array();
			}
		}
	}
	public function SetBusinessUnit(){
		if( defined(SI_DOMAIN_ID) && isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits']) && defined(SI_BUSINESSUNIT_ID) ){
			if( empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]) ){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['name']= SI_BUSINESSUNIT_NAME;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['id']= SI_BUSINESSUNIT_ID;
			}
		}
	}
	public function SetDeployment(){
		$overwrite = FALSE;
		if( empty( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'] ) || $overwrite){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'] = "live";
		}
	}
	public function SetInitialUser(){
		$overwrite = FALSE;
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME])){				
			if(!isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']) || $overwrite){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user'] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['name'] = 'guest';
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['id'] = '0x00000000000000000000000000000000';
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['prefs'] = array();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['loggedin'] = false;

				$db = new Database();
				$guestrules = $db->GetGuestRules(); //special case lookup functions because we dont have teh entities yet. 
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['permissions'] = $guestrules;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['roles'][] = "Guest";
			}else{
				//We have a user and know and know it is. Lets proceed with the users data
				if(count($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['roles'])==0 ){
					$db = new Database();
					$guestrules = $db->GetGuestRules(); //special case lookup functions because we dont have teh entities yet. 
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['permissions'] = $guestrules;
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['roles'][] = "Guest";

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