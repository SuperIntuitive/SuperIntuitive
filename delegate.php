<?php
namespace SuperIntuitive;
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
require_once dirname(__DIR__).DIRECTORY_SEPARATOR."SuperIntuitive".DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::ConfigureSessionCookieParams();
session_start();

Tools::Autoload('root');
Tools::DefineServer();
Tools::SendSecurityHeaders();

define("SI_ENTRY","DELEGATE");

if($_SERVER['REQUEST_METHOD'] !== 'POST'){
	http_response_code(405);
	echo json_encode(array(array('ERROR' => 'Method not allowed.')));
	exit();
}

$post = json_decode( file_get_contents("php://input"), true);
$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = array();
$_SESSION['AJAXRETURN'] = array();
//$dbc = new Database();

Tools::Log("IN DELEGATE.");
Tools::Log($post);

$csrfExemptKeys = array('SetupSuperIntuitive', 'TestDatabase', 'TestDomain');
if(isset($post['KEY']) && !in_array($post['KEY'], $csrfExemptKeys, true) && !Tools::ValidateCsrfToken()){
	http_response_code(403);
	echo json_encode(array(array('ERROR' => 'Invalid request token. Refresh the page and try again.')));
	exit();
}

if(isset($post['KEY'])){
	$key = $post['KEY'];
	switch($key){
		case "LoginAttempt": $login = new Login();
				if( $login->Attempt($post) ){
					//echo "logged In";
						
				}else{
						
				}
				break;
		case "Logout": $login = new Login();
				$login->Logout();

				break;
	    case "ChangeDeployment":
				$deploy = new Deployment();
				$deploy->ChangeDeployment($post);
				break;
		case "UpdatePassword":
		case "ChangePassword":
				$login = new Login();
				$login->ChangePassword($post);
				break;
		case "ForgotPassword":
				$user = new User();
				$user->ForgotPassword($post);
				break;
		//Setup functions for use only if not already setup
		case "SetupSuperIntuitive":	
				$db = new Database();
				if(!$db->IsCmsSetup() ){
				    Tools::Log("Setting up the Super Intuitive.");
					$setup = new Setup();
					$setup->SetupSuperIntuitive($post);
				}else{
					Tools::Log("Attempted overwrite of database.");
				}
				break;
		case "TestDatabase":
				$db = new Database();
				if( !$db->IsCmsSetup() ){
				Tools::Log("Testing the Database.");
				$setup = new Setup();
				$setup->TestDatabase($post);
				}else{
					Tools::Log("Attempted overwrite of database.");
				}
			    break;
		case "TestDomain":
				$db = new Database();
				if( !$db->IsCmsSetup() && isset($post['domain'])){
				Tools::Log("Testing the Domain.");
				$setup = new Setup();
				$result = $setup->TestDomain($post['domain']);
				Tools::Log("Result: ".$result);
				echo json_encode(array('outcome' => $result));
				}else{
					Tools::Log("It is too late to check a domain this way. Use the editor.");
				}
			    break;

		default:break;
	}

}


if(isset($_SESSION['AJAXRETURN']) && count($_SESSION['AJAXRETURN']) > 0 ){
	echo json_encode( array($_SESSION['AJAXRETURN'])  );
	$_SESSION['AJAXRETURN'] = null;
}

if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'])){
	if(count($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']) > 0 ){
		try{
			echo json_encode( array($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'])  );
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = null;
		}catch(Exception $ex){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = $ex->getMessage();
		}
	}
}
