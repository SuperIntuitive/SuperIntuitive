<?php
Tools::Autoload();

class Page {
	private $pageobjects;
	private $options;
	private $settings;

	public function __construct($pageobjects = null){
		if($pageobjects != null){
		    $this->pageobjects = $pageobjects;
			//Tools::Log($pageobjects);
			$db = new Database();
			//Tools::Log($pageobjects);
			$pageid = $pageobjects['page']['id'];
		    $this->settings = $db->GetRelatedEntities('pages',$pageid,'settings');
        }

		//Tools::Log($this->settings);
	}
	public function __destruct(){
	}

	public function GetHead(){
		if($this->pageobjects === "%SETUP%"){
			$setup = new Setup();
			return $setup->GetHead();
		}
		else
		{
		//Tools::Log($this->pageobjects['page'], true);
			//search for the page in the database
			$title = null;
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];

			if(isset($this->pageobjects['page']) && isset($this->pageobjects['page']['meta'])){
			    $title = $this->pageobjects['page']['meta'];
				if($deployment !="live"){
					$title = $deployment." - ".$title;
				}
			}
			//Tools::Log($_SESSION, true);
			$title = null;
			$meta = null;
			$favicon = null;
			$bodystyle = null;
			$lastModified =  time();
			//Tools::Log($this->pageobjects);
			if(isset($this->pageobjects['page']) && isset($this->pageobjects['page']['contentmodified'])){
			    if( count($this->pageobjects['page']['contentmodified'])>0){
					//Tools::Log($this->pageobjects['page']['contentmodified']);
					$lastModified = $this->pageobjects['page']['contentmodified'];
				}
			}
			//this takes the mod time on all the blocks and hashes them together. this way when they are moded, it will update them and redownload new js and css.
			   
			if(!empty($this->pageobjects['page']['options'])){

				$options = json_decode($this->pageobjects['page']['options'],true);

				if(json_last_error() === 0)
				{
					if(	!empty($options['head']))
					{		
						if(!empty($options['head']['title']))
						{
							$title = $options['head']['title'];
							if($deployment !="live"){
								$title = $deployment." - ".$title;
							}
							$title = "<title id='si_pagetitle'>$title</title>";
						}else{
						    $title = "<title id='si_pagetitle'></title>";
						}

						if(!empty($options['head']['favicon']))
						{
							$favicon = $options['head']['favicon'];
							if($deployment !="live"){
								$favicon = $deployment."_".$favicon;
							}
							$favicon = "<link rel='icon' type='image/png' href='media/images/$favicon' id='si_favicon'/>";
						}else{
						    $favicon = "<link rel='icon' type='image/png' href='#' id='si_favicon'/>";
						}


						if(!empty($options['head']['meta']))
						{
						
							foreach($options['head']['meta'] as $type => $metas){
								if(strtolower($type) === 'httpequiv'){
									$type = 'http-equiv';
								}
								if(is_array ($metas)){
									foreach($metas as $name=>$content){
										$meta.= "<meta $type='$name' content='$content'>";
									}
								}else{
									if($type ==="charset"){
										$meta.= "<meta $type='$metas' id='si_meta_charset' >";
									}else{
										$meta.= "<meta $type='$metas' >";
									}
								   
								}

							}

						}

					}
					if(	!empty($options['body'])){
					    $body = null;
						if(	!empty($options['body']['style'])){
						$body = "<style id='si_bodystyle'>body {";
							foreach($options['body']['style'] as $prop=>$val){
								if(strlen($prop)>0 && strlen($val)>0){
									$body.=$prop.":".$val.";";
								}
							}
							$body .= "}
							</style>";
						}
						if($body){
							$bodystyle = Tools::ReplaceConstants($body);				
						}

					}
				}
		    }
			//echo json_last_error();			
			
			$t = time();

			//$lib = new Library();
			$head = "";

			if($title != null){
			    $head .= $title;
			}

			if($favicon != null){
				$head .= $favicon;
			}
			if($meta != null){
				$head .= $meta;
			}
			
			
			$head .= "
		<style id='si_htmlstyle'>html{width: 100%; overflow-x: hidden;}</style>
		<link rel='stylesheet' type='text/css' id='si_plugins_style' href='/style/plugins.css?$t'>
		<link rel='stylesheet' type='text/css' id='si_page_style' href='/style/page.css?$lastModified'>
		<link rel='stylesheet' type='text/css' href='/style/libraries.css?$t'>
		<style>
			@media (prefers-color-scheme: light) {#si_colorscheme {color:white}}
			@media (prefers-color-scheme: dark) {#si_colorscheme {color:black}}
		</style>

		<script src='/scripts/plugins.js?$t' defer id='si_plugin_script'></script>
		<script src='/scripts/page.js?$lastModified' defer id='si_page_script'></script>
		<script src='/scripts/libraries.js?$t' defer id='si_extlibs'></script> 
		<script src='/scripts/tools.js?$t' defer ></script>";

		$widgetfiles = scandir('scripts/widgets');
		Tools::Log($widgetfiles);
		foreach($widgetfiles as $widget){
			if(!is_dir('scripts/widgets/'.$widget)){
				$moded = filemtime('scripts/widgets/'.$widget);
				$head .= "<script src='/scripts/widgets/$widget?$moded' defer></script>";	
			}
		}





			if(Tools::UserHasRole("SuperAdmin,Admin") && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment']=='dev'){
				$admin = new Admin();
				//$head.=$admin->PopulateEditorMediaFiles($this->pageobjects['admin']['media']);
				//$head.=$admin->PopulateEditorAllPages($this->pageobjects['admin']['allpages']);
				if(isset($this->pageobjects['blocks'])){
				
						//$head.=$admin->PopulatePageBlockData($this->pageobjects['blocks']);
				}

				//$head.=$admin->PopulatePageBlockData($this->pageobjects['admin']['blocktemplates'],true);
				$head.=$admin->IncludeAdminFiles();	
			}		
		
			//If the user is logged in, set up a javacript object for them.
			//Tools::Log("Logging user");
			//Tools::Log($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']);
			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['loggedin']) && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['loggedin'] === true){
				$name = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['name'];

				//get user preferences here... for now
				$openMethod = isset($_SESSION['USERPREFS']['OPEN_LINK_IN']) ? $_SESSION['USERPREFS']['OPEN_LINK_IN'] : 'window';

				$head.= "<script>
							if (!SI) { var SI = {}; }
							SI.LoggedInUser = {
								'name':'$name', 
								'preferences':{
									OpenLinksIn: $openMethod
								} 
							};
						 </script>";
			}
			if($bodystyle != null){
				$head.=$bodystyle;
			}
			//Replace any constants or variables with their values
			$head = Tools::ReplaceConstants($head);


			return $head;
		}
	}
	
	public function GetBody(){
		if($this->pageobjects === "%SETUP%"){
			$setup = new Setup();
			return $setup->GetBody();			
		}
		else
		{
			$guid = "";
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];
			if(Tools::UserHasRole("Admin")  && $deployment!='live'){
				if(isset($this->pageobjects['page']['id'])){
					$guid =  " data-guid='0x".$this->pageobjects['page']['id']."'";
				}
			}
			//the body is a string representing the whole body that is returned and output. It is made up of blocks
	        $body ="<body  $guid >";
			//Get the blocks
			if(isset($this->pageobjects['blocks'])){	
				$blocks = $this->pageobjects['blocks'];
				//Loop through the block data.
				foreach($blocks as $k=>$v){
				    //Tools::Log($k);
					$id = Tools::OkForElementId($k); 
					//$id = Tools::RandomString(11);
					$order = '';
					if(isset($v['order'])){
						$order =" data-order='{$v['order']}'";
						if(isset($v['options'])){
							$options = json_decode($v['options']);
							if(gettype($options) == 'object' && $options->tag != null){
								$block = "<".$options->tag." id='si_block_$id' class='si-block' $order ";
								foreach($options as $attr=>$value){
									if($attr == 'tag'){
									}
									else if($attr == 'style'){
										$block.= "style='";
										foreach($value as $style=>$prop){
											$block.= $style.":".$prop."; ";
										}
										$block.= "' ";
									}
									else if($attr == 'options'){

									}
									else{
										$block.= $attr."=".$value.' ';
									}
								}
								$html = "";
								if(isset($v['html'])){
									$html =  $v['html'];
								}
								$block .= ">$html</".$options->tag.">";
								$body.=$block;
							}
						}
					}
				}
			}
			$deploy = "";
			if(Tools::UserHasRole("Admin") || Tools::UserHasRole("Tester")){
				$deploy = new Deployment();
				$body.= $deploy->DrawControls();
				$body = $deploy->DeployMediaPaths($body);
			}
			$body.=" <i id='si_colorscheme'></i> </body>";
			$body = Tools::ReplaceMultilangs($body);

			return $body;
		}
	}

	public function Save($post){
		//make sure we have a guid
		if(isset($post['body']['data']['guid'])){
			//make an entity for the page
			$ent = new Entity("pages");
			$ent->Id = $post['body']['data']['guid'];
	
			unset($post['KEY']);

			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGESAVED'] = array();

			if(isset($post['redirect'])){
				$ent->Attributes->Add(new Attribute("redirecttopage_id", Tools::FixGuid( $post['redirect'] ) )); 
				unset($post['redirect']);		
			}
			
			if(isset($post['name'])){

				$dupe = new Entity("pages");
				$dupe->Attributes->Add(new Attribute("name", $post['name'] ) ); 
				$dupe = $dupe->Retrieve();
				if(count($dupe)===0){
					$ent->Attributes->Add(new Attribute("name",$post['name'] ) ); 
					unset($post['name']);
				}else{
				    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGESAVED']["DUPE"]=true;
					return false;
				}
			}
			$path = null;
			if(isset($post['path'])){
				$dupe = new Entity("pages");
				$dupe->Attributes->Add(new Attribute("path", $post['path'] ) ); 
				$dupe = $dupe->Retrieve();
				if(count($dupe)===0){
					$ent->Attributes->Add(new Attribute("path",$post['path'] ) ); 
				}else{
				    $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGESAVED']["DUPE"]=true;
					return false;
				}

				$path = $post['path'];
				if(strlen($path) ==0){
				  $path = "_ROOT_";
				}
				unset($post['path']);
			}

			$options = $post;

			if(!empty($options)){
				$json =  json_encode($options); // print_r($post[$field],true);
				$ent->Attributes->Add(new Attribute("dev-options", $json ) ); 
			}

			Tools::Log($ent);
			try{
				if($ent->Update()){
					
					if($path != null){
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGESAVED']['CURRENTDBPAGEPATH'] = $path;
					}
					
				}
			}catch(Exception $e){
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] .= $e;
				return false;
			}
			
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGEUPDATED'] = "true";
				return true;

		}else{
			$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['EXCEPTION'] = "failed to get a data.guid"; 
		}


		//echo json_encode($ent);	
	}

	public function New($post){
		Tools::Log("-----------------New Page--------------------",true);
	    $dbc = new Database();
		if(isset($post['page'])){

		    $dupe = new Entity("pages");
			$dupe->Attributes->Add(new Attribute("name", $post['page'] ) ); 
			$dupe = $dupe->Retrieve();
			if(count($dupe)===0){
				 $page = new Entity("pages");
				$page->Attributes->Add(new Attribute("dev-options", '{"head":{	"title":"Page Title",	"favicon":"favicon.png",	"meta":{		"name":{			"description":"My Description",			"keywords":"Change Me",			"language":"english",			"author":"me",			"designer":"me",			"publisher":"me",			"subject":"Chnage Me",			"distribution":"web",			"rating":"general",			"copyright":"Copyright 2019",			"classification":"Stuff",			"no-email-collection":"http:\/\/www.unspam.com\/noemailcollection\/",			"robots":"nofollow,noindex",			"revisit-after":"7 days",			"reply-to":"me@domain.com",			"city":"Los Gatos",			"country":"USA",			"viewport":"width=device-width, initial-scale=1.0"},			"charset":"utf-8",			"httpEquiv":{				"content-type":"text\/html",				"content-style-type":"text\/css",				"content-script-type":"text\/javascript"			}		}	},"body":{		"style":{			"margin":"0",			"border":"0",			"padding":"0",			"background-color":"rgba(33,23,22,1)"		},		"data":{			"guid":""}		}}' ) ); 
				$page->Attributes->Add(new Attribute("path", $post['page'] ) ); 
				$page->Attributes->Add(new Attribute("name", $post['page'] ) ); 
				$pageid = $page->Create();
			    Tools::Log($pageid);

			    $ret = array();
				$ret[$pageid]=$post['page'];
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['PAGECREATED'] = $ret;
			}else{
				Tools::Log('That page already exists.');	
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['AJAXRETURN']['EXCEPTION'] = 'Cannot make that page. It already exists.';
			}

		}


	}

	public function Open($pageobjects){
	    if($pageobjects == "%EMPTY_DOMAIN%"){
			return  $pageobjects;
		}
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['deployment'];

		$page = new Entity("pages");
		$page->Attributes->Add(new Attribute("path",SI_URI));
	    $mypage = $page->Retrieve();

		$pageobjects['page'] = array();
		$pageobjects['page'][] =  $mypage[0];

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['id']='0x'.$mypage[0]['id'];
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['name']= $mypage[0]['name'];

		$blocks = new Block();

		$myblocks = $blocks->Get( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['page']['id'] );
		$pageobjects['blocks'] = $myblocks;


		return $pageobjects;
	}

	public function RemoveRedirect($post){
		
		Tools::Log("in remove!!");
		if(isset($post['pageid'])){
			$ent = new Entity('pages');
			$ent->Id =  Tools::FixGuid($post['pageid']);
			$ent->Attributes->Add(new Attribute("redirecttopage_id", 'null') ); 
			Tools::Log("about to update!!");
			$worked = $ent->Update();


		}

	}
} 
