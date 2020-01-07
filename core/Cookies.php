<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
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
