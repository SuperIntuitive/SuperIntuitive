<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/SuperIntuitive/SuperIntuitive/blob/master/LICENSE
 * @version   v0.9
 */
//session_unset();

require_once 'core/Tools.php';	//Include the static tools class
Tools::Autoload('root');  //Run the auto include function from the root to get all the needed class files. 
define("SI_ENTRY","PAGELOAD"); //as opposed to ajax or another method. incase we move into a function when both are done
//Define the server. Get the hostname subdomain directory path and query string and put them in different defines. 
Tools::DefineServer(); 

//Get Database and cms setup status
$dbc = new Database();
$issetup = $dbc->IsCmsSetup();

//The variable that holds the Page() object instance
$page = null;
if(!$issetup){
	//The cms needs to be setup.
	$_SESSION['Installing'] = true; 
	//Tell the page object to get the setup page. 
	$page = new Page("%SETUP%");
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
