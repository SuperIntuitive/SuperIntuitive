<?php
Tools::Autoload();
class Media {

	public function __construct(){


	}
	
	public function __destruct(){

	}
	

	public function Promote($post){
		if( isset($post['Url']) ){
			$relpath = $post['Url'];
			$relpath = str_replace('https:/','/domains', $relpath);
			$relpath = str_replace('http:/','/domains',$relpath);

			$path = getcwd().$relpath;
			$deploy = $post['Deployment'];
			$deployTo = '';
			if($deploy === 'dev'){
				$deployTo = 'Test';
			}else if($deploy === 'test'){
			    $deployTo = 'Live';
			}

			if( file_exists ( $path ) ){
				$promoted = $path;

				$pathparts = explode('/',$relpath);
				$category ="";
				if(count($pathparts)>4){
				    $category = $pathparts[4];
				}
				Tools::Log($promoted);
				//eventually clean this all up. It should just hove one replace thats gets its data parsed.
				$promoted = str_replace('/media/audio/test_','/media/audio/',$promoted);
				$promoted = str_replace('/media/audio/dev_','/media/audio/test_',$promoted);

				$promoted = str_replace('/media/data/test_','/media/data/',$promoted);
				$promoted = str_replace('/media/data/dev_','/media/data/test_',$promoted);

				$promoted = str_replace('/media/documents/test_','/media/documents/',$promoted);
				$promoted = str_replace('/media/documents/dev_','/media/documents/test_',$promoted);

				$promoted = str_replace('/media/fonts/test_','/media/fonts/',$promoted);
				$promoted = str_replace('/media/fonts/dev_','/media/fonts/test_',$promoted);

				$promoted = str_replace('/media/video/test_','/media/video/',$promoted);
				$promoted = str_replace('/media/video/dev_','/media/video/test_',$promoted);

				$promoted = str_replace('/media/images/test_','/media/images/',$promoted);
				$promoted = str_replace('/media/images/dev_','/media/images/test_',$promoted);

				copy($path,$promoted);
				$relpath = explode('/domains/',$promoted)[1];
				$relpath = str_replace('/domains/','',$relpath);
				$relpath = str_replace(SI_DOMAIN_NAME,'',$relpath);

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['FILEPROMOTED'] = "si_media_".ucfirst($category)."_".$deployTo."Preview|$category|$relpath?".time();
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['CONSOLELOG'] = "Promoted File: ". $path.' '.$promoted;
			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['CONSOLELOG'] = "Did not find file". $path.' '.$deploy;
			}
		}
	}
	
	public function Recycle($post){
		if(isset($post['mediaId'])&& isset($post['url'])&& isset($post['type'])){
			$id = $post['mediaId'];
			$devurl = strtolower($post['url']);
			$testurl = str_replace('/dev_','/test_',$devurl);
			$rburl = str_replace('/dev_','/rollback_',$devurl);
			$url = str_replace('/dev_','/',$devurl);
			$type = strtolower($post['type']);

			//Tools::Log($id." ".$type." ".$url);

			//The 4 images to move to the recycl bin
			$path =  dirname($_SERVER['DOCUMENT_ROOT'].'/domains/'.$_SERVER['HTTP_HOST'].'/'.$url).'/';

			$rBin = dirname($path).'/recycle/';
			$filename = basename($url);
			
			if(file_exists($path."dev_".$filename)){
				rename($path."dev_".$filename, $rBin."dev_".$filename);
				Tools::Log('Moved: '.$path."dev_".$filename. ' to: '.$rBin."dev_".$filename );
			}
			if(file_exists($path."test_".$filename)){
				rename($path."test_".$filename, $rBin."test_".$filename);
				Tools::Log('Moved: '.$path."test_".$filename. ' to: '.$rBin."test_".$filename );
			}
			if(file_exists($path."rollback_".$filename)){
				rename($path."rollback_".$filename, $rBin."rollback_".$filename);
				Tools::Log('Moved: '.$path."rollback_".$filename. ' to: '.$rBin."rollback_".$filename );
			}
			if(file_exists($path.$filename)){
				rename($path.$filename, $rBin.$filename);
				Tools::Log('Moved: '.$path.$filename.' to: '.$rBin.$filename );
			}

			
			//drop it from the database;
			$db = new Database();
			$sql = "DELETE FROM `media` WHERE id = $id";
			Tools::Log('SQL: '.$sql);
			$db->Execute($sql);




		}
	}
} 