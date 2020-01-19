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
define("SI_ENTRY","API");
//Tools::Log("IN API",true);
//for now make it open to admins. after at an entity operation level we will deal with the roles. 
if(Tools::UserHasRole('Admin')){ //ToBe removed when Roles is integrated into entities opps. 
    //Tools::Log("IN API as Admin",true);
    $post = json_decode( file_get_contents("php://input"), true);

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
				if(is_array($v)){
					$v = json_encode($v);//handle json input
				}
				$ent->Attributes->Add(new Attribute($k,$v) );
			}
		}

	//	Tools::Log($op,true);
		$data = array();

		switch($op){
			case "Create": $data['CreatedId'] = $ent->Create(); break;
			case "Retrieve": $data = $ent->Retrieve($columns); break;
			case "Update": $data = $ent->Update(); break;
			case "Delete": break;//
			default:break;
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





?>
