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
if(!is_array($post) || !isset($post['KEY']) || !is_string($post['KEY'])){
	http_response_code(400);
	header('Content-Type: application/json; charset=UTF-8');
	echo json_encode(array('outcome' => false, 'message' => 'A JSON object with a request key is required.'));
	exit();
}
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = array();
$_SESSION['AJAXRETURN'] = array();
//$dbc = new Database();

Tools::Log("IN DELEGATE.");

if(!Tools::ValidateCsrfToken()){
	http_response_code(403);
	echo json_encode(array('outcome' => false, 'code' => 'CSRF_INVALID',
        'csrf' => Tools::GetCsrfToken(),
        'message' => in_array($post['KEY'], array('AuthorizeSetup', 'SetupSuperIntuitive', 'TestDatabase', 'TestDomain'), true)
            ? 'Your setup session has changed or expired. Authorize setup again in Step 1.'
            : 'Invalid request token. Refresh the page and try again.'));
	exit();
}

$setupKeys = array('AuthorizeSetup', 'SetupSuperIntuitive', 'TestDatabase', 'TestDomain');
if(isset($post['KEY']) && in_array($post['KEY'], $setupKeys, true)){
	if($post['KEY'] === 'SetupSuperIntuitive'){
		$setupLock = fopen(__DIR__.'/core/setup.lock', 'c');
		if($setupLock === false || !flock($setupLock, LOCK_EX | LOCK_NB)){
			http_response_code(409);
			echo json_encode(array('outcome' => false, 'message' => 'Another installation is in progress.'));
			exit();
		}
	}
	$db = new Database();
	$installState = $db->GetInstallState();
	if($installState !== Database::INSTALL_STATE_FRESH){
		$status = ($installState === Database::INSTALL_STATE_DB_ERROR) ? 503 : 409;
		$message = ($installState === Database::INSTALL_STATE_DB_ERROR)
			? 'This site is already installed. Setup is disabled while the database is unavailable.'
			: 'This site is already installed. Setup is disabled.';
		http_response_code($status);
		echo json_encode(array(array('ERROR' => $message, 'INSTALLSTATE' => $installState)));
		exit();
	}
	if($post['KEY'] === 'AuthorizeSetup'){
        if(!SetupAuthorization::IsAuthorized()){
            if(!RateLimit::RequireAllowance('setup-authorization', 30, 300)){
                echo json_encode(array('outcome' => false, 'code' => 'SETUP_RATE_LIMIT', 'message' => 'Too many authorization attempts. Wait five minutes and try again.'));
                exit();
            }
            if(!SetupAuthorization::Authorize(Tools::GetRequestHeader('X-SI-Setup'))){
                http_response_code(403);
                echo json_encode(array('outcome' => false, 'code' => 'SETUP_KEY_INVALID', 'message' => 'The installation key does not match this server. Check the configured key and try again.'));
                exit();
            }
        }
        echo json_encode(array('outcome' => true, 'authorized' => true, 'csrf' => Tools::GetCsrfToken()));
        exit();
    }
    if(!SetupAuthorization::IsAuthorized()){
        http_response_code(403);
        echo json_encode(array('outcome' => false, 'code' => 'SETUP_AUTH_REQUIRED', 'message' => 'Authorize setup in Step 1 to continue. Your other settings can stay in this form.'));
        exit();
    }
    if(!RateLimit::RequireAllowance('setup-actions', 60, 300)){
        echo json_encode(array('outcome' => false, 'code' => 'SETUP_RATE_LIMIT', 'message' => 'Too many setup requests. Wait five minutes and try again.'));
        exit();
    }
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
				Tools::Log("Setting up the Super Intuitive.");
				$setup = new Setup();
				$setup->SetupSuperIntuitive($post);
				break;
		case "TestDatabase":
				Tools::Log("Testing the Database.");
				$setup = new Setup();
				$setup->TestDatabase($post);
			    break;
		case "TestDomain":
				if(isset($post['domain'])){
				Tools::Log("Testing the Domain.");
				$setup = new Setup();
				$result = $setup->TestDomain($post['domain']);
				Tools::Log("Result: ".$result);
				echo json_encode(array('outcome' => $result));
				}else{
					Tools::Log("No domain was supplied for setup domain testing.");
				}
			    break;

		case "PluginAction":
                (new Login())->RefreshSession();
                (new Plugins())->Action($post);
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
