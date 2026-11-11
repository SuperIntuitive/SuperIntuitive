<?php
namespace SuperIntuitive; 
Tools::Autoload();
class Localtext{
	private $serverlanguage;
	
	public function __construct(){

	}
	
	public function __destruct(){
		
	}	
	
    private function Error($message){
        $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR'] = $message;
        return false;
    }
    private function Language($value){
        if(!is_string($value)) return $this->Error('A language code is required.');
        $code = strtolower(trim($value));
        if(!preg_match('/^[a-z]{2,3}(?:-[a-z]{2})?$/D', $code) || !isset((new MiscData())->Languages[$code])){
            return $this->Error('The language is not in the supported language catalog.');
        }
        return $code;
    }
    private function Installed($code, $pdo){
        $query = $pdo->prepare("SELECT IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND COLUMN_NAME=:column");
        $query->execute(array(':column' => '_'.$code));
        $column = $query->fetch(\PDO::FETCH_ASSOC);
        if(!$column) return false;
        $attributes =& $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes'];
        if(!isset($attributes['_'.$code])){
            $attributes['_'.$code] = array('type' => 'text', 'optional' => $column['IS_NULLABLE'], 'maxchars' => $column['CHARACTER_MAXIMUM_LENGTH']);
        }
        return true;
    }
    public function DefaultLanguages(){
        $pdo = (new Database())->DBC();
        $query = $pdo->query("SELECT COALESCE(NULLIF(s.settingvalue,''),'en') AS language FROM entities lt LEFT JOIN entities se ON se.name='settings' AND se.domain_id=lt.domain_id AND se.subdomain_id=lt.subdomain_id AND se.status='active' LEFT JOIN settings s ON s.entity_id=se.id AND s.settingname='DefaultLanguage' AND s.status='active' WHERE lt.name='localtext' AND lt.status='active'");
        return array_values(array_unique(array_map(fn($value) => strtolower(trim($value)), $query->fetchAll(\PDO::FETCH_COLUMN))));
    }
    private function SchemaChange($operation, $deleting = false){
        $bu = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME];
        $scope = Tools::FixGuid($bu['entities']['localtext']['instanceguid'] ?? null);
        $permissions = $bu['user']['permissions'][$scope] ?? array();
        if($scope === false || !filter_var($permissions['write'] ?? false, FILTER_VALIDATE_BOOLEAN)
            || ($deleting && !filter_var($permissions['delete'] ?? false, FILTER_VALIDATE_BOOLEAN))){
            return $this->Error('You do not have permission to change installed languages.');
        }
        $pdo = (new Database())->DBC();
        if((int)$pdo->query("SELECT GET_LOCK(CONCAT('si_localtext_',MD5(DATABASE())),5)")->fetchColumn() !== 1){
            return $this->Error('Another language change is in progress. Please try again.');
        }
        try{
            return $operation($pdo);
        }catch(\PDOException $error){
            Tools::Log('Language schema change failed: '.$error->getMessage());
            return $this->Error('The installed languages could not be changed.');
        }finally{
            $pdo->query("SELECT RELEASE_LOCK(CONCAT('si_localtext_',MD5(DATABASE())))");
        }
    }
    public function AddLanguage($post){
        $code = $this->Language($post['langcode'] ?? null);
        if($code === false) return false;
        $name = (new MiscData())->Languages[$code];
        return $this->SchemaChange(function($pdo) use ($code, $name){
            if(!$this->Installed($code, $pdo)){
                $comment = $pdo->quote(json_encode(array('Name' => $name)));
                $pdo->exec("ALTER TABLE `localtext` ADD `_$code` MEDIUMTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL COMMENT $comment");
                $this->Installed($code, $pdo);
            }
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ADDEDLANGUAGE'] = array('langcode' => $code, 'name' => $name);
            return true;
        });
    }
    public function RemoveLanguage($post){
        $code = $this->Language($post['langcode'] ?? null);
        if($code === false) return false;
        if(($post['confirm'] ?? null) !== true) return $this->Error('Confirm the permanent loss of this language\'s translations first.');
        return $this->SchemaChange(function($pdo) use ($code){
            $columns = $pdo->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='localtext' AND LEFT(COLUMN_NAME,1)='_'")->fetchAll(\PDO::FETCH_COLUMN);
            if(!in_array('_'.$code, $columns, true)) return $this->Error('The language is not installed.');
            if(count($columns) <= 1) return $this->Error('The last installed language cannot be removed.');
            if(in_array($code, $this->DefaultLanguages(), true)) return $this->Error('This language is a configured default for a site in this database and cannot be removed.');
            $pdo->exec("ALTER TABLE `localtext` DROP COLUMN `_$code`");
            unset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes']['_'.$code]);
            $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['REMOVEDLANGUAGE'] = array('langcode' => $code, 'name' => (new MiscData())->Languages[$code]);
            return true;
        }, true);
    }
    public function New($post){
        $language = $this->Language($post['language'] ?? null);
        if($language === false) return false;
        $text = $post['text'] ?? null;
        if(!is_string($text) || $text === '') return $this->Error('New local text must contain text.');
        if(!$this->Installed($language, (new Database())->DBC())) return $this->Error('The language is not installed.');
        $options = Tools::EncodeOptions($post['options'] ?? '{}');
        if($options === false) return $this->Error('Local text options must be a JSON object.');
        $token = Tools::RandomString(20, 'CAPS');
        $entity = new Entity('localtext');
        $entity->Attributes->Add(new Attribute('name', $token));
        $entity->Attributes->Add(new Attribute('_'.$language, $text));
        $entity->Attributes->Add(new Attribute('options', $options));
        // Older language installations created required columns without defaults.
        $attributes = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['entities']['localtext']['attributes'];
        foreach($attributes as $column => $definition){
            if(str_starts_with($column, '_') && $column !== '_'.$language && ($definition['optional'] ?? null) === 'NO' && !isset($definition['default'])){
                $entity->Attributes->Add(new Attribute($column, ''));
            }
        }
        $id = $entity->Create();
        if(!$id) return $this->Error('The local text could not be created.');
        $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['NEWLOCALTEXT'] = array('language' => '_'.$language, 'text' => $text, 'id' => $id, 'token' => $token);
        return true;
    }
    public function Update($post, $connection = null){
        $language = $this->Language($post['language'] ?? null);
        if($language === false) return false;
        $text = $post['text'] ?? null;
        $id = Tools::FixGuid($post['id'] ?? null);
        if(!is_string($text) || $id === false) return $this->Error('A valid local text ID and text are required.');
        if(!$this->Installed($language, $connection ?? (new Database())->DBC())) return $this->Error('The language is not installed.');
        $entity = new Entity('localtext', $id);
        $entity->Attributes->Add(new Attribute('_'.$language, $text));
        if(!$entity->Update($connection)) return $this->Error('The local text could not be updated in this site.');
        if($connection === null) $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['LOCALTEXTUPDATED'] = true;
        return true;
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
