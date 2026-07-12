<?php
namespace SuperIntuitive; 
Tools::Autoload();
class User{
	private function FindActiveUserByEmail($email){
		$db = new Database();
		$query = $db->DBC()->prepare("SELECT HEX(`id`) AS `id`, `name`, `email` FROM `users` WHERE `email` = :email AND `status` = 'active' LIMIT 1");
		$query->execute(array(':email' => $email));
		$user = $query->fetch();
		return ($user === false) ? null : $user;
	}

	public function __construct(){

	}
	
	public function __destruct(){

	}

	function UpdatePassword(){
		if(isset($_post['newpassword']) && isset($_post['newpassword'])){
		
		}

	}

	function ForgotPassword($post){
		if(!isset($post['email']) || !filter_var($post['email'], FILTER_VALIDATE_EMAIL)){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['FORGOTPASSWORD'] = false;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = 'A valid email address is required.';
			return false;
		}

		$user = $this->FindActiveUserByEmail($post['email']);
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['FORGOTPASSWORD'] = true;

		if($user === null){
			return true;
		}

		$message = "A password reset was requested for this account. If you did not request it, you can ignore this email.";
		$subject = "Password Reset";
		$headers = "Content-Type: text/plain; charset=UTF-8\r\n";
		if(!@mail($user['email'], $subject, $message, $headers)){
			Tools::Log('Password reset email could not be sent for '.$user['email']);
		}

		return true;
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