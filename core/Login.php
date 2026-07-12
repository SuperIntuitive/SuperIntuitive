<?php
namespace SuperIntuitive; 
Tools::Autoload();
class Login {
	private function SetRememberCookie($name, $value, $expires){
		setcookie($name, $value, Tools::GetCookieOptions($expires));
	}

	private function ClearRememberCookie($name){
		setcookie($name, '', Tools::GetCookieOptions(time() - 3600));
	}

	private function FindActiveUserByEmail($email){
		$db = new Database();
		$query = $db->DBC()->prepare("SELECT HEX(`id`) AS `id`, `name`, `email`, `password`, `preferences` FROM `users` WHERE `email` = :email AND `status` = 'active' LIMIT 1");
		$query->execute(array(':email' => $email));
		$user = $query->fetch();
		return ($user === false) ? null : $user;
	}

	private function FindRememberedUser($token, $time){
		$db = new Database();
		$query = $db->DBC()->prepare("SELECT HEX(`id`) AS `id`, `name`, `email`, `password`, `preferences` FROM `users` WHERE `remembertoken` = :token AND `remembertime` = :time AND `status` = 'active' LIMIT 1");
		$query->execute(array(':token' => $token, ':time' => $time));
		$user = $query->fetch();
		return ($user === false) ? null : $user;
	}

	private function FindUserRoles($userId){
		$db = new Database();
		$normalizedId = str_replace('0x', '', strtolower($userId));
		$query = $db->DBC()->prepare("SELECT `securityroles`.`name`, `securityroles`.`rules` FROM `relations` INNER JOIN `securityroles` ON `securityroles`.`id` = `relations`.`child_id` WHERE `relations`.`parent_id` = UNHEX(:userid)");
		$query->execute(array(':userid' => $normalizedId));
		$roles = $query->fetchAll();
		return is_array($roles) ? $roles : array();
	}

	private function UpdateRememberMe($userId, $token = '', $time = null){
		$db = new Database();
		$normalizedId = str_replace('0x', '', strtolower($userId));
		$query = $db->DBC()->prepare("UPDATE `users` SET `remembertoken` = :token, `remembertime` = :remembertime WHERE `id` = UNHEX(:userid)");
		$query->bindValue(':token', $token);
		if($time === null){
			$query->bindValue(':remembertime', null, \PDO::PARAM_NULL);
		}else{
			$query->bindValue(':remembertime', $time);
		}
		$query->bindValue(':userid', $normalizedId);
		$query->execute();
	}

	private function UpdatePasswordHash($userId, $hash){
		$db = new Database();
		$normalizedId = str_replace('0x', '', strtolower($userId));
		$query = $db->DBC()->prepare("UPDATE `users` SET `password` = :password WHERE `id` = UNHEX(:userid)");
		$query->execute(array(':password' => $hash, ':userid' => $normalizedId));
	}

	public function Attempt($post){
		if(isset($post['email']) && isset($post['password'])){
			if (filter_var($post['email'], FILTER_VALIDATE_EMAIL)){
				Tools::Log("ATTEMPTING TO LOGIN USER:".$post['email']);
				$ouruser = $this->FindActiveUserByEmail($post['email']);

				if($ouruser !== null){
					//check if the password checks out.
					$dbpass = $ouruser['password'];
					//Tools::Log("PASS:",$dbpass);
					if (password_verify($post['password'], $dbpass)) {
						//if remember me is set, then make a guid and the time and set it in the database
						$this->Verified($ouruser,$post);
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
						sleep(2); //help make the page load right the first time.
						return true;
					} 
				}
				else{
				
				}
			}
			//$this->Logout();
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['LOGINFAIL'] = 'TRUE';
			sleep(5);//were in no hurry to give up the results of an incorrect attempt.
			return false;
		}
		else{
			return false;
		}
	}

	public function Remembered(){
		//Tools::Log('In Remembered');
		//Tools::Log($_COOKIE);
		if(isset($_COOKIE['remembermetoken']) && isset($_COOKIE['remembermetime'])){
			Tools::Log("about to try to recognise the user");
			$ouruser = $this->FindRememberedUser($_COOKIE['remembermetoken'], (int)$_COOKIE['remembermetime']);
			Tools::Log($ouruser);
			if($ouruser !== null){
				Tools::Log('Verified by cookies');
				//if remember me is set, then make a guid and the time and set it in the database
				$this->Verified($ouruser, null);
				return true;	
			}
		}
		return false;
	}

