<?php
namespace SuperIntuitive;
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/SuperIntuitive/SuperIntuitive/blob/master/LICENSE
 * @version   v0.9
 */
//session_unset();
require_once dirname(__DIR__).DIRECTORY_SEPARATOR."SuperIntuitive".DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';//Include the static tools class
Tools::Autoload('root');  //Run the auto include function from the root to get all the needed class files. 
define("SI_ENTRY","PAGELOAD"); //as opposed to ajax or another method. incase we move into a function when both are done
//Define the server. Get the hostname subdomain directory path and query string and put them in different defines. 
Tools::DefineServer(); 
Tools::SendSecurityHeaders();

//Get Database and cms setup status
$dbc = new Database();
$installState = $dbc->GetInstallState();

//The variable that holds the Page() object instance
$page = null;
if($installState === Database::INSTALL_STATE_FRESH){
	//The cms needs to be setup.
	Tools::ConfigureSessionCookieParams();
	if(session_status() !== PHP_SESSION_ACTIVE){
		session_start();
	}
	$_SESSION['Installing'] = true; 
	//Tell the page object to get the setup page. 
	$page = new Page("%SETUP%");
}
else if($installState !== Database::INSTALL_STATE_READY){
	http_response_code($installState === Database::INSTALL_STATE_DB_ERROR ? 503 : 409);
?>
<!doctype html>
<html lang="en">
	<head>
		<title>SuperIntuitive Unavailable</title>
	</head>
	<body>
		<h1>SuperIntuitive is temporarily unavailable.</h1>
		<p>
			<?php if($installState === Database::INSTALL_STATE_DB_ERROR){ ?>
			This site has already been installed, but the database is currently unavailable.
			<?php } else { ?>
			This installation is incomplete. Setup has been disabled until an administrator repairs it.
			<?php } ?>
		</p>
	</body>
</html>
<?php
	exit();
}
else{

    //setup session handeling
	$session = new Sessions();



	//Using the DOMAIN and BU from DefineServer, we query the db for the domain, bu, and all entities it presides over. 
	$pageobjects = $dbc->GetDomainInstance();
	if($pageobjects == null){exit();}

	$plugins = new Plugins();
	$pi = $plugins->GetLocalPlugins('installed');
	if(count($pi)>0){
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins']=$pi;
	}

	$dbc->GetDatabaseSchema($pageobjects);

	//Tools::Log($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']);

		//GET THE USER INFO
	//what are the circumstances?
	//1 user has a existing SESSION with logged in user data
	//2 user does not have an existing session but has cookie keys to log them in
	//3 user is a guest
	

	//This will set the current user to the guest user but only if the user does not already exist. This is nice because we can tell if we need to look for a Cookie 
	$session->SetInitialUser();
	//If the user is guest, then try to locate a cookie to authenticate the user. 

	//Tools::Log('In Index: Logging Roles');
	//Tools::Log( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user'] );



    //$cookie = new Cookies();
	//$loggedin = $cookie->CheckLoginCookies();

	

	$login = new Login();
	$login->Remembered();
	//Tools::Log($_COOKIE);
	//	print_r($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['roles']);

	//get the users roles every time.
	$security = new Security();
	$roles = $security->SetUserSecurity();



	
	//echo "<pre>".print_r($_SESSION, true)."</pre>";
	//with the user determined or not, log/update the session in the db.
	$dbc->LogSession();
	
	
	//﻿Array ( [0] => ADMIN [1] => SUPERADMIN [2] => ADMIN [3] => SUPERADMIN

	//$dbc->CreateEntity("pagetemplates");
	//$dbc->UpdateEntitiesQuantities();
	//Tools::Log($pageobjects, true);
	
	$pageobjects = $dbc->GetPageData($pageobjects);

//		echo'<pre>';
//	print_r($pageobjects);
//	echo'</pre>';

	//	echo "<pre>".print_r($_SESSION, true)."</pre>";

	$dbc->GetPageLibraries();
	//echo "is admin ".$_SESSION['ISADMIN'];
	//print_r($_SESSION['USER']['ROLES']);

	if( Tools::UserHasRole("Admin") && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] == 'dev' && $pageobjects !== "%EMPTY_DOMAIN%"){

			$pageobjects = $dbc->GetMediaFiles($pageobjects);
			$pageobjects = $dbc->GetAllPages($pageobjects);
			$pageobjects = $dbc->GetBlockTemplates($pageobjects);
	}
	//print_r($pageobjects);




	$page = new Page($pageobjects);
}

//we need to pass this the list of languages, 
$lang = Tools::GetBrowserLanguage();


//build the html doc
if($page != null){
	$head = $page->GetHead();
	$body = $page->GetBody();

	//if(Tools::UserHasRole(""))
	//Tools::Log($head);
   // $body = phpinfo();
?>
<!doctype html>
<html lang="<?=$lang?>" style='height: 100%;'>
	<head>
		<?= $head ?>	
	</head>
     <?= $body ?>
</html>
<?php

} 
?>
