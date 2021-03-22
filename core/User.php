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

	function ForgotPassword($post){
		Tools::Log('In Forgot Password!');
		$users = new Entity('users');
		$users->Attributes->Add(new Attribute("email", post['email']));
		$ret = $users->Retrieve("id,status,createdon,modifiedon,name,email");
		$u = $ret[0];

	    Tools::Log($ret);
		$message ="You forgot your password dumbass! hahaha";
		$subject = "Forgot Password";
		mail($u->email, $subject, $message);
		Tools::Log("email sent!!!");
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