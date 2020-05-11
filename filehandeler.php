<?php
/*!
 * @overview superintuitive - a drag and drop webapp builder with point and click attribute and style editing.
 * @copyright Copyright (c) 2020 Robert Allen
 * @license   Licensed under GPLv2 license
 *            See https://github.com/disscombobilated/SuperIntuitive/blob/master/LICENSE
 * @version   v0.8
 */

session_start();

require_once 'core/Tools.php';
Tools::Autoload('root');
Tools::DefineServer();
define("SI_ENTRY","FILEUPLOAD");
if(Tools::UserHasRole('Admin')){

	$maxsize = Tools::GetUploadMaxFilesize();
	$ret = array();
	foreach($_FILES as $files){
		if(isset($files['name']) && isset($files['tmp_name']) && isset($files['size']) && isset($_SERVER['HTTP_HOST']) ){
			$host = $_SERVER['HTTP_HOST'];	
			//files a packed kind of stupidly. there is an array with 5 arrays, 1 for anem, type,tmpname,error,size,
			//For each file dropped in the operation, the arrays are filled. so we have to check all the arrays.  
			for($i=0; $i<count($files['name']); $i++ ){	
				$name = $files['name'][$i];
				$temp = $files['tmp_name'][$i];
				$size = filesize($temp);
				Tools::Log($temp);
				$error = (isset($file['error'][$i]))? $file['error'][$i]:null;

				if($error != null){
					Tools::Log('Error: '.$error, true);
				}

				if($size < $maxsize){

					$mime = Tools::GetFileMimeType( $temp ); 
					$category = GetFileCategory($mime);
					Tools::Log($mime);
					Tools::Log($category);
					
					if($category != null){
						if($category === 'zipfile' ){
			
						}else{
							//If the folder does not exist, make it
							$dirname = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/";
							if (!file_exists($dirname)) {
								mkdir($dirname,0777);
								chmod($dirname,0777);
								Tools::Log("The directory $dirname was successfully created.");	
							} 

							$path = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/dev_$name";
		
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
									$ent->Attributes->Add(new Attribute("path",$name ) ); 
									$ent->Attributes->Add(new Attribute("hash",$hash ) ); 
									$ent->Attributes->Add(new Attribute("mime",$mime ) ); 
									$ent->Attributes->Add(new Attribute("meta",$meta ) ); 
							
									$id = $ent->Create();
									
									$ret[$i]['id'] = $id;
									$ret[$i]['name'] = $name;
									$ret[$i]['category'] = $category;
									$ret[$i]['meta'] = $tags;
									$ret[$i]['mime'] = $mime;
									$ret[$i]['path'] = "/media/$category/dev_$name";

	
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
		}
	}
	echo json_encode($ret);
}

function GetFileCategory($mime){

	$category = null;
	
	switch($mime)
	{
		case 'image/png':
		case 'image/jpeg':
		case 'image/gif':
		case 'image/bmp':
		case 'image/vnd.adobe.photoshop':
			$category="images";
			break;

		case 'audio/mp3':
		case 'audio/x-wav':
		case 'audio/mpeg':
			$category="audio";
			break;

		case 'video/mp4':
		case 'video/avi':

			$category="videos";
			break;

		case 'text/plain':
		case 'application/pdf':
		case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
			$category='documents';
			break;

		case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
			$category='data';
			break;

			
		case 'application/x-font-ttf':
			$category='fonts';
			break;

		case 'application/zip':
			$category='zipfile';
			break;
		default: break;
	}
	return $category;

}




