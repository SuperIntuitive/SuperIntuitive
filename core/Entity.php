<?php


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
		$db = new Database();
		return $db->EntityAction($this,'create');
	}
	public function Retrieve( $columns = null){
		$db = new Database();
		if($columns===null){
			return $db->EntityAction($this,'select');
		}else{
			return $db->EntityAction($this,'select', $columns);
		}
	}
	public function Select( $columns = null){
		$db = new Database();
		if($columns===null){
			return $db->EntityAction($this,'select');
		}else{
			return $db->EntityAction($this,'select', $columns);
		}
	}
	public function Update(){
	    $db = new Database();
		return $db->EntityAction($this,'update');
	}
	public function Delete(){
	    $db = new Database();
		return $db->EntityAction($this,'delete');
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


	private function ProcessEntity($operatrion){
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME])){
			$unit = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME];
			$name = $this->Name;
			//First check security
			$append = false;  //These two will need to be used further down in the Attributes loop. 
			$appendTo = false;
			if(empty( $unit['user']['permissions'][strtolower("$entityId")])){
				Tools::Log("User does not have any $name permission");
				return null;
			}else{
				$entitypermissions =  isset($unit['user']['permissions'][strtolower("$entityId")]) ? $unit['user']['permissions'][strtolower("$entityId")]:false;
				//These should be consolidated to be the same someday. for now use this to match them
				//it is truly a case of programmer and user lingo at odds
				$permMap = array("select"=>"read","create"=>"create","update"=>"write","delete"=>"delete");
				$perm = $permMap[$operatrion];
				$hasPermission = isset($entitypermissions[$perm]) ? $entitypermissions[$perm] :false;
				if($hasPermission == false){
					Tools::Log("User does not have $name $operatrion permission");
					return null;
				}
				$append = isset($entitypermissions['append']) ? $entitypermissions['append'] :false;
				$appendTo = isset($entitypermissions['appendTo']) ? $entitypermissions['appendTo'] :false;
			}
		}
		else{
			//The Session has expired so make sure to handle this.
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
			$ctype = get_class($value);
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


//this is tough so lets...
//The Search is the whole search with all the groups. should be simple like an array
class Filter{
	public $Items = array();
	public $Type = 'and';
	public $Count = 0;
    public function __construct()
	{
		//every search has a default group that 'ands' all of the base attributes together. 
		//it is always at element #0 and cannot be moved. maybe we can change it to 'or' but not till were working ok
	}
	public function AddFilter($filter)
	{
		if(get_class($group)==='Filter')
		{
			$this->Items[] = $filter;
		}
		$this->Count = count($this->Items);
	}
	public function AddCondition($group)
	{
		if(get_class($group)==='SearchGroup')
		{
			$this->Items[] = $group;
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
