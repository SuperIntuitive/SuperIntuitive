<?php
namespace SuperIntuitive; 
Tools::Autoload();
class Login {

	public function Attempt($post){
		if(isset($post['email']) && isset($post['password'])){
			if (filter_var($post['email'], FILTER_VALIDATE_EMAIL)){
				Tools::Log("ATTEMPTING TO LOGIN USER:".$post['email']);
				$user = new Entity("users");
				$user->Attributes->Add(new Attribute("email",$post['email']) );
				$user->Attributes->Add(new Attribute("status",'active') );
				$users = $user->Retrieve("id,name,email,password,preferences");

				if(count($users)==1){
				    $ouruser = $users[0];
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
			$user = new Entity("users");
			$user->Attributes->Add(new Attribute("remembertoken",$_COOKIE['remembermetoken']) );
			$user->Attributes->Add(new Attribute("remembertime",(int)$_COOKIE['remembermetime']) );
			$user->Attributes->Add(new Attribute("status",'active') );	
			Tools::Log("about to try to recognise the user");
			$users = $user->Retrieve("id,name,email,password");
			Tools::Log($users);
			if(count($users)==1){
				$ouruser = $users[0];
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
		if(isset($post['rememberme'])){
			if($post['rememberme']){
				Tools::Log('rememberme is true');
				$exptime = time() + (10 * 365 * 24 * 60 * 60); //10 years
				$token = Tools::RandomString(32);
				$mtime = preg_replace('/[.+ ]/','',microtime(FALSE));
				Tools::Log('Setting Cookies');
				setcookie( "remembermetoken", $token , $exptime);
				setcookie( "remembermetime", $mtime, $exptime);

				Tools::Log('Setting Cookie data in db');
				$rememberuser = new Entity('users');
				$rememberuser->Id = '0x'.$ouruser['id'];
				$rememberuser->Attributes->Add(new Attribute('remembertoken', $token));
				$rememberuser->Attributes->Add(new Attribute('remembertime', $mtime));
				Tools::Log($rememberuser);
				$rememberuser->Update();

			}else{
			    Tools::Log('rememberme is false');
				unset($_COOKIE['remembermetoken']); 
				setcookie('remembermetoken', null, -1, '/'); 
				unset($_COOKIE['remembermetime']); 
				setcookie('remembermetime', null, -1, '/'); 
				Tools::Log('rememberme is false');
				Tools::Log('Setting Cookie data in db');
				$rememberuser = new Entity('users');
				$rememberuser->Id = '0x'.$ouruser['id'];
				$rememberuser->Attributes->Add(new Attribute('remembertoken', ''));
				$rememberuser->Attributes->Add(new Attribute('remembertime', 'null'));
				Tools::Log($rememberuser);
				$rememberuser->Update();
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
		$db = new Database();
		$roles = $db->GetRelatedEntities("users",'0x'.$ouruser['id'] ,"securityroles");
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
			unset($_COOKIE['remembermetoken']); 
			setcookie('remembermetoken', null, -1, '/'); 
			unset($_COOKIE['remembermetime']); 
			setcookie('remembermetime', null, -1, '/'); 
			$rememberuser = new Entity('users');
			$rememberuser->Id = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'];
			$rememberuser->Attributes->Add(new Attribute('remembertoken', ''));
			$rememberuser->Attributes->Add(new Attribute('remembertime', 'null'));
			$rememberuser->Update();
		}
		session_destroy();
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
	}
	public function Verify($post){
		if(isset($post['email']) && isset($post['password'])){
			if (filter_var($post['email'], FILTER_VALIDATE_EMAIL)){
				Tools::Log("ATTEMPTING TO LOGIN USER", true);
				$db = new Database();
				$user = new Entity("users");
				$user->Attributes->Add(new Attribute("email",$post['email']) );
				$user->Attributes->Add(new Attribute("status",'active') );
				$users = $user->Retrieve($user, "id,name,email,password");
				//	Tools::Log($users, true);
				if(count($users)==1){
				    $ouruser = $users[0];
					//check if the password checks out.
					$dbpass = $ouruser['password'];
					//Tools::Log("PASS:",$dbpass);
					if (password_verify($post['password'], $dbpass)) {
						return true;	
					}
				}
			}
		}
		
		return false;
	}
	public function ChangePassword($post){
		if ($this->Verify() && isset($post['newpassword']) && (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'] ))) {	
			$user = new Entity("users");
			$user->Id = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['id'];
			$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
			//	echo $hash;
			$user->Attributes->Add(new Attribute("password", $hash) ); 
			try{
				$user->Update();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED']=true;
			}
			catch(Exception $e){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED']=false;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR']=$e->getMessage();
			}
		}
	}

}
