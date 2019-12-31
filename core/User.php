<?php
Tools::Autoload();
class User{

	public function __construct(){

	}
	
	public function __destruct(){

	}

	function UpdatePassword(){
		if(isset($_post['newpassword']) && isset($_post['newpassword'])){
		
		}

	}

	function GetUsersForEditor(){
		$users = new Entity('users');
		$ret = $users->Retrieve("id,status,createdon,modifiedon,name,email");
		//Tools::Log($ret);
		return $ret;
	}

	function AddRole($post){
		if(isset($post['userid']) && isset($post['roleid'])){
			$db = new Database();
			$db->NewRelatedEntity('users',$post['userid'],'securityroles', $post['roleid']);
		}
	}

	function RemoveRole($post){
		Tools::Log($post);
		if(isset($post['relid'])){	
			$db = new Database();
			$db->RemoveRelation($post['relid']);
		}
	}


} 