<?php
session_start();

require_once 'core/Tools.php';
Tools::Autoload('root');
Tools::DefineServer();
define("SI_ENTRY","FILEUPLOAD");
if(Tools::UserHasRole('Admin')){

	$maxsize = Tools::GetUploadMaxFilesize();

	foreach($_FILES as $files){

		if(isset($files['name']) && isset($files['tmp_name']) && isset($files['size']) && isset($_SERVER['HTTP_HOST']) ){
			$host = $_SERVER['HTTP_HOST'];	
			//files a packed kind of stupidly. there is an array with 5 arrays, 1 for anem, type,tmpname,error,size,
			//For each file dropped in the operation, the arrays are filled. so we have to check all the arrays.  
			for($i=0; $i<count($files['name']); $i++ ){
				
				$name = $files['name'][$i];
				$temp = $files['tmp_name'][$i];
				$size = filesize($temp);


				$error = (isset($file['error'][$i]))? $file['error'][$i]:null;

				if($error != null){
					Tools::Log('Error: '.$error, true);
				}
				

				if($size < $maxsize){

					$mime = Tools::GetFileMimeType( $temp ); 
					$category = GetFileCategory($mime);
					

					if($category != null){
						if($category === 'zipfile' ){
			
						}else{
							//If the folder does not exist, make it
							$dirname = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/";
							if (!file_exists($dirname)) {
								mkdir($dirname, 0644);
								Tools::Log("The directory $dirname was successfully created.");	
							} 

							$path = $_SERVER['DOCUMENT_ROOT']."/domains/$host/media/$category/dev_$name";

				
							if(!file_exists($path)) {
		
								move_uploaded_file($temp, $path );
								
								$meta = array();
								//Attempt to get metadata
								$exif = exif_read_data($path, IFD0);
								if( $exif!==false ){
									Tools::Log($exif);
									$meta = $exif;
								}
								/*
								$id3 = id3_get_tag($path, ID3_V2_3);
								if( $id3!==false ){
									Tools::Log($id3);
									$meta = $id3;
								}
								*/
								//Tools::Log("ERROR was id3", true);
						
								$meta = json_encode($meta);				
								$hash = '0x'.sha1_file($path);
								
								$ent = new Entity("media");
						
								$ent->Attributes->Add(new Attribute("name",$name ) ); 
								$ent->Attributes->Add(new Attribute("path",$name ) ); 
								$ent->Attributes->Add(new Attribute("hash",$hash ) ); 
								$ent->Attributes->Add(new Attribute("mime",$mime ) ); 
								$ent->Attributes->Add(new Attribute("meta",$meta ) ); 
						
								$id = $ent->Create();
						//	Tools::Log($id, true);

							}else{
								Tools::Log("File already exists. Delete it first", true);				
							}
							
						}
					}
				}


			}



		
				//	Tools::Log($name.' '.$type.' '.$temp.' '.$error.''.$size, true);
		}

	}
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




