<?php
Tools::Autoload();
class Guid {
	private $guid;
	public function __construct($option){
		if($option === true){
			$this->guid = $this->Create();
		}else if($option === null){
			$this->guid = "0x"."00000000000000000000000000000000";
		}
	}
	
	public function __destruct(){

	}

	public function Create(){
		return  "0x".time().bin2hex(openssl_random_pseudo_bytes(11));

	}
	public function IsGuid($test){
		$rx = new RegX();
		//return rx.Match($test,"/^(\{)?[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}(?(1)\})$/i");
		return rx.Match($test,$rx->guid);
	}
	public function ToString(){
		return $this->guid;
	}


}

