<?php
namespace SuperIntuitive; 
use \PDO;
Tools::Autoload();

class Entity{
    //An entity represents a type of database table that meets specific requirements. 
	public $Name = null; //the name of the table
	public $Id = null; //The id of the record
	public $Attributes = null; //a grouping of the columns in the table
	public $Order = null;
	public $Limit = 20;
	public $Filter = null;
	

    public function __construct($entity=null, $id=null){
		$this->Attributes = new AttributeCollection();
		//$this->SearchGroups = new SearchGroupCollection();
		if( gettype($entity) ==='object'){
			$cn = get_class($entity);
			if($cn === 'EntityReference' )
			{
				$this->Name = $entity->Name;
		        $this->Id = $entity->Id;
			}
			elseif($cn === 'Entity'){
			   	$this->Name = $entity->Name;
		        $this->Id = $entity->Id;
				$this->$Attributes = $entity->$Attributes;
			}
		}	
		else if (Tools::IsJson($entity) ){
		   $json = Tools::JsonValidate($entity);
		   if(isset($json['Name'])){
				$this->Name = $json['Name'];
		   }
		   if(isset($json['Id'])){
				$this->Id = $json['Id'];
		   }
		   if(isset($json['Attributes'])){
				$this->Attributes = $json['Attributes'];
		   }
		   if(isset($json['Order'])){
				$this->Order = $json['Order'];
		   }
		   if(isset($json['Limit'])){
				$this->Limit = $json['Limit'];
		   }
		   if(isset($json['Filter'])){
				$this->Filter = $json['Filter'];
		   }
		}
		else{
			if($entity!=null)
			{
				$this->Name = $entity;
			}
			if($id!=null)
			{
				$this->Id = $id;
			}
		}	
		$this->Filter = new Filter();
	}

	public function Create(){
		return $this->EntityAction($this,'create');
	}
	public function Retrieve( $columns = null){
		//$db = new Database();
		if($columns===null){
			return $this->EntityAction($this,'select');
		}else{
			return $this->EntityAction($this,'select', $columns);
		}
	}
	public function Update(){
		return $this->EntityAction($this,'update');
	}
	public function Delete(){
		return $this->EntityAction($this,'delete');
	}

