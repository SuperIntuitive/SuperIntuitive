<?php
Tools::Autoload();
class Plugins {
	

	public function __construct(){
		$plugdir = $_SERVER["DOCUMENT_ROOT"] . "/plugins";
		if (!is_dir($plugdir)) {
			mkdir($plugdir,0644);
		}

		$dwnlddir = $_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded";
		if (!is_dir($dwnlddir)) {
			mkdir($dwnlddir,0644);
		}

		$instdir = $_SERVER["DOCUMENT_ROOT"] . "/plugins/installed";
		if (!is_dir($instdir)) {
			mkdir($instdir,0644);
		}			
			
	}
	
	public function __destruct(){

    }
    
    public function GetLocalPlugins($status){
		if($status ==='downloaded'){
			$files = array();
			$plugins = glob($_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded/*.zip");
			foreach($plugins as &$v){
				$v = basename ( $v );
			}
			return $plugins;
		}
		else if($status ==='installed'){	
			$path = $_SERVER["DOCUMENT_ROOT"]."/plugins/installed/";
		    $plugins = scandir($path);

			unset($plugins[0]); //.
			unset($plugins[1]); //..
			//get all of the top leve folder names = plugins
			$plugins = array_values($plugins);

			$dependents = array();

		    foreach($plugins as &$v){
				$conf =  $path.'/'.$v.'/info.conf';
				$plugin = array();
				if(file_exists ($conf) ){
					$lines = file( $conf, FILE_IGNORE_NEW_LINES);
					foreach($lines as $line){
						if(!Tools::StartsWith($line,'#')){ //lose comments
							$kvp = explode(":",$line,2);
							if(count($kvp)==2){
								$name = $kvp[0];
								$val = $kvp[1];
								$plugin[$name]=$val;
							}
						}
					}
				}
				//Tools::Log($plugin);
				$v = basename ( $v );
			}
			return $plugins;
		}
	
    }

	private function ParseConfig($config){
		for($i = 0; $i<count($plugins); $i++){
			$plugin = $plugins[$i];
			$confpath = glob($plugin."/info.conf")[0];
			$conflines = file($confpath, FILE_IGNORE_NEW_LINES);
			$pluginData[$i] = array();
			foreach($conflines as $conkvp){
				$conkvp = trim($conkvp);
				if(strpos($conkvp,':') !== FALSE){
					$kvp = explode(':',$conkvp);
					if(count($kvp)==2){
						$pluginData[$i][$kvp[0]] = $kvp[1];
					}
				}
			}
		}
	}

	public function GetMorePlugins(){
		
		//Go to the si plugin repo and get the Plugins
		//TODO add paging and a tracker so this can be fired when the repo is opened and if the user scrolls down the repo
		$plugins = file_get_contents('http://plugins.superintuitive.net?');

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['MOREPLUGINS']= $plugins;

	}

	public function DownloadPlugin($post){
	    if(isset( $post['appname'])){
			set_time_limit(0);

			if (strpos($post['appname'], '/') !== false) {
			//get params on this
				$fname = $post['appname'];
				if(Tools::EndsWith(strtolower($fname), '.zip')){
					$url = $fname;
				}else{
					Tools::Log("What is this path: ".$fname);
				}
			}else{
				$fname = $post['appname'];
				$url = 'http://plugins.superintuitive.net/plugins/'.$fname;
			}

			$path = $_SERVER["DOCUMENT_ROOT"] . '/plugins/downloaded/'.$fname;
			$file = fopen( $path, 'w+');
			//$file = fopen($_SERVER["DOCUMENT_ROOT"] . '/plugins/downloaded', 'w+');
			if(file_exists($url)){
			Tools::Log("Yea we made the file");
			}
			Tools::Log($path );
			$curl = curl_init();

			// Update as of PHP 5.4 array() can be written []
			curl_setopt_array($curl, [
				CURLOPT_URL            => $url,
				CURLOPT_RETURNTRANSFER => 1,
				CURLOPT_FILE           => $file,
				CURLOPT_TIMEOUT        => 50,
				CURLOPT_USERAGENT      => 'Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0)'
			]);

			Tools::Log("Getting the $fname zipfile");
			$response = curl_exec($curl);

			if($response === false) {

				Tools::Log("FAILED to get the plugin ".curl_error($curl));
			}

			//Tools::Log($response); // Do something with the response.
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['DOWNLOADEDPLUGIN']= $fname;
		}
	}

	public function InstallPlugin($post){
	   
		if(isset($post['plugin'])){
		    $zip = new ZipArchive;
			$plugin = $post['plugin'];
			Tools::Log("In Install: ".$plugin);
			try{

				if(file_exists ( $_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded/".$plugin.".zip" )){
					Tools::Log('file exists');
				}

				Tools::Log($_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded/".$plugin.".zip");
				if ($zip->open($_SERVER["DOCUMENT_ROOT"] . "/plugins/downloaded/".$plugin.".zip") === TRUE) {
					Tools::Log("OPened Zip");
					$zip->extractTo($_SERVER["DOCUMENT_ROOT"] . "/plugins/installed/".$plugin);
					$zip->close();
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['INSTALLPLUGIN']= $plugin;
				} else {
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['INSTALLPLUGINFAILED']= $plugin;
				}
			}
			catch(Exception $ex){
				Tools::Log($plugin." ".$ex->getMessage());
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['INSTALLPLUGINFAILED']= $plugin." ".$ex->getMessage();
			}

			if( file_exists($_SERVER["DOCUMENT_ROOT"]."/plugins/installed/".$plugin."/install.json") ){
				$installer = file_get_contents($_SERVER["DOCUMENT_ROOT"]."/plugins/installed/".$plugin."/install.json");
				if($installer!= NULL){
					$installer = json_decode($installer, true);
					Tools::Log($installer);
					if(isset($installer["components"])){
					    //create any entities needed
						if(isset($installer["components"]["entities"])){

							$entities = $installer["components"]["entities"];
							foreach($entities as $entity){

								if(isset($entity["name"])){

								    $newEntity = new Entity();
									$data = array();
									$data['sname'] = $entity["name"];
									$data['pname'] = $entity["pluralname"];
									$data['global'] = $entity["global"];
									if(!empty($entity["attributes"])){
										$data['attributes'] = array();
										$attributes = $entity["attributes"];
										foreach($attributes as $attribute){
											$attr = array();
											$attr["name"] = $attribute["name"];
											$attr["type"] = $attribute["datatype"];
											$attr["def"] = $attribute["default"];
											$attr["deploy"] = FALSE;
											$data['attributes'][] = $attr;
										}
									}

									Tools::Log($data);
									//$newEntity->NewEntity($data);
									/*
									$post['sname']
									$post['pname']
									$post['global']
									$post['attributes'] 
										$v['name']
										$v['type']
										$v['def']
										$v['deploy']
									*/


								}
							}
						}
						
					}

				}
			}


			
		}
	}

	public function UninstallPlugin($post){
		if(isset($post['plugin'])){
			try{
				$plugin = $post['plugin'];
				Tools::Log("IN Uninstall");
				Tools::DeleteDirectory($_SERVER["DOCUMENT_ROOT"]."/plugins/installed/".$plugin);
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['UNINSTALLPLUGIN']= $plugin;
			}
			catch(Exception $ex){
				Tools::Log($plugin." ".$ex->getMessage());
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['UNINSTALLPLUGINFAILED']= $ex->getMessage();
			}
		}
	}



} 