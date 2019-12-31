<?php
Tools::Autoload();
class Relations {

	public function __construct(){

	}
	
	public function __destruct(){

	}

	public function New($post){
		try{
			if(isset($post)){
				$entityName = $post["EntityName"];
				$entityId = $post["EntityId"];
				$relatedEntityName = $post["RelatedEntityName"];
				$relatedEntityId = $post["RelatedEntityId"];
				$order = $post["Order"];
				$options = $post["Options"];
			}else{
				Tools::Log("No Data to relate");
				$_SESSION['AJAXRETURN']['EXCEPTION'] = "No data to relate";
				return false;
			}
		}
		catch (Exception $ex){
			
		}
		//$entityName,$entityId,$relatedEntityName, $relatedEntityId, $devorder = 0, $devoptions = null 
		
	
		$relayid = new Guid(true);
		$relayid = $relayid->ToString(); //a random guid

		$relayEntityId = array_search("relations",$this->entityLookup); //the relations entity id for thie domain

		if($relayEntityId !== FALSE){

			$entityId = Tools::FixGuid($entityId);//clean the ids
			$relatedEntityId = Tools::FixGuid($relatedEntityId);
			
			$entityNameId = $entityName;
			$relatedEntityNameId = $relatedEntityName;
			//print_r($this->entityLookup);
			//this allows the entity to be supplied ether as a string-name or its guid. 
			//In the end it becomes a guid after looking it up
			if(!Tools::StartsWith($entityName,'0x')){
				$entityNameId = $this->entityLookup[$entityNameId];
			}else{
				$entityName = array_search($entityNameId,$this->entityLookup);
			}
			//ho $eType;
			//print_r($this->entityLookup);
			if(!Tools::StartsWith($relatedEntityNameId,'0x')){
				$relatedEntityNameId = $this->entityLookup[$relatedEntityNameId];
			}else{
				$relatedEntityName = array_search($relatedEntityNameId,$this->entityLookup);
			}

			$note = "$entityName_$relatedEntityName";

			$devopt1 = "";
			$devopt2 = "";
			if($devoptions!= null){
				$devopt1 = ",`dev-options`";
				$devopt2 = ",:devoptions";
			}

			$sql = "INSERT INTO `relations` (`id`,`entity_id`,`parententity_id`,`childentity_id`,`parentid`,`childid`,`dev-order`,`note`,$devopt1) VALUES($relayid,$relayEntityId,$relatedEntityId,$relatedEntityNameId,$entityId,$entityNameId,$devorder,:note,$devopt2);";

			$data = $this->pdo->prepare($sql);
			if($devoptions!= null){
				$data->execute();
			}else{
				$data->execute(array(':note'=>$note, ':devoptions'=> $devoptions ));
			}
	
		}

	}

	//this will delete all relations where the parent or the child id is supplyied. In the end there will be no realtions eather way. 
	public function DeleteAllRelations($guid){
		


		$sql = "DELETE `relations` WHERE  `parent_id` = $guid OR `child_id` = $guid;";
		$db = new Database();
		$db->Execute($sql);
	}


} 