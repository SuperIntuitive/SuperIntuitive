<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
Tools::Autoload();
class Block {
	public function __construct(){
	}
	
	public function __destruct(){
	}

	function Save($post){
	
		if(isset($post['guid'])){
			
			$block = new Entity("blocks"); //name  script style html 
			$block->Id = $post['guid'];
			
			$relations = new Entity("relations"); //Order and Options, both deployable
			$relations->Id = $post['relationsId'];

			//The fields that could possibly be saved in a block. we dont have to save all of them all the time, but all options must be saved as one
			$fields = array('order','options','name','script','style','html');
           
			foreach($fields as $field){
				if(isset($post[$field] ))
				{
					switch($field){
						case 'name': $block->Attributes->Add(new Attribute("name",$post[$field] ) ); 
							break;
						case 'options':
								$json =  json_encode($post[$field]);
								$relations->Attributes->Add(new Attribute("dev-options", $json ) ); 
							break;
						case 'order':
								$relations->Attributes->Add(new Attribute("dev-order", $post[$field] ) ); 
							break;
						case 'html':
							$html = $post[$field];
							//Tools::Log($html,true);
							$html = str_replace('/dev_','/',$html);




							//Tools::Log($html.true);
						//	$html = str_replace('media/images/dev_"','media/images/',$html);
						//	$html = str_replace('media/audio/dev_"','media/audio/',$html);
						//	$html = str_replace('media/data/dev_"','media/data/',$html);
						//	$html = str_replace('media/documents/dev_"','media/documents/',$html);
						//	$html = str_replace('media/font/dev_"','media/font/',$html);
						//	$html = str_replace('media/videos/dev_"','media/videos/',$html);
							$block->Attributes->Add(new Attribute("dev-$field",$html ) );
							break;
						case 'style':
						    $style = $post[$field];
							$style = str_replace('/dev_','/',$style);
							$block->Attributes->Add(new Attribute("dev-$field",$style ) );
							break;
						case 'script':
						    $script = $post[$field];
							$script = str_replace('/dev_','/',$script);
							$block->Attributes->Add(new Attribute("dev-$field",$script ) );
							break;
						default: $block->Attributes->Add(new Attribute("dev-$field",$post[$field] ) );
							break;
					}

				}
			}

			try
			{
				//Tools::Log($block);
				//Tools::Log($relations);
				if($block->Attributes->Count>0){
					$block->Update();
				}
				if($relations->Attributes->Count>0){
					$relations->Update();
				}
				
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKSAVED'] = $post['name'];
			}
			catch(Exception $ex)
			{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $ex;
			}
		}

	}
	function New($post){
		try{
			if( isset($post['name']) && isset($post['order']) ){
				$name = $post['name'];
				Tools::Log("In New");
			    //Block defaults
				$post['options'] = $options = '{"tag":"div","style":{"position":"static","left":"0px","top":"0px","width":"100%","height":"500px"}}';
				$html = "<!-- $name block -->";
				$script= "console.log('$name loaded');";
				$style= ".$name { }";
				
				$check = new Entity("blocks");
				$check->Attributes->Add(new Attribute("name",$name)); 
				$dupe = $check->Retrieve();
				Tools::Log($dupe);
				
				//Create a new block and give it all that stuff
				$block = new Entity("blocks");
				$block->Attributes->Add(new Attribute("name",$name)); 
				$block->Attributes->Add(new Attribute("dev-options",$options));
				$block->Attributes->Add(new Attribute("dev-html",$html));
				$block->Attributes->Add(new Attribute("dev-script",$script));
				$block->Attributes->Add(new Attribute("dev-style",$style));

				$newid = null;
				$newid = $block->Create();
				//if the new block is created and we have an id
				if($newid != null){

					$post['blockid']=$newid; //so that relate can find the new block

				    $relid = $this->Relate($post);
					if($relid){
						//All done return
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKCREATED'] = "New Block: $name created";
						return;
					}else{
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION']['ERROR'] = "Created block; failed to create relation";
					}
				}
				else{
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION']['ERROR'] = "Failed to create the block: $name";
				}
			}
		}
		catch(Exception $ex){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $ex;
		}
	}
	function Relate($post){
		try{
			$isnew = false;
			if($post['KEY']==="BlockNew"){$isnew = true;}
			 
			$pageid = !isset($post['pageid']) ? null : $post['pageid'];
			$blockid = !isset($post['blockid']) ? null : $post['blockid'];
			$order = !isset($post['order']) ? null : $post['order'];
			$options = !isset($post['options']) ? null : $post['options'];
			if($pageid && $blockid && ($order!==null)){
				//get the block that were relating to the page
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED'] = array();
				$entity = new Entity('blocks');
				$entity->Id = $blockid;
				$myblock = $entity->Retrieve()[0];
				Tools::Log($myblock);
				if($myblock){

					if(!empty($myblock['options']) ){
						$options = $myblock['options'];
					}

					if($options===null || strlen($options<2)){ //finally if we still have no options
						$options = '{"tag":"div","style":{"position":"static","left":"0px","top":"0px","width":"100%","height":"500px"}}';
					}
					if(isset($myblock['name'])){
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['NAME'] = $myblock['name'];
					}
					if(isset($myblock['html'])){
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['HTML'] = $myblock['html'];
					}
					if(isset($myblock['style'])){
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['STYLE'] = $myblock['style'];
					}
					if(isset($myblock['script'])){
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['SCRIPT'] = $myblock['script'];
					}

					$db = new Database();
					Tools::Log($options);
					$relatedid = $db->NewRelatedEntity("pages",$pageid,"blocks", $blockid, $order, $options);

					if($relatedid != null){

						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['ID'] = $blockid;
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['RELID'] = $relatedid;
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['OPTIONS'] = $options;
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['ORDER'] = $order;
					}
					return $relatedid;
				}

			}
		}catch(Exception $ex){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = $ex;
		}

	}
	function Remove($post){
	    if(isset($post['linkid'])  ){
			Tools::Log("Removing relation:".$post['linkid']);
			$dbc = new Database();
			$dbc->RemoveRelation($post['linkid']);
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKREMOVED'] = "Block removed";
		}

	}

