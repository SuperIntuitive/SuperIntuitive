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

$multipartPost = $_POST;

Tools::Autoload('root');
Tools::DefineServer();
Tools::SendSecurityHeaders();

define("SI_ENTRY","DELEGATEADMIN");
if($_SERVER['REQUEST_METHOD'] !== 'POST'){
	http_response_code(405);
	echo json_encode(array('ERROR' => 'Method not allowed.'));
	exit();
}
if(Tools::UserHasRole('Admin')){
	//Get post from here
	$post = $multipartPost;
	if(empty($post)){
		$post = json_decode(file_get_contents("php://input"), true);
	}
	if(!is_array($post)){
		$post = array();
	}
	if(empty($post['KEY']) && !empty($_FILES['pluginzip'])){
		$post['KEY'] = 'UploadPluginPackage';
	}
	if(!Tools::ValidateCsrfToken()){
		http_response_code(403);
		echo json_encode(array('ERROR' => 'Invalid request token. Refresh the page and try again.'));
		exit();
	}
	//Tools::Log($post);
	unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']); //Make sure any old return data is gone
	$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = array(); //Reinit a new return.
	//If we have a key property
	Tools::Log('In DA');

/*
//eventually move to this type of paradime. to adhere to it will be very organizing. 
	$entity = $post['Entity'];
	$function = $post['Function'];
	$ent = new $entity();
	$ent->$function($post);
*/
	try{
		if(isset($post['KEY'])){

			switch($post['KEY']){
				//Promote an Entity Column
				case "Promote":
					$db = new Database();
					$db->Promote($post); 
					break;

				//Page
				case "PageNew": 
					$page = new Page(null);
					$page->New($post); 
					break;
				case "PageSave": 
					$page = new Page(null);
					$page->Save($post); 
					break;
				case "RemoveRedirect": 
					$page = new Page(null);
					$page->RemoveRedirect($post); 
					break;

				//Block
				case "BlockNew": 
					$block = new Block();
					$block->New($post); 
					break;
				case "BlockSave": 
					$block = new Block();
					$block->Save($post); 
					break;
				case "BlockRelate":
					Tools::Log('BlockRelate');
					$block = new Block();
					$block->Relate($post); 
					break;
				case "BlockRemove":
					$block = new Block();
					$block->Remove($post); 
					break;

				//Media
				case "MediaPromote":
					$media = new Media();
					$media->Promote($post); 
					break;
				case "MediaRecycle":
					$media = new Media();
					$media->Recycle($post); 
					break;

				//ZRelate two entities
				case "RelationNew":
					$relation = new Relations();
					$relation->New($post);
					break;

				//User
				case "ChangePassword":
					$admin = new Admin();
					$admin->SetPassword($post);
					break;
				case "NewUser":
					$admin = new Admin();
					$admin->NewUser($post);
					break;
				case "DeleteUser":
					$admin = new Admin();
					$admin->DeleteUser($post);
					break;

				//Security
				case "GetUserRoles":
					$admin = new Admin();
					$admin->GetUserRoles($post);
					break;
				case "AddUserRole":
					$user = new User();
					$user->AddRole($post);
					break;
				case "RemoveUserRole":
					$user = new User();
					$user->RemoveRole($post);
					break;
				case "DeleteRole":
					$sec = New Role();
					$sec->Delete($post);
					break;

				//Language
				case "AddLanguage":
					$localT = new Localtext();
					$localT->AddLanguage($post);
					break;
				case "LocaltextNew":
					$localT = new Localtext();
					$localT->New($post);
					break;
				case "UpdateLocaltext":
					$localT = new Localtext();
					$localT->Update($post);
					break;
				case "NewEntity":
					$ent = new Entity();
					$ent->NewEntity($post);
					break;



				//Plugins
				case "GetMorePlugins":
				case "DownloadPlugin":
				case "UploadPluginPackage":
				case "InstallPlugin":
				case "UninstallPlugin":
					if(!Tools::CanAccessPluginStore()){
						http_response_code(403);
						echo json_encode(array('ERROR' => 'Plugin management is only available to logged-in admins while the site is in dev deployment.'));
						exit();
					}
					$pi = new Plugins();
					if($post['KEY'] === "GetMorePlugins"){
						$pi->GetMorePlugins();
					}else if($post['KEY'] === "DownloadPlugin"){
						$pi->DownloadPlugin($post);
					}else if($post['KEY'] === "UploadPluginPackage"){
						$pi->UploadPluginPackage($post);
					}else if($post['KEY'] === "InstallPlugin"){
						$pi->InstallPlugin($post);
					}else{
						$pi->UninstallPlugin($post);
					}
					 break;



				case "NewSetting":
					$set = new Setting();
					$set->New(null,null,$post);
					break;
				case "UpdateSetting":
					$set = new Setting();
					$set->Update(null,null,$post);
					break;
				case "DeleteSetting":
					$set = new Setting();
					$set->Delete(null,$post);
					break;

				case "BuildBackupFile":
					$admin = new Admin();
					$admin->BackupDatabase($post);
					break;	
				case "BuildInstallerFile":
					$admin = new Admin();
					$admin->BuildInstallerFile($post);
					break;


				default: 
					break;
			}
		}	

	}
	catch (Exception $e) {
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = $e->getMessage();
	}

	//Return any messages as a json object to parse client side.
	if(count($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']) > 0 ){
	    echo json_encode( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] );
	    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN'] = null; //make sure to clear it after. Race conditions worry me here.
		//it is why it is good to only allow one ajax out at a time before the next on is allowed to go.
    }


//echo json_encode($_POST);
}else{
	//not an admin
	//find out whos trying and report it
	http_response_code(403);
	echo json_encode(array('ERROR' => 'Forbidden'));
	exit();
}







