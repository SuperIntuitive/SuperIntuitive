<?php
namespace SuperIntuitive; 
class test{

public function EntityAction($entity, $action, $columns = '_ALL_'){
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
			//switch the action
			switch($action){
				case 'select':


			}


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
				$data = $this->pdo->prepare($sql);
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

?>