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
			if($entity instanceof EntityReference)
			{
				$this->Name = $entity->Name;
		        $this->Id = $entity->Id;
			}
			elseif($entity instanceof Entity){
			   	$this->Name = $entity->Name;
		        $this->Id = $entity->Id;
				$this->Attributes = $entity->Attributes;
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
	public function Update($connection = null){
		return $this->EntityAction($this,'update', '_ALL_', $connection);
	}
	public function Delete(){
		return $this->EntityAction($this,'delete');
	}

	public function NewEntity($post){	
		if(!is_array($post)){
			return false;
		}
		foreach(array($post['sname'] ?? null, $post['pname'] ?? (($post['sname'] ?? '').'s')) as $identifier){
			if(!is_string($identifier) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,47}$/D', $identifier)){
				return false;
			}
		}
		if(isset($post['attributes']) && (!is_array($post['attributes']) || count($post['attributes']) > 128)){
			return false;
		}
		foreach($post['attributes'] ?? array() as $attribute){
			if(!is_array($attribute) || !is_string($attribute['name'] ?? null)
				|| !preg_match('/^[A-Za-z_][A-Za-z0-9_]{0,47}$/D', $attribute['name'])
				|| !is_string($attribute['type'] ?? null)
				|| !preg_match('/^(?:TINYINT|SMALLINT|MEDIUMINT|INT|INTEGER|BIGINT|DECIMAL|NUMERIC|FLOAT|DOUBLE|REAL|BIT|BOOLEAN|SERIAL|DATE|DATETIME|TIMESTAMP|TIME|YEAR|CHAR|VARCHAR|BINARY|VARBINARY|TINYBLOB|BLOB|MEDIUMBLOB|LONGBLOB|TINYTEXT|TEXT|MEDIUMTEXT|LONGTEXT|JSON|ENUM|SET|LOOKUP|GEOMETRY|POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)$/Di', $attribute['type'])
				|| (isset($attribute['size']) && $attribute['size'] !== '' && (!is_scalar($attribute['size']) || !preg_match('/^[0-9]{1,5}(?:,[0-9]{1,2})?$/D', (string)$attribute['size'])))
				|| (isset($attribute['def']) && (!is_scalar($attribute['def']) || strpos((string)$attribute['def'], "\0") !== false))){
				return false;
			}
		}
		$db = new Database();
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
							$def = ' DEFAULT '.$db->DBC()->quote((string)$v['def']);
						}

						if(isset($v['size']) && $v['size'] !== ''){
							$size = $v['size'];
							$type.="($size)";
						}

						if($v['deploy'] === 'false'){
							Tools::Log('deploy is false see:'.$v['deploy']);
							//only make on column
							$attrsql .= "`$name` $type$def,";
						}else{
							$attrsql .= "`live-$name` $type$def, `dev-$name` $type$def, `test-$name` $type$def, `rollback-$name` $type$def,";
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


	private function EntityAction($entity, $action, $columns = '_ALL_', $connection = null){
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
		if(!is_string($name) || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/D', $name)){
			Tools::Log("The entity has no name. Action cannot continue");
			Tools::Log($entity);
			return false;
		}

		$bu = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
		$deployment = $bu['deployment'];
		if(!in_array($deployment, array('live', 'test', 'dev', 'rollback'), true)){
			return false;
		}
		if($entity->Id !== null){
			$entity->Id = Tools::FixGuid($entity->Id);
			if($entity->Id === false){
				return false;
			}
		}
		
		//If we cant find the Entity data than scram	
		if(empty( $bu['entities'][$name])){
		    //Tools::Log("MADE IT HERE");
			return null;
		}
		//Get the id of this entity for this domain/bu
		$entitydef = $bu['entities'][$name];
		
		$entityId = !isset($entitydef['instanceguid']) ? null : $entitydef['instanceguid']; 
		$entityId = Tools::FixGuid($entityId);
		if($entityId === false){
			return false;
		}
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
			// Stored rules use strings: the string "false" is truthy in PHP.
			$create = filter_var($create, FILTER_VALIDATE_BOOLEAN);
			$read = filter_var($read, FILTER_VALIDATE_BOOLEAN);
			$write = filter_var($write, FILTER_VALIDATE_BOOLEAN);
			$delete = filter_var($delete, FILTER_VALIDATE_BOOLEAN);
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
				if(!is_string($colname) || !preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/D', $colname)){
					return false;
				}
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
			if(!is_string($fieldName) || !preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/D', $fieldName)){
				return false;
			}
			if(!isset($allattrs[Tools::CleanDeployableField($fieldName)])
				|| (($action === 'create' || $action === 'update') && in_array($fieldName, array('id', 'entity_id'), true))){
				return false;
			}
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

            // Every attribute value is bound, including numbers, enums and IDs.
            // SQL identifiers above are validated independently of these values.
            $placeholder = ':attr_'.count($params);
            $expression = $placeholder;
            if($val === null || (is_string($val) && strtolower($val) === 'null' && (Tools::EndsWith($fieldName, '_id') || in_array($fieldtype, array('primary', 'lookup'), true)))){
                $expression = 'NULL';
            } else {
                if($val instanceof EntityReference){
                    $val = $val->Id;
                }
                if(Tools::EndsWith($fieldName, '_id') || $fieldName === 'id' || in_array($fieldtype, array('primary', 'lookup'), true)){
                    $val = Tools::FixGuid($val);
                    if($val === false){
                        return false;
                    }
                    $val = substr($val, 2);
                    $expression = 'UNHEX('.$placeholder.')';
                } else if($fieldtype === 'sha1'){
                    if(!is_string($val) || !preg_match('/^(?:0x)?[a-f0-9]{40}$/Di', $val)){
                        return false;
                    }
                    $val = preg_replace('/^0x/i', '', $val);
                    $expression = 'UNHEX('.$placeholder.')';
                } else if(!is_scalar($val)){
                    return false;
                }
                if(is_bool($val)){
                    $val = (int)$val;
                }
                $params[$placeholder] = $val;
            }
            $fields .= "`$fieldName`,";
            $values .= $expression.',';
            $set .= "`$fieldName`=".$expression.', ';
            $where .= "`$fieldName`".($expression === 'NULL' ? ' IS NULL ' : '='.$expression.' ');

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
				$fixedEntityId = Tools::FixGuid($entity->Id);
				if($fixedEntityId === false){
					Tools::Log("Trying to update with an invalid ID???", true);
					return false;
				}
				$entity->Id = $fixedEntityId;
				if(strlen($set)>2){
					$sql = "UPDATE `$name` $set WHERE `id` = UNHEX(:_entity_id) AND `entity_id` = UNHEX(:_scope_id)";
					$params[':_entity_id'] = substr($entity->Id, 2);
					$params[':_scope_id'] = substr($entityId, 2);
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
				$hexColumn = Tools::NeedsHex($columns);
                $columns = Tools::StartsWith($hexColumn, 'HEX(') ? $hexColumn.' AS `'.$columns.'`' : '`'.$columns.'`';
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
				$connection ??= (new Database())->DBC();
				$data = $connection->prepare($sql);
			}
			catch(\PDOException $ex)
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
			catch(\PDOException $ex)
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
                if($data->rowCount() === 0){
                    $found = $connection->prepare("SELECT 1 FROM `$name` WHERE `id`=UNHEX(:id) AND `entity_id`=UNHEX(:scope)");
                    $found->execute(array(':id' => substr($entity->Id, 2), ':scope' => substr($entityId, 2)));
                    return (bool)$found->fetchColumn();
                }
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
			if($value instanceof Entity || $value instanceof EntityReference)
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
    public $Attributes = array();
    public $Count = 0;

    public function __construct($attribs = null){
        $this->Add($attribs);
    }

    public function Add($attribs){
        foreach(is_array($attribs) ? $attribs : array($attribs) as $attribute){
            if($attribute instanceof Attribute){
                $this->Attributes[] = $attribute;
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
