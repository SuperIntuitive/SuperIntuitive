<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
Tools::Autoload();
class Admin {
	public function IncludeAdminFiles(){
		
		$files = "	
		<script src='/editor/editor.js' defer></script>	
		<link rel='stylesheet' type='text/css'  href='/editor/editor.css'>
		";
		$objfiles = scandir('editor/objects');
		foreach($objfiles as $obj){
			if(strlen($obj) > 2){
				$files .= "<script src='/editor/objects/$obj' defer></script>";		
			}

		}


		//$files.=$this->AdminStyle();
		return $files;
	}

	public function GetCurrentMedia($media){
	    //print_r( $media);

		$json = '{';
		foreach($media as $k=> $mo){
		    $id   = $mo['id'];
		    $mime = $mo['mime'];
			$path = $mo['path'];
			$name = $mo['name'];
			$hash = $mo['hash'];
			$k = addslashes ($k);
			$json .=  "
				\"$k\"  : {
					'id':'$id',
				    'mime':'$mime',
					'name':'$name',
					'filename':'$path',
					'hash':0x$hash,
				},
			";
		}
		$json .= '}';
		//echo $json;
		return $json;
	}

	public function GetCurrentPages($allpages){
		$json = '{';
		foreach($allpages as $k=> $pg){
		    $bu = $pg['businessunitName'];
			$dn = $pg['domainName'];
			$page = $pg['pageName'];
			$id = $pg['pageId'];
			$k = addslashes ($k);
			$json .=  "
				\"$k\" : {
				    'id':'$id',
				    'businessunit':'$bu',
					'domain':'$dn',
					'page':'$page'
				},
			";
		}
		$json .= '},';
		return $json;
	}

	public function GetCurrentBlocks($blocks, $template = false){
		//Tools::Log($blocks, true);

		$json .= '{';	

		foreach($blocks as $k=> $bl){
		//Tools::Log($bl, true);
			$guid = isset($bl['id']) ? "'guid':'".$bl['id']."'," : "'guid':'null'," ;
			$relayid = isset($bl['relationsId']) ? "'relationsId':'".$bl['relationsId']."'," : "'relationsId':'null'," ;
			$script = isset($bl['script']) ? "'script':`".$bl['script']."`," : "'script':''," ;
			$style = isset($bl['style']) ? "'style':`".$bl['style']."`," : "'style':''," ;
			$options = isset($bl['options']) ? "'options':'".$bl['options']."'," : "'options':''," ;
			if($template){
				$thumb = isset($bl['thumb']) ? "'thumb':'".$bl['thumb']."'," : "'thumb':''," ;
			}else{
				$order = isset($bl['order']) ? "'order':'".$bl['order']."'," : "'order':'-1'," ;
			}

			$k = addslashes ($k);
			$json .=  "
				\"$k\" : {
					$guid
					$relayid
					$script
					$style
					$options
					";
				if($template)
				{
					$json .= $thumb;	
				}else{
					$json .= $order;	
				}
				$json .="
				},
			";
		}
		$json .= '},';

		//Tools::Log($json);

		if(!isset($_SESSION['SITMP'])){
			$_SESSION['SITMP'] = array();
		}
			
		$_SESSION['SITMP']['blocks']= $json;
		return $json;
	}

	public function SetPassword($post){
		if ( isset($post['newpassword']) && isset($post['userid'])) {	
			$user = new Entity("users");
			$user->Id = $post['userid'];
			$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
			//	echo $hash;
			$user->Attributes->Add(new Attribute("password", $hash) ); 
			try{
				$user->Update();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PASSWORDCHANGED']=true;
			
			}
			catch(Exception $e){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PASSWORDCHANGED']=false;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['ERROR']= $e->getMessage();
			}
		}
	}

	public function NewUser($post){
		if ( isset($post['newpassword']) && isset($post['name']) && isset($post['email']) ) {	
			$user = new Entity("users");
		
		//Tools::Log("IN NEW USER");
			$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
			//	echo $hash;
			$user->Attributes->Add(new Attribute("name", $post['name']) ); 
			$user->Attributes->Add(new Attribute("email", $post['email']) ); 
			$user->Attributes->Add(new Attribute("password", $hash) ); 
			try{
				$id = $user->Create();
				$output = array();
				$output['Status']='true'; 
				$output['UserId']=$id; 
				$output['Name']=$post['name']; 
				$output['Email']=$post['email'];

				//$db = new Database();
				//$db->NewRelatedEntity($entityName,$entityId,$relatedEntityName, $relatedEntityId );

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['CREATEUSER']=$output;
			}
			catch(Exception $e){
				$output = array();
				$output['Status']='true'; 
				$output['Name']=$post['name']; 
				$output['Email']=$post['email'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['CREATEUSER']=$output;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['ERROR']= $e->getMessage();
			}
		}
	}
	public function DeleteUser($post){
		$user = new Entity("users");
		$user->Id = $post['id'];
		$user->Delete();
	}
	public function GetUserRoles($post){
		Tools::Log("Getting User ROles");
		if(isset($post['userid'])){
			$id = Tools::FixGuid($post['userid']);
			$db = new Database();
			$roles = $db->GetRelatedEntities("users",$id ,"securityroles");
			//Tools::Log($roles);
			$ret = array();
			if($roles != null){
				foreach($roles as $v){
					$ret[$v['id']] = $v['relationsId'];
				}
				
			}else{
				$ret = "NOROLES";
			}


			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['RETRIEVEDROLES']=$ret;
		}
		
	}

	public function AdminStyle(){
		return "
		<style id='si_editor_style'>
		 @font-face {
            font-family: Roboto;
            src: url('/editor/media/fonts/Roboto/Roboto-Regular.ttf');
         }
        @font-face {
            font-family: RobotoThin;
            src: url('/editor/media/fonts/Roboto/Roboto-thin.ttf');
        }
		@font-face {
            font-family: Inconsolata;
            src: url('/editor/media/fonts/Inconsolata/Inconsolata-Regular.ttf');
        }
		.si-scripter-codepad:focus{
			outline:none; /*1px dashed rgba(128,128,128,0.4);*/
		}

		si-jsur{
				color:dodgerblue;
				text-decoration:underline;
				cursor:url;
				}

		si-linm{
			display:block;
			width:100%;
			cursor:pointer;
		}
		si-linm:hover{
			background-color:#000080;
			color:#F0FFFF;
		}

		si-jsrx{color:	pink;}
		si-jscom{color:	#8FBC8F;}

		si-jssym{color:	#FFD700;}

		si-jskw{color:#1E90FF}

		si-jssq{color:#CD5C5C}

		si-jsdq{color:#F08080}

		si-jsmet{color:#ADD8E6}

		si-jswin{color:#20B2AA}

		si-jsnu{color:#FFEFD5}

		si-jsarf{color:#87CEEB}
		si-jsarp{color:#9370DB}

		si-jsstf{color:#87CEEB}
		si-jsstp{color:#9370DB}

		si-jsdtf{color:#3CB371}
		si-jsdtp{color:#90EE90}

		si-jself{color:#008080}
		si-jselp{color:#20B2AA}

		</style>
		";

	}
} 
