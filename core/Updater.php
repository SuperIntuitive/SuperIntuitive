<?php
Tools::Autoload();
class Template {

	public function __construct(){

	}
	
	public function __destruct(){

	}

    public function PerformUpdate($post){
        //allow the option to update from different branches with the dafault being master
        if(!isset($post['branch'])){
            $post['branch'] = "master";
        }
        $branch = "?ref=".$post['branch'];


        $rootContentsJson = file_get_contents("https://api.github.com/repos/superintuitive/superintuitive/contents/".$branch);
        $rootContents = json_decode($rootContentsJson);






    }



} 