	public function GetPagesBlocks(){
		if(SI_ENTRY == "PAGELOAD"){
			Tools::Log("IN GetPagesBlocks");
			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment']) && isset( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['id']) ){			
				$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
				$pageid = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['id'];
				$cols= "id,name,`$deploymentlevel-html`,`$deploymentlevel-style`,`$deploymentlevel-script`";
				$data = array();
				$data = $this->GetRelatedEntities('pages',$this->pageGuid,'blocks', $cols );

				$libs = array();
				$ses = array();
				
				//echo gettype($data);-
				Tools::Log($data);
				foreach($data as $v){
					if(isset($v['name'])){
						$safekey = Tools::SafeKey($v['name'], $libs);

						$libs[$safekey] = array();
						$libs[$safekey]["id"] = '0x'.$v['id'];
						$libs[$safekey]["name"] = $v['name'];
						$libs[$safekey]["order"] = $v['relationsOrder'];
						$libs[$safekey]["options"] = $v['relationsOptions'];

						$ses[$safekey] = array();
						$ses[$safekey]["id"] = '0x'.$v['id'];
						$ses[$safekey]["name"] = $v['name'];
						$ses[$safekey]["order"] = $v['relationsOrder'];
						$ses[$safekey]["options"] = $v['relationsOptions'];

						$libs[$safekey]['html'] = $v["$deploymentlevel-html"]; //'test html';//
						if(Tools::UserHasRole('Admin')){
							$libs[$safekey]["relayid"] = '0x'.$v['relationsId'];
							$ses[$safekey]["relayid"] = '0x'.$v['relationsId']; //why would this be needed if not to update
							$libs[$safekey]['script'] = $v["$deploymentlevel-script"];//'test script';//
							$libs[$safekey]['style'] =  $v["$deploymentlevel-style"]; //'test style'; //
						}
					}
				}

			//	$_SESSION['SI']['page']['newBlock'] = $ses;
				return $libs;
			}
		}
	}

	public function Get($pageid){	
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
		$cols= "id,name,`$deploymentlevel-html`,`$deploymentlevel-style`,`$deploymentlevel-script`";
		$data = array();
		$db = new Database();
		$data = $db->GetRelatedEntities('pages',$pageid,'blocks', $cols );
		$libs = array();
		foreach($data as $v){
			if(isset($v['name'])){
				$libs[$v['name']] = array();
				$libs[$v['name']]["id"] = '0x'.$v['id'];
				$libs[$v['name']]["name"] = $v['name'];
				$libs[$v['name']]["order"] = $v['relationsOrder'];
				$libs[$v['name']]["options"] = $v['relationsOptions'];
				$libs[$v['name']]['html'] = $v["$deploymentlevel-html"]; //'test html';//
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'][$v['name']]['id']='0x'.$v['id'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'][$v['name']]['name']=  $v['name'];

				//Data only needed by admin for the editor
				if(Tools::UserHasRole('Admin')){
					$libs[$v['name']]["relayid"] = '0x'.$v['relationsId'];
					$libs[$v['name']]['script'] = $v["$deploymentlevel-script"];//'test script';//
					$libs[$v['name']]['style'] =  $v["$deploymentlevel-style"]; //'test style'; //
				}

			}
		}
		return $libs;
	}
} 
