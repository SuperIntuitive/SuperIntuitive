<?php
namespace SuperIntuitive; 
use \PDO;
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
Tools::Autoload();

class Database extends DbCreds 
{
	const INSTALL_STATE_FRESH = 'fresh_install';
	const INSTALL_STATE_READY = 'installed_ok';
	const INSTALL_STATE_DB_ERROR = 'installed_db_error';
	const INSTALL_STATE_PARTIAL = 'partial_install';

	private $pdo = null;
	private $entityLookup = array();
	private $pageGuid = null;
	private $pageName = null;
	private $pageStatusReason = null;
	private $dbSchema = null;
	private $entityTables = array();
	private $requiredInstallTables = array('domains', 'entities', 'settings', 'users', 'pages', 'relations');
	public  $databaseName = null;

	public function __construct(){
		$this->Connect();
	}
	public function __destruct(){
	}
	public function DBC(){
		return $this->pdo;
	}
	public static function GetInstallLockPath(){
		return $_SERVER["DOCUMENT_ROOT"].'/core/install.lock';
	}
	private function HasConfiguredDbCreds(){
		$creds = new DbCreds();
		return isset($creds->servername)
			&& isset($creds->username)
			&& isset($creds->password)
			&& isset($creds->database)
			&& isset($creds->dbtype)
			&& trim((string)$creds->servername) !== ''
			&& trim((string)$creds->username) !== ''
			&& trim((string)$creds->database) !== ''
			&& trim((string)$creds->dbtype) !== '';
	}
	private function HasInstallLock(){
		return is_file(self::GetInstallLockPath());
	}
	private function GetExistingInstallTables(){
		if($this->pdo === null || $this->pdo === false || empty($this->databaseName)){
			return array();
		}

		$placeholders = implode(',', array_fill(0, count($this->requiredInstallTables), '?'));
		$sql = "SELECT `table_name`
			FROM INFORMATION_SCHEMA.TABLES
			WHERE `table_schema` = ?
			AND `table_name` IN ($placeholders)";

		try{
			$stmt = $this->pdo->prepare($sql);
			$params = array_merge(array($this->databaseName), $this->requiredInstallTables);
			$stmt->execute($params);
			$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
			return is_array($tables) ? $tables : array();
		}
		catch(\PDOException $ex){
			Tools::Error("Install table lookup failed: ".$ex->getMessage(), true);
		}

		return array();
	}
	private function HasInstallMarkerSetting(){
		if($this->pdo === null || $this->pdo === false){
			return false;
		}

		try{
			$stmt = $this->pdo->prepare("SELECT `settingvalue` FROM `settings` WHERE `settingname` = :settingname LIMIT 1");
			$stmt->execute(array(':settingname' => 'SiteInstalled'));
			$value = $stmt->fetchColumn();
			if($value === false){
				return false;
			}

			return in_array(strtolower(trim((string)$value)), array('1', 'true', 'yes'), true);
		}
		catch(\PDOException $ex){
			Tools::Error("Install marker lookup failed: ".$ex->getMessage(), true);
		}

		return false;
	}
	private function HasLegacyInstalledData(){
		if($this->pdo === null || $this->pdo === false){
			return false;
		}

		try{
			$domains = (int)$this->pdo->query("SELECT COUNT(*) FROM `domains`")->fetchColumn();
			$entities = (int)$this->pdo->query("SELECT COUNT(*) FROM `entities`")->fetchColumn();
			$users = (int)$this->pdo->query("SELECT COUNT(*) FROM `users`")->fetchColumn();
			return $domains > 0 && $entities > 0 && $users > 0;
		}
		catch(\PDOException $ex){
			Tools::Error("Legacy install lookup failed: ".$ex->getMessage(), true);
		}

		return false;
	}
	public function GetInstallState(){
		$hasInstallLock = $this->HasInstallLock();
		$hasConfiguredCreds = $this->HasConfiguredDbCreds();

		if($this->pdo === null || $this->pdo === false){
			if($hasInstallLock || $hasConfiguredCreds){
				return self::INSTALL_STATE_DB_ERROR;
			}

			return self::INSTALL_STATE_FRESH;
		}

		$existingTables = $this->GetExistingInstallTables();
		$tableCount = count($existingTables);
		if($tableCount === 0){
			if($hasInstallLock || $hasConfiguredCreds){
				return self::INSTALL_STATE_PARTIAL;
			}
			return self::INSTALL_STATE_FRESH;
		}

		if($tableCount < count($this->requiredInstallTables)){
			return self::INSTALL_STATE_PARTIAL;
		}

		if($this->HasInstallMarkerSetting() || $this->HasLegacyInstalledData()){
			return self::INSTALL_STATE_READY;
		}

		if($hasInstallLock || $hasConfiguredCreds){
			return self::INSTALL_STATE_PARTIAL;
		}

		return self::INSTALL_STATE_FRESH;
	}
	private function Connect(){
		if($this->pdo){
			$this->pdo = null;
		}
		try 
		{		
			$creds = new DbCreds();
			if(!isset($creds->servername) && !isset($creds->username) && !isset($creds->password) && !isset($creds->database) && !isset($creds->dbtype)){
				return false;
			}
			$this->databaseName = $creds->database;
			$options = [
				PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
				PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
				PDO::ATTR_EMULATE_PREPARES   => false,
			];
			$port = isset($creds->port) ? (int)$creds->port : 3306;
			$this->pdo = new PDO("$creds->dbtype:host=$creds->servername;port=$port;dbname=$creds->database;charset=utf8mb4", $creds->username, $creds->password,$options);
		}
		catch(\PDOException $ex)
		{
		    $this->pdo = false;
			Tools::Error("Database connection error: ".$ex->getMessage(),true);
		}
	}
	public function IsCmsSetup(){
		return $this->GetInstallState() === self::INSTALL_STATE_READY;
	}	
	public function Execute($sql){
		$exc = $this->pdo->prepare($sql);
		//Tools::Log("In Execute after prep");
		$fetch =  $exc->execute();
		Tools::Log($fetch);
	}	
	public function GetDomainInstance(){
		//When the page is called to load, this looks at the domain and subdomain(bu) to 
		//get a list of entities from the entities table. This list is a key as to which entities belong to the sub.domain combo. 
		//All entities are owned by a sub.domain combination. 
		try{
			$data = $this->pdo->prepare("
				SELECT domains.name AS domainName, domains.status AS domainStatus, HEX(domains.id) AS domainId, subdomains.name AS subdomainName, subdomains.status AS subdomainStatus, HEX(subdomains.id) AS subdomainId, entities.name AS entityName, HEX(entities.id) AS entityId
				FROM domains
				INNER JOIN subdomains ON domains.id = subdomains.domain_id 
				INNER JOIN entities ON domains.id = entities.domain_id AND subdomains.id = entities.subdomain_id
				WHERE domains.name = :domain AND subdomains.name = :subdomain AND domains.status = 'active' AND subdomains.status = 'active' AND entities.status = 'active'");
			$data->execute( array(':domain'=>SI_DOMAIN_NAME,':subdomain'=>SI_SUBDOMAIN_NAME) );
		}
		catch(\PDOException $ex)
		{
		    $this->pdo = false;
			Tools::Error("Database connection error: ".$ex->getMessage(),true);
		}

		$count = $data->rowCount();			
		//Tools::Log(SI_SUBDOMAIN_NAME.".".SI_DOMAIN_NAME);
		if($count == 0){
			$pageobjects = "%EMPTY_DOMAIN%";
			Tools::Error("Domain: ".SI_DOMAIN_NAME." with Business Unit: ".SI_SUBDOMAIN_NAME." can not be found");
			return $pageobjects;
		}
		else{
			$entityLookup = array();
			$pageobjects = array();
			$pageobjects['domain'] = array();
			$pageobjects['subdomain'] = array();
			$pageobjects['entities'] = array();
			$requiredEntities=['pages','blocks','media','relations','users'];
			foreach ($data as $row) {
				foreach($row as $k=>$v){
					if(!isset($pageobjects['domain']['id']) && $k ==  'domainId'){
						$pageobjects['domain']['name'] = $row['domainName'];					   
						$pageobjects['domain']['status'] = $row['domainStatus'];
						//$pageobjects['domain']['defaultLanguage'] = $row['defaultLanguage'];
						$pageobjects['domain']['id'] = '0x'.$v;
						define("SI_DOMAIN_ID",'0x'.$v);

					}
					else if(!isset($pageobjects['subdomain']['id']) && $k ==  'subdomainId'){
						$pageobjects['subdomain']['name'] = $row['subdomainName'];
						$pageobjects['subdomain']['status'] = $row['subdomainStatus'];
						$pageobjects['subdomain']['id'] = '0x'.$v;
						define("SI_SUBDOMAIN_ID",'0x'.$v);
					}
					else if( $k == 'entityId'){
			   			$pageobjects['entities'][$row['entityName']] = $v;
						$entityLookup[$row['entityName']] = '0x'.$v;
						$entityLookup['0x'.$v] = $row['entityName'];
						Tools::RemoveArrayValue($row['entityName'],$requiredEntities);
					}
					else{
					}
				}
			}
			if(count($requiredEntities)>0){
				Tools::Error("Required Entities not included:");
				Tools::Error($requiredEntities);
			}

			$session = new Sessions();
			//Once we have the Domain, Bu and entity lookup list we set the domain in the session domain tree under SI
			$session->SetDomain();
			//The business unit is set under the Domain. One could conceivably and more likely  usually have multi domains and bu in the SI SESSION obj. THey should not be confused ever. 
			$session->SetSubDomain();
			//The deployment is set under the business unit. Moving from one domain or bu to another could change your deployment to what you were on when you were last there. no big deal.  
			$session->SetDeployment();

			//clear and check every time
			//unset($_SESSION['SI']['domains'][SI_DOMAIN_ID]['subdomains'][SI_SUBDOMAIN_ID]['entities']);
			$this->entityLookup = $entityLookup;

			return $pageobjects;		
		}
	}
	public function GetDatabaseSchema($pageobjects){
		//Add these items to the SI data array
		if(isset($pageobjects['domain']['id'])){

			//$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['defaultlanguage'] = $pageobjects['domain']['defaultLanguage'];

			//Get the Users roles;
			//Get the SecurityRoles Entity Read allowences.
			//Get the Read Entity rules that they have.
			//Formulate a sql IN() set with the allowed entities
			//for now, if its a Guest, they need to read users to login
			$allowRead = '';
			//The roles only effect Entity operations which loggin in is. 
			//The pages blocks and other things by default do not need anything because they direct sql calls. This could change. 
			//this is my beautiful place to csv all of the entities that the users roles->rules allow them to read. 
			//the role is checked again on EntityAction jobs

			if(Tools::UserHasRole("Guest") ){
				$allowRead = "AND `tbl`.`table_name` IN('users','blocks','localtext','pages','relations','domains','subdomains','securityroles') "; //for now the only entity the guest user needs to have a session saved for is users for loging in.

			}
			//if its an admin give all aka = "";
			if(Tools::UserHasRole("Admin")){
				$allowRead = ''; //completely lose the table condition and get them all.
			}

			//Get a bunch of database schema from our DB. Table and fields and data types and comments and stuff
			$schema = "SELECT cols.table_name, tbl.table_comment, cols.is_nullable, cols.column_name, cols.column_type, cols.column_comment,cols.column_default,cols.column_key,cols.character_maximum_length
			FROM INFORMATION_SCHEMA.COLUMNS cols
			JOIN INFORMATION_SCHEMA.TABLES tbl ON cols.table_name = tbl.table_name AND cols.table_schema = tbl.table_schema
			WHERE cols.table_schema = '$this->databaseName' $allowRead
			ORDER BY table_name, ordinal_position";
			//Tools::Log($schema, true);
			$data = $this->pdo->prepare($schema);
			//print_r($data);
    		$data->execute( );


			//Now add our entities and their data to the object
			//For each column in the whole database
			$entities = array();
            $deploymentColumns = array();
			foreach ($data as $row) {
			//	Tools::Log($row,true);
				$entity = $row['table_name'];
                if(preg_match('/^(dev|test|live|rollback)-(.+)$/D', $row['column_name'], $deploymentColumn)){
                    $deploymentColumns[$entity][$deploymentColumn[2]][] = $deploymentColumn[1];
                }
				$entityoptions = $row['table_comment'];
				$field = $row['column_name'];
				$type = $row['column_type'];
				$default =  $row['column_default'];
				$columnkey =  $row['column_key'];
				$charmaxlength =  $row['character_maximum_length'];
				$isNullable =  $row['is_nullable'];
			
				$fieldoptions = array();
				$lookup = null;
				$comment =  $row['column_comment'];

				$comments = explode(';',$comment);
				
				if(sizeof($comments)>0){
					foreach($comments as $kvp){
					
						$parts = explode(':', $kvp);
						if(count($parts) == 2){
							$fieldoptions[$parts[0]]=$parts[1];
						}
					}
				}
				if(count($fieldoptions) > 0){
					if(array_key_exists("entity",$fieldoptions)){
						$lookup = $fieldoptions['entity'];
					}
				}

				if(!array_key_exists($entity,$entities)){
					$entities[$entity]= array();
				}

				//get the entity guid for this domain/bu
				$entGuid = Tools::GetEntityGuidFromName($entity);
				//Tools::Log("entity Guid");
				//Tools::Log($entGuid);
				if(isset( $this->entityLookup[$entity])){
					$guid = $this->entityLookup[$entity];
					//$_SESSION['SI']['entities'][$entity]['instanceguid']=$guid;
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$entity]['instanceguid']=$guid;
					$entities[$entity]['instanceguid']=$guid;

					if(!isset($entities[$entity]['deployable']) ){
						$entities[$entity]['deployable']='false';
					}


				}
				else{
					//determine what to do if entity is not on list
					//continue;
				}

				$entities[$entity]["entityoptions"]  = json_decode($entityoptions, true);


				if(!array_key_exists($field,$entities[$entity])){

					if(Tools::StartsWith($field,'live-')){
						$field =str_replace('live-','',$field);
						$entities[$entity]['deployable']='true';
						$entities[$entity]['attributes'][$field]= array();
						$entities[$entity]['attributes'][$field]['deployable'] = 'true';
					}else if(Tools::StartsWith($field,'test-') || Tools::StartsWith($field,'dev-') || Tools::StartsWith($field,'rollback-') ){
						continue;
					}else{
						$entities[$entity]['attributes'][$field] = array();
					}
			
					if($field!=null){			
						$unsigned = false;

						if(!strpos( $type,'unsigned')===false ){
							$entities[$entity]['attributes'][$field]['unsigned']='true';
							$unsigned = true;
						}

						$entities[$entity]['attributes'][$field]['optional']=$isNullable;


						if($row['character_maximum_length'] != NULL ) 
						{
							$entities[$entity]['attributes'][$field]['maxchars'] = $row['character_maximum_length'];
						}

						if($field == 'p_id'){
							$entities[$entity]['attributes'][$field]['type'] = "incrementor";
							$entities[$entity]['attributes'][$field]['min']  = '0';
							$entities[$entity]['attributes'][$field]['max']  = '18446744073709551615';
						}
						else if($field == 'id'){
							$entities[$entity]['attributes'][$field]['type'] = "primary";
						}
						else if($field == 'sum'){
							$entities[$entity]['attributes'][$field]['type'] = "counter";
						}
						else if( Tools::EndsWith($field, '_id') && ($row['column_type'] =="binary(16)") )
						{
							if($field == "entity_id"){
								$entities[$entity]['attributes'][$field]['type'] = "sitekey";
							}else{
								$entities[$entity]['attributes'][$field]['type'] = "lookup";
								if($lookup != null){
									$entities[$entity]['attributes'][$field]['lookup'] = $lookup;
								}	
							}			
						}
						else if( Tools::StartsWith( $row['column_type'] , 'enum(') ) 
						{
							$entities[$entity]['attributes'][$field]['type'] = 'optionset';
							$entities[$entity]['attributes'][$field]['options'] =  str_replace( ')','',str_replace('enum(','',$row['column_type'] ));
						}
						else if( Tools::StartsWith( $row['column_type'] , 'set(') ) 
						{
							$entities[$entity]['attributes'][$field]['type'] = 'multioptionset';
							$entities[$entity]['attributes'][$field]['options'] =  str_replace( ')','',str_replace('set(','',$row['column_type'] ));
						}
						else if( Tools::StartsWith( $row['column_type'] , 'char(') ) 
						{
							$entities[$entity]['attributes'][$field]['type'] = 'char';
						}
						else if( Tools::StartsWith( $row['column_type'] , 'decimal(') ) 
						{
							$entities[$entity]['attributes'][$field]['type'] = 'decimal';
							$places =  explode(',',str_replace( ')','',str_replace('decimal(','',$row['column_type'] )));
								
							$entities[$entity]['attributes'][$field]['wholeplaces']= $places[0];
							$entities[$entity]['attributes'][$field]['decimalplaces'] =$places[1];
						}
						else if($type =='year(4)') 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'year';
						}
						else if(strpos( $type,'text')!==false  || strpos( $type,'varchar(')!==false) 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'text';
						}
						else if(strpos( $type,'tinyint(')!==false ) 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'number';
							if($unsigned){
								$entities[$entity]['attributes'][$field]['min']  = '-128';
								$entities[$entity]['attributes'][$field]['max']  = '128'; 
							}else{
								$entities[$entity]['attributes'][$field]['min']  = '0';
								$entities[$entity]['attributes'][$field]['max']  = '255';  								
							}
						}
						else if(strpos( $type,'smallint(')!==false ) 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'number';
							if($unsigned){
								$entities[$entity]['attributes'][$field]['min']  = '-32768';
								$entities[$entity]['attributes'][$field]['max']  = '32767'; 
							}else{
								$entities[$entity]['attributes'][$field]['min']  = '0';
								$entities[$entity]['attributes'][$field]['max']  = '65535';  								
							}
						}
						else if(strpos( $type,'mediumint(')!==false ) 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'number';
							if($unsigned){
								$entities[$entity]['attributes'][$field]['min']  = '-8388608';
								$entities[$entity]['attributes'][$field]['max']  = '8388607'; 
							}else{
								$entities[$entity]['attributes'][$field]['min']  = '0';
								$entities[$entity]['attributes'][$field]['max']  = '16777215';  								
							}
						}
						else if(strpos($type,'int(')!==false ) 
						{		
							$entities[$entity]['attributes'][$field]['type']  = 'number';
							if($unsigned){
								$entities[$entity]['attributes'][$field]['min']  = '-2147483648';
								$entities[$entity]['attributes'][$field]['max']  = '2147483647';
							}else{
								$entities[$entity]['attributes'][$field]['min']  = '0';
								$entities[$entity]['attributes'][$field]['max']  = '4294967295';  								
							}
						}
						else if(strpos( $type,'longint(')!==false ) 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'number';
							if($unsigned){
								$entities[$entity]['attributes'][$field]['min']  = '-9223372036854775808';
								$entities[$entity]['attributes'][$field]['max']  = '9223372036854775807'; 
							}else{
								$entities[$entity]['attributes'][$field]['min']  = '0';
								$entities[$entity]['attributes'][$field]['max']  = '18446744073709551615';  								
							}
						}
						else if( $row['column_type'] == "binary(20)") 
						{
							$entities[$entity]['attributes'][$field]['type']  = 'sha1';
						}
						else{
							$entities[$entity]['attributes'][$field]['type']  = $type ;
						}
						//
						if(!empty($default))
						$entities[$entity]['attributes'][$field]['default'] =$default;

						if(!empty($columnkey)){
							$entities[$entity]['attributes'][$field]['index'] =$columnkey;
						}
					
					}	
				}
			}
			//Tools::Log($entities, true);
			
            foreach($deploymentColumns as $table => $fields){
                foreach($fields as $field => $levels){
                    $entities[$table]['attributes'][$field]['deployments'] = $levels;
                }
            }
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'] = $entities;
		}
	}
	public function GetGuestRules(){
	    //Tools::Log("In Get Guest Role", true);
		//first get the entity guid for the security role. then get the guest role
		//The reason for not using an entity is the user does not have entity access at this point;
		$sql = "SELECT HEX(`id`) AS `id` from `entities` WHERE `name`=:name AND `domain_id`=".SI_DOMAIN_ID." AND `subdomain_id`=".SI_SUBDOMAIN_ID;
		$securityRoleId = $this->pdo->prepare($sql);
		$parms = array();
		$parms[':name'] = "securityroles";
    	$securityRoleId->execute($parms );
		$result = $securityRoleId->fetch(PDO::FETCH_ASSOC);
		if(isset($result['id'])){
			$entid = '0x'.$result['id'];
			$sql = "SELECT `rules` FROM `securityroles` WHERE `name` = :guest AND `entity_id` = ".$entid;
			$parms = array();
			$parms[':guest'] = "Guest";
			$securityRules = $this->pdo->prepare($sql);
			$securityRules->execute($parms );
			$result = $securityRules->fetch(PDO::FETCH_ASSOC);
			if(isset($result['rules'])){
				$rules = json_decode(str_replace("appendto","appendTo",strtolower($result['rules']) ),true);
				Tools::Log($rules);

				return $rules;
			}
		}
		return null;
	}
	public function Query(string $table, array $parameters, string $columns = '_ALL_', $join = ""){
        $columns = ($columns == '_ALL_'? "*":$columns);
		$where = "";
		$params = array();
		foreach($parameters as $param){
			if($param->Column != null && $param->Value != null){
				$where .= $param->Column.$param->Operator.":".$param->Column;
				$params[$param->Column] = $param->Value;
			}
		}
		if(strpos($columns, ',') != FALSE){
			$cols = explode(',',$columns);
			$newCols = "";
			foreach($cols as $col){
				$newCols .= Tools::NeedsHex($col).',';
			}
			$columns = rtrim($newCols,',');
		}else{
			$columns = Tools::NeedsHex($columns);
		}
		$sql = "SELECT $columns FROM $table $join WHERE $where";
		$stmt = $this->pdo->prepare($sql);
		$stmt->execute($params); //make an array of key value pairs 
		$d = $stmt->fetchAll();
		return $d;
	}
	public function LogSession(){

	    $ip = Tools::GetIpAddress();
		// Audit records identify sessions without storing their bearer cookies.
		// Keep the fingerprint within the legacy 26-character column.
		$sid = substr(hash('sha256', session_id()), 0, 26);
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['sessions'])){
			$entityId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['sessions']['instanceguid'];	
			$guid = new Guid(true);
			$g = $guid->ToString();
			$userId = 'NULL';
			if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'])){
				$userId = Tools::FixGuid($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id']);
			}
			$binds = array(":sessionid"=>$sid,":ipaddress"=>$ip, ':update_ipaddress' => $ip);
			$insert = "INSERT INTO `sessions`(`id`,`entity_id`,`sessionid`,`user_id`,`ipaddress`) 
						VALUES ($g,$entityId,:sessionid,$userId,:ipaddress) 
						ON DUPLICATE KEY UPDATE `count` = `count` + 1, `user_id` = $userId, `ipaddress` = :update_ipaddress;";
			try{
				$sql = $this->pdo->prepare($insert);
				$sql->execute($binds);
				$sql = null;
			}catch( \PDOException $Exception ){
				Tools::Error("Session log failure: ".$Exception->getMessage(), true);
			}
		}
	}



	public function GetPageData($pageobjects){
	    if($pageobjects == "%EMPTY_DOMAIN%"){
			return  $pageobjects;
		}

		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
		$pageEntityId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['pages']['instanceguid'];
		$pageQuery = $this->pdo->prepare("SELECT HEX(`id`) AS `id`, `name`, `path`, HEX(`redirecttopage_id`) AS `redirecttopage_id`, `$deploymentlevel-options` AS `options` FROM `pages` WHERE `entity_id` = $pageEntityId AND `path` = :path AND `status` = 'active' LIMIT 1");
		$pageQuery->execute(array(':path' => SI_URI));
	    $mypage = $pageQuery->fetchAll(PDO::FETCH_ASSOC);
		if($mypage === null){
			Tools::Log("Error the page could not be returned.");
			exit();
		}
	    $pageobjects['page'] = array();
	    if(count($mypage)){

            // Enforce assigned page roles before loading blocks or following redirects.
            $roleQuery = $this->pdo->prepare("SELECT `securityroles`.`name` FROM `relations`
                INNER JOIN `securityroles` ON `securityroles`.`id` = `relations`.`child_id`
                WHERE `relations`.`parent_id` = UNHEX(:pageid) ");
            $roleQuery->execute(array(':pageid' => $mypage[0]['id']));
            $requiredRoles = $roleQuery->fetchAll(PDO::FETCH_COLUMN);
            if(count($requiredRoles) > 0 && !Tools::UserHasRole('Admin') && !Tools::UserHasRole($requiredRoles)){
                unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']);
                http_response_code(403);
                header('Cache-Control: no-store');
                exit('You do not have permission to view this page.');
            }

			//if there is a redirect do it.
			if(isset($mypage[0]['redirecttopage_id'])){
				$rid = Tools::FixGuid($mypage[0]['redirecttopage_id']);
				$rpage = new Entity("pages");
				$rpage->Id =$rid; 
				$myrpage = $rpage->Retrieve();
				if(count($myrpage) && isset($myrpage[0]['path'])){
					header("Location: /".$myrpage[0]['path']); 
					exit();
				}else{
				//Cant find the redirect page so send them to a 404 becuase we dont want them going to the original page if it should be redirected.
					header("Location: /404");
					exit();
				}
			}

			$pageobjects['page']['name']= $mypage[0]['name'];
			$pageobjects['page']['id']= $mypage[0]['id'];
			$pageobjects['page']['path']= $mypage[0]['path'];
			$pageobjects['page']['options']= $mypage[0]['options'];

			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['id']='0x'.$mypage[0]['id'];
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['name']= $mypage[0]['name'];

			$myblocks = $this->GetBlocks( '0x'.$pageobjects['page']['id'] );

			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['contentmodified'])){
				$pageobjects['page']['contentmodified']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['contentmodified'];
			}
			$pageobjects['blocks'] = $myblocks;

			//get site settings
			$pageobjects['page']['sitesettings']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings'] = array();
			$settingsentities = new Entity('settings');
			$settings = $settingsentities->Retrieve('settingname,settingvalue');
			$tmpSetting = array();
			if($settings != null){
				foreach($settings as $setting){
					$tmpSetting[$setting['settingname']] = $setting['settingvalue'];
					$pageobjects['page']['sitesettings']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['settings'][$setting['settingname']] = $setting['settingvalue'];
				}
			}
			//$settings = $tmpSetting;
			//Tools::Log($settings);
			//$settingsjson = json_encode($settings);
		}else{
			//Cant find the page. redirect the browser to 404 and bail out.
			header("Location: /404");
			exit();
			/*It is possible to just get the 404 from the db and display it, but the address stays what it was and if it is edited and saved then 404 will be renamed the errent address and will no longer work.
			It may be possble to hack the Page.php script to add some js to alert the editor that it is a 404 page to avoid renaming it. 
			This would allow the errent address to stay in the url while the 404 is displayed. 
			For now I will just redirect them to the 404 page and the editor will know because of the address.
			*/
		}
		return $pageobjects;
	}
	public function GetBlockTemplates($pageobjects){
		$btEntityId = $this->entityLookup['blocktemplates'];
		$sql = "SELECT 
			blocktemplates.name AS blocktemplateName, 
			
			blocktemplates.style AS blocktemplateStyle, 
			blocktemplates.html AS blocktemplateHtml, 
			blocktemplates.script AS blocktemplateScript, 
			blocktemplates.options AS blocktemplateOptions, 
			blocktemplates.thumb AS blocktemplateThumb, 
			blocktemplates.category AS blocktemplateCategory, 
			blocktemplates.order AS blocktemplateOrder, 
			HEX(blocktemplates.id) AS blocktemplateId

			FROM blocktemplates
			WHERE blocktemplates.entity_id=$btEntityId 
			ORDER BY blocktemplates.category ASC, blocktemplates.order ASC;";

		$data = $this->pdo->prepare($sql);
		$data->execute( );
		
		$pageobjects['admin']['blocktemplates'] = array();

		foreach ($data as $row) {
	
			$name = $row['blocktemplateName'];

			$pageobjects['admin']['blocktemplates'][$name] = array();
			$pageobjects['admin']['blocktemplates'][$name]['id'] = $row['blocktemplateId'];
			$pageobjects['admin']['blocktemplates'][$name]['style'] = $row['blocktemplateStyle'];
			$pageobjects['admin']['blocktemplates'][$name]['html'] = $row['blocktemplateHtml'];
			$pageobjects['admin']['blocktemplates'][$name]['script'] = $row['blocktemplateScript'];
			$pageobjects['admin']['blocktemplates'][$name]['order'] = $row['blocktemplateOrder'];
			$pageobjects['admin']['blocktemplates'][$name]['options'] = $row['blocktemplateOptions'];
			$pageobjects['admin']['blocktemplates'][$name]['category'] = $row['blocktemplateCategory'];
			$pageobjects['admin']['blocktemplates'][$name]['thumb'] = $row['blocktemplateThumb'];
		}
		return $pageobjects;
	}
	public function NewRelatedEntity($entityName, $entityId, $relatedEntityName, $relatedEntityId, $devorder = 0, $devoptions = null){
        $entities = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'] ?? array();
        $entityId = Tools::FixGuid($entityId);
        $relatedEntityId = Tools::FixGuid($relatedEntityId);
        $order = filter_var($devorder, FILTER_VALIDATE_INT);
        foreach(array($entityName, $relatedEntityName) as $name){
            if(!is_string($name) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $name) || !isset($entities[$name]['instanceguid'])){
                return false;
            }
        }
        if($entityId === false || $relatedEntityId === false || $order === false){
            return false;
        }
        // Both records must belong to this domain and subdomain, even for admins.
        foreach(array(array($entityName, $entityId), array($relatedEntityName, $relatedEntityId)) as $record){
            $query = $this->pdo->prepare("SELECT 1 FROM `".$record[0]."` WHERE id = UNHEX(:id) AND entity_id = UNHEX(:scope)");
            $query->execute(array(':id' => substr($record[1], 2), ':scope' => substr(Tools::FixGuid($entities[$record[0]]['instanceguid']), 2)));
            if(!$query->fetchColumn()){
                return false;
            }
        }
        $relation = new Entity('relations');
        foreach(array('parententity_id' => $entities[$entityName]['instanceguid'], 'childentity_id' => $entities[$relatedEntityName]['instanceguid'],
            'parent_id' => $entityId, 'child_id' => $relatedEntityId, 'live-order' => 0, 'test-order' => 0, 'dev-order' => $order, 'note' => $entityName.'_'.$relatedEntityName) as $key => $value){
            $relation->Attributes->Add(new Attribute($key, $value));
        }
        if($devoptions !== null){
            $relation->Attributes->Add(new Attribute('dev-options', $devoptions));
        }
        return $relation->Create();
    }
	public function RemoveRelation($linkid){
		$linkid = Tools::FixGuid($linkid);
		Tools::Log("Remove Relations ".$linkid);
		if($linkid){ //simple guid verify 
			try{
				$rel = new Entity('relations');
				$rel->Id = $linkid;
				$rel->Delete();

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REMOVERELATION'] = $linkid;
			}	
			catch (Exception $e) {
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = $e;
			}
		}
	}
	public function GetRelatedEntities($entityName, $entityGuid, $relatedEntityName, $columns = null){
        $entities = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'] ?? array();
        $entityGuid = Tools::FixGuid($entityGuid);
        $deployment = Tools::GetCurrentDeployment();
        if($entityGuid === false || !in_array($deployment, array('live', 'test', 'dev'), true)){
            return array();
        }
        foreach(array($entityName, $relatedEntityName, 'relations') as $name){
            if(!is_string($name) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $name) || !isset($entities[$name]['instanceguid'])){
                return array();
            }
        }
        $select = "HEX(r.id) AS relationsId, r.modifiedon AS relationsModifiedOn, r.`$deployment-options` AS relationsOptions, r.`$deployment-order` AS relationsOrder";
        if($columns === null){
            $select .= ", child.*, HEX(child.id) AS id";
        }else{
            if(!is_string($columns)){
                return array();
            }
            foreach(explode(',', $columns) as $column){
                $column = trim($column, " `");
                if(!preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/D', $column)){
                    return array();
                }
                $select .= Tools::EndsWith($column, '_id') || $column === 'id'
                    ? ", HEX(child.`$column`) AS `$column`" : ", child.`$column`";
            }
        }
        $query = $this->pdo->prepare("SELECT $select FROM `$entityName` parent
            INNER JOIN relations r ON r.parent_id = parent.id AND r.parententity_id = parent.entity_id
            INNER JOIN `$relatedEntityName` child ON child.id = r.child_id AND child.entity_id = r.childentity_id
            WHERE parent.id = UNHEX(:id) AND parent.entity_id = UNHEX(:parent_scope)
            AND child.entity_id = UNHEX(:child_scope) AND r.entity_id = UNHEX(:relation_scope)
            AND parent.status = 'active' AND child.status = 'active' AND r.status = 'active'
            ORDER BY r.`$deployment-order` ASC");
        $query->execute(array(':id' => substr($entityGuid, 2),
            ':parent_scope' => substr(Tools::FixGuid($entities[$entityName]['instanceguid']), 2),
            ':child_scope' => substr(Tools::FixGuid($entities[$relatedEntityName]['instanceguid']), 2),
            ':relation_scope' => substr(Tools::FixGuid($entities['relations']['instanceguid']), 2)));
        return $query->fetchAll();
    }
	public function GetPageLibraries(){
		$cols= "id,name";
		$data = array();
		$data = $this->GetRelatedEntities('pages', $this->pageGuid,'libraries', $cols );
		$libs = array();
		if($data !== null){
			foreach($data as $v){
				if(isset($v['name'])){
					$libs[$v['name']] = '0x'.$v['id'];
				}
			}
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['libraries'] = $libs;
		}
	}
	public function GetBlocks($pageid){	
	    //first clear the blocks from  prev page
	    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'] = array();
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
		//Tools::Log("IN GetBlocks: ".$deploymentlevel,true);
		$cols= "id,name,modifiedon,`$deploymentlevel-html`,`$deploymentlevel-style`,`$deploymentlevel-script`";
		$data = array();
		$data = $this->GetRelatedEntities('pages',$pageid,'blocks', $cols );
	    $contentModified = '';
		$blocks = array();
		foreach($data as $v){
			if(isset($v['name'])){
				$safeKey = Tools::SafeKey($v['name'],$blocks);
				$ittr = str_replace($v['name'],'',$safeKey);
				//Get multilingual data here and do the replacements. 

				
				$langs = explode(',',SI_LANGS);

				//Tools::Log($langs);
				$lang = "_en";
				$translations = array();
				$translations = $this->GetRelatedEntities('blocks', '0x'.$v['id'] ,'localtext', $lang );

				$blocks[$safeKey] = array();
				$blocks[$safeKey]["name"] = $v['name'];
				$blocks[$safeKey]["order"] = $v['relationsOrder'];
				$blocks[$safeKey]["options"] = $v['relationsOptions'];
				$blocks[$safeKey]["relationsModifiedOn"] = $v['relationsModifiedOn'];
				$blocks[$safeKey]["modifiedon"] = $v['modifiedon'];
				$contentModified.=$v['relationsModifiedOn']. $v['modifiedon'];
				$blocks[$safeKey]["ittr"]=$ittr;
				$blocks[$safeKey]['html'] = $v["$deploymentlevel-html"]; //'test html';//
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'][$v['name']]['id']='0x'.$v['id'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'][$v['name']]['name']= $v['name'];
				//Data only needed by admin for the editor
				if(Tools::UserHasRole('Admin')){
					$blocks[$safeKey]["id"] = '0x'.$v['id'];
					$blocks[$safeKey]["relationsId"] = '0x'.$v['relationsId'];
					$blocks[$safeKey]['script'] = $v["$deploymentlevel-script"];//'test script';//
					$blocks[$safeKey]['style'] =  $v["$deploymentlevel-style"]; //'test style'; //
				}
			}
		}
		$contentModified = md5($contentModified);
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['contentmodified'] = $contentModified;

		//Tools::Log($blocks,true);
		//if we are admin we need these in trhe editor
		if (Tools::UserHasRole('Admin')) 
		{
			if(!isset($_SESSION['SITMP'])){
				$_SESSION['SITMP'] = array();
			}
			$_SESSION['SITMP']['blocks'] = $blocks;
		}

		return $blocks;
	}
	public function GetBlockScriptsByIds($guids, $type='js'){
		if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'])){
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
			$select = "name,`$deployment-script` AS script";
			if($type==='css'){
			    $select = "name,`$deployment-style` AS script";
			}
			$sql = "SELECT $select FROM `blocks` WHERE ID in ($guids) "; 
		//	echo $sql;
		    $data = $this->pdo->prepare($sql);
			$data->execute();
			if($data->rowCount() == 0){
				return null;
			}
			$scripts = array();
			foreach ($data as $row) {		
				$scripts[$row['name']][$type] = $row['script'];
			}
			return $scripts;
		}
	}
	public function GetLibsByIds($id_csv, $type='js'){
		//hack for now until root cause is Found.
		$id_csv = str_replace("0x0x","0x",$id_csv);
		$select = "`name`,`live-js`,`live-css`";
		$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];

		if($deployment == 'dev'){
			$select = "`name`,`dev-js`";
			if($type==='css'){
			    $select = "`name`,`dev-css`";
			}
		}
		$sql = "SELECT $select FROM `libraries` WHERE `id` in ($id_csv) "; 
		 //   echo "/* $sql */";
		$data = $this->pdo->prepare($sql);
		$data->execute();
		if($data->rowCount() == 0){
			return null;
		}
		$libs = array();
		if($deployment !=='dev'){
			foreach ($data as $row) {
				if($type==='js'){			
					$libs[$row['name']]['JS'] = $row['live-js'];
				}
				else if($type==='css'){
					$libs[$row['name']]['CSS'] = $row['live-css'];				
				}
			}
		}else{
			foreach ($data as $row) {
				if($type==='js'){			
					$libs[$row['name']]['JS'] = $row['dev-js'];
				}
				else if($type==='css'){
					$libs[$row['name']]['CSS'] = $row['dev-css'];				
				}
			}
		}
		//print_r($relations);
		return $libs;
	}
	public function CreateEntity($name){
		$guid = new Guid(true);
		$g=$guid->ToString();
		$name = strtolower($name);
	    if($name != null && (!isset($this->entityLookup[$name]) ))
		{
			$createTable = "
			CREATE TABLE IF NOT EXISTS `$name` (
			  `p_id` bigint(20) NOT NULL,
			  `id` binary(16) NOT NULL,
			  `sum` bit(1) NOT NULL DEFAULT b'1',
			  `status` enum('active','inactive') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
			  `createdon` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP 
			  `modifiedon` datetime DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
			  `entity_id` binary(16) NOT NULL COMMENT 'entity:entities', 
			  `name` varchar(255) COLLATE utf8_unicode_ci NOT NULL 
			) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

			ALTER TABLE `$name` ADD PRIMARY KEY (`p_id`), ADD UNIQUE KEY `id` (`id`), ADD KEY `name` (`name`), ADD KEY `status` (`status`), ADD KEY `entity_id` (`entity_id`);
			ALTER TABLE `$name` MODIFY `p_id` bigint(20) NOT NULL AUTO_INCREMENT;
			-- ALTER TABLE `$name` ADD CONSTRAINT `{$name}_ibfk_1` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;					
			";

			if(!$this->ImportSqlFile($createTable)){
				echo "Failed to import";
			}
			else{
				$sql = "SELECT HEX(`id`) AS subdomain_id, HEX(`domain_id`) AS domain_id FROM `subdomains`";
				$data = $this->pdo->prepare($sql);
				$data->execute();
				foreach ($data as $row) 
				{
					$bu = '0x'.$row['subdomain_id'];
					$do = '0x'.$row['domain_id'];
					$insert ="INSERT INTO `entities`(`id`, `domain_id`, `subdomain_id`, `name`) VALUES ($g,$do, $bu, :name);";

					$stmt = $this->pdo->prepare($insert);
					$stmt->execute(['name' => $name]); 
					$stmt = null;
				}
			}
		}
	}
	public function ImportSqlFile($sqlFile, $tablePrefix = null, $InFilePath = null){
		try {
		
			// Enable LOAD LOCAL INFILE
			$this->pdo->setAttribute(\PDO::MYSQL_ATTR_LOCAL_INFILE, true);
		
			$errorDetect = false;
		
			// Temporary variable, used to store current query
			$tmpLine = '';
		
			// Read in entire file
			$lines = explode(PHP_EOL, $sqlFile);

			//$lines = file($sqlFile);
		
			// Loop through each line
			foreach ($lines as $line) {
				// Skip it if it's a comment
				if (substr($line, 0, 2) == '--' || trim($line) == '') {
					continue;
				}
				// Read & replace prefix
				$line = str_replace(['<<prefix>>', '<<InFilePath>>'], [$tablePrefix, $InFilePath], $line);
			
				// Add this line to the current segment
				$tmpLine .= $line;
			
				// If it has a semicolon at the end, it's the end of the query
				if (substr(trim($line), -1, 1) == ';') {
					try {
						// Perform the Query
						$this->pdo->exec($tmpLine);
					} catch (\PDOException $e) {
						echo "<br><pre>Error performing Query: '<strong>" . $tmpLine . "</strong>': " . $e->getMessage() . "</pre>\n";
						$errorDetect = true;
					}
				
					// Reset temp variable to empty
					$tmpLine = '';
				}
			}
		
			// Check if error is detected
			if ($errorDetect) {
				return false;
			}
		
		} catch (\Exception $e) {
			echo "<br><pre>Exception => " . $e->getMessage() . "</pre>\n";
			return false;
		}
	
		return true;
	}
	public function GetMediaFiles($pageobjects){
	    //this is only used for admin so well protect it in 
	    // if(isset($_SESSION['USER']['ROLES']) && in_array('ADMIN',$_SESSION['USER']['ROLES'])){
		if(Tools::UserHasRole("Admin")){


			$mediaEntityId = $this->entityLookup['media'];
		//	echo $mediaEntityId;
			$data = $this->pdo->prepare("
				SELECT HEX(id) AS id,
						`name`, 
					   `path`,
					   HEX(hash) AS hash,
					   `mime`
				FROM media
				WHERE entity_id=$mediaEntityId");
			$data->execute(null );//,':pageEnt'=>$pageEntityId ) );

			$mediaobjects = array();
			if(!isset($pageobjects['admin']) ){
				$pageobjects['admin'] = array();
			}
			foreach ($data as $row) {
				$mediaobjects[] = $row;
			}
			//print_r($mediaobjects);
			$pageobjects['admin']['media'] = $mediaobjects;
			if(!isset($_SESSION['SITMP'])){
				$_SESSION['SITMP'] = array();
			}
			
			$_SESSION['SITMP']['media'] = $mediaobjects;
		
			return $pageobjects;
			// ent id 0x11e8bb56883be134ad77005056c00001  
			// hash   0x0abeff5d15738d7060d052a046a785e2
			//url \media\images\lhdv4327q0l.png
			//name MainLogo
			//mime 'image/png'
		}
	}
	public function GetAllPages($pageobjects){
		if(Tools::UserHasRole("Admin") ){

			$superad = false;
			if(Tools::UserHasRole("SuperAdmin")){
				$superad = true;
			}

			$domainad = false;
			if(Tools::UserHasRole("DomainAdmin")){
				$domainad = true;
			}

			$pageEntityId = '0x'.$this->entityLookup['pages'];
			if($superad===true){
				$where = "";
			}else{
				$did = $pageobjects['domain']['id'];
				$where = "WHERE domains.id=$did ";
			}

			//'redirecttopage_id'
			//	print_r($pageobjects);
			$data = $this->pdo->prepare("
				SELECT domains.name AS domainName, 
					   HEX(domains.id) AS domainId, 
					   subdomains.name AS subdomainName, 
					   HEX(subdomains.id) AS subdomainId,  
					   entities.name AS entityName, 
					   HEX(pages.id) AS pageId, 
					   HEX(pages.redirecttopage_id) AS redirecttopage, 
					   pages.name AS pageName
				FROM domains
				INNER JOIN subdomains ON subdomains.domain_id = domains.id 
				INNER JOIN entities ON entities.subdomain_id = subdomains.id AND entities.domain_id = domains.id && entities.name = :entityName
				INNER JOIN pages ON entities.id = pages.entity_id
				$where");
			$data->execute(array(':entityName'=>"pages" ));//,':pageEnt'=>$pageEntityId ) );
			//if there are no rows returned then we cant find the page. send them to the 404 page

			//echo $pageEntityId;
			if(!isset($pageobjects['admin']) ){
				$pageobjects['admin'] = array();
			}
		
			$pageobjects['admin']['allpages'] = array();
			foreach ($data as $row) {
				$pageobjects['admin']['allpages'][] = $row;
			}

			//print_r($pageobjects['admin']);
			if(!isset($_SESSION['SITMP'])){
				$_SESSION['SITMP'] = array();
			}
			$_SESSION['SITMP']['pages'] = $pageobjects['admin']['allpages'];

			return $pageobjects;
		}
	}
	public function UpdateEntitiesQuantities(){
	    //	print_r($this->entityLookup);
		foreach($this->entityLookup as $k=>$v){
		    if(!Tools::StartsWith($k,"0x")){
			    $sql = "SELECT `sum` FROM $k";
				$data = $this->pdo->prepare($sql);
				$row = $data->execute();
				$count = $data->rowCount();

				$update = "UPDATE `entities` SET `quantity`=$count WHERE `id`=$v";
				$up = $this->pdo->prepare($update );
				$up->execute();
			}
		}
	}
	public function UpdateEntityQuantity($entityName){		
		if(isset($this->entityLookup[$entityName])){
			$id= $this->entityLookup[$entityName];
			$sql = "SELECT `sum` FROM $entityName";
			$data = $this->pdo->prepare($sql);
			$row = $data->execute();
			$count = $data->rowCount();

			$update = "UPDATE `entities` SET `quantity`=$count WHERE `id`=$id";
			$up = $this->pdo->prepare($update );
			$up->execute();
		}
	}
    public function Promote($post){
        $bu =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $fail = function($message) use (&$bu){ $bu['AJAXRETURN']['ERROR'] = $message; return false; };
        if(!Tools::UserHasRole('Admin') || !is_array($post)){
            return $fail('Only administrators can promote content.');
        }
        $target = $post['deployment'] ?? null;
        $table = $post['entityname'] ?? null;
        $attribute = $post['attribute'] ?? null;
        $id = Tools::FixGuid($post['entityid'] ?? null);
        $sources = array('test' => 'dev', 'live' => 'test', 'rollback' => 'live');
        if(!is_string($target) || !isset($sources[$target]) || !is_string($table) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $table)
            || !is_string($attribute) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $attribute) || $id === false){
            return $fail('The deployment request is invalid.');
        }
        $definition = $bu['entities'][$table] ?? array();
        $scope = Tools::FixGuid($definition['instanceguid'] ?? null);
        if($scope === false || !filter_var($definition['attributes'][$attribute]['deployable'] ?? false, FILTER_VALIDATE_BOOLEAN)){
            return $fail('This field does not support deployment.');
        }
        $permissions = $bu['user']['permissions'][$scope] ?? array();
        if(!filter_var($permissions['read'] ?? false, FILTER_VALIDATE_BOOLEAN) || !filter_var($permissions['write'] ?? false, FILTER_VALIDATE_BOOLEAN)){
            return $fail('You do not have permission to promote this content.');
        }
        $sourceColumn = $sources[$target].'-'.$attribute;
        $targetColumn = $target.'-'.$attribute;
        try{
            // Identifiers must exist in this schema; values and record scope remain bound parameters.
            $schema = $this->pdo->prepare('SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=:schema AND TABLE_NAME=:table');
            $schema->execute(array(':schema' => $this->databaseName, ':table' => $table));
            $columns = $schema->fetchAll(PDO::FETCH_COLUMN);
            if(!in_array($sourceColumn, $columns, true) || !in_array($targetColumn, $columns, true)){
                return $fail($target === 'rollback' ? 'This field has no rollback storage in the current database schema.' : 'The source or target deployment field is unavailable.');
            }
            $this->pdo->beginTransaction();
            $find = $this->pdo->prepare('SELECT `'.$sourceColumn.'` AS source FROM `'.$table.'` WHERE id=UNHEX(:id) AND entity_id=UNHEX(:scope) FOR UPDATE');
            $params = array(':id' => substr($id, 2), ':scope' => substr($scope, 2));
            $find->execute($params);
            $row = $find->fetch(PDO::FETCH_ASSOC);
            if(!$row){
                $this->pdo->rollBack();
                return $fail('The source record was not found in this site.');
            }
            if($attribute === 'options' && Tools::EncodeOptions($row['source']) === false){
                $this->pdo->rollBack();
                return $fail('Source options are invalid or double-encoded JSON. The target was left unchanged.');
            }
            // Copy in SQL: no JSON encoding, escaping, NULL-string conversion, or editor text replacement.
            $update = $this->pdo->prepare('UPDATE `'.$table.'` SET `'.$targetColumn.'`=`'.$sourceColumn.'` WHERE id=UNHEX(:id) AND entity_id=UNHEX(:scope)');
            $update->execute($params);
            $this->pdo->commit();
            $bu['AJAXRETURN']['PROMOTED'] = $attribute.($target === 'rollback' ? ' saved to rollback in ' : ' promoted to '.$target.' in ').$table;
            return true;
        }catch(\Throwable $error){
            if($this->pdo->inTransaction()) $this->pdo->rollBack();
            Tools::Log('Promotion failed: '.$error->getMessage());
            return $fail('Deployment failed. The target was left unchanged.');
        }
    }

} 



















