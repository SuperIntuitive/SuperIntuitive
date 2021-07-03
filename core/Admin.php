<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */
Tools::Autoload();
class Admin {
	public function IncludeAdminFiles(){
		

		$moded = filemtime('editor/editor.css');
		$files = "\t\t<link rel='stylesheet' type='text/css'  href='/editor/editor.css?$moded'>\n";

		$moded = filemtime('editor/editor.js');
		$files .= "\t\t<script defer src='/editor/editor.js?$moded' ></script>\n";

		$objfiles = scandir('editor/objects');
		foreach($objfiles as $obj){
			if(!is_dir('editor/objects/'.$obj)){
				$moded = filemtime('editor/objects/'.$obj);
				$files .= "\t\t<script defer src='/editor/objects/$obj?$moded' ></script>\n";	
			}
		}


		//$files.=$this->AdminStyle();
		return $files;
	}
	public function GetCurrentMedia($media){
	    //print_r( $media);

		$json = '{';
		foreach($media as $k=> $mo){
		    $id   = $mo['id'];
		    $mime = $mo['mime'];
			$path = $mo['path'];
			$name = $mo['name'];
			$hash = $mo['hash'];
			$k = addslashes ($k);
			$json .=  "
				\"$k\"  : {
					'id':'$id',
				    'mime':'$mime',
					'name':'$name',
					'filename':'$path',
					'hash':0x$hash,
				},
			";
		}
		$json .= '}';
		//echo $json;
		return $json;
	}
	public function GetCurrentPages($allpages){
		$json = '{';
		foreach($allpages as $k=> $pg){
		    $bu = $pg['subdomainName'];
			$dn = $pg['domainName'];
			$page = $pg['pageName'];
			$id = $pg['pageId'];
			$k = addslashes ($k);
			$json .=  "
				\"$k\" : {
				    'id':'$id',
				    'subdomain':'$bu',
					'domain':'$dn',
					'page':'$page'
				},
			";
		}
		$json .= '},';
		return $json;
	}
	public function GetCurrentBlocks($blocks, $template = false){
		//Tools::Log($blocks, true);

		$json .= '{';	

		foreach($blocks as $k=> $bl){
		//Tools::Log($bl, true);
			$guid = isset($bl['id']) ? "'guid':'".$bl['id']."'," : "'guid':'null'," ;
			$relayid = isset($bl['relationsId']) ? "'relationsId':'".$bl['relationsId']."'," : "'relationsId':'null'," ;
			$script = isset($bl['script']) ? "'script':`".$bl['script']."`," : "'script':''," ;
			$style = isset($bl['style']) ? "'style':`".$bl['style']."`," : "'style':''," ;
			$options = isset($bl['options']) ? "'options':'".$bl['options']."'," : "'options':''," ;
			if($template){
				$thumb = isset($bl['thumb']) ? "'thumb':'".$bl['thumb']."'," : "'thumb':''," ;
			}else{
				$order = isset($bl['order']) ? "'order':'".$bl['order']."'," : "'order':'-1'," ;
			}

			$k = addslashes ($k);
			$json .=  "
				\"$k\" : {
					$guid
					$relayid
					$script
					$style
					$options
					";
				if($template)
				{
					$json .= $thumb;	
				}else{
					$json .= $order;	
				}
				$json .="
				},
			";
		}
		$json .= '},';

		//Tools::Log($json);

		if(!isset($_SESSION['SITMP'])){
			$_SESSION['SITMP'] = array();
		}
			
		$_SESSION['SITMP']['blocks']= $json;
		return $json;
	}
	public function SetPassword($post){
		if ( isset($post['newpassword']) && isset($post['userid'])) {	
			$user = new Entity("users");
			$user->Id = $post['userid'];
			$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
			//	echo $hash;
			$user->Attributes->Add(new Attribute("password", $hash) ); 
			try{
				$user->Update();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED']=true;
			
			}
			catch(Exception $e){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PASSWORDCHANGED']=false;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR']= $e->getMessage();
			}
		}
	}
	public function NewUser($post){
		if ( isset($post['newpassword']) && isset($post['name']) && isset($post['email']) ) {	
			$user = new Entity("users");
		
		//Tools::Log("IN NEW USER");
			$hash = password_hash($post['newpassword'], PASSWORD_DEFAULT);
			//	echo $hash;
			$user->Attributes->Add(new Attribute("name", $post['name']) ); 
			$user->Attributes->Add(new Attribute("email", $post['email']) ); 
			$user->Attributes->Add(new Attribute("password", $hash) ); 
			try{
				$id = $user->Create();
				$output = array();
				$output['Status']='true'; 
				$output['UserId']=$id; 
				$output['Name']=$post['name']; 
				$output['Email']=$post['email'];

				//$db = new Database();
				//$db->NewRelatedEntity($entityName,$entityId,$relatedEntityName, $relatedEntityId );

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['CREATEUSER']=$output;
			}
			catch(Exception $e){
				$output = array();
				$output['Status']='true'; 
				$output['Name']=$post['name']; 
				$output['Email']=$post['email'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['CREATEUSER']=$output;
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['ERROR']= $e->getMessage();
			}
		}
	}
	public function DeleteUser($post){
		$user = new Entity("users");
		$user->Id = $post['id'];
		$user->Delete();
	}
	public function GetUserRoles($post){
		Tools::Log("Getting User ROles");
		if(isset($post['userid'])){
			$id = Tools::FixGuid($post['userid']);
			$db = new Database();
			$roles = $db->GetRelatedEntities("users",$id ,"securityroles");
			//Tools::Log($roles);
			$ret = array();
			if($roles != null){
				foreach($roles as $v){
					$ret[$v['id']] = $v['relationsId'];
				}
				
			}else{
				$ret = "NOROLES";
			}


			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['RETRIEVEDROLES']=$ret;
		}
		
	}
	public function AdminStyle(){
		return "
		<style id='si_editor_style'>
		 @font-face {
            font-family: Roboto;
            src: url('/editor/media/fonts/Roboto/Roboto-Regular.ttf');
         }
        @font-face {
            font-family: RobotoThin;
            src: url('/editor/media/fonts/Roboto/Roboto-thin.ttf');
        }
		@font-face {
            font-family: Inconsolata;
            src: url('/editor/media/fonts/Inconsolata/Inconsolata-Regular.ttf');
        }
		.si-scripter-codepad:focus{
			outline:none; /*1px dashed rgba(128,128,128,0.4);*/
		}

		si-jsur{
				color:dodgerblue;
				text-decoration:underline;
				cursor:url;
				}

		si-linm{
			display:block;
			width:100%;
			cursor:pointer;
		}
		si-linm:hover{
			background-color:#000080;
			color:#F0FFFF;
		}

		si-jsrx{color:	pink;}
		si-jscom{color:	#8FBC8F;}

		si-jssym{color:	#FFD700;}

		si-jskw{color:#1E90FF}

		si-jssq{color:#CD5C5C}

		si-jsdq{color:#F08080} 

		si-jsmet{color:#ADD8E6}

		si-jswin{color:#20B2AA}

		si-jsnu{color:#FFEFD5}

		si-jsarf{color:#87CEEB}
		si-jsarp{color:#9370DB}

		si-jsstf{color:#87CEEB}
		si-jsstp{color:#9370DB}

		si-jsdtf{color:#3CB371}
		si-jsdtp{color:#90EE90}

		si-jself{color:#008080}
		si-jselp{color:#20B2AA}

		</style>
		";

	}

	public function BackupDatabase($post){
		$this->BuildInstallerFile($post, true);
	}	
	public function BuildInstallerFile($post, $backup = false){

		$filename;

		if($backup){
			$datepath = date("Y/m/");
			if(isset($post['Name'])){
				$filename = $post['Name'].".sql";
			}else{
				$filename = date("d_H-i-s")."_SiBackup.sql";
			}
			$dir = $_SERVER['DOCUMENT_ROOT'] . "/sql/backups/$datepath";
		}
		else{$filename = date("d_H-i-s")."_SiBackup.sql";
			if(isset($post['Name'])){
				$filename = $post['Name'].".sql";
			}else{
				$filename = date("d_H-i-s")."_SiInstaller.sql";
			}
			$dir = $_SERVER['DOCUMENT_ROOT'] . "/sql/installer/";
		}
		
		Tools::Log($dir);
		if (!file_exists($dir)) {
			mkdir($dir, 0777, true);
		}
		$fpath = "$dir$filename";
		Tools::Log($fpath);
	
		try{
			$db = new Database();
			$pdo = $db->DBC();
			$database = $db->GetDatabaseName();
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
			WHERE cols.table_schema = '$database'
			ORDER BY table_name, ordinal_position";

			
			$dbrows = $pdo->prepare($schema);
			//print_r($data);
			$dbrows->execute( );

			$tables = array();
			foreach ($dbrows as $dbrow) {

				$tablename = $dbrow['table_name'];
				if($tablename == "securityroles"){
					$bla = "STOP HERE";
				}
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

				if(!$backup){
					if($table ==="domains" || $table ==="subdomains" || $table ==="users"){
						$select.= " LIMIT 1";
					}
				}

				$script.=$columntext;
				$script.=") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci ";
				if($tablecomment){
					$script.=" COMMENT='".$tablecomment."'";
				}
				$script.=";\r\n";
				$script.="\r\n";

				$tdata = $pdo->prepare($select);
				$tdata->execute( );

				if($table == "emails"){
					$x=1;
				}

				foreach($tdata as $trow){
					$j = 0;
					$jlen = count($trow);
					$insert  .= "(";

					if(!$backup){

						$trow["createdon"]="_SI_NOWTIME_";
						$trow["modifiedon"]=NULL;

						if($table === "domains"){
							$trow["name"]='__SI_DOMAIN_NAME__';
						}
						if($table === "buisnessunits"){
							$trow["name"]='';
						}
						if($table === "users"){
							$trow["name"]='__SI_USER_NAME__';
							$trow["email"]='__SI_USER_EMAIL__';
							$trow["password"]='__SI_USER_PASSWORD__';
						}
						if($table === "settings"){
							switch($trow["settingname"]){
								case 'DefaultLanguage': $trow["settingvalue"] = '__SI_DEFAULT_LANGUAGE__';break;
								case 'DefaultCurrency': $trow["settingvalue"] = '__SI_DEFAULT_CURRENCY__';break;
								case 'DefaultTimeZone': $trow["settingvalue"] = '__SI_DEFAULT_TIMEZONE__';break;
								case 'NotificationEmail': $trow["settingvalue"] = '__SI_DEFAULT_NOTEEMAIL__';break;

								default:break;
							}
							
						}
					}
					foreach ($trow as $cname=>$cell) {
						if($cell===NULL){
							$insert .="NULL";
						}else{						
							$ctype = $typeLookup[$cname];
							$stype = substr($ctype, 0, strpos($ctype, "("));
							switch($stype){
								case "binary": 
									$bin = "0x".strtoupper($cell);
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
									//  (0x)([a-fA-F0-9]{32})   0x[a-fA-F0-9]{32}
									if(!$backup){
									    preg_match_all('/0x[a-fA-F0-9]{32}/', $cell, $allmatches);

									    if($allmatches){
											foreach($allmatches as $matches){
												foreach($matches as $match){
													$binToken = "";
													$fixedmatch = str_replace("0X","0x",strtoupper($match));
													$foundInd = array_search($fixedmatch, $guidLookup);
													if ($foundInd === false){
														$binToken = "_SI_GUID_".count($guidLookup);
														$guidLookup[] = $fixedmatch;
													}else{
														$binToken = "_SI_GUID_".$foundInd;
													}
													$cell = str_replace($match,$binToken, $cell);
												}
											}
										}
									}

								    $cell = addslashes($cell); 
									$cell = preg_replace('/(\r\n|\r|\n)+/', '\n', $cell);
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
			
			if(!$backup){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Installer Built Successfully";
			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Successfully";
			}
		}
		catch(Exception $e){
			if(!$backup){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Installer Build Failed: ".$e;
			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']["BUILDINSTALLER"] = "Backed Up Database Failed: ".$e;
			}
		   Tools::Error($e);
		}
	}





} 