	private function Verified($ouruser, $post){
					Tools::Log($ouruser);
		if(session_status() === PHP_SESSION_ACTIVE){
			session_regenerate_id(true);
		}
		if(isset($post['rememberme'])){
			if($post['rememberme']){
				Tools::Log('rememberme is true');
				$exptime = time() + (30 * 24 * 60 * 60);
				$token = bin2hex(random_bytes(32));
				$mtime = time();
				Tools::Log('Setting Cookies');
				$this->SetRememberCookie("remembermetoken", $token, $exptime);
				$this->SetRememberCookie("remembermetime", (string)$mtime, $exptime);

				Tools::Log('Setting Cookie data in db');
				$this->UpdateRememberMe($ouruser['id'], $token, $mtime);

			}else{
			    Tools::Log('rememberme is false');
				unset($_COOKIE['remembermetoken']); 
				$this->ClearRememberCookie('remembermetoken'); 
				unset($_COOKIE['remembermetime']); 
				$this->ClearRememberCookie('remembermetime'); 
				Tools::Log('rememberme is false');
				Tools::Log('Setting Cookie data in db');
				$this->UpdateRememberMe($ouruser['id']);
			}
		}

		$usersession = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user'];

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['loggedin'] = true;
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'] = '0x'.$ouruser['id'];
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['name'] = $ouruser['name'];
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['email'] = $ouruser['email'];
		
		//TODO: set this up in the database somewhere.  
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs']['open_links_in'] = 'tab'; //open external links in a window or tab
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs']['help']['moz'] = false;
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs']['help']['w3'] = false; 
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['prefs']['autosave'] = true;
		if(isset($ouruser['preferences'])){
		    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['preferences'] = json_decode($ouruser['preferences']);
		}
		

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'] = array();
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['permissions']=array();

		//$preferences = $db->GetRelatedEntities("users",'0x'.$ouruser['id'] ,"preferences");


		//Goto Database and get the users SecurityRoles. 
		$roles = $this->FindUserRoles($ouruser['id']);
		Tools::Log("Number of user roles: ".count($roles));
		if(count($roles)==0){
			//the user does not have a role yet. we will give them guest
			Tools::Log("The user has no roles so they will get guest rolls.");
			$db = new Database();
			$guestrules = $db->GetGuestRules(); 
			Tools::Log($guestrules);
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['permissions'] = $guestrules;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'][] = "Guest";
		}else{	
			foreach($roles as $role){
				//Tools::Log("Setting the Logged in Roles", true);
				if(!in_array($role['name'], $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'])){
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles'][] = $role['name'];
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['permissions'] = json_decode($role['rules'],true);
				}
			}
		}



		if(Tools::UserHasRole('Admin')) {
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] = "dev";
			Tools::Log("User is Admin");
		}else{
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] = "live";
			Tools::Log("User is NOT Admin", true);
		}
	}
	public function Logout(){
		if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'])){
			$userId = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'];
			unset($_COOKIE['remembermetoken']); 
			$this->ClearRememberCookie('remembermetoken'); 
			unset($_COOKIE['remembermetime']); 
			$this->ClearRememberCookie('remembermetime'); 
			$this->UpdateRememberMe($userId);
		}
		session_destroy();
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
	}
	public function Verify($post){
		if(isset($post['email']) && isset($post['password']) && filter_var($post['email'], FILTER_VALIDATE_EMAIL)){
			$ouruser = $this->FindActiveUserByEmail($post['email']);
			if($ouruser !== null && password_verify($post['password'], $ouruser['password'])){
				return true;
			}
		}
		
		return false;
	}
	public function ChangePassword($post){
		if(empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'])){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED'] = false;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = 'You must be logged in to change your password.';
			return false;
		}

		if(!isset($post['newpassword']) || strlen(trim($post['newpassword'])) === 0){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED'] = false;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = 'A new password is required.';
			return false;
		}

		if(!$this->Verify($post)){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED'] = false;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = 'Current credentials are invalid.';
			return false;
		}

		$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
		try{
			$this->UpdatePasswordHash($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'], $hash);
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED'] = true;
			return true;
		}
		catch(\PDOException $e){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED'] = false;
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = $e->getMessage();
		}

		return false;
	}

}
