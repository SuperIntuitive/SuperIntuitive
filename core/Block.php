<?php
namespace SuperIntuitive; 
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
        $bu =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $fail = function($message) use (&$bu){ $bu['AJAXRETURN']['ERROR'] = $message; return false; };
        if(!Tools::UserHasRole('Admin') || Tools::GetCurrentDeployment() !== 'dev' || !is_array($post)){
            return $fail('Block editing is only available in Dev.');
        }
        $blockId = Tools::FixGuid($post['guid'] ?? null);
        $relationId = Tools::FixGuid($post['relationsId'] ?? null);
        $scopes = array();
        foreach(array('blocks', 'relations') as $name){
            $scope = Tools::FixGuid($bu['entities'][$name]['instanceguid'] ?? null);
            $permissions = $bu['user']['permissions'][$scope] ?? array();
            if($scope === false || !filter_var($permissions['write'] ?? false, FILTER_VALIDATE_BOOLEAN)){
                return $fail('You do not have permission to save this block.');
            }
            $scopes[$name] = $scope;
        }
        if($blockId === false || $relationId === false){
            return $fail('The block or page link is invalid.');
        }
        $blockFields = $relationFields = array();
        foreach(array('name', 'html', 'script', 'style') as $field){
            if(array_key_exists($field, $post)){
                $value = $post[$field];
                if(!is_string($value)){
                    return $fail('Block content must be text.');
                }
                // Saved media URLs remain deployment-neutral.
                if($field !== 'name') $value = preg_replace('~(/media/(?:images|audio|videos?|data|fonts|icons|documents)/)dev_~', '$1', $value);
                $blockFields[$field === 'name' ? 'name' : 'dev-'.$field] = $value;
            }
        }
        if(array_key_exists('options', $post)){
            $json = Tools::EncodeOptions($post['options']);
            if($json === false){
                return $fail('Block options must be a valid JSON object.');
            }
            $relationFields['dev-options'] = $json;
        }
        if(array_key_exists('order', $post)){
            $order = filter_var($post['order'], FILTER_VALIDATE_INT);
            if($order === false || $order < 0 || $order > 2147483647){
                return $fail('Block order must be a nonnegative integer.');
            }
            $relationFields['dev-order'] = $order;
        }
        $translations = $post['localtext'] ?? [];
        if(!is_array($translations) || !array_is_list($translations)) return $fail('Block translations must be a list.');
        $db = new Database();
        $pdo = $db->DBC();
        try{
            $pdo->beginTransaction();
            $find = $pdo->prepare('SELECT b.name FROM blocks b INNER JOIN relations r ON r.child_id=b.id AND r.childentity_id=b.entity_id
                WHERE b.id=UNHEX(:block) AND b.entity_id=UNHEX(:block_scope) AND r.id=UNHEX(:relation) AND r.entity_id=UNHEX(:relation_scope) FOR UPDATE');
            $find->execute(array(':block' => substr($blockId, 2), ':block_scope' => substr($scopes['blocks'], 2), ':relation' => substr($relationId, 2), ':relation_scope' => substr($scopes['relations'], 2)));
            $row = $find->fetch(\PDO::FETCH_ASSOC);
            if(!$row){
                $pdo->rollBack();
                return $fail('This block does not belong to the supplied page link.');
            }
            foreach(array(array('blocks', $blockId, $blockFields), array('relations', $relationId, $relationFields)) as $record){
                if(!$record[2]) continue;
                $sets = $params = array();
                foreach($record[2] as $field => $value){
                    $parameter = ':value'.count($sets);
                    $sets[] = '`'.$field.'`='.$parameter;
                    $params[$parameter] = $value;
                }
                $params[':id'] = substr($record[1], 2);
                $params[':scope'] = substr($scopes[$record[0]], 2);
                $update = $pdo->prepare('UPDATE `'.$record[0].'` SET '.implode(',', $sets).' WHERE id=UNHEX(:id) AND entity_id=UNHEX(:scope)');
                $update->execute($params);
            }
            foreach($translations as $translation){
                if(!is_array($translation) || !(new Localtext())->Update($translation, $pdo)){
                    $pdo->rollBack();
                    return $fail($bu['AJAXRETURN']['ERROR'] ?? 'The block translation could not be saved.');
                }
            }
            $pdo->commit();
            $bu['AJAXRETURN']['BLOCKSAVED'] = $post['name'] ?? $row['name'];
            return true;
        }catch(\Throwable $error){
            if($pdo->inTransaction()) $pdo->rollBack();
            Tools::Log('Block save failed: '.$error->getMessage());
            return $fail('The block could not be saved. No changes were committed.');
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
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['BLOCKCREATED'] = "New Block: $name created";
						return;
					}else{
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION']['ERROR'] = "Created block; failed to create relation";
					}
				}
				else{
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION']['ERROR'] = "Failed to create the block: $name";
				}
			}
		}
		catch(Exception $ex){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = $ex;
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
				$result = array();
				$entity = new Entity('blocks');
				$entity->Id = $blockid;
				$myblock = $entity->Retrieve()[0];
				Tools::Log($myblock);
				if($myblock){

					if(!empty($myblock['options']) ){
						$options = $myblock['options'];
					}

					if($options===null || strlen($options)<2){ //finally if we still have no options
						$options = '{"tag":"div","style":{"position":"static","left":"0px","top":"0px","width":"100%","height":"500px"}}';
					}
					if(isset($myblock['name'])){
						$result['NAME'] = $myblock['name'];
					}
					if(isset($myblock['html'])){
						$result['HTML'] = $myblock['html'];
					}
					if(isset($myblock['style'])){
						$result['STYLE'] = $myblock['style'];
					}
					if(isset($myblock['script'])){
						$result['SCRIPT'] = $myblock['script'];
					}

					$db = new Database();
					Tools::Log($options);
					$relatedid = $db->NewRelatedEntity("pages",$pageid,"blocks", $blockid, $order, $options);

					if($relatedid != null){

						$result['ID'] = $blockid;
						$result['RELID'] = $relatedid;
						$result['OPTIONS'] = $options;
						$result['ORDER'] = $order;
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['BLOCKRELATED'] = $result;
					} else {
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = 'The block could not be added to this page.';
					}
					return $relatedid;
				}

			}
		}catch(Exception $ex){
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = $ex;
		}

	}
	function Remove($post){
	    if(isset($post['linkid'])  ){
			Tools::Log("Removing relation:".$post['linkid']);
			$dbc = new Database();
			$dbc->RemoveRelation($post['linkid']);
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['BLOCKREMOVED'] = "Block removed";
		}

	}

	public function GetPagesBlocks(){
		if(SI_ENTRY == "PAGELOAD"){
			Tools::Log("IN GetPagesBlocks");
			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment']) && isset( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['id']) ){			
				$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
				$pageid = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['id'];
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
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
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
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'][$v['name']]['id']='0x'.$v['id'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['blocks'][$v['name']]['name']=  $v['name'];

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
