
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

			if($id){
				$nvp = [$name, $value];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['SETTINGCREATED'] = $nvp;
			}

		}
	//settingname:name, settingvalue:value
	}

	function Update($name=null, $value=null){
		Tools::Log("IN Settings Update");
		
		if(isset($post['settingname']) ){
			    $name = $post['settingname'];
		}
		if(isset($post['settingvalue'])){
			    $value = $post['settingvalue'];
		}
		if($name){
		
			$ent = new Entity('settings');
			$ent->Attributes->Add(new Attribute("settingname", $name));
			$found = $ent->Select();

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
			$ind = $post['index'];
			$kvp=[$name,$ind];
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['SETTINGDELETED'] = $kvp;
		}
	}
}


