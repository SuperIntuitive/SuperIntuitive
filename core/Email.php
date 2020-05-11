<?php
Tools::Autoload();
class Email {

	public function __construct(){

	}
	
	public function __destruct(){

	}


	public function Send($post){
		//the simplist email only has a to address to send to and it must be an array.
		$to = "";
		$subject = " ";
		$message = " ";

		if(isset($post["to"])){
			$to = "";
			for($post["to"] as $eachto){
				$to.=$eachto.", ";
			}
			$to = rtrim($to, ', ');



		}

	}


} 