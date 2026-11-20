<?php
namespace SuperIntuitive; 
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */

require_once $_SERVER["DOCUMENT_ROOT"].'/core/Tools.php';
Tools::ConfigureSessionCookieParams();
session_start();

Tools::Autoload('root');
Tools::DefineServer();
Tools::SendSecurityHeaders();
define("SI_ENTRY","FILEUPLOAD");
if($_SERVER['REQUEST_METHOD'] !== 'POST'){
	http_response_code(405);
	echo json_encode(array('ERROR' => 'Method not allowed.'));
	exit();
}
if(Tools::UserHasRole('Admin')){
	if(!Tools::ValidateCsrfToken()){
		http_response_code(403);
		echo json_encode(array('ERROR' => 'Invalid request token. Refresh the page and try again.'));
		exit();
	}

	$maxsize = Tools::GetUploadMaxFilesize();
	$ret = array();
	foreach($_FILES as $files){
		if(isset($files['name']) && isset($files['tmp_name']) && isset($files['size'])){
			$host = SI_DOMAIN_NAME;
			//files a packed kind of stupidly. there is an array with 5 arrays, 1 for anem, type,tmpname,error,size,
			//For each file dropped in the operation, the arrays are filled. so we have to check all the arrays.  
			for($i=0; $i<count($files['name']); $i++ ){	
				$name = Tools::SafeUploadedFilename($files['name'][$i]);
				$temp = $files['tmp_name'][$i];
				$size = (int)$files['size'][$i];
				Tools::Log($name);
				$error = (isset($files['error'][$i]))? $files['error'][$i]:null;

				if($error != null || !is_uploaded_file($temp)){
					Tools::Log('Error: '.$error, true);
					continue;
				}

				if($size < $maxsize){
					$ext = '.'.pathinfo($name, PATHINFO_EXTENSION);
					$filedata = Tools::GetFileTypeData( $ext ); 
					$mime;
					$category;
					if($filedata){
						$mime = $filedata[0];
						$category = $filedata[1];
					}else{
					    Tools::Log("Could not determine the mime type");
						return false;
					}
					Tools::Log($mime);
					Tools::Log($category);
					$finfo = finfo_open(FILEINFO_MIME_TYPE);
					$actualMime = ($finfo !== false) ? finfo_file($finfo, $temp) : false;
					if($finfo !== false){
						finfo_close($finfo);
					}
					$expectedCategory = rtrim($category, 's');
					$actualCategory = ($actualMime !== false && strpos($actualMime, '/') !== false) ? explode('/', $actualMime)[0] : null;
					if($actualCategory === null || $actualCategory !== $expectedCategory){
						Tools::Log('Rejected upload due to MIME mismatch: '.$name.' => '.print_r($actualMime, true), true);
						continue;
					}
					$storedName = 'dev_'.Tools::StorageFilename($ext);

					//If the folder does not exist, make it
					$dirname = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/";
					if (!file_exists($dirname)) {
						mkdir($dirname,0755, true);
						Tools::Log("The directory $dirname was successfully created.");	
					} 

					$path = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/$storedName";
		
					if(!file_exists($path)) {
						Tools::Log('Attempting to move file from: '.$temp." to ".$path);
						if(move_uploaded_file($temp, $path )){
							Tools::Log('Moved file from: '.$temp." to ".$path);
							$tags = array();
							//Attempt to get metadata
							$fp = fopen($path, 'rb');

							$exif = @exif_read_data($fp, 0, true);
							if($exif){
								foreach ($exif as $key => $section) {
									foreach ($section as $name => $val) {
										if(!isset($tags[$key])){
											$tags[$key] = array();
										}
										$tags[$key][$name]=$val;
									}
								}
							}

							$meta = json_encode($tags);				
							$hash = '0x'.sha1_file($path);
									
							$ent = new Entity("media");
							
							$ent->Attributes->Add(new Attribute("name",$name ) ); 
							$ent->Attributes->Add(new Attribute("path",$storedName ) ); 
							$ent->Attributes->Add(new Attribute("hash",$hash ) ); 
							$ent->Attributes->Add(new Attribute("mime",$actualMime ) ); 
							$ent->Attributes->Add(new Attribute("meta",$meta ) ); 
							
							$id = $ent->Create();
									
							$ret[$i]['id'] = $id;
							$ret[$i]['name'] = $name;
							$ret[$i]['category'] = $category;
							$ret[$i]['meta'] = $tags;
							$ret[$i]['mime'] = $actualMime;
							$ret[$i]['path'] = "/media/$category/$storedName";

	
						}
						else{
							Tools::Log('Failed to move file from: '.$temp." to ".$path);
						}
					}else{
						Tools::Log("File already exists. Delete it first", true);				
					}
						
					
				}
			}
		}
	}
	echo json_encode($ret);
}

else{
	http_response_code(403);
	echo json_encode(array('ERROR' => 'Forbidden'));
}





