<?php 
header("Content-Type: application/javascript; charset: UTF-8");

require_once '../core/Tools.php';
session_start();
Tools::DefineServer();
if (!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['libraries'])) {
    $libraryids = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['libraries'];

        Tools::Autoload('subroot');
        $db = new Database();

        $guids = "";
        foreach($libraryids as $libid){
            $guids.= $libid.',';
        }
        $guids = rtrim($guids, ',');
        $libs = $db ->GetLibsByIds($guids);

        foreach($libs as $name=> $lib){
            echo '/*-!'.$name."!-*/ \n";
            echo $lib['JS']."\n\n\n\n";
        }
 }
 ?>




