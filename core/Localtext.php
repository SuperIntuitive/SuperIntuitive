<?php
namespace SuperIntuitive; 
Tools::Autoload();
class Localtext{
	private $serverlanguage;
	
	public function __construct(){

	}
	
	public function __destruct(){
		
	}	
	
	public function AddLanguage($post){
		if(isset($post['langcode']) && isset($post['name'])){
			$langcode = $post['langcode'];
			$name = $post['name'];
			$addLang = "ALTER TABLE `localtext` ADD `_$langcode` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci  NOT NULL COMMENT '{\"Name\":\"$name\"}';";
			Tools::Log($addLang);
			$db = new Database();
			try{
			    $db->Execute($addLang);
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ADDEDLANGUAGE'] = $post;
			}
			catch(PDOException $ex){
				

			}
			
		}

	}
	public function New($post){
		if(isset($post['language']) && isset($post['text']) ){
			if(isset($post['options'])){
				$opts = $post['options'];
			}else{
				$opts ='{}';
			}
			$langcol = '_'.$post['language'];
			$text = $post['text'];
			$code = Tools::RandomString(20,"CAPS");
			$localTxtEnt = new Entity('localtext');
			$localTxtEnt->Attributes->Add(new Attribute('name',$code));
			$localTxtEnt->Attributes->Add(new Attribute($langcol,$text));
			$localTxtEnt->Attributes->Add(new Attribute('options',$opts));
			Tools::Log($localTxtEnt);
			//Create the Localtext
			$guid = $localTxtEnt->Create();
			if($guid){
				$ret = array(); 
				$ret['language'] = $langcol;
				$ret['text'] = $text;
				$ret['id'] = $guid;
				$ret['token'] = $code;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['NEWLOCALTEXT'] =$ret;
			}
		}
	}


	public function Update($post){
		if(isset($post['id'])&&isset($post['language'])&&isset($post['text'])){
			
			$lang = $post['language'];
			$txt = $post['text'];
			$id = $post['id'];
			$localent = new Entity('localtext');
			$localent->Id = $id;
			$localent->Attributes->Add(new Attribute('_'.$lang,$txt));
			Tools::Log("Updating Localtext");
			Tools::Log($localent);
			$localent->Update();
		}
	}




	public function Save($post){
		$spanish = YandexTranslate('en', 'es', $post['text']);
		Tools::Log($spanish);

	}

	public function ReplaceLanguage(){



	//this should replace text with inner as token.

		$dom = new DOMDocument();

	}


	public function Translate($langto, $langfrom, $text){
		



	}

	public function YandexTranslate($langto, $langfrom, $text){
		$text = urlencode($text);
		$url = "https://translate.yandex.com/?lang=$langto-$langfrom&text=".$text;
		$text = file_get_contents($url);



	}

	public function GoogleTranslate($text){
/*
		$setting = new Entity("settings");
		$setting->Attributes->Add(new Attribute("name", 'RapidApiKey'));
		$key = $setting->Retrieve();
		if($key['value']){
			$key = $key['value'];
		}
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]


		$curl = curl_init();
		curl_setopt_array($curl, array(
			CURLOPT_URL => "https://google-translate1.p.rapidapi.com/language/translate/v2/detect",
			CURLOPT_RETURNTRANSFER => true,
			CURLOPT_FOLLOWLOCATION => true,
			CURLOPT_ENCODING => "",
			CURLOPT_MAXREDIRS => 10,
			CURLOPT_TIMEOUT => 30,
			CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
			CURLOPT_CUSTOMREQUEST => "POST",
			CURLOPT_POSTFIELDS => "q=Translate%20my%20shit%20google",
			CURLOPT_HTTPHEADER => array(
				"content-type: application/x-www-form-urlencoded",
				"x-rapidapi-host: google-translate1.p.rapidapi.com",
				"x-rapidapi-key: c30712ac88mshecb0fccf8a4aaf0p11c40djsn78bd69bdf306"
			),
		));

		$response = curl_exec($curl);
		$err = curl_error($curl);

		curl_close($curl);

		if ($err) {
			echo "cURL Error #:" . $err;
		} else {
			echo $response;
		}
*/
	}


}


