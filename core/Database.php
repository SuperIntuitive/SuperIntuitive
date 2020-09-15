<?php
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
	private $pdo = null;
	private $entityLookup = array();
	private $pageGuid = null;
	private $pageName = null;
	private $pageStatusReason = null;
	private $dbSchema = null;
	private $entityTables = array();
	public  $databaseName = null;

	public function __construct(){
		$this->Connect();
	}
	public function __destruct(){
	}
	public function DBC(){
		return $this->pdo;
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
			$this->pdo = new PDO("$creds->dbtype:host=$creds->servername;dbname=$creds->database;charset=utf8", $creds->username, $creds->password,$options);
		}
		catch(PDOException $ex)
		{
		    $this->pdo = false;
			Tools::Error("Database connection error: ".$ex->getMessage(),true);
		}
	}
	public function IsCmsSetup(){
		if($this->pdo === null){
			return false;
		}else{
			return true;
		}
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
		$data = $this->pdo->prepare("
			SELECT domains.name AS domainName, domains.status AS domainStatus, HEX(domains.id) AS domainId, businessunits.name AS businessunitName, businessunits.status AS businessunitStatus, HEX(businessunits.id) AS businessunitId, entities.name AS entityName, HEX(entities.id) AS entityId
			FROM domains
			INNER JOIN businessunits ON domains.id = businessunits.domain_id 
			INNER JOIN entities ON domains.id = entities.domain_id AND businessunits.id = entities.businessunit_id
			WHERE domains.name = :domain AND businessunits.name = :businessunit");
		$data->execute( array(':domain'=>SI_DOMAIN_NAME,':businessunit'=>SI_BUSINESSUNIT_NAME) );
		$count = $data->rowCount();			
		//Tools::Log(SI_BUSINESSUNIT_NAME.".".SI_DOMAIN_NAME);
		if($count == 0){
			$pageobjects = "%EMPTY_DOMAIN%";
			Tools::Error("Domain: ".SI_DOMAIN_NAME." with Business Unit: ".SI_BUSINESSUNIT_NAME." can not be found");
			return $pageobjects;
		}
		else{
			$entityLookup = array();
			$pageobjects = array();
			$pageobjects['domain'] = array();
			$pageobjects['businessunit'] = array();
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
					else if(!isset($pageobjects['businessunit']['id']) && $k ==  'businessunitId'){
						$pageobjects['businessunit']['name'] = $row['businessunitName'];
						$pageobjects['businessunit']['status'] = $row['businessunitStatus'];
						$pageobjects['businessunit']['id'] = '0x'.$v;
						define("SI_BUSINESSUNIT_ID",'0x'.$v);
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
			$session->SetBusinessunit();
			//The deployment is set under the business unit. Moving from one domain or bu to another could change your deployment to what you were on when you were last there. no big deal.  
			$session->SetDeployment();

			//clear and check every time
			//unset($_SESSION['SI']['domains'][SI_DOMAIN_ID]['businessunits'][SI_BUSINESSUNIT_ID]['entities']);
			$this->entityLookup = $entityLookup;

			return $pageobjects;		
		}
	}
	public function GetDatabaseSchema($pageobjects){
		//Add these items to the SI data array
		if(isset($pageobjects['domain']['id'])){

			//$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['defaultlanguage'] = $pageobjects['domain']['defaultLanguage'];

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
				$allowRead = "AND `tbl`.`table_name` IN('users','blocks','localtext','pages','relations','domains','businessunits','securityroles') "; //for now the only entity the guest user needs to have a session saved for is users for loging in.

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
			foreach ($data as $row) {
			//	Tools::Log($row,true);
				$entity = $row['table_name'];
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
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'][$entity]['instanceguid']=$guid;
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
			
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'] = $entities;
		}
	}
	public function GetGuestRules(){
	    //Tools::Log("In Get Guest Role", true);
		//first get the entity guid for the security role. then get the guest role
		//The reason for not using an entity is the user does not have entity access at this point;
		$sql = "SELECT HEX(`id`) AS `id` from `entities` WHERE `name`=:name AND `domain_id`=".SI_DOMAIN_ID." AND `businessunit_id`=".SI_BUSINESSUNIT_ID;
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
		$sid =session_id();
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['sessions'])){
			$entityId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['sessions']['instanceguid'];	
		//	Tools::Log("logging session");
		//	Tools::Log($entityId);
			$session = json_encode($_SESSION);
			$server = json_encode($_SERVER);
			$binds = array(":sessionid"=>$sid,":session"=>$session,":ipaddress"=>$ip,":server"=>$server);
			$guid = new Guid(true);
			$g = $guid->ToString();
			$insert = "INSERT INTO `sessions`(`id`,`entity_id`,`sessionid`,`sessiondata`,`ipaddress`, `server` ) 
						VALUES ($g,$entityId,:sessionid,:session,:ipaddress,:server ) ON DUPLICATE KEY UPDATE count = count + 1;";
			//echo $insert;
			try{
				$sql = $this->pdo->prepare($insert);
				$sql->execute($binds);
				$sql = null;
			}catch( PDOException $Exception ){
			
			}
		}
	}

	//Admin only
	public function CreateInstance($domain, $businessunit){
		//This function will automatically run when accessed from an unknown domain and or businessunit
		//if the domain exists it will use it, if not it will make it.
		//if the business unit exists...we shouldnt be here then. 
		//make the business unit 
		//once we have the domain and businessunit id make all the entities for the BU.
		//Once we have all of the entities setup then we setup the default records. Big ToDo
		$defaultEntities = ['blocks','media','pages','preferences','relations','securityroles','settings','users'];
		if(Tools::UserHasRole('Admin')){
			if(strlen($domain) > 1){
				$db = new Database();
				$existdom = $db->Excecute("SELECT `id` FROM `domains` WHERE `name`='$domain' ");
				$existbu = $db->Excecute("SELECT `id` FROM `businessunits` WHERE `name`='$businessunit' ");

				$domainGuid = new Guid(true);
				$domainId = $domainGuid->ToString();
				$buGuid = new Guid(true);
				$buId = $buGuid->ToString();

				$insert = "INSERT INTO `domains`(`id`, `name`) VALUES ($domainId,:name)";
				$sql = $this->pdo->prepare($insert);
			//	print_r($sql);
				$sql->execute([":name"=>$domain]);
				$sql = null;

				$insert = "INSERT INTO `businessunits`(`id`, `name`, `domain_id`) VALUES ($buId,:name,$domainId)";
				$sql = $this->pdo->prepare($insert);
			//	print_r($sql);
				$sql->execute([":name"=>$businessunit]);
				$sql = null;

				foreach($this->entityTables as $v){
					$entGuid = new Guid(true);
					$entId = $entGuid->ToString();
					$insert = "INSERT INTO `entities`(`id`, `domain_id`, `businessunit_id`,`name`) VALUES ($entId,$domainId,$buId,:name)";
					$sql = $this->pdo->prepare($insert);
					$sql->execute([":name"=>$v]);
					$sql = null;
				}

			}
		}
	}
	public function BackupDatabase($post){
		$this->BuildInstallerFile($post, true);
	}
	public function BuildInstallerFile($post, $backup = false){

		$filename;

		if($backup){
			$datepath = date("Y/m/");
			if(isset($post['Name'])){
				$filename = $post['Name'].".sql";
			}else{
				$filename = date("d_H-i-s")."_SiBackup.sql";
			}
			$dir = $_SERVER['DOCUMENT_ROOT'] . "/sql/backups/$datepath";
		}
		else{$filename = date("d_H-i-s")."_SiBackup.sql";
			if(isset($post['Name'])){
				$filename = $post['Name'].".sql";
			}else{
				$filename = date("d_H-i-s")."_SiInstaller.sql";
			}
			$dir = $_SERVER['DOCUMENT_ROOT'] . "/sql/installer/";
		}
		
		Tools::Log($dir);
		if (!file_exists($dir)) {
			mkdir($dir, 0777, true);
		}
		$fpath = "$dir$filename";
		Tools::Log($fpath);
	
		try{

			$schema = "SELECT   tbl.table_comment,
								cols.table_name, 
								cols.is_nullable, 
								cols.column_name, 
								cols.character_set_name,
								cols.collation_name,
								cols.column_type, 
								cols.column_comment,
								cols.column_default,
								cols.column_key,
								cols.extra,
								cols.numeric_scale
			FROM INFORMATION_SCHEMA.COLUMNS cols
			JOIN INFORMATION_SCHEMA.TABLES tbl ON cols.table_name = tbl.table_name AND cols.table_schema = tbl.table_schema
			WHERE cols.table_schema = '$this->databaseName'
			ORDER BY table_name, ordinal_position";


			$dbrows = $this->pdo->prepare($schema);
			//print_r($data);
			$dbrows->execute( );

			$tables = array();
			foreach ($dbrows as $dbrow) {

				$tablename = $dbrow['table_name'];
				$tablecomment = $dbrow['table_comment'];
				$columnname = $dbrow['column_name'];

				if(!isset($tables[$tablename])){
					$tables[$tablename] = array();
					$tables[$tablename]['comment']= $tablecomment;
					$tables[$tablename]['columns']= array();
				}
				
				$tables[$tablename]['columns'][$columnname]= array();
				$tables[$tablename]['columns'][$columnname]['type']= $dbrow['column_type'];;
				$tables[$tablename]['columns'][$columnname]['default']= $dbrow['column_default'];
				$tables[$tablename]['columns'][$columnname]['key']= $dbrow['column_key'];
				$tables[$tablename]['columns'][$columnname]['nullable']= $dbrow['is_nullable'];
				$tables[$tablename]['columns'][$columnname]['comment']= $dbrow['column_comment'];
				$tables[$tablename]['columns'][$columnname]['collation']= $dbrow['collation_name'];
				$tables[$tablename]['columns'][$columnname]['charset']= $dbrow['character_set_name'];
				$tables[$tablename]['columns'][$columnname]['extra']= $dbrow['extra'];
				$tables[$tablename]['columns'][$columnname]['numeric']= $dbrow['numeric_scale'];

			}

			$script = "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\r\nSET AUTOCOMMIT = 0;\r\nSTART TRANSACTION;\r\nSET time_zone = \"+00:00\"; \r\n\r\n";

			$guidLookup = array();

			foreach ($tables as $table=>$tabledata) {
				$tablecomment = $tabledata['comment'];
				$columns = $tabledata['columns'];
				$script .= "CREATE TABLE "."`".$table."` (\r\n";
				$columntext ="";
				$i = 0;
				$len = count($columns);
				$insert = "INSERT INTO `".$table."` (";
				$select = "SELECT ";
				$typeLookup = array();
				foreach ($columns as $column=>$columndata) {
					$insert .=  "`".$column."`";
					$type = $columndata['type'];

					if (strpos($type, "binary") !== false){
						$select .=  "HEX(".$column.")";
						$typeLookup["HEX(".$column.")"]=$type;
					}else{
						$select .=  "`".$column."`";
						$typeLookup[$column]=$type;
					}

					$default = $columndata['default'] == null? "": $columndata['default'];
					$key = $columndata['key'] == null? "": $columndata['key'];
					$nullable = $columndata['nullable'] == null? "": $columndata['nullable'];
					$comment = $columndata['comment'] == null? "": $columndata['comment'];
					$collation = $columndata['collation'] == null? "": $columndata['collation'];
					$charset = $columndata['charset'] == null? "": $columndata['charset'];
					$extra = $columndata['extra'] == null? "": $columndata['extra'];
					$numeric = $columndata['numeric'] == null? "": $columndata['numeric'];

					$columntext.= "\t`".$column."` ".$type;
					if($charset){
						$columntext.= " CHARACTER SET ".$charset;
					}
					if($collation){
						$columntext.= " COLLATE ".$collation;
					}
					if($nullable == "NO"){
						$columntext.= " NOT NULL";
					}
					if($default){

					    if($default == "NULL"){
							$columntext.= " DEFAULT NULL";
						}
						else if($default == "current_timestamp()"){
							$columntext.= " DEFAULT current_timestamp()";
						}
						else if($numeric != "NULL"){
							$columntext.= " DEFAULT ".$default;
						}
						else{
							$columntext.= " DEFAULT '".$default."'";
						}
					}
					if($extra){
						$extra = str_replace("on update","ON UPDATE",$extra);
						$columntext.= " ".$extra;
					}
					if($comment){
						$columntext.= " COMMENT '".$comment."'";
					}
					if ($i != $len - 1) {
						$insert .=", ";
						$select .=", ";
						$columntext.= ",\r\n";
					}else{
						$insert .=") VALUES\r\n";
						$select .=" FROM ".$table;
						$columntext.= "\r\n";
					}
					$i++;
				}

				if(!$backup){
					if($table ==="domains" || $table ==="businessunits" || $table ==="users"){
						$select.= " LIMIT 1";
					}
				}

				$script.=$columntext;
				$script.=") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ";
				if($tablecomment){
					$script.=" COMMENT='".$tablecomment."'";
				}
				$script.=";\r\n";
				$script.="\r\n";
			//	$sql = "SELECT * FROM `".$table."`"
				$tdata = $this->pdo->prepare($select);
				//print_r($data);
				$tdata->execute( );

				if($table == "emails"){
					$x=1;
				}

				foreach($tdata as $trow){
					$j = 0;
					$jlen = count($trow);
					$insert  .= "(";

					if(!$backup){

						$trow["createdon"]="_SI_NOWTIME_";
						$trow["modifiedon"]=NULL;

						if($table === "domains"){
							$trow["name"]='__SI_DOMAIN_NAME__';
						}
						if($table === "buisnessunits"){
							$trow["name"]='';
						}
						if($table === "users"){
							$trow["name"]='__SI_USER_NAME__';
							$trow["email"]='__SI_USER_EMAIL__';
							$trow["password"]='__SI_USER_Password__';
						}
						if($table === "settings"){
							switch($trow["settingname"]){
								case 'DefaultLanguage': $trow["settingvalue"] = '__SI_DEFAULT_LANGUAGE__';break;
								case 'DefaultCurrency': $trow["settingvalue"] = '__SI_DEFAULT_CURRENCY__';break;
								case 'DefaultTimeZone': $trow["settingvalue"] = '__SI_DEFAULT_TIMEZONE__';break;
								case 'NotificationEmail': $trow["settingvalue"] = '__SI_DEFAULT_NOTEEMAIL__';break;

								default:break;
							}
							
						}
					}
					foreach ($trow as $cname=>$cell) {
						if($cell===NULL){
							$insert .="NULL";
						}else{						
							$ctype = $typeLookup[$cname];
							$stype = substr($ctype, 0, strpos($ctype, "("));
							switch($stype){
								case "binary": 
									$bin = "0x".$cell;
									if($ctype === "binary(16)"){
										if(!$backup){
											$foundInd = array_search($bin, $guidLookup);
											if (false !== $foundInd){
												$bin = "_SI_GUID_".$foundInd;
											}else{
												$bin = "_SI_GUID_".count($guidLookup);
												$guidLookup[] = "0x".$cell;
												
											}
										}
									}
									$insert .=$bin;
									break;
								case "int": $insert .=$cell; break;
								case "enum": $insert .="'".$cell."'"; break;
								default:
								    $cell = addslashes($cell); 
									$cell = preg_replace('/(\r\n|\r|\n)+/', "\n", $cell);
									$cell = preg_replace('/\s+/', ' ', $cell);
									$insert .="'".$cell."'"; 
								    break;
							}
						}

						if ($j !== $jlen - 1) {
							$insert .=", ";
						}else{
							$insert .="),\r\n";
						}
						$j++;
					}

				}
				if($tdata->rowCount() > 0){
					$insert = rtrim(trim($insert),',');
					$script.=$insert.";\r\n\r\n";
				}
				
			}

			$indexes = "";
			foreach ($tables as $table=>$tabledata) {
				$columns = $tabledata['columns'];
				$index ="";
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "PRI"){
							$index.="    ADD PRIMARY KEY (`".$column."`),\r\n";
						}
					}
				}
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "UNI"){
							$index.="    ADD UNIQUE KEY(`".$column."`),\r\n";
						}
					}
				}
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "MUL"){
							$index.="    ADD KEY (`".$column."`),\r\n";
						}
					}
				}
				if($index){
					$index="ALTER TABLE `".$table."`\r\n".$index;
					$index=trim($index);
					$index=rtrim($index,',').";\r\n\r\n";
					$indexes.=$index;
				}
			}

			$script.=$indexes;

			file_put_contents($fpath, $script);
			
			if(!$backup){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Installer Built Successfully";
			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Successfully";
			}
		}
		catch(Exception $e){
			if(!$backup){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Installer Build Failed: ".$e;
			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Failed: ".$e;
			}
		   Tools::Error($e);
		}
	}
	public function GetPageData($pageobjects){
	    if($pageobjects == "%EMPTY_DOMAIN%"){
			return  $pageobjects;
		}

		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
		$page = new Entity("pages");
		$page->Attributes->Add(new Attribute("path",SI_URI));
	    $mypage = $page->Retrieve();
		if($mypage === null){
			Tools::Log("Error the page could not be returned.");
			exit();
		}
	    $pageobjects['page'] = array();
	    if(count($mypage)){

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

			//look for security roles
			//Tools::Log('In GetPageData: Logging Roles');
		    //Tools::Log( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['roles'] );
			$rolesneeded = $this->GetRelatedEntities('pages',$mypage[0]['id'],'securityroles');
			//Tools::Log("roles needed");
			//Tools::Log($rolesneeded);



			$pageobjects['page']['name']= $mypage[0]['name'];
			$pageobjects['page']['id']= $mypage[0]['id'];
			$pageobjects['page']['path']= $mypage[0]['path'];
			$pageobjects['page']['options']= $mypage[0]['options'];

			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['id']='0x'.$mypage[0]['id'];
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['name']= $mypage[0]['name'];

			$myblocks = $this->GetBlocks( '0x'.$pageobjects['page']['id'] );

			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['contentmodified'])){
				$pageobjects['page']['contentmodified']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['contentmodified'];
			}
			$pageobjects['blocks'] = $myblocks;

			//get site settings
			$pageobjects['page']['sitesettings']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['settings'] = array();
			$settingsentities = new Entity('settings');
			$settings = $settingsentities->Retrieve('settingname,settingvalue');
			$tmpSetting = array();
			if($settings != null){
				foreach($settings as $setting){
					$tmpSetting[$setting['settingname']] = $setting['settingvalue'];
					$pageobjects['page']['sitesettings']=$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['settings'][$setting['settingname']] = $setting['settingvalue'];
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
	public function NewRelatedEntity($entityName,$entityId,$relatedEntityName, $relatedEntityId, $devorder = 0, $devoptions = null ){


		$relayid = new Guid(true);
		$relayid = $relayid->ToString(); //a random guid
		$relayEntityId = false;

		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['relations']['instanceguid'])){
		    $relayEntityId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['relations']['instanceguid'];
		}else{
			return;
		}

		//for now just dont make dupes. I need to fix retireves parameters
		$dupe = new Entity('relations');
		$dupe->Attributes->Add(new Attribute('parent_id',$entityId));
		$dupe->Attributes->Add(new Attribute('child_id',$relatedEntityId));
	    //	$dupes = $dupe->Retrieve();

	    //	Tools::Log("Logging Dupes:",true);
		//Tools::Log($dupes,true);
	    //	Tools::Log("Done Logging Dupes:",true);


		if($relayEntityId !== FALSE){

			$entityId = Tools::FixGuid($entityId);//clean the ids
			$relatedEntityId = Tools::FixGuid($relatedEntityId);
			

			$entityNameId = $entityName;
			$relatedEntityNameId = $relatedEntityName;
			//print_r($this->entityLookup);
			//this allows the entity to be supplied ether as a string-name or its guid. 
			//In the end it becomes a guid after looking it up
			if(!Tools::StartsWith($entityName,'0x')){
			
				//$entityNameId = $this->entityLookup[$entityNameId];
				$entityNameId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'][$entityNameId]['instanceguid'];
			}else{
				$entityName = Tools::GetEnityFromGuid($entityNameId);

				//$entityName = array_search($entityNameId,$this->entityLookup);
			}
			//ho $eType;
			//print_r($this->entityLookup);
			if(!Tools::StartsWith($relatedEntityNameId,'0x')){
				$relatedEntityNameId =  $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'][$relatedEntityNameId]['instanceguid']; 
			}else{
				$relatedEntityName =  Tools::GetEnityFromGuid($relatedEntityNameId); //array_search($relatedEntityNameId,$this->entityLookup);
			}

			$notes = array();
			$notes['PrimaryEntityName']= $entityName;
			$notes['RelatedEntityName']= $relatedEntityName;
			$jsonnote = json_encode($notes);


			$note = $entityName."_".$relatedEntityName;

			$devopt1 = "";
			$devopt2 = "";
			if($devoptions!= null){
				$devopt1 = ",`dev-options`";
				$devopt2 = ",:devoptions";
			}

			$sql = "INSERT INTO `relations` (`id`,`entity_id`,`parententity_id`,`childentity_id`,`parent_id`,`child_id`,`dev-order`,`note`$devopt1) VALUES($relayid,$relayEntityId,$entityNameId,$relatedEntityNameId,$entityId,$relatedEntityId,$devorder,:note$devopt2);";
			Tools::Log($sql,true);
			$data = $this->pdo->prepare($sql);
			if($devoptions == null){
				$data->execute(array(':note'=>$note));
			}else{
				$data->execute(array(':note'=>$note, ':devoptions'=> $devoptions ));
			}
			return $relayid;
		}
	}
	public function RemoveRelation($linkid){
		$linkid = Tools::FixGuid($linkid);
		Tools::Log("Remove Relations ".$linkid);
		if($linkid){ //simple guid verify 
			try{
				$rel = new Entity('relations');
				$rel->Id = $linkid;
				$rel->Delete();

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['REMOVERELATION'] = $linkid;
			}	
			catch (Exception $e) {
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $e;
			}
		}
	}
	public function GetRelatedEntities($entityName,$entityGuid,$relatedEntityName,$columns = null){
		//ERROR non loggedin users get undefined here.
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'])){
		    $entities = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'];
		}else{
			return;
		}
	    //	print_r($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]);
		if($relatedEntityName == 'securityroles'){
			//Tools::Log('securityroles:'.$entities['relations']['instanceguid'],true);
				
		}

	    if(isset($entities['relations']['instanceguid'])){
			$relationEntityId = $entities['relations']['instanceguid'];	 

			$eType =$entityName;
			if(!Tools::StartsWith($entityName,'0x')){
				$eType = $entities[$eType];
			}else{
				$entityName = array_search($eType,$entities);
			}
			$sType =$relatedEntityName;
			if(!Tools::StartsWith($sType,'0x')){
				if(!empty($entities[$sType]))
				$sType = $entities[$sType];
			}else{
				$searchType = array_search($sType,$entities);
			}

			if(Tools::StartsWith($entityGuid ,'0x') && strlen($entityGuid) === 34){
				$select = "SELECT ";
				$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];

				$defselect = "HEX(`relations`.`id`) AS relationsId,  `relations`.`modifiedon` AS relationsModifiedOn,  `relations`.`$deploymentlevel-options` AS relationsOptions,  `relations`.`$deploymentlevel-order` AS relationsOrder,";

				if($columns == null){		
				    $select.=" $defselect $relatedEntityName.*, HEX(`$relatedEntityName`.`id`) AS id ";
				}else{
					$ctype = gettype($columns);
							
					if($ctype =='string'){
						if(strpos($columns,',') !== false){
						    $cols = '';
							$pieces = explode(',',$columns);
							foreach($pieces as $v){
								if(Tools::EndsWith($v,'_id') || $v == 'id'){
								$select.= 'HEX(`'.$relatedEntityName.'`.`'.$v."`) AS $v,";
								}else{
									$select.=$relatedEntityName.'.'.$v.',';
								}
							}
							$select = rtrim($select,',');
					    }else{
						    if(Tools::EndsWith($columns,'_id') || $columns == 'id'){
								$select.= 'HEX(`'.$relatedEntityName.'`.`'.$columns."`) AS $columns,";
							}else{
								$select.=$relatedEntityName.'.'.$columns;
							}
						}
						$select = str_replace("SELECT ","SELECT $defselect",$select);
					}else if($ctype =='array'){
					
					}
				}

				$sql = "
					$select
					FROM $entityName
					INNER JOIN `relations` ON `$entityName`.`id`=`relations`.`parent_id`
					INNER JOIN `$relatedEntityName` ON `$relatedEntityName`.`id`=`relations`.`child_id`
					WHERE `$entityName`.`id` = $entityGuid
					ORDER BY  `relations`.`$deploymentlevel-order` ASC
				";

				$data = $this->pdo->prepare($sql);
				$data->execute();
				if($data->rowCount() == 0){
					return null;
				}
				$relations = array();
				foreach ($data as $row) {
					$relations[] = $row ;
				}
				return $relations;
			}
		}
		return null;
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
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['libraries'] = $libs;
		}
	}
	public function GetBlocks($pageid){	
	    //first clear the blocks from  prev page
	    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'] = array();
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
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
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'][$v['name']]['id']='0x'.$v['id'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'][$v['name']]['name']= $v['name'];
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
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['contentmodified'] = $contentModified;

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
		if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'])){
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
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
		$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];

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
				$sql = "SELECT HEX(`id`) AS businessunit_id, HEX(`domain_id`) AS domain_id FROM `businessunits`";
				$data = $this->pdo->prepare($sql);
				$data->execute();
				foreach ($data as $row) 
				{
					$bu = '0x'.$row['businessunit_id'];
					$do = '0x'.$row['domain_id'];
					$insert ="INSERT INTO `entities`(`id`, `domain_id`, `businessunit_id`, `name`) VALUES ($g,$do, $bu, :name);";

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
					   `mime`,
					   `category`
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
					   businessunits.name AS businessunitName, 
					   HEX(businessunits.id) AS businessunitId,  
					   entities.name AS entityName, 
					   HEX(pages.id) AS pageId, 
					   HEX(pages.redirecttopage_id) AS redirecttopage, 
					   pages.name AS pageName
				FROM domains
				INNER JOIN businessunits ON businessunits.domain_id = domains.id 
				INNER JOIN entities ON entities.businessunit_id = businessunits.id AND entities.domain_id = domains.id && entities.name = :entityName
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
		//deployment: deployment, entityname: entityname, entityid: entityid, attribute: attribute
		if(isset($post['deployment']) && isset($post['entityname']) && isset($post['entityid']) && isset($post['attribute'])){
			$deployment = $post['deployment'];
			$entityname = $post['entityname'];
			$entityid = $post['entityid'];
			$attribute = $post['attribute'];

			 Tools::Log("Updating:  $deployment  $entityname  $entityid  $attribute");


			$ournewfield = null;
			switch($deployment){
				case "test": $ournewfield = "dev-$attribute";break;
				case "live": $ournewfield = "test-$attribute";break; //dont forget to drop one in rollback a few hours later
				case "rollback": $ournewfield = "live-$attribute";break;
				default : return false;; //no idea what is going on but bailing.
			}

			//make an entity to search for the field			
			$ent = new Entity($entityname);
			//add the ID to look for
			$ent->Id = $entityid;
			//we need to get the field. 
			$found = $ent->Retrieve($ournewfield);
			
			if(count($found)===1){
			    $ent2 = new Entity($entityname);
				$ent2->Id = $entityid;
				//We found the Entity
				$attributeData = $found[0][$ournewfield];
				
				if($attribute === 'html'){
				    $thingsToRemoveBeforePromotion = array('class="si-editable-element"',
					                                       'si-editable-element',
														   'si-editable-ignoreinner',
														   );
					$attributeData = str_replace($thingsToRemoveBeforePromotion,'',$attributeData);
				}
				
				$ent2->Attributes->Add(new Attribute("$deployment-$attribute",$attributeData) );
				//Tools::Log($ent);
				try{
				    $success = $ent2->Update();
					Tools::Log("Updated ".$attribute." successfully");
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PROMOTED'] = $attribute.' has been promoted to '.$deployment.' in '.$entityname;
				}
				catch(Exception $ex){
				    //Tools::Log("Updated Failed: ". $ex->getMessage());
				    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $ex->getMessage();
				}
				
				//Tools::Log('success', true);
				//Tools::Log($success, true);
			}
		}
	}

} 



















