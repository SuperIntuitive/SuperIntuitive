<?php
Tools::Autoload();
class Lookup {
	private $Populated = false;
	private $InstanceEntityId;
	private $InstanceEntityName;

	private $Entity;
	private $EntityId;
	private $Datatable;
	

	public function __construct($entity, $columns="", $filter="", $display = "name"){
		$this->Entity = $entity;
		$this->EntityId = $entity->Id;
		$this->InstanceEntityName = $entity->Name;
		$this->InstanceEntityId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities'][$this->InstanceEntityName];
		
	}
	
	public function __destruct(){

	}


	public function Draw($retType = "js"){
	    $retval = "";
		if($retType == "js"){
				$retval = " Ele('input',{
			data:{
				entityid: $this->EntityId 
			},
			onclick: function(){
				
			},
			onkeyup:function(){
				alert('query the database');
			}
		})";

		}
		echo $retval;

	}

} 