	public function NewEntity($post){	
		Tools::Log($post);
		if(!empty($post['sname'])){
			$sname = $post['sname'];
			$pname;
			if(!empty($post['pname'])){
				$pname = $post['pname'];
			}else{
			    $pname=$sname.'s';
			}
			//Tools::Log(get_class_methods(Database) );
			$attrsql = '';
			Tools::Log("Logging Attrs");
			if(!empty($post['attributes'])){
				foreach( $post['attributes'] as $k=>$v){
					$type= null;
					if(isset($v['name']) && isset($v['type'])){
						$type = $v['type'];
						$name = $v['name'];

						$def= '';
						if(isset($v['def'])){
							$def = " DEFAULT '".$v['def']."'";
						}

						if(isset($v['size'])){
							$size = $v['size'];
							$type.="($size)";
						}

						if($v['deploy'] === 'false'){
							Tools::Log('deploy is false see:'.$v['deploy']);
							//only make on column
							$attrsql .= "`$name` $type$def,";
						}else{
							$attrsql .= "`$name` $type$def, dev_$name $type$def, test_$name $type$def, rollback_$name $type$def,";
						}		
				    }
				}
			}
			$attrsql = rtrim($attrsql,',');
			
			$entity = '';
			$global = "true";
			if(isset($post['global']) && $post['global'] ==="1"){

			}else{
				$global = "false";
				$entity =  "`entity_id` binary(16) NOT NULL COMMENT 'entity:entities',";
			}

			$createtable = "		
			CREATE TABLE IF NOT EXISTS `$pname` (
			  `id` binary(16) NOT NULL,
			  `status` enum('active','inactive') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'active',
			  `statusreason` enum('live','test','dev') COLLATE utf8_unicode_ci NOT NULL DEFAULT 'dev',
			  `createdon` datetime NOT NULL DEFAULT current_timestamp(),
			  `modifiedon` datetime DEFAULT NULL ON UPDATE current_timestamp(),
			  $entity
			  `name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
			  $attrsql
			) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci COMMENT='{\"EN\":\"$pname\", \"SN\":\"$sname\",\"global\":\"$global\"}';
			";
			$setKeys = "ALTER TABLE `$pname`
			  ADD PRIMARY KEY (`id`),
			  ADD KEY `name` (`name`),
			  ADD KEY `entityid` (`entity_id`);
			";
			$const = $pname."_ibfk_1";
			$constraints = "ALTER TABLE `$pname`  ADD CONSTRAINT `$const` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;";

			$db = new Database();
			
			$db->Execute($createtable);
	    	$db->Execute($setKeys);
			$db->Execute($constraints);
			$db->Execute("COMMIT");


		}
	}


	private function EntityAction($entity, $action, $columns = '_ALL_'){
		/*
			EntityAction can complete any entity database transaction. 
			It preforms the work for Entity create,update,select so far.
			Obviously this started as different function but as they all seemed quite similar I decided to create a master entity action function. 

			IF 
				* Creating: P1 is an Entity object with all of the Attributes required to create the new entity. if an ID is provided it is ignored.The Entity Name property is required.
				* Updating: P1 is an Entity object with all of the Attributes required to update an existing entity. The Entity Name and Id properties are required. Clearing a value can be done by passing _CLEAR_ as the value;
				* Selecting: P1 is an entity object with all of the Attributes that must match the return results. TODO Grouping needs to be done on an Attribute level. Hopefully it can be setup there. 
		*/
		//Tools::Log("EntityAction");
		//Tools::Log("action: ".$action);
		//Tools::Log($entity);
		
		//Get the entity name eg: blocks
		$name = $entity->Name;
		if(!$name){
			Tools::Log("The entity has no name. Action cannot continue");
			Tools::Log($entity);
			return false;
		}

		$bu = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
		$deployment = $bu['deployment'];
		
		//If we cant find the Entity data than scram	
		if(empty( $bu['entities'][$name])){
		    //Tools::Log("MADE IT HERE");
			return null;
		}
		//Get the id of this entity for this domain/bu
		$entitydef = $bu['entities'][$name];
		
		$entityId = !isset($entitydef['instanceguid']) ? null : $entitydef['instanceguid']; 
		//Tools::Log($bu['user'],true);
		//security
		$create;
		$read;
		$write;
		$append;
		$appendTo;
		$delete;
		//Tools::Log($bu['user']);
		//Check the security of the planned operation against that of the users permissions


	    if(empty( $bu['user']['permissions'][strtolower("$entityId")])){
			//no ticket?
			if(strlen($entityId)){
				Tools::Log("User does not have $name $action permission ".$entityId);
			}
			//Tools::Log($bu['user']['permissions']);
			return null;
		}else{

			$entitypermissions =  isset($bu['user']['permissions'][strtolower("$entityId")]) ? $bu['user']['permissions'][strtolower("$entityId")]:false;
			$create = isset($entitypermissions['create']) ? $entitypermissions['create'] :false;
			$read = isset($entitypermissions['read']) ? $entitypermissions['read'] :false;
			$write = isset($entitypermissions['write']) ? $entitypermissions['write'] :false;
			$append = isset($entitypermissions['append']) ? $entitypermissions['append'] :false;
			$appendTo = isset($entitypermissions['appendTo']) ? $entitypermissions['appendTo'] :false;
			$delete = isset($entitypermissions['delete']) ? $entitypermissions['delete'] :false;
			//Tools::Log("create: ".$create.", read: ".$read.", write: ".$write.", append: ".$append.", appendTo: ".$appendTo.", delete: ".$delete);
			if($action == "select" && $read == false){   //this could be turned into a big multi condition if, but i think in the long run this might be quicker.		
				Tools::Log("User does not have $name read permission $read ");
				return null;
			}
			else if($action == "create" && $create == false){
				Tools::Log("User does not have $name create permission");
				return null;
			}
			else if($action == "update" && $write == false){
				Tools::Log("User does not have $name update permission");
				return null;
			}
			else if($action == "delete" && $delete == false){
				Tools::Log("User does not have $name delete permission");
				return null;
			}

			if($create == "temp"){
				$create == false;
			}

		}
		//Tools::Log("User has permission", true);
		//Tools::Log("Name: ".$name.'  EntityID: '.$entityId.'  EntityIDlength: '.count($entityId),true);

		$deployable = !isset($entitydef['deployable']) ? null : $entitydef['deployable'];  
		//Tools::Log($deployable."  ".$entityId, true);
		//Handle the selected Columns
		//Thell be no wildcard searches for ALL. This will get all the applicable columns to send back. 
		if($action == "select"){
			$allcolumns;
			if($columns == "_ALL_"){
				$allcolumns = array_keys($entitydef['attributes']);
			}
			else{
				$allcolumns = (is_array($columns))? $columns : explode(',',$columns);
			}			
			$allcolumnscsv = "";
			foreach($allcolumns as $colname){
				if($colname != 'instanceguid' && $colname != 'deployable' && $colname != 'p_id' && $colname != 'sum'){
					//Tools::Log("AllCols: ".$colname ,true);
					if(isset($entitydef['attributes'][$colname]['deployable'])){
						$allcolumnscsv .= $deployment.'-'.$colname.",";
					}else{
						$allcolumnscsv .= $colname.",";
					}
				}
			}
			$columns = trim( $allcolumnscsv, ',');
			//Tools::Log("Columns: ".$columns);
		}

		$entIdId ='';		
		$attrs = $entity->Attributes->Get();
		$set = ' SET ';
		$fields = ' (';
		$values = ' VALUES(';
		$params = array();
		$where = 'WHERE ';
					
		if($action == 'create' || $action == 'select' || $action == 'delete' ){
		    //Create a entity_id entity reference to populate this field with its entity id. 
			$orgId = null;
			if(!empty($entity->Id)){
				$orgId = $entity->Id;
				$where.=  "`id` = ".$orgId;
			}
			
			$guid = new Guid(true);
			$entIdId = $guid->ToString();
			//add the prefix if needed
			if(!Tools::StartsWith($entIdId,"0x")){
				$entIdId = '0x'.strtolower($entIdId);
			}

			//we dont need an entity reference for this. we need the entity
			$entity->Id = $entIdId;

			$fields.="`id`,";
			$values.= strtolower($entIdId).',';
		
		    //Make sure to add the EntityID to the create and select sqls. //update will have the guid so it should be fine.. but to prevent shananagans mabe require it too.
			if($entityId !=null && strlen($entityId) === 34 ){
			
				$entNameAttr = new Attribute('entity_id',strtolower($entityId) );
				$entity->Attributes->Add($entNameAttr);
				$fields.="`entity_id`,";
				$values.= strtolower($entityId).','; 

				if($orgId != null){
					$where.=  " AND `entity_id` = ".$entityId;
				}else{
					$where.=  " `entity_id` = ".$entityId;
				}
			}
		}

		//ATTRIBUTE PROCESSING
		$allattrs = $bu['entities'][$name]['attributes'];	
		foreach($attrs as $attr){
			//Get the attributes properties.
		    $attrname = null;
			$type = null;
			$optional = null;
			$maxchars = null;
			$deployable = null;
			$attrvalue = null;

			if($attr->Name != null){
				//get rid of any deployment prefixes to the attribute name. we will put them back before the sql
				$attrname =  Tools::CleanDeployableField($attr->Name);
				$attrdata = null;
				if($allattrs != null && isset($allattrs[$attrname])){
					$attrdata = $allattrs[$attrname];
				} 
				if($attrdata != null){
					if( isset($attrdata['type'])){
					$type = $attrdata['type'];
					}
					if( isset($attrdata['deployable'])){
						$deployable = $attrdata['deployable'];
					}
					if( isset($attrdata['optional'])){
						$optional = $attrdata['optional'];
					} 
					if( isset($attrdata['maxchars'])){
						$maxchars = $attrdata['maxchars'];
					}
				    //Tools::Log('attrdata');
					//Tools::Log($attrname);
				    //Tools::Log($attrdata);
				}
				else{Tools::Log($name."->$attrdata is null for an attribute");}
			}else{Tools::Log($name."->Name is null for an attribute");}

			$fieldName = $attr->Name;
			$val = $attr->Value;
			//$atype = $attr->
			$fieldtype = gettype($val);
			$safefieldname = $fieldName; // safefieldname does not have a dev or text prefix even if it the field does.

			if($deployable==true){ //if deployable make sure there is no prefix before searching entities
			    $safefieldname = Tools::CleanDeployableField($fieldName);
		    }

			if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$name]['attributes'][$safefieldname])){
				if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$name]['attributes'][$safefieldname]['type'])){
				$fieldtype = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$name]['attributes'][$safefieldname]['type'];
			    }
			}

			if($where !='WHERE '){
				$where.= " AND ";	
			}

			if($fieldName== 'hash'){
				Tools::Log("Hash type", true);
				Tools::Log($fieldtype, true);
			}

		    $isnull;
			if(strtolower($val) === 'null'){$val = 'NULL';}

			//if were trying to set this to null, we need to fix it.	
			switch($fieldtype){

				case "boolean":
				case "integer":
				case "number":
				case "double":
					$fields.="`$fieldName`,";
					$values.="$val,"; 
					$set.="`$fieldName`=$val, ";
					$where.="`$fieldName`=$val ";
					break;
				case 'optionset':
					$fields.="`$fieldName`,";
					$values.="$val,"; 
					$set.="`$fieldName`='$val', ";
					$where.="`$fieldName`='$val' ";
					break;
				case "string": 
				case "text":
					$fields.="`$fieldName`,";
					if(!Tools::EndsWith($fieldName,"_id")){
						$sfield =preg_replace("/[^A-Za-z0-9]/", '', $fieldName);
						$values.=":$sfield,"; 
						$set.="`$fieldName`=:$sfield, ";
						$where.="`$fieldName`=:$sfield ";
						$params[":$sfield"]=$val;
					}else{
						if(!Tools::StartsWith($val,"0x")){
							$val = '0x'.$val;
						}
						$values.="$fieldName,"; 
						$set.="`$fieldName`=$val, ";
						$where.="`$fieldName`= $val ";
					}
					break;			
				case "array":break;
				case "object": 
				case "primary": 
				case "lookup": 
					//Tools::Log(gettype($val),true);
					if($val === 'NULL'){			    
						$fields.="`$fieldName`,";
						$values.=" NULL,"; 
						$set.="`$fieldName`= NULL, ";
						$where.="`$fieldName`= NULL ";	
					}else{
						$guid = null;
						if( get_class($val) === "EntityReference" && (Tools::EndsWith($fieldName,"_id")|| $fieldName == 'id' ) ){
							$guid = $val->Id;
						}
						else if(gettype($val) === "string"  && (Tools::EndsWith($fieldName,"_id"))){
							$guid = $val;
						}
						if(!Tools::StartsWith($guid,"0x")){
								$guid = '0x'.$guid;
						}

						else if($guid != null && strlen($guid) === 34){
							$fields.="`$fieldName`,";
							$values.="$guid,"; 
							$set.="`$fieldName`=$guid, ";
							$where.="`$fieldName`=$guid ";			
						}
					}


					break;	
				case "sha1":
					if($val !=='0x'){
						//$fields.="HEX($fieldName) AS `$fieldName`,";
						$fields.="`$fieldName`,";
						$values.="$val,"; 
						$set.="`$fieldName`='$val', ";
						$where.="`$fieldName`='$val' ";
					}

					break;
				case "NULL":break;
				default:
			}
		}
		
		$set = trim($set);
		$set = rtrim($set,',');
		$fields = rtrim($fields,',').')';
		$values = rtrim($values,',').')';
		//END ATTRIBUTE PROCESSING

		
		//Declare the database statement
		$sql = null;

		//Tools::Log($fields, true);
		//Tools::Log($values, true);

		if($action == 'update'){
		    if($entity->Id != null){
				$entid = $entity->Id;
			   	if(!Tools::StartsWith($entity->Id,"0x")){
					$entity->Id = '0x'.$entity->Id;
				}
				if(strlen($set)>2){
					$sql = "UPDATE `$name` $set WHERE `id` = ".$entity->Id;
					Tools::Log($sql);
				}

			}else{
				Tools::Log("Trying to update with no ID???",  true);
				return false;
			}
		}
		else if($action == 'select' || $action == 'delete'){
			if(strpos($columns, ',') != FALSE){
				$cols = explode(',',$columns);
				$newCols = "";
				foreach($cols as $col){
				    $pos = strrpos($col, ".");
					if ($pos === false) { // note: three equal signs
						$newcol = Tools::NeedsHex($col);
						if(Tools::StartsWith($newcol ,"HEX(") === true){
							 $newCols .= $newcol." AS $col,";
						}
						else if(Tools::StartsWith($newcol ,$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'].'-') === true ){
							$as = str_replace($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'].'-',"",$newcol);
							$newCols .=  '`'.$newcol."` AS `$as`,";
						}
						else{
							 $newCols .= '`'.$newcol.'`,';
						}
					}else{
						//we need a JOIN.
						//fisrt lest get the entity and requested property
						$entprop = explode('.',$col);
						$ent = $entprop[0];
					}
				}
				$columns = rtrim($newCols,',');
				//echo $columns;
			}else{
				$columns = '`'.Tools::NeedsHex($columns).'`';
			}
		    //echo $columns;
		    //Tools::Log($columns,true);
			$where = preg_replace('/AND $/', '', $where);
			if(trim($where)=='WHERE'){
				$where='';
			}

			if($action == 'select'|| $action == 'read'){
				//$limit = ' LIMIT '+ $entity->Limit;


				$sql = "SELECT $columns FROM `$name` $where ";
			}
			else if ($action == 'delete'){
			    //Make this somewhat safe for now. should not be able to delete whole busnesses table. needs the bu id @ something else
				if(strlen($where)> 35){ 
					$sql = "DELETE FROM `$name` $where";
				}else{
			 	    //Tools::Log('where');
				    //Tools::Log($where);
					Tools::Log("$action entity prepair failed for: ".print_r($entity,true). ' Either an if or attribute is required. cannot delete the whole table from here');
				}
			}
		    //Tools::Log($params, true);
		}
		else if($action == 'create'){
		    $sql = "INSERT INTO `$name` $fields $values";
		}

		if($sql !== null){
			//Tools::Log($sql);
			//Tools::Log($params);
	        //Prepare the SQL transaction
			try{
				$db = new Database();
				$data = $db->DBC()->prepare($sql);
			}
			catch(PDOException $ex)
			{
				Tools::Log("$action entity prepair failed for: ".print_r($entity,true). ' with Exception: '.$ex ,true);
				return false;
			}
			
			try{
				//Tools::Log("Prepairing succeeded");
				//Tools::Log($params);
				if(count($params) >0){
					$data->execute( $params );
				}else{
					$data->execute();
				}
			}
			catch(PDOException $ex)
			{
				Tools::Log("$action entity failed for: ".print_r($entity,true). ' with Exception: '.$ex ,true);
				return false;
			}

			if($action =='create'){
				return $entIdId;
			}else if($action =='select'){
			    //echo $select;
				//$data->setFetchMode(PDO::FETCH_ASSOC); 
				
				$mydata = $data->fetchAll(PDO::FETCH_ASSOC);
			    if(count($mydata)===0){
					return null;
				}
				//Tools::Log($mydata );
				return $mydata;
			}else if($action =='update'){
				return true;
			}
		}
	}


}

