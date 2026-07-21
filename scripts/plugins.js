<?php 
namespace SuperIntuitive;
header("Content-Type: application/javascript; charset: UTF-8");

session_start();
require_once dirname(__DIR__).DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::DefineServer();

//Tools::Log($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins']);
if (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins'])) {

    $plugins = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins'];
    $deployment = Tools::GetCurrentDeployment();
    $pluginscript = "";

    foreach($plugins as $plugin){
        $scripts = glob($_SERVER["DOCUMENT_ROOT"]. "/plugins/installed/".$plugin."/scripts/*.js");
        $selectedScripts = array();
        if (count($scripts) > 0) {
            $scriptVariants = array();
            foreach($scripts as $script){
                $name = basename($script);
                $baseName = preg_replace('/-min(?=\.js$)/i', '', $name);
                if(!isset($scriptVariants[$baseName])){
                    $scriptVariants[$baseName] = array(
                        'default' => null,
                        'min' => null,
                    );
                }

                if(preg_match('/-min\.js$/i', $name) === 1){
                    $scriptVariants[$baseName]['min'] = $script;
                }
                else{
                    $scriptVariants[$baseName]['default'] = $script;
                }
            }

            foreach($scriptVariants as $variant){
                $selected = null;
                if($deployment === 'dev'){
                    $selected = $variant['default'] ?? $variant['min'];
                }
                else{
                    $selected = $variant['min'] ?? $variant['default'];
                }

                if($selected !== null){
                    $selectedScripts[] = $selected;
                }
            }

            sort($selectedScripts, SORT_NATURAL | SORT_FLAG_CASE);
        }

        if (count($selectedScripts) > 0) {
            $pluginscript.= "\n/*__PLUGIN=$plugin */";
        }
        foreach($selectedScripts as $script){
            $name = basename($script);
            $pluginscript.= "\n/*__SCRIPTFILE=$name */ \n";
            $pluginscript.= file_get_contents($script);

            $pluginscript.= "\n/*__SCRIPTFILE=$name */";
        }
        if (count($selectedScripts) > 0) {
            $pluginscript.= "\n/*__ENDPLUGIN=$plugin */ \n\n";
        }
    }
    echo $pluginscript;
}

?>

