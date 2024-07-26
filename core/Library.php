<?php
namespace SuperIntuitive; 
class Library {


	private $libdirectory = '/lib';

	public function __construct(){
	   $this->GetLibNames();


	}
	
	public function __destruct(){

	}
	
	private function GetLibNames(){
		$dir = getcwd ().$this->libdirectory. '/*' ;
		$directories = glob($dir, GLOB_ONLYDIR);
	}


	
} 