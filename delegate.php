<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
session_start();
require_once 'core/Tools.php';
Tools::Autoload('root');
Tools::DefineServer();

define("SI_ENTRY","DELEGATE");

$post = json_decode( file_get_contents("php://input"), true);
$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN'] = array();
$_SESSION['AJAXRETURN'] = array();
//$dbc = new Database();
//echo '{"fred": "Bad Ass"}';
Tools::Log("IN DELEGATE.",true);


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
				$user = new User();



		//Setup functions for use only if not already setup
		case "SetupDatabase":	
				$db = new Database();
				if(!$db->IsCmsSetup() ){
				    Tools::Log("Setting up the Database.");
					$setup = new Setup();
					$setup->SetupDatabase($post);
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


if(count($_SESSION['AJAXRETURN']) > 0 ){
	echo json_encode( array($_SESSION['AJAXRETURN'])  );
	$_SESSION['AJAXRETURN'] = null;
}


if(count($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']) > 0 ){
	try{
		echo json_encode( array($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN'])  );
	    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN'] = null;
	}catch(Exception $ex){
	    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $ex->getMessage();
		
	}

}
