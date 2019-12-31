<?php
Tools::Autoload();
class Deployment {
	private $deployment;
	public function __construct(){
	}
	
	public function __destruct(){
	}

	public function DrawControls(){
		if(isset( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'] )){
			//$dep = $_SESSION['SI']['page']['deployment'];

			$dep = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];

			$liveB = "filter:brightness(50%)";
			$testB = "filter:brightness(50%)";
			$devB = "filter:brightness(50%)";
			$liveE = "";
			$testE = "";
			$devE = "";
			switch($dep){
				case "dev": $devB = "filter:brightness(150%)"; $devE = 'disabled'; break;
				case "test": $testB = "filter:brightness(150%)"; $testE = 'disabled'; break;
				case "live": $liveB = "filter:brightness(150%)"; $liveE = 'disabled';  break;
			}
			$controls =  "<div id='si_deployment_controls' class='si-deployment-control' style='position:fixed; margin-left:95%; top:5px; opacity: 0.5;'>";
			$controls .=  "<button id='si_deployment_control_live' class='si-deployment-control' title='live' $liveE onclick='SI_ChangeDeployment(this)' style='border-radius:8px; width:16px; height:16px; background-color:red; display:block; border:none; margin:2px; $liveB' >";
			$controls .=  "<button id='si_deployment_control_test' class='si-deployment-control' title='test' $testE onclick='SI_ChangeDeployment(this)' style='border-radius:8px; width:16px; height:16px; background-color:yellow; display:block; border:none; margin:2px; $testB' >";
			if(Tools::UserHasRole("Admin")){
				$controls .=  "<button id='si_deployment_control_dev' class='si-deployment-control' title='dev' $devE onclick='SI_ChangeDeployment(this)'  style='border-radius:8px; width:16px; height:16px; background-color:green; display:block; border:none; margin:2px; $devB' >";
			}
			$controls .=  "
			<script>
				var SI_ChangeDeployment = function(self){
				//debugger;
					let deploy = self.id.replace('si_deployment_control_','');
					Tools.Ajax({Data : {'KEY':'ChangeDeployment','Deployment':deploy}});
				}	
			</script>";

			$controls .=  "</div>";
			return $controls;
		}	

	}
	public function ChangeDeployment($post)
	{
		if(Tools::UserHasRole("SuperAdmin,Admin,Tester"))
		{
			if(isset($post['Deployment']))
			{
				if($post['Deployment']==='live' ||$post['Deployment']==='test' ||$post['Deployment']==='dev')
				{
					if($post['Deployment']==='dev')
					{
						if(Tools::UserHasRole("SuperAdmin,Admin"))
						{
							$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'] = "dev";
						}
					}
					else
					{
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'] = $post['Deployment'];
					}
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['REFRESH'] = 'TRUE';
				}
			}
		}
	}


	//TODO fix this to use the new page session vars
	public function DeployMediaPaths($htmlstring){
		if(isset($_SESSION['SI']['page']['deployment'])){
    		$deployment = $_SESSION['SI']['page']['deployment'];
			if($deployment != 'live'){
			$categories = ['images','audio','videos','data','fonts',"documents"];
				foreach($categories as $cats){
					$htmlstring = str_replace("media/$cats/","media/$cats/".$deployment."_" ,$htmlstring);
				}		
			}
		}
		return $htmlstring;	
	}

}

