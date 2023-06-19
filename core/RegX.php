<?php
Tools::Autoload();
class RegX {
	public function __construct($expression){

	}
	
	public function __destruct(){

	}
	public function Match($subject,$pattern){
		if (preg_match($pattern,$subject)===1 ) {
		    return true;
		}
		return false;
	}
	public function Replace($subject,$pattern,$with=''){
		return preg_replace($pattern,$with,$subject);
	}

	public $guid = "/^(\{)?[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}(?(1)\})$/i";
	public $ipv4 = "/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/";
	public $email = "/\b[\w\.-]+@[\w\.-]+\.\w{2,4}\b/gi";
	public $url = "/(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/ ";
	public $alpha = "/^[a-zA-Z]*$/";
	public $digits = "/^[0-9]*$/";
	public $amex = "/^(3[47][0-9]{13})*$/";
	public $mstrcd= "/^(5[1-5][0-9]{14})*$/";
	


} 
