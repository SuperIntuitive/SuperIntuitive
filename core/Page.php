<?php
Tools::Autoload();

class Page {
	private $pageobjects;
	private $options;
	//private $settings;

	public function __construct($pageobjects = null){
		if($pageobjects != null){
		    $this->pageobjects = $pageobjects;
			//Tools::Log($pageobjects);

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
		else if($this->pageobjects == "%EMPTY_DOMAIN%"){
		    Tools::Log("This domain is not found");
	    }
		else
		{



		//Tools::Log($this->pageobjects['page'], true);
			//search for the page in the database
			$title = null;
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];

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
			    if( strlen($this->pageobjects['page']['contentmodified'])===32){
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
							$title = "<title id='si_pagetitle'>$title</title>\n";
						}else{
						    $title = "<title id='si_pagetitle'></title>\n";
						}
						if(!empty($options['head']['favicon']))
						{
							$favicon = $options['head']['favicon'];
							if($deployment !="live"){
								$favicon = $deployment."_".$favicon;
							}
							$favicon = "\t\t<link rel='icon' type='image/png' href='media/images/$favicon' id='si_favicon'/>\n";
						}else{
						    $favicon = "\t\t<link rel='icon' type='image/png' href='#' id='si_favicon'/>\n";
						}

						if(!empty($options['head']['meta']))
						{
						
							foreach($options['head']['meta'] as $type => $metas){
								if(strtolower($type) === 'httpequiv'){
									$type = 'http-equiv';
								}
								if(is_array ($metas)){
									foreach($metas as $name=>$content){
										$meta.= "\t\t<meta $type='$name' content='$content'>\n";
									}
								}else{
									if($type ==="charset"){
										$meta.= "\t\t<meta $type='$metas' id='si_meta_charset' >\n";
									}else{
										$meta.= "\t\t<meta $type='$metas' >\n";
									}
								   
								}

							}

						}

					}
					if(	!empty($options['body'])){
					    $body = null;
						if(	!empty($options['body']['style'])){
						$body = "\t\t<style id='si_bodystyle'>body {";
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
			
			//get page settings
			$db = new Database();
			$settings = null;
			if(isset($this->pageobjects['page']) && isset($this->pageobjects['page']['id'])){
				$pageid = $this->pageobjects['page']['id'];
				$settings = $db->GetRelatedEntities('pages',$pageid,'settings');
				$settings = json_decode($settings,true);
			}

			$blocks = $this->pageobjects['blocks'];
            Tools::Log('blocks');
			
			//If the user is logged in, set up a javacript object for them.
			//Tools::Log("Logging user");
			//Tools::Log($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']);
			$pageblocks = array();
			foreach($blocks as $block=>$val){
				if(!isset($pageblocks[$block])){
					$pageblocks[$block]=array();
				}
				if(isset($val['options'])){
					$blockOptions = json_decode($val['options'], true);
					
					 Tools::Log($blockOptions);
					if(isset($blockOptions['settings'])){
						$pageblocks[$block]['Settings'] = array();
						$pageblocks[$block]['Settings']= $blockOptions['settings'];
					}
					if(isset($blockOptions['widgets'])){
						$pageblocks[$block]['Widgets'] = array();
						$pageblocks[$block]['Widgets'] = $blockOptions['widgets'];
					}
				}
			}
			$blocksjson = json_encode($pageblocks);


				$head.= 
"		<script>
if (!SI) { var SI = {}; }
	SI.Page = {};
	SI.Page.Settings = { $settings };
	SI.Page.Blocks = $blocksjson;
	SI.Widget = {};
	SI.Widgets = {};
	SI.User = {};
";


			if(isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['loggedin']) && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['loggedin'] === true){
				$name = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['name'];
				$prefs = "{}";
				if(!empty($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['preferences'])){
					$prefs = json_encode($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['user']['preferences']);
				}
				$head.= 
"	SI.User.Name = '$name';
	SI.User.Preferences = $prefs;";
	
			}else{
				$head.= 
"	SI.User.Name = 'guest';";
			}

			$head.= "</script>\n";
			
			$head .= "
		<style id='si_htmlstyle'>html{width: 100%; height:1vh; overflow-x: hidden;}</style>
		<link rel='stylesheet' type='text/css' id='si_plugins_style' href='/style/plugins.css?$t'>
		<link rel='stylesheet' type='text/css' id='si_page_style' href='/style/page.css?$lastModified'>
		<link rel='stylesheet' type='text/css' href='/style/libraries.css?$t'>
		<link rel='stylesheet' type='text/css' href='/style/widgets.css?$t'>
		<style id='si_page_media'>
			@media (prefers-color-scheme: light) {#si_colorscheme {color:white}}
			@media (prefers-color-scheme: dark) {#si_colorscheme {color:black}}
		</style>


		<script src='/scripts/tools.js?$t' defer ></script>\n";

		$widgetfiles = scandir('scripts/widgets');
		//Tools::Log($widgetfiles);
		foreach($widgetfiles as $widget){
			if(!is_dir('scripts/widgets/'.$widget)){
				$moded = filemtime('scripts/widgets/'.$widget);
				$head .= "\t\t<script src='/scripts/widgets/$widget?$moded' defer></script>\n";	
			}
		}




			if(Tools::UserHasRole("Admin") && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment']=='dev'){
				$admin = new Admin();
				//$head.=$admin->PopulateEditorMediaFiles($this->pageobjects['admin']['media']);
				//$head.=$admin->PopulateEditorAllPages($this->pageobjects['admin']['allpages']);
				if(isset($this->pageobjects['blocks'])){
				
						//$head.=$admin->PopulatePageBlockData($this->pageobjects['blocks']);
				}

				//$head.=$admin->PopulatePageBlockData($this->pageobjects['admin']['blocktemplates'],true);
				$head.=$admin->IncludeAdminFiles();	
			}		
			if(Tools::UserHasRole("Admin") || Tools::UserHasRole("Tester")){
				$deploy = new Deployment();
				$head.= $deploy->DrawScript();
			}

			if($bodystyle != null){
				$head.=$bodystyle;
			}

						$head .= "
		<script src='/scripts/plugins.js?$t' defer id='si_plugin_script'></script>
		<script src='/scripts/page.js?$lastModified' defer id='si_page_script'></script>
		";

			//Replace any constants or variables with their values
			//this needs more work. If the head item is saved with the constants it will lose the replacement token
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
			$deployment = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];
			if(Tools::UserHasRole("Admin")  && $deployment =='dev'){
				if(isset($this->pageobjects['page']['id'])){
					$guid =  " data-guid='0x".$this->pageobjects['page']['id']."'";
				}
			}
			//the body is a string representing the whole body that is returned and output. It is made up of blocks
	        $body ="<body  $guid ><i id='si_colorscheme'></i>";
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
							$options = json_decode($v['options'],true);
							if(isset($options['tag'])){
							    $html = "";
								$tag = $options['tag'];
								$block = "<$tag id='si_block_$id' class='si-block' $order ";
								Tools::Log($options);
								foreach($options as $attr=>$value){
								
									switch($attr){
										case 'tag':
										case 'settings':
										case 'widgets':
											break;
										case 'style':
											$block.= "style='";
											foreach($value as $style=>$prop){
												$block.= $style.":".$prop."; ";
											}
											$block.= "' ";
											break;
										default:
											Tools::Log($attr);
										    Tools::Log($value);
										    break;
									}

								}
								if(isset($v['html'])){
									$html =  $v['html'];
								}
								$block .= ">$html</$tag>";
								$body.=$block;
							}else{
								Tools::Log("Block failed to be created without a tag");
							}

							/*
								else if( gettype($attr)=="string" && gettype($value)=="string" ){
									$block.= $attr."=".$value.' ';
								}
							*/
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
			$body.="</body>";
			$body = Tools::ReplaceMultilangs($body);
			$body = Tools::ReplaceConstants($body);

			return $body;
		}
	}



	public function Save($post){
		//only save the page if we are an admin and in dev
	    if(Tools::UserHasRole("Admin") && $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'] =='dev'){
			//make sure we have a guid
			if(isset($post['body']['data']['guid'])){
				//make an entity for the page
				$ent = new Entity("pages");
				$ent->Id = $post['body']['data']['guid'];
	
				unset($post['KEY']);

				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED'] = array();

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
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED']["DUPE"]=true;
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
						$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED']["DUPE"]=true;
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
				//Tools::Log($ent);
				try{
					if($ent->Update()){
					
						if($path != null){
							$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED']['CURRENTDBPAGEPATH'] = $path;
						}
					
					}
				}catch(Exception $e){
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] .= $e;
					$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED']['UPDATEFAILED'] = "true";
					return false;
				}
			
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGESAVED']['PAGEUPDATED'] = "true";
					return true;

			}else{
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['EXCEPTION'] = "failed to get a data.guid"; 
			}

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
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PAGECREATED'] = $ret;
				//$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['CALLBACK'] = $post['CALLBACK'];
				//$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['PARAMETER'] = $ret;
			}else{
				Tools::Log('That page already exists.');	
				$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['AJAXRETURN']['EXCEPTION'] = 'Cannot make that page. It already exists.';
			}

		}


	}

	public function Open($pageobjects){
	    if($pageobjects == "%EMPTY_DOMAIN%"){
			return  $pageobjects;
		}
		$deploymentlevel = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['deployment'];

		$page = new Entity("pages");
		$page->Attributes->Add(new Attribute("path",SI_URI));
	    $mypage = $page->Retrieve();

		$pageobjects['page'] = array();
		$pageobjects['page'][] =  $mypage[0];

		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['id']='0x'.$mypage[0]['id'];
		$_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['name']= $mypage[0]['name'];

		$blocks = new Block();

		$myblocks = $blocks->Get( $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['subdomains'][SI_SUBDOMAIN_NAME]['page']['id'] );
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
