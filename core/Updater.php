<?php
Tools::Autoload();
class Updater {

	public function __construct(){

	}
	
	public function __destruct(){

	}

    public function PerformUpdate($post){
        //allow the option to update from different branches with the dafault being master
        if(!isset($post['branch'])){
            $branch = "master";
        }else{
            $branch = $post['branch'];
        }
        //get the zipfile from github
        $update = file_get_contents("https://github.com/superintuitive/SuperIntuitive/archive/$branch.zip");
        //put the zip file in the updates folder
        file_put_contents($_SERVER["DOCUMENT_ROOT"] ."/core/setup/updates/$branch.zip", $update);
        //delete the zip data in memory. its not needed anymore and could be biggish
        unset($update);
        //unzip the file
        $zip = new ZipArchive;
        if ($zip->open($_SERVER["DOCUMENT_ROOT"]."/core/setup/updates/$branch.zip") === TRUE) {
            //extract the zip file to a temp direcotry.
            $zip->extractTo($_SERVER["DOCUMENT_ROOT"] . "/core/setup/updates/temp/");
            $zip->close();
            //delete the zip file
            unlink($_SERVER["DOCUMENT_ROOT"]."/core/setup/updates/$branch.zip");

            //get all the new file names into an array
            $files = array();
            //the root name
            $root = $_SERVER["DOCUMENT_ROOT"]."/core/setup/updates/temp/SuperIntuitive-$branch";
            //get all the files we could need and put them in the array
            $files = array_merge( 
                glob("$root/core/setup/installers/*.sql"),
                glob("$root/core/*"),
    
                glob("$root/editor/*"),
                glob("$root/editor/media/*"),
                glob("$root/editor/media/data/*"),
                glob("$root/editor/media/documents/*"),
                glob("$root/editor/media/fonts/*"),
                glob("$root/editor/media/icons/*"),
                glob("$root/editor/media/images/*"),
                glob("$root/editor/media/video/*"),
                glob("$root/editor/objects/*"),
    
                glob("$root/scripts/*"),
                glob("$root/scripts/widgets/*"),
    
                glob("$root/style/*"),
    
                glob("$root/*")  
            );
    

            //loop through them all.
            foreach($files as $file){
                //If its a directory
                if(is_dir($file))
                {
                    //if it doesnt exist
                    if (!file_exists($file)) {
                        //create it
                        mkdir($file, 0755, true);
                    }
 
                }else{
                    $newFileName = $file;
                    $sysFileName = str_replace("/core/setup/updates/temp/SuperIntuitive-$branch", "",$file);

                    if(!Tools::SameFileData($newFileName,$sysFileName)){
                         rename ($newFileName, $sysFileName);
                        Tools::Log("Moving ".$newFileName." to ".$sysFileName);
                    }else{
                        Tools::Log($newFileName." is the same as ".$sysFileName);
                    }
                }
            }

            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['SUPERALERT']= "Update Complete";
        } else {
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['UPDATEFAILED']= "TRUE";
        }
    }



} 