<?php
Tools::Autoload();
class Security {

	public function __construct(){

	}
	
	public function __destruct(){

	}

	public function SetUserSecurity(){
		$roles = new Role();
		$roles->GetUserRoles();
		//Tools::Log($roles);
	}

} 


class Role {
    public $Name;
	public $Rules ='';
	public function __construct($n = null, $r = null){
		
	}
	
	public function __destruct(){

	} 

	public function Create($name,$rules){
		$this->Name = $name;
		$role = new Entity('securityroles');
		$role->Attributes.Add(new Attribute("name",$name) );
		$role->Attributes.Add(new Attribute("rules",$rules) );
		$role->Create();
	}
	public function Modify($id,$rules){

	}
	public function Assign($userid, $role){
		



	}

	public function Delete($post){
		if(isset($post['roleid'])){
			$ent = new Entity('securityroles');
			$id =  Tools::FixGuid($post['roleid']);
			if($id){
				$ent->Id =$id;
				$ent->Delete();
				//now delete an relations to it
				//$r = new Relations();
				//$r->DeleteAllRelations($id);

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ROLEDELETED'] = $post['rolename'];
			}

		}
	}

	public function GetUserRoles(){
	//	Tools::LogTrace();
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id']) )
		{
			$userid = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'];
			$db = new Database();

		    $roles = $db->GetRelatedEntities("users",$userid,"securityroles");

			if($roles!==false){
				return $roles;
			}else{
				return array();
			}
		}else{
			Tools::Log("in Security->GetUserRoles() We dont have a user id yet.");
		}
		
	}



}
