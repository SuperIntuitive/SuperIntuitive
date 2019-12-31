<?php 
header("Content-type: text/javascript; charset: UTF-8");

session_start();
require_once '../core/Tools.php';
Tools::DefineServer();

$finishedScript = '';
if (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'])) {
    // Tools:: Log("in page.js after the condidtion");
    Tools::Autoload('subroot');
    $db = new Database();
    $blocks = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['blocks'];
    $guids = "";
    // Tools::Log($blocks, true);
    foreach($blocks as $block){
        $guids.= $block['id'].',';
           
    }
    $guids = rtrim($guids, ',');
    $libs = $db->GetBlockScriptsByIds($guids);
    foreach($libs as $name=>$type){           
        if (!empty($type['js'])) {
            $finishedScript.= "\n/*__BLOCK=$name */ \n";
            $finishedScript.= $type['js'];
            $finishedScript.= "\n/*__ENDBLOCK=$name */ \n";
        }             
    }
}

echo $finishedScript;

?> 

