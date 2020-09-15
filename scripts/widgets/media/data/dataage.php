
<?php

    if(isset($_GET["language"])){
        $lang =  htmlspecialchars($_GET["language"]);
        switch($lang){
            case 'html': echo filemtime($_SERVER['DOCUMENT_ROOT'].'/scripts/widgets/media/data/html.json'); break;
            case 'css':  echo filemtime($_SERVER['DOCUMENT_ROOT'].'/scripts/widgets/media/data/css.json'); break;
            case 'js' :  echo filemtime($_SERVER['DOCUMENT_ROOT'].'/scripts/widgets/media/data/js.json'); break;
            case 'php' : echo filemtime($_SERVER['DOCUMENT_ROOT'].'/scripts/widgets/media/data/php.json'); break;
            case 'sql' : echo filemtime($_SERVER['DOCUMENT_ROOT'].'/scripts/widgets/media/data/sql.json'); break;
        }
    } 
?>