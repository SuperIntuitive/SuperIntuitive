
<?php


class Setting {

	function New($name=null, $value=null, $post=null){
		Tools::Log("IN Settings");
		if(isset($post['settingname']) ){
			    $name = $post['settingname'];
		}
		if(isset($post['settingvalue'])){
			    $value = $post['settingvalue'];
		}
		if($name && $value){

			$ent = new Entity('settings');
			$ent->Attributes->Add(new Attribute("settingname", $name));
			$ent->Attributes->Add(new Attribute("settingvalue", $value));
			Tools::Log($ent);
			$id = $ent->Create();
			$id = ltrim($id, "0x");

			if($id){
				$setting = [$id, $name, $value];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PARAMETER'] = $setting;
				//
			}

		}
	//settingname:name, settingvalue:value
	}

	function Update($name=null, $value=null, $post=null){
		Tools::Log("IN Settings Update");
		Tools::Log($post);
		if(isset($post['settingname']) ){
			    $name = $post['settingname'];
		}
		if(isset($post['settingvalue'])){
			    $value = $post['settingvalue'];
		}
		if($name){
		Tools::Log($name.":".$value);
			$ent = new Entity('settings');
			$ent->Attributes->Add(new Attribute("settingname", $name));
			$found = $ent->Retrieve();

			if(isset($found[0]['id'])){
				$id = $found[0]['id'];
			    $update = new Entity('settings');
				$update->Id = $id;
				$update->Attributes->Add(new Attribute("settingvalue", $value));

				$update->Update();

				$nvp = [$name, $value];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['SETTINGUPDATED'] = $nvp;
			}

		}
	//settingname:name, settingvalue:value
	}
	function Delete($name=null, $post=null){
		Tools::Log("IN Settings Delete");
		if(isset($post['settingname']) ){
			    $name = $post['settingname'];
		}
		if($name){
			$delete = new Entity('settings');
			$delete->Attributes->Add(new Attribute("settingname", $name));
			$delete->Delete();
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PARAMETER'] = $name;
		}
	}

	function Relate($post){
		try{
			$isnew = false;
			if($post['KEY']==="BlockNew"){$isnew = true;}
			 
			$pageid = !isset($post['pageid']) ? null : $post['pageid'];
			$settingid = !isset($post['settingid']) ? null : $post['settingid'];
			if($pageid && $settingid){
				//get the block that were relating to the page
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['SETTINGRELATED'] = array();
				$relatedid = $db->NewRelatedEntity("pages",$pageid,"settings", $settingid);
				if($relatedid != null){
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['BLOCKRELATED']['RELID'] = $relatedid;
				}
				return $relatedid;
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
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['SETTINGREMOVED'] = "Block removed";
		}
	}

}


