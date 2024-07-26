<?php 
namespace SuperIntuitive;
header("Content-Type: application/javascript; charset: UTF-8");

session_start();
require_once dirname(__DIR__).DIRECTORY_SEPARATOR.'core'.DIRECTORY_SEPARATOR.'Tools.php';
Tools::DefineServer();

//Tools::Log($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins']);
if (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins'])) {

    $plugins = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['plugins'];
    $pluginscript = "";

    foreach($plugins as $plugin){
        $scripts = glob($_SERVER["DOCUMENT_ROOT"]. "/plugins/installed/".$plugin."/scripts/*.js");
        if (count($scripts) > 0) {
            $pluginscript.= "\n/*__PLUGIN=$plugin */";
        }
        foreach($scripts as $script){
            $name = basename($script);
            $pluginscript.= "\n/*__SCRIPTFILE=$name */ \n";
            $pluginscript.= file_get_contents($script);

            $pluginscript.= "\n/*__SCRIPTFILE=$name */";
        }
        if (count($scripts) > 0) {
            $pluginscript.= "\n/*__ENDPLUGIN=$plugin */ \n\n";
        }
    }
    echo $pluginscript;
}

?>