class EntityCollection{
	public $Entities = array();
    public function __construct($entitys=null){
	 
	    if(gettype($entitys)==='array'){
			$this->$Entities = $entitys;
		}else if($entitys!=null){
		    if(get_class($entitys)==='Entity')
			$this->$Entities[] = $entitys;
		}
	}
	public function Add($entity)
	{
		$this->Entities[] = $entity;	
	}
}

class EntityReference{
	public $Name = null;
	public $Id = null;

    public function __construct($entity=null, $guid=null){
	    if($entity){
			$this->Name = $entity;
		    $this->Id = $guid;
		}
	}
}

class Attribute{
//this needs to be smarter
	public $Name = null;
	public $Value = null;
	public $Type = null;

    public function __construct($name, $value, $type=null)
	{
	    if($name != null || $value != null){
			$this->Name = $name;
			$ctype=null;
			if(is_object($value)){
				$ctype = get_class($value);
			}
			if($ctype =='Entity' || $ctype =='EntityReference')
			{
				$er = new EntityReference();
				$er->Name = $value->Name;
				$er->Id = $value->Id;
				$this->Value = $er;
			}
			else{
			    $this->Value = $value;
			}

		    
			if($type != null){
				$this->Type = $type; 
			}
		}
	}
}

class AttributeCollection{
	public $Attributes;
	public $Count=0;	
    public function __construct($attribs=null){
	    $this->Attributes = array();
	    if(gettype($attribs)==='array' && count($attribs) > 0){
			if(get_class( current($attribs) )==='Attribute')
			{
				$this->Attributes = $attrib;
			}
		}
		else if($attribs!=null){
		    if(get_class($attribs)==='Attribute')
			{
				$this->Attributes[] = $attribs;
			}
		}
	}
	public function Add($attribs)
	{
	    if(gettype($attribs)==='array'){
			$this->Attributes = array_merge($this->Attributes, $attribs);
		}
		else if(gettype($attribs)==='string'){
			//$this->Attributes = array_merge($this->Attributes, $attribs);
			Tools::Log($attribs);
		}
		else if($attribs!=null){
		    if(get_class($attribs)==='Attribute')
			{
				$this->Attributes[] = $attribs;
			}
		}
		$this->Count = count($this->Attributes);
	}
	public function Get(){
		return $this->Attributes;
	}
}


//The Filter class maintains a list of items.
//An Item can either be a search Condition or another Filter
class Filter{
	public $Items = array();
	public $Type = 'and';
	public $Count = 0;
    public function __construct()
	{

	}

	public function AddCondition($condition)
	{
		if(get_class($condition)==='Condition')
		{
			$this->Items[] = $condition;
		}
		$this->Count = count($this->Items);
	}

	public function AddFilter($filter)
	{
		if(get_class($filter)==='Filter')
		{
			$this->Items[] = $filter;
		}
		$this->Count = count($this->Items);
	}

}

class Condition{
	public $Attribute;
	public $Operator;
	public function __construct($attr, $op)
	{
		$this->Attribute = $attr;
		$this->Operator = $op;
	}
}


