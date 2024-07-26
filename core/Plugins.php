<?php
namespace SuperIntuitive; 
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

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['MOREPLUGINS']= $plugins;

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
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['DOWNLOADEDPLUGIN']= $fname;
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
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['INSTALLPLUGIN']= $plugin;
				} else {
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['INSTALLPLUGINFAILED']= $plugin;
				}
			}
			catch(Exception $ex){
				Tools::Log($plugin." ".$ex->getMessage());
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['INSTALLPLUGINFAILED']= $plugin." ".$ex->getMessage();
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
				$this->RemovePluginSQL($plugin);
				Tools::DeleteDirectory($_SERVER["DOCUMENT_ROOT"]."/plugins/installed/".$plugin);
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['UNINSTALLPLUGIN']= $plugin;
			}
			catch(Exception $ex){
				Tools::Log($plugin." ".$ex->getMessage());
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['UNINSTALLPLUGINFAILED']= $ex->getMessage();
			}
		}
	}

	private function RemovePluginSQL($plugin){
		//select all the tables with the $plugin prefix
		$db = new Database();
		$tblwildcard = $plugin."\_%";
		try{

			$schema = "SELECT table_name
			FROM INFORMATION_SCHEMA.TABLES
			WHERE table_schema = '$db->databaseName' && table_name LIKE $tblwildcard
			GROUP BY table_name;";

			$tables = $db->DBC()->prepare($schema);
			//print_r($data);
			$tables->execute( );
			//Drop the plugins tables 
			foreach ($tables as $table) {
				$tablename = $table['table_name'];
				$drop = $db->PDO()->prepare("DROP TABLE $tablename;");
				$drop->execute();
			}
		}
		catch(Exception $e){

		}


	}

	private function SavePluginSql($plugin){
		$db = new Database();
		$dir = $_SERVER['DOCUMENT_ROOT'] . "/plugins/installed/".$plugin."/sql/";
		$filename = $plugin.".sql";
		
		Tools::Log($dir);
		if (!file_exists($dir)) {
			mkdir($dir, 0777, true);
		}
		$fpath = "$dir$filename";
		Tools::Log($fpath);

		$tblwildcard = $plugin."\_%";
		try{

			$schema = "SELECT   tbl.table_comment,
								cols.table_name, 
								cols.is_nullable, 
								cols.column_name, 
								cols.character_set_name,
								cols.collation_name,
								cols.column_type, 
								cols.column_comment,
								cols.column_default,
								cols.column_key,
								cols.extra,
								cols.numeric_scale
			FROM INFORMATION_SCHEMA.COLUMNS cols
			JOIN INFORMATION_SCHEMA.TABLES tbl ON cols.table_name = tbl.table_name AND cols.table_schema = tbl.table_schema
			WHERE cols.table_schema = '$db->databaseName' && cols.table_name LIKE $tblwildcard
			ORDER BY table_name, ordinal_position";


			$dbrows = $db->PDO()->prepare($schema);
			//print_r($data);
			$dbrows->execute( );

			$tables = array();
			foreach ($dbrows as $dbrow) {

				$tablename = $dbrow['table_name'];
				$tablecomment = $dbrow['table_comment'];
				$columnname = $dbrow['column_name'];

				if(!isset($tables[$tablename])){
					$tables[$tablename] = array();
					$tables[$tablename]['comment']= $tablecomment;
					$tables[$tablename]['columns']= array();
				}
				
				$tables[$tablename]['columns'][$columnname]= array();
				$tables[$tablename]['columns'][$columnname]['type']= $dbrow['column_type'];;
				$tables[$tablename]['columns'][$columnname]['default']= $dbrow['column_default'];
				$tables[$tablename]['columns'][$columnname]['key']= $dbrow['column_key'];
				$tables[$tablename]['columns'][$columnname]['nullable']= $dbrow['is_nullable'];
				$tables[$tablename]['columns'][$columnname]['comment']= $dbrow['column_comment'];
				$tables[$tablename]['columns'][$columnname]['collation']= $dbrow['collation_name'];
				$tables[$tablename]['columns'][$columnname]['charset']= $dbrow['character_set_name'];
				$tables[$tablename]['columns'][$columnname]['extra']= $dbrow['extra'];
				$tables[$tablename]['columns'][$columnname]['numeric']= $dbrow['numeric_scale'];

			}

			$script = "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\r\nSET AUTOCOMMIT = 0;\r\nSTART TRANSACTION;\r\nSET time_zone = \"+00:00\"; \r\n\r\n";

			$guidLookup = array();

			foreach ($tables as $table=>$tabledata) {
				$tablecomment = $tabledata['comment'];
				$columns = $tabledata['columns'];
				$script .= "CREATE TABLE "."`".$table."` (\r\n";
				$columntext ="";
				$i = 0;
				$len = count($columns);
				$insert = "INSERT INTO `".$table."` (";
				$select = "SELECT ";
				$typeLookup = array();
				foreach ($columns as $column=>$columndata) {
					$insert .=  "`".$column."`";
					$type = $columndata['type'];

					if (strpos($type, "binary") !== false){
						$select .=  "HEX(".$column.")";
						$typeLookup["HEX(".$column.")"]=$type;
					}else{
						$select .=  "`".$column."`";
						$typeLookup[$column]=$type;
					}

					$default = $columndata['default'] == null? "": $columndata['default'];
					$key = $columndata['key'] == null? "": $columndata['key'];
					$nullable = $columndata['nullable'] == null? "": $columndata['nullable'];
					$comment = $columndata['comment'] == null? "": $columndata['comment'];
					$collation = $columndata['collation'] == null? "": $columndata['collation'];
					$charset = $columndata['charset'] == null? "": $columndata['charset'];
					$extra = $columndata['extra'] == null? "": $columndata['extra'];
					$numeric = $columndata['numeric'] == null? "": $columndata['numeric'];

					$columntext.= "\t`".$column."` ".$type;
					if($charset){
						$columntext.= " CHARACTER SET ".$charset;
					}
					if($collation){
						$columntext.= " COLLATE ".$collation;
					}
					if($nullable == "NO"){
						$columntext.= " NOT NULL";
					}
					if($default){

					    if($default == "NULL"){
							$columntext.= " DEFAULT NULL";
						}
						else if($default == "current_timestamp()"){
							$columntext.= " DEFAULT current_timestamp()";
						}
						else if($numeric != "NULL"){
							$columntext.= " DEFAULT ".$default;
						}
						else{
							$columntext.= " DEFAULT '".$default."'";
						}
					}
					if($extra){
						$extra = str_replace("on update","ON UPDATE",$extra);
						$columntext.= " ".$extra;
					}
					if($comment){
						$columntext.= " COMMENT '".$comment."'";
					}
					if ($i != $len - 1) {
						$insert .=", ";
						$select .=", ";
						$columntext.= ",\r\n";
					}else{
						$insert .=") VALUES\r\n";
						$select .=" FROM ".$table;
						$columntext.= "\r\n";
					}
					$i++;
				}

				$script.=$columntext;
				$script.=") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ";
				if($tablecomment){
					$script.=" COMMENT='".$tablecomment."'";
				}
				$script.=";\r\n";
				$script.="\r\n";
			//	$sql = "SELECT * FROM `".$table."`"
				$tdata = $db->PDO()->prepare($select);
				//print_r($data);
				$tdata->execute( );
				if($table == "emails"){
					$x=1;
				}
				foreach($tdata as $trow){
					$j = 0;
					$jlen = count($trow);
					$insert  .= "(";

					//Replace these with tokens for the install
					$trow["createdon"]="_SI_NOWTIME_";
					$trow["modifiedon"]=NULL;

					foreach ($trow as $cname=>$cell) {
						if($cell===NULL){
							$insert .="NULL";
						}else{						
							$ctype = $typeLookup[$cname];
							$stype = substr($ctype, 0, strpos($ctype, "("));
							switch($stype){
								case "binary": 
									$bin = "0x".$cell;
									if($ctype === "binary(16)"){
										if(!$backup){
											$foundInd = array_search($bin, $guidLookup);
											if (false !== $foundInd){
												$bin = "_SI_GUID_".$foundInd;
											}else{
												$bin = "_SI_GUID_".count($guidLookup);
												$guidLookup[] = "0x".$cell;
											}
										}
									}
									$insert .=$bin;
									break;
								case "int": $insert .=$cell; break;
								case "enum": $insert .="'".$cell."'"; break;
								default:
								    $cell = addslashes($cell); 
									$cell = preg_replace('/(\r\n|\r|\n)+/', "\n", $cell);
									$cell = preg_replace('/\s+/', ' ', $cell);
									$insert .="'".$cell."'"; 
								    break;
							}
						}
						if ($j !== $jlen - 1) {
							$insert .=", ";
						}else{
							$insert .="),\r\n";
						}
						$j++;
					}

				}
				if($tdata->rowCount() > 0){
					$insert = rtrim(trim($insert),',');
					$script.=$insert.";\r\n\r\n";
				}
			}
			$indexes = "";
			foreach ($tables as $table=>$tabledata) {
				$columns = $tabledata['columns'];
				$index ="";
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "PRI"){
							$index.="    ADD PRIMARY KEY (`".$column."`),\r\n";
						}
					}
				}
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "UNI"){
							$index.="    ADD UNIQUE KEY(`".$column."`),\r\n";
						}
					}
				}
				foreach ($columns as $column=>$columndata) {
					$key = $columndata['key'] == null? "": $columndata['key'];
					if($key){
						if($key === "MUL"){
							$index.="    ADD KEY (`".$column."`),\r\n";
						}
					}
				}
				if($index){
					$index="ALTER TABLE `".$table."`\r\n".$index;
					$index=trim($index);
					$index=rtrim($index,',').";\r\n\r\n";
					$indexes.=$index;
				}
			}

			$script.=$indexes;

			file_put_contents($fpath, $script);
			

			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Successfully";

		}
		catch(Exception $e){

			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Failed: ".$e;
			
		   Tools::Error($e);
		}
	}



} 