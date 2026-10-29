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

class Deployment {
	private $deployment;
	public function __construct(){
	}
	
	public function __destruct(){
	}

	public function DrawScript(){
			return  "
			<script>
				if (!SI) { var SI = {}; }
				if (!SI.Deployment) { SI.Deployment = {}; }
				SI.Deployment.Change = function(self){
				//debugger;
					let deploy = self.id.replace('si_deployment_control_','');
                    const blocks = window.SI && SI.Editor && SI.Editor.Data && SI.Editor.Data.Objects.Blocks;
                    if (blocks && Object.values(blocks).some(block => block.IsDirty) && !confirm('Switch deployment and discard your unsaved changes?')) return;
                    self.disabled = true;
                    const request = SI.Tools.Ajax({Data : {'KEY':'ChangeDeployment','Deployment':deploy}});
                    request.timeout = 20000;
                    request.addEventListener('load', function () {
                        if (request.status === 200 && window.SI && SI.Editor) {
                            try {
                                const response = JSON.parse(request.responseText);
                                if (response[0] && response[0].REFRESH) SI.Editor.DeploymentSwitchAccepted = true;
                            } catch (error) {}
                        }
                    });
                    request.addEventListener('loadend', function () {
                        self.disabled = false;
                        if (request.status !== 200) alert('Could not switch deployment. Refresh the page and try again.');
                    });
				}	
			</script>";
	}

	public function DrawControls(){
		if(Tools::UserHasRole("Admin,Tester"))
		{
			if(isset( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] )){
				$dep = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];

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
				$controls =  "<div id='si_deployment_controls' class='si-deployment-control' style='position:fixed; right:14px; bottom:14px; z-index:996; display:flex; gap:3px; padding:5px; border-radius:4px; background:#121d30; opacity:0.9;'>";
				$controls .=  "<button id='si_deployment_control_live' class='si-deployment-control' title='live' $liveE onclick='SI.Deployment.Change(this)' style='border-radius:8px; width:16px; height:16px; background-color:red; display:block; border:none; margin:2px; $liveB' ></button>";
				$controls .=  "<button id='si_deployment_control_test' class='si-deployment-control' title='test' $testE onclick='SI.Deployment.Change(this)' style='border-radius:8px; width:16px; height:16px; background-color:yellow; display:block; border:none; margin:2px; $testB' ></button>";
				if(Tools::UserHasRole("Admin")){
					$controls .=  "<button id='si_deployment_control_dev' class='si-deployment-control' title='dev' $devE onclick='SI.Deployment.Change(this)'  style='border-radius:8px; width:16px; height:16px; background-color:green; display:block; border:none; margin:2px; $devB' ></button>";
				}

				$controls .=  "</div>";
				return $controls;
			}	
		}
	}
    public function ChangeDeployment($post){
        $bu =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $level = is_array($post) ? ($post['Deployment'] ?? null) : null;
        if(!Tools::UserHasRole('Admin,Tester') || !is_string($level) || !in_array($level, array('live', 'test', 'dev'), true)
            || ($level === 'dev' && !Tools::UserHasRole('Admin'))){
            $bu['AJAXRETURN']['ERROR'] = 'You cannot switch to that deployment.';
            return false;
        }
        $bu['deployment'] = $level;
        unset($bu['page'], $_SESSION['SITMP']);
        $bu['AJAXRETURN']['REFRESH'] = 'TRUE';
        return true;
    }




    public function DeployMediaPaths($content){
        $deployment = Tools::GetCurrentDeployment();
        if(!in_array($deployment, array('dev', 'test'), true)) return $content;
        $host = SI_SUBDOMAIN_NAME === '' ? SI_DOMAIN_NAME : SI_SUBDOMAIN_NAME.'.'.SI_DOMAIN_NAME;
        // Match whole local URLs rather than replacing paths inside unrelated external URLs.
        $pattern = '~(?<![a-z0-9_/:.\x7e-])(?:(https?://[^/\s\x22\x27()<>]+))?(/?media/(?:images|audio|videos?|data|fonts|icons|documents)/)(?!dev_|test_|rollback_)([^/\s\x22\x27()<>]+)~i';
        return preg_replace_callback($pattern, function($match) use ($deployment, $host){
            if($match[1] !== '' && strtolower((string)parse_url($match[1], PHP_URL_HOST)) !== strtolower($host)) return $match[0];
            return $match[1].$match[2].$deployment.'_'.$match[3];
        }, $content);
    }

}

