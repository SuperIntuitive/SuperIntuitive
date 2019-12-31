<?php
Tools::Autoload();
class Cookies {
	public function __construct()
	{

	}
	
	public function __destruct()
	{

	}
	
	public function AllowCookies(){
	
	}

	public function CheckLoginCookies(){
		if(!empty($_COOKIE['PHPSESSID'] ))
		{
			if(isset($_COOKIE['rememberme'] ))
		    {
				if(isset($_COOKIE['ckey'] ))
				{
					if(isset($_COOKIE['ctime'] ))
					{
						//try to authenticated the user using this stuff
						$login = new Login();
				
					}
				}
			}
		}

	}


	//GDPR
	public function DrawCookiesOptIn(){
	
	}

	public function DrawCookiesDisclosureGrid(){
	
	}


} 