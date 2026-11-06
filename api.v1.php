<?php
namespace SuperIntuitive;
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/SuperIntuitive/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
require_once dirname(__DIR__).DIRECTORY_SEPARATOR."SuperIntuitive".DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::ConfigureSessionCookieParams();
session_start();
Tools::Autoload('root');
Tools::DefineServer();
Tools::SendSecurityHeaders();
define("SI_ENTRY","API");
if($_SERVER['REQUEST_METHOD'] !== 'POST'){
	http_response_code(405);
	echo json_encode(array('ERROR' => 'Method not allowed.'));
	exit();
}
//Tools::Log("IN API",true);
//for now make it open to admins. after at an entity operation level we will deal with the roles. 
if(Tools::UserHasRole('Admin')){ //ToBe removed when Roles is integrated into entities opps. 
	if(!Tools::ValidateCsrfToken()){
		http_response_code(403);
		echo json_encode(array('ERROR' => 'Invalid request token. Refresh the page and try again.'));
		exit();
	}
    //Tools::Log("IN API as Admin",true);
    $rawPost = file_get_contents("php://input");
    $post = json_decode($rawPost, true);
    $jsonPost = json_decode($rawPost);
    if (($post['Operation'] ?? '') === 'Lookup') {
        try { echo json_encode(Lookup::Search($post), JSON_THROW_ON_ERROR); }
        catch (\Throwable $error) { http_response_code($error->getMessage()==='FORBIDDEN' ? 403 : 400); echo json_encode(['ERROR'=>$error->getMessage()]); }
        exit;
    }
	if(isset($_POST)){unset($_POST);}
	if(isset($_GET)){unset($_GET);}
	if(isset($post["Entity"]) && isset($post["Entity"]['Name']) && isset($post["Operation"])){
		$ent = new Entity ($post["Entity"]['Name'] );
		$op = $post["Operation"];
	    $columns = null;
		if(!empty($post['Columns'])){
			$columns = $post['Columns'];
		}
		if(isset( $post["Entity"]['Id'])){
			$ent->Id = $post["Entity"]['Id'];
		}
		if(isset( $post["Entity"]['Attributes'])){
			$attributes = $post["Entity"]['Attributes'];
			foreach($attributes as $k=>$v){
                if(isset($jsonPost->Entity->Attributes) && $jsonPost->Entity->Attributes instanceof \stdClass && property_exists($jsonPost->Entity->Attributes, $k)){
                    $v = $jsonPost->Entity->Attributes->$k;
                }
                if(preg_match('/^(?:(?:dev|test|live|rollback)-)?options$/D', $k)){
                    $v = Tools::EncodeOptions($v);
                    if($v === false){
                        http_response_code(400);
                        echo json_encode(array('ERROR' => 'Options must be a valid JSON object.'));
                        exit();
                    }
                }else if(is_array($v) || is_object($v)){
                    $v = json_encode($v, JSON_THROW_ON_ERROR);
                }
				$ent->Attributes->Add(new Attribute($k,$v) );
			}
		}
	    //Tools::Log($op,true);
		$data = array();
		switch($op){
			case "Create": $data['CreatedId'] = $ent->Create(); break;
			case "Retrieve": $data = $ent->Retrieve($columns); break;
			case "Update": $data = $ent->Update(); break;
			case "Delete": break;//
			default:break;
		}
		if(!is_array($data)){
			$data = array('Success' => $data === true);
		}
		//Tools::Log($data,true);
		$data['Return']['Entity'] = array();
		$data['Return']['Entity']['Name'] = $post["Entity"]['Name'];
		$data['Input'] = $post;
		if(isset($post["ReturnQuery"])){
			$data['Return']['Query'] = $post["ReturnQuery"];
		}
		//Tools::Log($data);
		echo json_encode($data);
	}
}
else{
	http_response_code(403);
	echo json_encode(array('ERROR' => 'Forbidden'));
}


?>
