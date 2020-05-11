///<reference path="..\scripts\tools.js" />

<?php 
header("Content-type: text/javascript; charset: UTF-8");
session_start();
require_once '../core/Tools.php';
Tools::Autoload();
Tools::DefineServer();

error_reporting(E_ALL ^ E_WARNING); 

   // echo $siobj;
if (Tools::UserHasRole('Admin')) 
{
   
    $notsuperadmin = "true";
    $notdomainadmin = "true";
    if (Tools::UserHasRole('SuperAdmin')) { $notsuperadmin = "false"; $notdomainadmin = "false"; } 
    if (Tools::UserHasRole('DomainAdmin')) { $notdomainadmin = "false"; }

    $plugs = new Plugins();
    $downloadedplugs = $plugs->GetLocalPlugins('downloaded');
    $downloadedplugs = json_encode($downloadedplugs);
     //Tools::Log($downloadedplugs);

    $currentPlugins = array();
    $installedplugs = $plugs->GetLocalPlugins('installed');

    foreach($installedplugs as $plugin){
        if (!isset($currentPlugins[$plugin])) {
            $currentPlugins[$plugin] = array();
            $currentPlugins[$plugin]['scripts'] = array();
            $currentPlugins[$plugin]['styles'] = array();
        }
        //get scripts
        $scripts = glob( $_SERVER["DOCUMENT_ROOT"]. "/plugins/installed/".$plugin."/scripts/*.js" );  
        if (count($scripts)>0) {
            foreach($scripts as $script) {
                $name = pathinfo($script, PATHINFO_FILENAME);
                $currentPlugins[$plugin]['scripts'][$name] = file_get_contents($script);
            }
        }
        //get styles
        $styles = glob($_SERVER["DOCUMENT_ROOT"]. "/plugins/installed/".$plugin."/styles/*.css");
        if (count($styles) > 0) {
            foreach($styles as $style) {
                $name = pathinfo($style, PATHINFO_FILENAME);
                $currentPlugins[$plugin]['styles'][$name] = file_get_contents($style);
            }
        }
    }
    if ($currentPlugins) {
        $currentPlugins = json_encode($currentPlugins);
    } else {
        $currentPlugins = "{}";
    }
    
    //get misc data that is needed
    $miscdata = new MiscData();  //this is a grab bag of stuff until i get a better data tree going. 

    //get the users settings here
    $openMethod = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['prefs']['open_link_in']) ? $_SESSION['SI']['user']['prefs']['open_link_in'] : 'window';

    $helplinks = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['settings']['HelpLinks']) ? _SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['settings']['HelpLinks'] : 'true';
  
    $showMoz = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['help']['moz']) ? $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['help']['moz'] : 'false';
    $showW3 = isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['help']['w3']) ? $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['user']['help']['w3'] : 'false';

    $helplinks = "['mdn','w3']";


    $showMoz = $helplinks;
    $showW3 = $helplinks;



    //Get all the media objects
    $mediaObjects = json_encode($_SESSION['SITMP']['media']);
    $pageObjects = json_encode($_SESSION['SITMP']['pages']);
    $blockObjects = json_encode($_SESSION['SITMP']['blocks']);
    unset($_SESSION['SITMP']);

    //Get all the relations 
    $relationentities = new Entity('relations');
    $relations = $relationentities->Retrieve();
    $relationsjson = json_encode($relations);
    //Tools::Log($relations);


    $settingsentities = new Entity('settings');
    $settings = $settingsentities -> Retrieve('id,settingname,settingvalue');
    $settings2 = json_encode($settings);
    $tmpSetting = array();
    foreach($settings as $setting){
        $tmpSetting[$setting['settingname']] = $setting['settingvalue'];
    }
    $settings = $tmpSetting;
    //Tools::Log($settings);
    $settingsjson = json_encode($settings);

    //colornames
    $colors = $miscdata->ColorNames;
    $coloroptions = "<option value=''>Color Names</option>";
    foreach($colors as $v){
        $coloroptions.= "<option value='$v' >$v</option>";
    }

    //Get Languages
    $langs = $miscdata->languages;
    //$langoptions = "'";
    $langoptions = "<option value=''></option>";
   // $detectedlang = strtolower(explode(",", $_SERVER['HTTP_ACCEPT_LANGUAGE'])[0]);
    foreach($langs as $k=>$v){
        $selected = '';//(strtolower($k) == $detectedlang ? "selected='selected'" : "");
        $langoptions.="<option value='$k' $selected >$v</option>";
    }
    //$langoptions.= "'";

    if(isset($settings['DefaultLanguage'])) {
        $defaultLanguage = $settings['DefaultLanguage'];
    }else if(isset($_SERVER['HTTP_ACCEPT_LANGUAGE'])){
        $defaultLanguage = substr($_SERVER['HTTP_ACCEPT_LANGUAGE'], 0, 2);
    }else{
        $defaultLanguage = 'en';
    }
    //$defaultLanguage = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['defaultlanguage'];

    $myLangs = json_encode(explode(',',explode(';',$_SERVER['HTTP_ACCEPT_LANGUAGE'])[0]));

    $supportedLanguages = null;
    //Tools::Log($defaultLanguage);
    if (isset($_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['localtext']['attributes'])) {
        $langfields = $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities']['localtext']['attributes'];
        foreach($langfields as $field=>$cols){
            if (Tools::StartsWith($field, "_")){
                $code = str_replace('_', '', $field);
                $name = $langs[$code];
                $supportedLanguages.="<option value='$code' >$name</option>";
            }
        }
    }

    $lanent = new Entity('localtext');
    
    $localtexts = json_encode($lanent->Retrieve());
     // Tools::Log($localtexts);

    //getDefaultQuickMenu items
    $quickmenuitems = $miscdata->userDefaultQuickmenu;

    $u = new User();
    $users = $u->GetUsersForEditor();

    $dt = new DataTable("users");
   // Tools::Log($users);
    $dt->Numbered = true;
    $dt->Selectable = true;


    $dt->LoadArray($users);

    $usrconfstyle = 'height:28px; width:28px; margin:3px; background-size:contain;';
    $configbts = [
        "<input type='button'  title='Change Password' style=' $usrconfstyle background-image: url(\\\"/editor/media/icons/resetpw.png\\\");' onclick='SI.Editor.Objects.User.ChangePassword(this)' />",
        "<input type='button'  title='Manage Roles'    style=' $usrconfstyle background-image: url(\\\"/editor/media/icons/securityroles.png\\\");' onclick='SI.Editor.Objects.User.GetRoles(this)' />",
        "<!--<input type='button'  value='DELETE'   onclick='SI.Editor.Objects.User.Delete(this)' />-->",
    ];
    $confbtn = new DataColumn("Configure");
    $confbtn->Default = implode($configbts);
    $dt->AddColumn($confbtn);
    $options = ["ID"=> "si_editor_users_table"];
    $usertable = $dt->Draw($options);
    //Tools::Log($usertable, true);
    //Security Roles 
    $roles = new Entity('securityroles');
    $rolesdata = $roles->Retrieve();
    foreach($rolesdata as $i=>$roleent){
        if (isset($roleent['rules'])) {
            $obj = json_decode($roleent['rules']);
            $rolesdata[$i]['rules'] = array();
            $rolesdata[$i]['rules'] = $obj;
        }
    }
    $rolesdata = json_encode($rolesdata);

    $EasyPassword = '/^(?=.*\d)(?=.*[a-zA-Z]).{6,}$/gm';
    $HardPassword = '/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm';

    $PasswordStrength = $HardPassword;

    //Build Mime interface to allow admin to pick allowed mimes
    $mimes = "{
        'Images': ['image/png', 'image/bmp', 'image/jpeg', 'image/svg', 'image/gif'],
        'Audio': ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/midi', 'audio/ogg', 'audio/flac','audio/webm'],
        'Video': ['video/avi', 'video/mpeg', 'video/mp4', 'video/ogg','video/webm'],
        'Docs': ['application/pdf', 'application/msword'],
        'Data': ['application/xml', 'application/json','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'Fonts': ['application/x-font-ttf', 'application/x-font-otf']
        }";
       

    $sessionPageData = json_encode($_SESSION['SI']);

    //  $sessionPageData = str_replace('":{"', '":{<br />&nbsp;&nbsp;&nbsp;&nbsp;"', $sessionPageData);


    $htmlElementsAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/html_elements.json');
    $htmlAttributesAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/html_attributes.json');
    $cssPropertiesAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/css_properties.json');
    $jsMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/js_methods.js');
    $phpMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/php_methods.json');
    $sqlMethodsAge = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/sql_methods.json');
    $cssNew = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/css_new.json');
    $cssPseudo = filemtime($_SERVER['DOCUMENT_ROOT'].'/editor/media/data/css_pseudo.json');


    $dataage = "html_elements: $htmlElementsAge,
            html_attributes: $htmlAttributesAge,
            css_properties: $cssPropertiesAge,
            js_methods : $jsMethodsAge,
            php_methods : $phpMethodsAge,
            sql_methods : $sqlMethodsAge,
            css_new : $cssNew,
            css_pseudo: $cssPseudo
           ";
    //echo $dataage;

    $entities =  $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'];
    $entityDefinitions = json_encode($entities);
    //deprecate
    $entityInfo = $entityDefinitions;

    $entityData = array();
    $recordCount = count($entities);
    $entityJson = "";

?> 
"use strict";
if(!SI){ var SI = {};}
if (!SI.Editor) { SI.Editor = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }

SI.Editor = {
    Style: {
        BackColor: 'black',
        BackgroundColor: 'rgb(72, 75, 87)',
        TextColor: 'rgb(172, 175, 187)',
        MenuColor: 'slategrey',
        ButtonColor: '#9A9',
        DraggerColor: '#99A',
        FontFace: 'Roboto',
        SetTheme: function () {
            let theme = SI.Theme.UserPreference;
            if (theme) {
                if (theme === 'light') {
                    SI.Editor.Style.BackColor = 'white',
                        SI.Editor.Style.BackgroundColor = '#AAA';
                    SI.Editor.Style.TextColor = '#111';
                    SI.Editor.Style.MenuColor = '#777';
                    SI.Editor.Style.ButtonColor = '#345';
                    SI.Editor.Style.DraggerColor = '#234';
                }
                else {
                    SI.Editor.Style.BackgroundColor = 'rgb(72, 75, 87)';
                    SI.Editor.Style.TextColor = 'rgb(172, 175, 187)';
                    SI.Editor.Style.MenuColor = 'slategrey';
                    SI.Editor.Style.ButtonColor = '#9A9';
                    SI.Editor.Style.DraggerColor = '#99A';
                }
            }

        }
    },
    Run: function () {
      //  let t0 = performance.now(); //how long does the editor take to load?
        console.time('EditorLoadTime');
        SI.Editor.Data.Init(); 
        //wait for all the code to load before continuing. 
        var starttimmer = setInterval(function () {
            if (SI.Editor.Data.loaded) {
                clearInterval(starttimmer);
                SI.Editor.Style.SetTheme();
                SI.Editor.Objects.Elements.Init();
                SI.Editor.UI.Init();
            }
        }, 50);
        console.timeEnd('EditorLoadTime');
        console.log(SI.Editor);
       // setTimeout(function () { SI.Editor.Ajax.PostSetup.Go() }, 1000);

        for (let x in window) {
            if (!window.hasOwnProperty) {
                console.log(x);
            }
        }


    },
    Data: {
        loaded : false,
        html_elements: {},
        html_attributes: {},
        css_properties: {},
        js_methods: {},
        php_methods: {},
        sql_methods: {},
        DataAge: { 
            <?= $dataage ?>        
        },
        Code: {},
        DataLists: {
            HtmlElementDataList: null,
            HtmlAttributeDataList: null,
            CssPropertiesDataList: null,
            JsMethodsDataList: null,
            PhpMethodsDatalist: null,
            SqlMethodsDataList: null, 
            AcceptedMimeTypes: <?=$mimes ?>,
            AdminData:<?= $sessionPageData ?>,
            ImportRules: [],
            MediaRules: {},
            FontFaces: {},
            PageRules: { Allowed: ['margin', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom',"orphans","widows"]},
            AnimationNames: [],
        },
        Init: function () {
            var codes = ["html_elements", "html_attributes", "css_properties", "js_methods", "php_methods", "sql_methods", "css_new","css_pseudo"];
            let loadedcount = 0;
            codes.forEach(function (codetype) {
                let lastmoddate = codetype + "_last_modified";
                let timestamp = localStorage.getItem(lastmoddate);   
                let jsonstring = localStorage.getItem(codetype);
                if ( timestamp === "undefined" || (SI.Editor.Data.DataAge[codetype] != null && timestamp <= SI.Editor.Data.DataAge[codetype] && jsonstring === null)  ) {
                    var request = new XMLHttpRequest();
                    try {
                        request.onreadystatechange = function () {
                            if (this.readyState == 4 && this.status == 200) {
                                if (request.responseText.length > 0) {
                                    SI.Tools.Storage.OverwriteStorage(codetype, request.responseText);
                                    SI.Tools.Storage.OverwriteStorage(codetype + "_last_modified", SI.Editor.Data.DataAge[codetype]);
                                    SI.Editor.Data[codetype] = JSON.parse(request.responseText);
                                    loadedcount++;
                                    if (loadedcount == codes.length) {
                                        SI.Editor.Data.loaded = true;
                                    }
                                }
                            }
                        };
                        request.open("GET", '/editor/media/data/' + codetype + '.json', true);
                        request.send();
                    }
                    catch (e) {
                        console.warn(e);
                    }
                } else {
                    if (jsonstring != null && jsonstring.length > 0) {
                        try {
                            if (codetype === "css_new") {
                                SI.Editor.Data.Code.Styles = JSON.parse(jsonstring);
                            }
                            else if (codetype === "css_pseudo") {
                                SI.Editor.Data.Code.PseudoStyles = JSON.parse(jsonstring);
                            }
                            else {
                                SI.Editor.Data[codetype] = JSON.parse(jsonstring);
                            }
                            
                            loadedcount++;
                            if (loadedcount == codes.length) {       
                                SI.Editor.Data.loaded = true;
                            }
                        } catch (ex) {
                            console.warn(ex);                           
                        }
                    }
                }
            });
            
            SI.Editor.Data.Tools.SupplementData();
        },
        OptionSets: {
            HTML: {
              Elements:{}
            },
            CSS: {
                Keyframes: [],
                FontFaces: [],
                Media: [],
                GlobalValues: ['initial', 'inherit', 'unset'],
                Properties: {},
                PseudoClasses: [],
                PseudoElements: [],
                Colors: "<?= $coloroptions ?>", 
            },
            Language: {
                All : "<?= $langoptions ?>",
            },
        },
        Objects: {
            Blocks: <?= $blockObjects ?>,
            Pages: <?= $pageObjects ?>,
            Media: <?= $mediaObjects ?>,
            Users: "<?= $usertable ?>",
            Entities: {
                Count: <?= $recordCount ?>,
                Definitions: <?= $entityDefinitions ?>,
                Relationships:  <?= $relationsjson ?>,
                Lists: {
                    FwdRevLookup: {},
                    NotAllowedNames: ['domain', 'domains', 'businessunit', 'businessunits', 'entity', 'entities'],
                    NotAllowedAttributes: ['p_id', 'id', 'status', 'statusreason', 'createdon', 'modifiedon', 'entity_id'],
                },
            },
            Deployment: {
                Levels: {
                    test: {
                        Label: "",
                        ToolTip: 'Promote to Test',
                        BackgroundColor: "green",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(0,128,0,0.2)',
                        BorderRadius: '9px',
                    },
                    live: {
                        Label: "",
                        ToolTip: 'Promote to Live',
                        BackgroundColor: "yellow",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(255,255,0,0.2)',
                        BorderRadius: '9px',
                    },
                    rollback: {
                        Label: "",
                        ToolTip: 'Save to Rollback',
                        BackgroundColor: "red",
                        MinWidth: "18px",
                        MinHeight: "18px",
                        Shadow: '3px 3px 3px rgba(255,0,0,0.2)',
                        BorderRadius: '9px',
                    }
                },
                UI: function (options) {
                    this.Defaults = {
                        "EntityName": null,
                        "EntityId": null,
                        "Attribute": null,
                        "Parent": null,
                        "LabelMargin": null,
                    };
                    this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
                    if (this.options.EntityName != null && this.options.EntityId != null && this.options.Attribute != null) {
                        let box = Ele("div", {
                            style: {
                                cursor: 'default',
                            }
                        });
                        //debugger;
                        //add the label
                        let label = Ele("span", {
                            innerHTML: options.Attribute,
                            appendTo: box,
                        });
                        if (options.LabelMargin) {
                            label.style.marginRight = options.LabelMargin;
                        }
                        let deployments = SI.Editor.Data.Objects.Deployment.Levels;
                        for (let deployment in deployments) {
                            //debugger;
                            let props = deployments[deployment];
                            Ele("button", {
                                id: 'si_edit_promote_' + options.Attribute + "_" + deployment,
                                title: props.ToolTip,
                                style: {
                                    display: "inline-block",
                                    borderRadius: props.BorderRadius,
                                    border: 'none',
                                    boxShadow: props.Shadow,
                                    margin: "4px",
                                    marginLeft: "7px",
                                    padding: "2px",
                                    paddingLeft: "5px",
                                    paddingRight: "5px",
                                    height: "18px",
                                    backgroundColor: props.BackgroundColor,
                                    minWidth: props.MinWidth,
                                    cursor: 'pointer',
                                },
                                data: {
                                    entityid: options.EntityId,
                                    entityname: options.EntityName,
                                    deployment: deployment,
                                    attribute: options.Attribute,
                                },
                                innerHTML: props.Label,
                                onclick: function (e) {
                                    //debugger;
                                    let entityid = this.dataset.entityid;
                                    let deployment = this.dataset.deployment;
                                    let entityname = this.dataset.entityname;
                                    let attribute = this.dataset.attribute;
                                    let data = { KEY: 'Promote', deployment: deployment, entityname: entityname, entityid: entityid, attribute: attribute };
                                    let ajax = { Url: SI.Editor.Ajax.Url, Data: data, };
                                    //   console.log(ajax);
                                    SI.Editor.Ajax.Run(ajax);

                                    e.stopPropagation();
                                },
                                appendTo: box,
                            });
                        }
                        if (options.Parent == null) {
                            return box;
                        } else {
                            let pop = document.querySelector(options.Parent);
                            if (pop) {
                                pop.appendChild(box);
                            }
                        }

                    }
                },
                Promoted: function (val) {
                    SI.Tools.SuperAlert(val, 1500);
                    console.log(val);
                },

            },
            Plugins: {
                Current: <?= $currentPlugins ?>,
                Downloaded: <?= $downloadedplugs ?>,
            },
            Security: {
                Operations: ['create', 'read', 'write', 'append', 'appendTo', 'delete'],
                Roles: <?= $rolesdata ?>,
            },
            Settings: <?= $settingsjson ?>,
            Settings2: <?= $settings2 ?>,
        },
        User: {
            HelpLinks: <?= $helplinks ?>,
            Languages: <?= $myLangs ?>,
            QuickMenuItems: <?= $quickmenuitems ?>,
            PasswordStrength: <?= $PasswordStrength ?>,
        },
        Site: {
            Domain: "<?= SI_DOMAIN_NAME ?>",
            BusinessUnit: "<?= SI_BUSINESSUNIT_NAME ?>",
            SessionPageData:  <?= $sessionPageData ?>,
        },
        Tools: {
            GetFileSize: function (path) {
                var ajax = new XMLHttpRequest();
                ajax.open('HEAD', path, true);
                ajax.onreadystatechange = function () {
                    if (ajax.readyState == 4) {
                        if (ajax.status == 200) {
                            return ajax.getResponseHeader('Content-Length');
                        } else {
                            return null;
                        }
                    }
                };
                ajax.send(null);
            },
            GetStyleByName: function (name) {
                for (let i in SI.Editor.Data.css_properties) {
                    let group = SI.Editor.Data.css_properties[i];
                    for (let j in group) {
                        if (group[j].n === name) {
                            SI.Editor.Data.css_properties[i][j].group = i;
                            SI.Editor.Data.css_properties[i][j].index = j;
                            return SI.Editor.Data.css_properties[i][j];
                        }
                    }
                }
            },
            //GetAttributesByName returns the first instance of the attribute. there are several listed under multiple divs. they are not guaranteed unless a group is specified
            GetAttributeByName: function (name, group=null) {
                for (let i in SI.Editor.Data.html_attributes) {
                    let curgroup = SI.Editor.Data.html_attributes[i];
                    if (curgroup == group || group == null) {
                        for (let j in curgroup) {
                            debugger;
                            if (curgroup[j].s === name) {
                                //debugger;
                                SI.Editor.Data.html_attributes[i][j].curgroup = i;
                                SI.Editor.Data.html_attributes[i][j].index = j;
                                return SI.Editor.Data.html_attributes[i][j];
                            }
                        }
                    }
                }
            },
            SupplementData: function () {
                this.EntityData = function () {
                    //Build the Entity Not allowed names and the Guid reverse lookup list 
                    let info = SI.Editor.Data.Objects.Entities.Definitions;
                    let notallowednames = SI.Editor.Data.Objects.Entities.Lists.NotAllowedNames;
                    let entkey = {}
                    for (let ent in info) {
                        let entdata = info[ent]
                        if (typeof entdata.instanceguid !== 'undefined') {
                            entkey[entdata.instanceguid] = ent;
                            entkey[ent] = entdata.instanceguid;
                            //debugger;
                            //This list will be checked when time to make a new entity. 
                            if (typeof notallowednames[ent] === 'undefined')  {
                                notallowednames.push(ent);
                            }
                            //Entity Options
                            if (typeof entdata.entityoptions !== 'undefined' && entdata.entityoptions) {
                                //dont allow a singular name to be used as a new ent name either
                                if (typeof entdata.entityoptions['SN'] !== 'undefined' && notallowednames.indexOf(entdata.entityoptions.SN) === -1) {
                                      notallowednames.push(entdata.entityoptions.SN);
                                }
                            }
                        }
                    }
                    SI.Editor.Data.Objects.Entities.Lists.FwdRevLookup = entkey;
                    SI.Editor.Data.Objects.Entities.Lists.NotAllowedNames = notallowednames;
                };
                //the relations data is nothign but guids. lets try to make this more readable and useable
                this.RelationsData = function () {  
                    //Relations data has only entity guid names. use the reverse lookup from EntityData to get the names to make it easy to read.
                    let relations = SI.Editor.Data.Objects.Entities.Relationships;
                    let lookup = SI.Editor.Data.Objects.Entities.Lists.FwdRevLookup;
                    for (let r in relations) {
                        let relation = relations[r];
                        let childid = relation.childentity_id;
                        if (typeof lookup["0x" + childid]!== 'undefined') {
                            relation.childentity_name = lookup["0x" + childid];
                        }
                        let parentid = relation.parententity_id;
                        if (typeof lookup["0x" + parentid] !== 'undefined') {
                            relation.parententity_name = lookup["0x" + parentid];
                        }
                    }
                };
                this.StyleData = function () {
                    if (SI.Editor.Data.Code.Styles) {
                        SI.Editor.Data.DataLists.StyleGroups = {};
                        if (SI.Editor.Data.Objects.Settings.StyleGroupOrder) {
                            let existGroups = SI.Editor.Data.Objects.Settings.StyleGroupOrder.split(",");
                            for (let group of existGroups) {
                                SI.Editor.Data.DataLists.StyleGroups[group] = [];
                            }
                        } 
                        let styles = SI.Editor.Data.Code.Styles;
                        for (let i in styles) {
                            if (styles.hasOwnProperty(i)) {
                                let style = styles[i];
                                //Get the unique Groups
                                if (style.groups) {
                                    for (let group of style.groups) {
                                        if (!SI.Editor.Data.DataLists.StyleGroups[group]) {
                                            SI.Editor.Data.DataLists.StyleGroups[group] = [];
                                        }
                                        SI.Editor.Data.DataLists.StyleGroups[group].push(i);
                                    }
                                }
                            }
                        }
                    }
                };
                this.AtData = function () {
                    //@keyframenames are the same as animation names. find them and set them. too bad there isnt a window object that holds all Animation Names.
                    let sheets = document.styleSheets;
                    for (let i = 0; i < sheets.length; i++) {
                        let sheet = sheets[i];
                        if (sheet.href !== null) {
                            if (sheet.href.includes('style/plugins') || sheet.href.includes('style/page')) {
                                let rules = sheet.cssRules;
                                for (let j = 0; j < rules.length; j++) {
                                    let rule = rules[j];
                                    //Import Runles
                                    if (rule.type === 3) {
                                        let href = rule.href;
                                        if (!SI.Editor.Data.DataLists.ImportRules.includes(href)) {
                                            SI.Editor.Data.DataLists.ImportRules.push(href);
                                        }
                                    }
                                    //get Media Rules
                                    if (rule.type === 4) {
                                        let ctxt = rule.conditionText;
                                        if (!SI.Editor.Data.DataLists.MediaRules[ctxt]) {
                                            SI.Editor.Data.DataLists.MediaRules[ctxt] = [];
                                        }
                                      
                                        mediaRules = rule.cssRules;
                                        for (let k = 0; k < mediaRules.length; k++) {
                                            SI.Editor.Data.DataLists.MediaRules[ctxt].push(mediaRules[k].cssText);
                                        }
                                    }
                                    //get font faces
                                    if (rule.type === 5) {
                                        let ffstyles = rule.style;
                                        if (ffstyles.fontFamily) {
                                        //we must have a font face family
                                            if (!SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily]) {
                                                SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily] = {};
                                            }
                                            let ittr = 0;
                                            while (ffstyles[ittr]) {
                                                if (ffstyles[ittr] !== "font-family") {
                                                    let ffstyle = ffstyles[ittr];
                                                    let ffprop = ffstyles[ffstyle];
                                                    SI.Editor.Data.DataLists.FontFaces[ffstyles.fontFamily][ffstyle] = ffprop;
                                                }
                                                ittr++;
                                            }
                                        }
                                    }
                                    //get page printer rules
                                    if (rule.type === 6) {
                                        let pgstyles = rule.style;
                                        let ittr = 0;
                                        while (pgstyles[ittr]) {
                                            if (pgstyles[ittr] !== "font-family") {
                                                let pgstyle = pgstyles[ittr];
                                                if (SI.Editor.Data.DataLists.PageRules.Allowed.indexOf(pgstyle)>-1) {
                                                    let pgprop = pgstyles[pgstyle];
                                                    SI.Editor.Data.DataLists.PageRules[pgstyle] = pgprop;
                                                }
                                            }
                                            ittr++;
                                        }
                                    }
                                    //get Animation Names
                                    if (rule.type === 7) {
                                        let name = rule.name;
                                        if (!SI.Editor.Data.DataLists.AnimationNames.includes(name)) {
                                            SI.Editor.Data.DataLists.AnimationNames.push(name);
                                        }
                                    }
                                }
                            }
                        }
                    }
                };


                //run our data functions
                this.EntityData();
                this.RelationsData();//dependent on the function above it to have run.
                this.StyleData();
                this.AtData();
            },
        }
    },
    UI:{
        Container: null,
        Windows: ["Page", "Media", "Site", "Styler", "Scripter", "Widgets", "Language", "Entities", "Plugins", "Scenegraph", "Security", "Users","Settings"],
        Init: function (){
            //Initialize main visible panel
            SI.Editor.UI.DrawAppContainer();
            SI.Editor.UI.MainMenu.Init();
            //Initalize 3 sub menus
            let editorPanels = ["AddPanel", "EditPanel", "ToolsPanel"];
            for (let i in editorPanels) {
                let title = editorPanels[i];
                SI.Editor.UI[title].Init();
            }
            //Initialize Windows
            for (let i in SI.Editor.UI.Windows) {
                let title = SI.Editor.UI.Windows[i];
                SI.Editor.UI[title].Init();
            }
            SI.Editor.UI.SetDocumentEvents();
        },
        SetDocumentEvents: function(ev) {
            //if the rott si menu is open, spawn the browser context menu. if not open the root si menu
            document.oncontextmenu = function (e) {
                let element = document.getElementById('si_edit_main_menu');
                let v = element.currentStyle ? element.currentStyle.display : getComputedStyle(element, null).display;
                if (v != 'none') {
                } else {
                    let mm = document.getElementById('si_edit_main_menu');
                    mm.style.top = e.pageY + 'px';//e.clientY + "px";
                    mm.style.left = e.pageX + 'px';//e.clientX + "px";
                    mm.style.display = 'block';
                    e.preventDefault();
                    return false;
                }
             };

            window.onbeforeunload = function (ev) {
                ev.preventDefault();
                let list = '';
                let blocks = SI.Editor.Data.Objects.Blocks;
                for (let block in blocks) {
                    if (blocks.hasOwnProperty(block)) {
                        if (blocks[block].IsDirty) {
                          //  debugger;
                            list += block+ ", ";
                        }
                    }
                }
                if (list != '') {
                    //To google. I really wish this worked.
                    return ev.returnValue = 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                   // return 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                }             
            };

            var map = {}; // You could also use an array  so-5203407
            onkeydown = onkeyup = function (e) {
                var selected = SI.Editor.Objects.Elements.Selected;
                var isFocused = (document.activeElement === selected);      //so-36430561
                var movable = true;
                if (selected) {
                    //we only move by arrows if we have a position and the doc does not have a selected element so the arroews dont break textbox navigation
                    if (typeof selected.style.position === 'undefined' || selected.style.position === 'static' || isFocused) {
                        movable = false;
                    }
                }

                e = e || event; // to deal with IE
                map[e.keyCode] = e.type == 'keydown';
                let inc = (e.ctrlKey) ? 1 : 5;

                if (map[37]) { //Left Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(-inc, 0);
                } 
                if (map[38]) {//Up Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(0,-inc);
                }
                if (map[39]) {//Right Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(inc, 0);
                }
                if (map[40]) {//Down Arrow
                    if (movable)
                    SI.Editor.Objects.Elements.MoveBy(0,inc);
                }
                if (map[46]) {//Delete Element
                    if (confirm("Delete Element: " + selected.id + "?")) {
                        SI.Editor.Objects.Elements.Remove(selected);
                    } else {
                        map[e.keyCode] = false;
                    }
                }
                if (map[90] && e.ctrlKey) { //ctrl-z should undo
                    document.execCommand('undo');
                }
                //alert(e.keyCode);
            }
        },
        DrawAppContainer: function () {
            //create the container that all visible editor.js items will be containd in.
            var editorContainer = Ele('div', {
                class: 'lgn-editor',
                id: 'si_edit_container',
                style: {
                    fontFamily: SI.Editor.Style.FontFace,
                    color:SI.Editor.Style.TextColor,
                },
                appendTo:document.body,
            });

            SI.Editor.UI.Container = editorContainer;  
        },
        MainMenu: {
            Element: null,
            Init: function () {
                //Main Menu Box	
                var mainMenu = Ele('div', {
                    id: 'si_edit_main_menu',
                    class: 'si-window-container',//hack to make this play like a window
                    draggable: true,
                    style: {
                        width: '75px',
                        color: SI.Editor.Style.TextColor,
                        position: 'absolute',
                        display: 'none',
                        zIndex: '995',
                        left: '100px',
                    },
                    onmouseenter: function () {
                        var winds = document.getElementsByClassName("si-window-container");
                        for (let i = 0; i < winds.length; i++) {
                            winds[i].style.zIndex = '980';
                        }
                        this.style.zIndex = '981';
                    },
                    onmouseleave: function () {
                        //debugger;
                        SI.Editor.UI.MainMenu.IsDragging = false;
                        document.getElementById('si_edit_hud_editisdragging').innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                    },
                    ondragstart: function (e) {
                        //Need to add the mouse to menu offset so that it can be determined below.
                        //debugger;
                        if (e.target.id.split('_')[0] == "dragger") { return; }
                        this.dataset.mOffX = e.offsetX;
                        this.dataset.mOffY = e.offsetY;
                        SI.Editor.UI.MainMenu.IsDragging = true;
                        e.dataTransfer.setData("Text", e.target.id);
                        document.getElementById('si_edit_hud_editisdragging').innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                    },
                    ondragover: function (e) { e.preventDefault(); },
                    ondragend: function (e) {
                        //debugger;
                        SI.Editor.UI.MainMenu.IsDragging = false;
                        //get mouse offsets when the menu was clicked. this way it does not snap to the upper right on drop.
                        let moX = this.dataset.mOffX;
                        let moY = this.dataset.mOffY;
                        //change the menu position to be the mouse minus the original mouse offset
                        this.style.left = e.pageX - moX + 'px';
                        this.style.top = e.pageY - moY + 'px';
                        document.getElementById('si_edit_hud_editisdragging').innerHTML = SI.Editor.UI.MainMenu.IsDragging;
                        //console.log(e);
                    }
                });
                //Menu Items Table
                var mainMenuTable = Ele('table', {
                    id: 'si_edit_main_menu_table',
                    style: {
                        width: '100%',
                        borderCollapse: 'separate',      
                        borderSpacing: '0px',
                    }
                });
                //Menu Items 
                let mainMenuItems = ['add', 'edit', 'tools'];
                //debugger;
                for (let mi in mainMenuItems) {
                    let val = mainMenuItems[mi];
                    let brdrad = '0px';
                    let bdrcol = 'black black ' + SI.Editor.Style.BackgroundColor + ' black' ;
                    switch (val) {
                        case 'add': brdrad = '5px 5px 0px 0px'; break;
                        case 'tools': brdrad = '0px 0px 0px 5px'; break;
                    }
                    var mainMenuRow = Ele('tr', {});
                    let txt = val.toLowerCase().replace(/\b[a-z]/g, function (letter) {
                        return letter.toUpperCase();
                    });
                    let menuitem = Ele('td', {
                        innerHTML: txt,
                        id: 'si_' + val + '_menu_item',
                        style: {
                            cursor : 'pointer',                  
                            borderTopWidth : '0px',
                            borderLeftWidth : '0px',
                            textAlign: 'center',
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                            borderRadius: brdrad,
                            border: '1px black solid',
                            borderColor: bdrcol,
                        },
                        onclick: function (e) { SI.Editor.UI.MainMenu.SelectMenu('si_edit_' + val + '_menuitem') },
                        appendTo: mainMenuRow,
                    });
                    if (val === 'tools') {
                        menuitem.style.borderBottom = '1px black solid';
                    }
                    mainMenuTable.appendChild(mainMenuRow);
                }
                //Append Main Menu at the end
                mainMenu.appendChild(mainMenuTable);
                //Close Editor x button	
                mainMenu.appendChild(Ele('button', {
                    id: 'close-editor',
                    innerHTML: 'X',
                    style: {
                        width: '26px',
                        height: '20px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: SI.Editor.Style.TextColor,
                        position: 'relative',
                        top: '-1px',
                        float: 'right',
                        fontSize: '12px',
                        border: '1px black solid',
                        borderRadius: '0px 0px 5px 5px',
                    },
                    onclick: function () { SI.Editor.Style.SetTheme(); mainMenu.style.display = 'none'; },
                }));
                SI.Editor.UI.Container.appendChild(mainMenu);
                SI.Editor.UI.MainMenu.Element = document.getElementById('si_edit_main_menu');
            }, 
            //Hide/Unhide sub menus when item selected
            SelectMenu: function(menu) {
                //for now we want something selected before openeing the edit menu
                if (menu == "si_edit_edit_menuitem" && SI.Editor.Objects.Elements.Selected == null) {
                    alert("Please select an element to edit.");
                    return false;
                }
                if (menu && SI.Tools.Is.Visible(menu)) {
                    SI.Tools.Style.FadeOut(menu, 200);
                }
                else {
                    let menus = ["si_edit_add_menuitem", "si_edit_edit_menuitem", "si_edit_tools_menuitem"];
                    menus.forEach(function (_menu) {
                        if (menu === _menu) {
                            SI.Tools.Style.FadeIn(_menu, 200);
                        } else {
                            if (_menu && SI.Tools.Is.Visible(_menu)) {
                                SI.Tools.Style.FadeOut(_menu, 200);
                            }
                        }
                    });
                }
            },
            IsDragging:false,
        },
        AddPanel: {
            Init: function () {
                var htmlattrs = JSON.parse(localStorage.getItem("html_attributes"));
                //Add Menu		
                var tagMenu = Ele('div', {
                    id: 'si_edit_add_menuitem',
                    style: {
                        width: '200px',
                        height : '220px',
                        backgroundColor : SI.Editor.Style.BackgroundColor,
                        position : 'absolute',
                        top : '0px',
                        left : '75px',
                        display : 'none',
                        padding : '0',
                        fontSize: '.8em',
                    },
                    onscroll: function (e) {
                       e.stopPropagation();
                    },
                });
                SI.Editor.UI.AddPanel.SetupTabs(tagMenu);
                //Append the new menu to the main menu.
                SI.Editor.UI.MainMenu.Element.appendChild(tagMenu);
            },
            SetupTabs: function (newMenu) {
                let tabs = SI.Widget.Tabs();
                //create the tabbox
                let tabTags = Ele('div', {
                    id: 'si_edit_add_tabs',
                    style:{
                        width : "96%",
                        height : "200px",
                        backgroundColor : "black",
                        paddingLeft: '5px',
                        overflow : 'auto',
                    }
                });
                //tags.appendChild(tabTags);
                let tagscroll = SI.Editor.UI.AddPanel.TagScroller();
                tabTags.appendChild(tagscroll);
                
                var tabWidgets = Ele('div', {
                    id: 'new-item-tab-tools',
                    style: {
                        width: "100%",
                        height: "200px",
                        backgroundColor: "black",
                        paddingLeft: '5px',
                        overflow: 'auto',
                    }
                });
                
                var widgetbox = SI.Editor.UI.AddPanel.Widgetbox();
                tabWidgets.appendChild(widgetbox);

                tabs.Items.Add("Tags", tabTags);
                tabs.Items.Add("Widgets", tabWidgets);

                newMenu.appendChild(tabs.Draw());
            },
            Widgetbox: function () {
                let widgetscontainer = Ele('div', {
                    innerHTML: "Widgets",
                    style: {
                        backgroundImage: "url('/editor/media/images/underconstruction.png')",
                        backgroundSize: "contain",
                        width: '100%',
                        height:'100%',
                    },
                });
                //debugger;
                if (SI.Widget) {
                    for (let widget in SI.Widget) {
                        let w = new SI.Widget[widget]();
                        let def = w.Defaults;
                        //debugger;
                    }
                }
                return widgetscontainer;
            },
            TagScroller: function() {
                var tagsview = Ele('div', {
                    ondrop: function (e) {
                        //alert();
                        e.stopPropagation();
                        e.preventDefault();
                        return false;
                    }
                });
                
                for (let group in SI.Editor.Data.html_elements) {
                    if (SI.Editor.Data.html_elements.hasOwnProperty(group)) {
                        let tagbox = Ele('div', { innerHTML : group });
                        let tagtable = Ele('table', {
                            style:{backgroundColor: SI.Editor.Style.BackgroundColor, width:'100%'}
                        });
                        //debugger;
                        let tagGroup = SI.Editor.Data.html_elements[group]; 

                        for (let prop in tagGroup) {
                            if (tagGroup.hasOwnProperty(prop)) {
                               
                                var ele = tagGroup[prop].n;
                                var tg = tagGroup[prop].t;


                                if (tagGroup[prop].def) {
                                    var def = JSON.stringify(tagGroup[prop].def);
                                } else {
                                    def = false;
                                }
                                
                                var tagsrow = document.createElement('tr'); 
                                var tddragger = document.createElement('td');

                                var imDragger = Ele('div', {
                                    id: "dragger_" + ele,
                                    style: {
                                        backgroundImage : "url('/editor/media/icons/dragaround.png')",
                                        backgroundSize : "cover",
                                        width : '24px',
                                        height : '24px'
                                    },
                                    data: {
                                        default:def,
                                    },
                                    draggable: true,
                                    ondragstart : function (ev) {
                                      //  this.dragging = true;

                                        ev.effectAllowed = "copyMove";
                                        ev.dataTransfer.setData("Text", ele);
                                    },
                                    ondrag: function (e) {
                                        SI.Editor.UI.MainMenu.IsDragging = false;
                                        //console.log(e);
                                        if (e.buttons === 3) { //both buttons down
                                            e.preventDefault();
                                            return false;
                                        }

                                    },
                                    ondragtransfer: function (ev) {
                                        ev.dataTransfer.dropEffect = "copy";
                                    },
                                    ondragend: function (e) {

                                        e.stopPropagation();
                                        //debugger;
                                        if (SI.Tools.Is.Element(SI.Editor.Objects.Elements.DropParent) ) {
                                            //debugger;
                                            var tag = e.target.id.split('_')[1].trim();
                                            var isempty = SI.Tools.Is.EmptyElement(tag);
                                            var isinline =SI.Tools.Is.EmptyElement(tag);
                                            let def = null;
                                            // console.log('isEmpty:' + isempty);
                                            if (e.target.dataset.default) {
                                                def = JSON.parse(e.target.dataset.default);
                                            }
                                            // var obj = document.createElement(tag);
                                            //debugger;
                                            var obj = Ele(tag, def);
                                            

                                            if (!isempty && obj.innerHTML.length === 0 ) {
                                                obj.innerHTML = tag;
                                            }

                                            if (tag == "script") {
                                                obj.innerHTML = "console.log('Your script starts here')";
                                            }
                                            obj.style.position = 'absolute';
                                            //obj.style.position = 'relative';
                                            obj = SI.Editor.Objects.Elements.Editable(obj);
                                            //debugger;
                                            if (SI.Editor.Objects.Elements.DropParent != null) {
                                                if (typeof SI.Editor.Objects.Elements.DropParent.id != "undefined" && SI.Editor.Objects.Elements.DropParent.id.startsWith('si_block_')){
                                                    obj.style.top = e.pageY - parseInt(SI.Editor.Objects.Elements.DropParent.offsetTop) + "px";
                                                    obj.style.left = e.pageX - parseInt(SI.Editor.Objects.Elements.DropParent.offsetLeft) + "px";
                                                   // var b = new EditBox(obj);
                                                    
                                                    SI.Editor.Objects.Elements.DropParent.appendChild(obj);
                                                }
                                                else {
                                                    var ot =SI.Tools.GetElementOffset(SI.Editor.Objects.Elements.DropParent, 'offsetTop');
                                                    var ol =SI.Tools.GetElementOffset(SI.Editor.Objects.Elements.DropParent, 'offsetLeft');
                                                    obj.style.top = e.pageY - ot + "px";
                                                    obj.style.left = e.pageX - ol+ "px";
                                                    //var b = new EditBox(obj);
                                                    SI.Editor.Objects.Elements.DropParent.appendChild(obj);
                                                }
                                            }
                                            //make block dirty so that we can tell the user to save it before leaving
                                            let block =SI.Tools.Element.GetBlock(obj).id.replace("si_block_", "");
                                            if (block) {
                                                SI.Editor.Data.Objects.Blocks[block].IsDirty = true;
                                            }
                                            
                                        }
                                        else
                                        {
                                            alert("Please make sure you drop on a block. Go to the Page tool to make blocks");
                                        }
                                    }
                                });
                                
                                tddragger.appendChild(imDragger);
                                var tddata = document.createElement('td');
                                tddata.innerHTML = tagGroup[prop].ln;

                                tagsrow.appendChild(tddragger);
                                tagsrow.appendChild(tddata);

                                SI.Editor.Objects.Settings.Help.Show("tags", tagGroup[prop], tagsrow);

                                tagtable.appendChild(tagsrow);
                            }
                        }
                        tagbox.appendChild(tagtable);
                        tagsview.appendChild(tagbox);
                    }
                }
                Ele("div", { style: { height: '16px', position: 'relative' }, appendTo: tagsview });//hack to fix the bottom row of the scrolls. This is probably a tabs issue. further investigate.
                return tagsview;
            },
        },
        EditPanel: {
            //Init: build the panel, setup and populate the tabs.
            Init: function () {
                var editMenu = Ele('div', {
                    id: 'si_edit_edit_menuitem',
                    style: {
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        position: 'absolute',
                        top: '20px',
                        left: '75px',
                        display: 'none',
                        width: '485px',
                        height: '329px',
                    },
                    draggable: true,
                    ondragover: function (e) { e.preventDefault();},
                    ondragstart: function (e) {
                        
                        e.stopPropagation();
                        return false;
                    },

                });
                var tabs = new SI.Widget.Tabs({ Height: '100%' });
                tabs.Items.Add('Main', SI.Editor.UI.EditPanel.DrawMain());
                tabs.Items.Add('Attributes', SI.Editor.UI.EditPanel.DrawAttributes());
                tabs.Items.Add('Styles', SI.Editor.UI.EditPanel.DrawStyles());
               // tabs.Items.Add('Styles2', SI.Editor.UI.EditPanel.DrawStyles2());
                editMenu.appendChild(tabs.Draw());
                SI.Editor.UI.MainMenu.Element.appendChild(editMenu);
            },
            //Draw the Main tab 
            DrawMain: function (e) {
                //Container
                let container = Ele('div', {
                    id: 'si_main_view',
                    style: {
                        height: '329px',
                        backgroundColor: 'black',
                        color: SI.Editor.Style.TextColor,
                        padding: '15px',
                        overflowY: 'scroll',
                    },
                    ondrag: function () {
                        return false;
                    },

                });
                SI.Tools.StopOverscroll(container);
                //Menubox
                let menu = Ele('div', {
                    id: "si_edit_main_menubox",
                    style: {
                        position: 'relative',
                    },
                    appendTo: container,
                });
                //if has inner text content edit cb here
                

                //Select Button
                let select = Ele('button', {
                    innerHTML: "Select",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_selectpanel");
                        handlePanels(panel);
                        refreshSelects();
                    },
                    style: {
                       
                    },
                    appendTo: menu,
                });

                let selectpanel = Ele('div', {
                    id: "si_edit_main_selectpanel",
                    class:"si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',
                        position: 'absolute',
                        marginLeft: '0px',
                        padding: '3px',
                        color:'black',
                    },
                    appendTo: menu,
                });

                let blkBtn = Ele('button', {
                    innerHTML: "Block",
                    onclick: function (e) {
                        //debugger;
                        let sel = SI.Editor.Objects.Elements.Selected
                        let blk =SI.Tools.Element.GetBlock(sel);

                        SI.Editor.Objects.Blocks.Select(blk.id);
                    },
                    style: {
                        display: 'block',
                        width: '74px',
                    },
                    appendTo: selectpanel,
                });

                
                let parBtn = Ele('button', {
                    innerHTML: "Parent",
                    onclick: function (e) {
                        let sel = SI.Editor.Objects.Elements.Selected;
                        if (sel) {
                            par = sel.parentElement;
                            if (par.classList.contains('si-block')) {
                                // do some stuff
                                alert("Can't select parent block");
                                return;
                            }
                            if (par.id != null) {
                                SI.Editor.Objects.Elements.Select(e,par.id);
                            }
                            
                        }
                    },
                    style: {
                        display: 'block',
                        width: '74px',
                    },
                    appendTo: selectpanel,
                });

                Ele('span', { innerHTML: "By id", appendTo: selectpanel});
                let selectbyid = Ele('select', {
                    style: {
                        width: "30px",
                        marginLeft:"10px"
                        
                    },
                    onmouseenter: function (e) { refreshSelects(); },
                    onchange: function (e) {                      
                        ele = document.getElementById(this.value)
                        if (ele) {
                            var event = new MouseEvent('dblclick', {
                                'view': window,
                                'bubbles': false,
                                'cancelable': true
                            });
                            ele.dispatchEvent(event);
                            refreshSelects();
                        }                     
                    },
                    appendTo: selectpanel,
                    
                });
                let handlePanels = function (panel) {
                    //determine if we are showing or hiding the panel
                    let display = 'none';
                    if (panel.style.display == 'block') {
                        display = 'none';
                    } else {
                        display = 'block';
                    }
                    //make sure ALL of the panels are hidden
                    let panels = document.getElementsByClassName('si-edit-main-panel');
                    for (let p in panels) {
                        if (panels.hasOwnProperty(p)) {
                            panels[p].style.display = 'none';
                        }
                    }
                    //set the given panel to be 
                    panel.style.display = display;
                }
                let refreshSelects = function () {
                    //capture the display of the element 
                    let startValue = selectbyid.value;
                    //clear the select element
                    selectbyid.innerHTML = "";
                    //get all the blocks
                    let blocks = document.querySelectorAll(".si-block");
                    let selid = null;
                    if (SI.Editor.Objects.Elements.Selected) {
                        selid = SI.Editor.Objects.Elements.Selected.id;
                    }
                    
                    for (let block of blocks) {
                        let group = Ele('optgroup', {
                            label: block.id.replace("si_block_", ""),
                            style: {
                                color: 'darkgrey',
                            },
                        })
                        selectbyid.add(group);

                        let option = Ele('option', {
                            innerHTML: block.id,
                            value: block.id,
                            disabled: true,
                            style: {
                                color: 'navy',
                            },
                        })
                        selectbyid.add(option);

                        children = document.querySelectorAll("#" + block.id + " *");
                        for (let child of children) {
                            let color = 'blue';
                            let disabled = false;
                            if (child.id == selid) {
                                color = 'red';
                                option.disabled = "disabled";
                                disabled = true;
                            }
                            //debugger;
                            let generations =SI.Tools.Element.GenerationsFromBlock(child);
                            let tab = '';
                            for (let g = 0; g < generations; g++) {
                                tab += "&nbsp;&nbsp;&nbsp;&nbsp;";
                            }
                            let ele = Ele('option', {
                                innerHTML: tab + child.id,
                                value: child.id,
                                style: {
                                    color: color,
                                },
                            })
                            if (disabled) {
                                ele.disabled = "disabled";
                            }
                            selectbyid.add(ele);
                        }
                    }
                    selectbyid.value = startValue;
                }

                //Parent Button
                let parent = Ele('button', {
                    innerHTML: "Parent",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_parentpanel");
                        handlePanels(panel);
                        refreshParents();
                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });
                let parentpanel = Ele('div', {
                    id: "si_edit_main_parentpanel",
                    class: "si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',

                        position: 'absolute',
                        marginLeft: '58px',
                        padding: '3px',
                    },
                    appendTo: menu,
                });
                let selectedParentLabel = Ele('span', {
                    innerHTML: "Parent:",
                    style: {
                        color: 'black',
                        display: 'block',
                    },
                    appendTo: parentpanel,
                });
                let selectedParentValue = Ele('span', {
                    innerHTML: "NothingSelected",
                    style: {
                        color: 'blue',
                        display: 'block',
                    },
                    appendTo: parentpanel,
                });
                Ele('hr', { appendTo: parentpanel,});
                let changeParentLabel = Ele('span', {
                    innerHTML: "Change Parent",
                    style: {
                        color: 'black',
                        display:'block',
                    },
                    appendTo: parentpanel,
                });

                let selectBlockElements = Ele('select', {
                    onchange: function (e) {
                        if (SI.Editor.Objects.Elements.Selected != null) {
                            let newParent = document.getElementById(this.value);
                            if (newParent != SI.Editor.Objects.Elements.Selected.parentElement) {
                                newParent.appendChild(SI.Editor.Objects.Elements.Selected);
                            } else {
                                console.log("The element alread belongs to that parent");
                            }
                            
                        }
                    },
                    onmouseenter: function () { refreshParents(); },
                    appendTo: parentpanel,
                });
                let refreshParents = function () {
                    //first get all the blocks
                    let startValue = selectBlockElements.value;
                    selectBlockElements.innerHTML = "";
                    let blocks = document.querySelectorAll(".si-block");
                    let selid = null;
                    if (SI.Editor.Objects.Elements.Selected) {
                        selid = SI.Editor.Objects.Elements.Selected.id;
                        selectedParentValue.innerHTML = SI.Editor.Objects.Elements.Selected.parentElement.id;
                    }
                    //debugger;
                    for (let b in blocks) {
                        if (blocks.hasOwnProperty(b)){
                            //add the options group showing the block name
                            let group = Ele('optgroup', {
                                label: blocks[b].id.replace("si_block_", ""),
                                style: {
                                    color: 'darkgrey',
                                },
                            })
                            selectBlockElements.add(group);

                            let block = Ele('option', {
                                innerHTML: blocks[b].id,
                                value: blocks[b].id,
                                style: {
                                    color: 'navy',
                                },
                            })
                            selectBlockElements.add(block);
                            //debugger;
                            children = document.querySelectorAll("#" + blocks[b].id + " *");
                            for (let c in children) {
                                if (children.hasOwnProperty(c)) {
                                    if (!SI.Tools.Is.EmptyElement(children[c].tagName)) {
                                        let color = 'blue';
                                        let disabled = false;
                                        if (children[c].id == selid) {
                                            color = 'red';
                                            block.disabled = "disabled";
                                            disabled = true;
                                        }
                                        //debugger;
                                        let generations =SI.Tools.Element.GenerationsFromBlock(children[c]);
                                        let tab = '';
                                        for (let g = 0; g < generations; g++) {
                                            tab += "&nbsp;&nbsp;&nbsp;&nbsp;";
                                        }
                                        let ele = Ele('option', {
                                            innerHTML: tab+children[c].id,
                                            value: children[c].id,
                                            style: {
                                                color: color,
                                            },
                                        })
                                        if (disabled) {
                                            ele.disabled = "disabled";
                                        }
                                        selectBlockElements.add(ele);
                                    }
                                }
                            }
                        }
                    }
                    selectBlockElements.value = startValue;
                }

                //Delete Button
                let remove = Ele('button', {
                    innerHTML: "Delete",
                    onclick: function (e) {
                        if (confirm("Delete Element " + SI.Editor.Objects.Elements.Selected.id+"???")) {
                            SI.Editor.Objects.Elements.Remove(SI.Editor.Objects.Elements.Selected);
                        } 
                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });

                //Advanced Button
                let advanced = Ele('button', {
                    innerHTML: "Advanced",
                    onclick: function (e) {
                        let panel = document.getElementById("si_edit_main_advancedpanel");
                        handlePanels(panel);

                    },
                    style: {
                        marginLeft: '5px',
                    },
                    appendTo: menu,
                });
                let advancedpanel = Ele('div', {
                    id: "si_edit_main_advancedpanel",
                    class: "si-edit-main-panel",
                    style: {
                        backgroundColor: 'silver',
                        display: 'none',
                        position: 'absolute',
                        marginLeft: '178px',
                        padding: '7px',
                        color: 'black',
                    },
                    appendTo: menu,
                });
                let multilinguallbl = Ele('span', {
                    innerHTML: 'Multilingual ',
                    title: "translate the text into other languages",
                    style: {
                        fontSize: '.6em',
                    },    
                    appendTo: advancedpanel,
                });
                //MULTILINGUAL SELECT
                let mylang = SI.Editor.Data.User.Languages;
                let multilingualselect = Ele('select', {
                    id:'si_edit_main_advanced_mlselect',
                    append: Ele('option', {}),
                    onchange: function (ev) {
                        //debugger;
                        if (this.selectedIndex) {

                            if (confirm("This will replace the innerHTML of this element with the contents of the multilingual text!\nThiscan't be undone. The current innerHTML will be foever lost")) {
                                //debugger;
                                let index = this.selectedIndex - 1;
                                    let localtext = SI.Editor.Objects.Language.Current[index];
                                    //let opt = this.options[this.selectedIndex];
                                    for (let lang of mylang) {
                                        let col = '_' + lang.toLowerCase();
                                        if (localtext[col] && localtext[col].length > 0) {
                                            let text = localtext[col];
                                            SI.Editor.Objects.Elements.Selected.innerHTML = text;
                                            SI.Editor.Objects.Elements.Selected.classList.add("si-multilingual-" + localtext.name);
                                            SI.Editor.Objects.Elements.Selected.classList.add("si-multilingual");
                                            SI.Editor.Objects.Elements.Selected.dataset.si_ml_index = index;
                                            SI.Editor.Objects.Elements.Selected.dataset.si_ml_token = localtext.name;
                                            break;
                                        }
                                    }
                            } else {
                                this.selectedIndex = 0;
                            }
                        } else {
                            if (SI.Editor.Objects.Elements.Selected.classList.contains("si-multilingual-")) {
                                if (confirm("This will remove the multilingual nature of this element.\nThe innerHTML will remain intact but will not be tracked multilingually.\nThis will not affect the item in the Language tool or other elements it is assigned to.")) {
                                    var classes = SI.Editor.Objects.Elements.Selected.classList;
                                    

                                    SI.Editor.Objects.Elements.Selected.classList.Remove("si-multilingual");
                                    SI.Editor.Objects.Elements.Selected.removeAttribute('data-si_ml_index');
                                    SI.Editor.Objects.Elements.Selected.removeAttribute('data-si_ml_token');
                                }
                            }
                        }
                    },
                    appendTo: advancedpanel,
                });
                let current = SI.Editor.Objects.Language.Current;
               
                //debugger;
                
                for (let texts of current) {
                    //debugger;
                    for (let lang of mylang) {
                        let col = '_' + lang.toLowerCase();
                        if (texts[col] && texts[col].length > 0) {
                            let text = texts[col]
                            if (texts[col].length > 32) {
                                text = texts[col].substr(0, 32) + "\u2026";
                            }
                            
                            Ele('option', {
                                innerHTML: text,
                                data: {
                                    id: '0x' + texts.id,
                                    token: texts.name,
                                    column: col,
                                },
                                appendTo: multilingualselect,
                            })
                            break;
                        }
                    }


                }


                Ele("br", { appendTo: advancedpanel});
                let ignoreInnerlbl = Ele('span', {
                    innerHTML: 'Ignore innerHTML on Save ',
                    title:"This is useful when personal data may be present in an element and should not be saved to the block database. eg: Logged In: MyUserName",
                    style: {
                        fontSize:'.6em',
                    },
                    appendTo: advancedpanel,
                });
                let ignoreInner = Ele('input', {
                    type: 'checkbox',
                    id: "si_edit_main_advanced_ignoreinner",
                    onchange: function (ev) {
                        //debugger;
                        if (this.checked) {
                            SI.Editor.Objects.Elements.Selected.classList.add("si-editable-ignoreinner");
                        } else {
                            SI.Editor.Objects.Elements.Selected.classList.remove("si-editable-ignoreinner");
                        }
                    },
                    appendTo: advancedpanel,
                });


                let maintable = Ele("table", {
                    id: "si_edit_main_shotrcuttable",
                    style: {
                        height: '100%',
                        paddingBottom: '40px',
                    },
                    appendTo: container,
                });

                //soon to be user selectable shortcuts to often used tools.       
                SI.Editor.UI.EditPanel.DrawQuickMenuItems(maintable);
                return container
            },
            DrawQuickMenuItems: function(maintable) {
                maintable.innerHTML = "";
                let sc = SI.Editor.Data.User.QuickMenuItems;
                for (let i in sc) {
                    if (sc.hasOwnProperty(i)) {
                        let control = sc[i];
                        let type = control.Type;
                        let row = SI.Editor.Objects.Elements[type].Widget(control);
                        if (row != null) {
                            maintable.appendChild(row);
                        }
                    }
                }
            },
            //Draw the attributes tab
            DrawAttributes: function (e) {
                var attrsview = Ele('div', {
                    id: 'si_attribute_view',
                    style: {
                        height: '329px',
                        overflowY: 'scroll',
                    },
                    
                });
                //Tools.StopOverscroll(attrsview); //this is meant to make the screen not scroll past the window. it needs work
                var pretable = Ele('table', {
                    style: {
                        width: '100%',  
                    }
                });
                var fnamerow = document.createElement('tr');
                var fnameLabel = document.createElement('td');
                fnameLabel.innerHTML = 'friendly name';
                fnamerow.appendChild(fnameLabel);
                var fnameLabel = document.createElement('td');
                fnameLabel.innerHTML = '<input />';
                fnamerow.appendChild(fnameLabel);

                for (let group in SI.Editor.Data.html_attributes) {
                    //           console.log(eletype + "  " + prop);
                    if (SI.Editor.Data.html_attributes.hasOwnProperty(group)) {

                        var attrsbox = Ele('div', {
                            innerHTML: group,
                            style: {
                                backgroundColor: 'black',
                                color: SI.Editor.Style.TextColor,
                                paddingLeft: '10px',
                            },
                        });         
                        if (group != 'GLOBAL' && group != 'EVENT') {
                            attrsbox.classList.add('si-attribute-group');
                            attrsbox.id = 'si_attribute_group_' + group.trim();
                            attrsbox.style.display = 'none';
                        }
                        var attrstable = Ele('table', {
                            style: {
                                width: '100%',
                                borderCollapse: 'collapse',
                                userSelect: false,
                                backgroundColor: SI.Editor.Style.BackgroundColor,
                            }
                        });
                        for (let attribute in SI.Editor.Data.html_attributes[group]) {
                            if (SI.Editor.Data.html_attributes[group].hasOwnProperty(attribute)) {
                                let editableAttributeRow = SI.Editor.Objects.Elements.Attributes.Widget({ "Group": group, "Index": attribute });
                                if (editableAttributeRow != null) {
                                    attrstable.appendChild(editableAttributeRow);                                 
                                }
                            }
                        }

                        Ele("tr", { append: Ele('td', { innerHTML: '|' }), appendTo: attrstable });//hack to fix the bottom row of the scrolls. This is probably a tabs issue. further investigate.
                        
                        attrsbox.appendChild(attrstable);
                        attrsview.appendChild(attrsbox);
                        
                    }
                }
                return attrsview;

            },
            //Draw the styles tab
            DrawStyles : function (e) {

                var styleview = Ele('div', {
                    id: 'si_style_view',
                    style: {
                        height: '329px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                    },
                });
                
               // var eletype = ele.tagName.toLowerCase();
                //Loop through all of the groups of styles
                for (let group in SI.Editor.Data.css_properties) {
                    if (SI.Editor.Data.css_properties.hasOwnProperty(group)) {
                        if (!group.startsWith("Pseudo")) {
                            //Make the group box
                            let stylebox = Ele('div', {
                                innerHTML: group,
                                style: {
                                    backgroundColor: 'black',
                                    color: SI.Editor.Style.TextColor,
                                    paddingLeft: "10px",
                                },
                                appendTo: styleview,
                            });
                            let styletable = Ele('table', {
                                style: {
                                    backgroundColor: SI.Editor.Style.BackgroundColor,
                                    color: SI.Editor.Style.TextColor,
                                    width: '100%',
                                },
                                appendTo: stylebox,
                            });
                            //Loop through all of the possible styles and create a user interface for them :)
                            for (let css in SI.Editor.Data.css_properties[group]) {
                                if (SI.Editor.Data.css_properties[group].hasOwnProperty(css)) {
                                    var editableChoiceRow = SI.Editor.Objects.Elements.Styles.Widget({ "Group": group, "Index": css });
                                    if (editableChoiceRow != null) {
                                        styletable.appendChild(editableChoiceRow);
                                    }
                                }
                            }
                        }
                    }
                }
                Ele("div",{style: {height:"18px",}, appendTo:styleview });//hack to fix the bottom of the scrolls. This is probably a tabs issue. further investigate.
                return styleview;
            },

            DrawStyles2: function() {
                //create a box for the groups
                var styleview = Ele('div', {
                    id: 'si_edit_style_view',
                    style: {
                        backgroundColor: SI.Editor.Style.BackColor,

                    },
                });
                //create the menubar for controls
                var styleviewctrls = Ele('div', {
                    id: 'si_edit_style_view_controls',
                    style: {
                        backgroundColor: SI.Editor.Style.MenuColor,
                        height:'20px',
                    },
                    appendTo: styleview
                });
                //add the Group radio box
                var styleviewradiogrouplabel = Ele('label', {
                    for: 'si_edit_style_view_controls_radio_group',
                    innerHTML: "Group",
                    style: {
                        marginLeft: '10px',
                    },
                    appendTo: styleviewctrls
                });
                var styleviewradiogroup = Ele('input', {
                    type: "radio",
                    checked:"checked",
                    name:'si_edit_style_view_controls_sort',
                    id: 'si_edit_style_view_controls_radio_group',
                    style: {marginRight:'10px'},
                    appendTo: styleviewctrls,
                    onchange: function () {
                        document.getElementById('si_edit_style_view_groups').style.display = 'block';
                        document.getElementById('si_edit_style_view_alpha').style.display = 'none';
                    }
                });
                //add the Alpha radio box
                var styleviewradioalphalabel = Ele('label', {
                    for: 'si_edit_style_view_controls_radio_alpha',
                    innerHTML: "A-Z",
                    appendTo: styleviewctrls
                });
                var styleviewradioalpha = Ele('input', {
                    type: "radio",
                    name: 'si_edit_style_view_controls_sort',
                    id: 'si_edit_style_view_controls_radio_alpha',
                    data: {
                        'si-loaded': false
                    },
                    appendTo: styleviewctrls,
                    onchange: function () {
                        alert("alpha");
                        document.getElementById('si_edit_style_view_groups').style.display = 'none';
                        let sortedbox = document.getElementById('si_edit_style_view_alpha');
                        if (!sortedbox.dataset.loaded === true) {
                            SI.Editor.UI.EditPanel.DrawSortedStyles();
                        }
                        sortedbox.style.display = 'block';
                    }
                });
                //The Groups Box
                var styleviewgroups = Ele('div', {
                    id: 'si_edit_style_view_groups',
                    style: {
                        height: '290px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                    },
                    appendTo: styleview
                });
                //The Alphabatized Box
                var styleviewalpha = Ele('div', {
                    id: 'si_edit_style_view_alpha',
                    style: {
                        height: '290px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                        display:'none'
                    },
                    appendTo: styleview
                });

                let groups = SI.Editor.Data.DataLists.StyleGroups;
                let groupObject = {};
                for (let g in groups) {

                    let groupbox = Ele("div", { });

                    let props = groups[g];
                    for (let p in props) {
                        let prop = props[p];
                        let style = SI.Editor.Data.Code.Styles[prop];

                        Ele("div", {
                            innerHTML:prop,           
                            appendTo:groupbox
                        });

                    }

                    groupObject[g] = groupbox;
                }
             //   debugger;
                let options = { Sections: groupObject };
                let accordion = new SI.Widget.Accordion(options);
                styleviewgroups.appendChild(accordion);
                return styleview
            },
            DrawSortedStyles: function() {
                //only draw this if the user selected it.
                let box = document.getElementById('si_edit_style_view_alpha');
                
                let styles = SI.Editor.Data.Code.Styles;
                let styleObject = {};

                for (let s in styles) {

                   
                }

                let options = { Sections: styleObject };
                let accordion = new SI.Widget.Accordion(options);
                debugger;
                box.dataset.loaded = true;
            },

            //When a element is selected, update ALL the Attributes and styles UIs to reflect the elements values.
            SetSelectedElementValues: function (element) {
                //debugger;
                //CONFIG the menu
                //In the attributes menu we have tag specific attributes. We only want to show the Global, Event, and Tag specific attributes.
                //first hide all attribute groups.
                //debugger;
                SI.Tools.Class.Loop("si-attribute-group", function (ag) {
                    ag.style.display = 'none';
                });
                //if the tags attribute list exists, show it
                //debugger;
                let tag = element.tagName.toLowerCase();
                let group = document.getElementById("si_attribute_group_" + tag);
                if (group != null) {
                    group.style.display = 'block';
                }
                //good thing all styles are global...

                //clear all the data from the attributes and style lists. 
                SI.Editor.UI.EditPanel.Clear.Attributes();
                SI.Editor.UI.EditPanel.Clear.Styles();
                //debugger;
                //Loop through all the element's attributes and styles and set what ever we can in the UI so we see what they have
                for (let i = 0; i < element.attributes.length; i++) {
                    var attrib = element.attributes[i];
                    if (attrib.specified) {
                       //if it is not a global attr then try to find it as it tag name
                        let fields = document.getElementsByClassName("si-edit-attribute-GLOBAL-" + attrib.name);
                        //if it is not a global attr then try to find it as it tag name
                        if (!fields) { 
                            fields = document.getElementsByClassName("si-edit-attribute-" + element.tagName.toLowerCase() + "-" + attrib.name);
                        }
                        if (fields) {
                            for (let field in fields) {
                                //debugger;
                                if (attrib.name.startsWith('data-')) {
                                    //add the elements styles here
                                }
                                //Handle showing the inline styles
                                else if (attrib.name == 'style') {
                                    
                                    var parts = attrib.value.split(";");
                                    for (let j = 0; j < parts.length; j++) {
                                        let kvp = parts[j].split(':');
                                        if (kvp.length > 1) {
                                            //debugger;
                                            let sty = kvp[0];
                                            //    var inputs = document.querySelectorAll("." + "si-edit-style-" + sty);
                                            let inputs = document.getElementsByClassName("si-edit-style-" + kvp[0].trim());
                                            for (let k = 0; k < inputs.length; k++) {
                                                inputs[k].value = kvp[1];
                                            }
                                        }
                                    }
                                }
                                else if (attrib.name == 'class') {
                                    fields[field].value = attrib.value.replace(/class="si-editable-element"/g, "").replace(/si-editable-element/g, "").replace("si-editor-selected", "");
                                }
                                else {
                                    fields[field].value = attrib.value;
                                }
                            }
                        }
                    }
                }
                //since these are not technically attributes but I want to show them none the less. 
                let tagname = document.getElementsByClassName("si-edit-attribute-GLOBAL-tag");
                for (let i = 0; i < tagname.length; i++) {
                    tagname[i].value = tag;
                }
                let innerHtmls = document.getElementsByClassName("si-edit-attribute-GLOBAL-innerHTML");
                let innerTexts = document.getElementsByClassName("si-edit-attribute-GLOBAL-innerText");
                //debugger;
                if (!SI.Tools.Is.EmptyElement(tag)) {
                    //disable the ignore inner checkbox
                    document.getElementById('si_edit_main_advanced_ignoreinner').disabled = false;                  
                    if (element.classList.contains("si-editable-ignoreinner")) {
                        document.getElementById('si_edit_main_advanced_ignoreinner').checked = true;
                    } else {
                        document.getElementById('si_edit_main_advanced_ignoreinner').checked = false;
                    }
                    for (let i = 0; i < innerHtmls.length; i++) {
                        var html = element.innerHTML;
                        html = html.replace(/class='si-editable-element'/g, "").replace(/si-editable-element/g, "");
                        innerHtmls[i].disabled = false;
                        innerHtmls[i].value = html;
                    }                   
                    for (let i = 0; i < innerTexts.length; i++) {
                        var children = element.children;
                        for (let j = 0; j < children.length; j++) {
                            innerTexts[i].disabled = false;
                            var child = children[j];
                            if (child.nodeType != Node.TEXT_NODE) {
                                innerTexts[i].disabled = true;
                            }
                        }
                        innerTexts[i].value = element.innerText;
                    }
                } else {
                    document.getElementById('si_edit_main_advanced_ignoreinner').disabled = true;

                    for (let html of innerHtmls) {
                        html.value = "This type of element cannot accept inner text or child elements";
                        html.disabled = true;
                    }
                    for (let txt of innerTexts) {
                        txt.value = "This type of element cannot accept inner text";
                        txt.disabled = true;
                    }
                }

                //debugger;
                let mlsel = document.getElementById('si_edit_main_advanced_mlselect');
                if (element.classList.contains('si-multilingual')) {
                    let mlIn = parseInt(element.dataset.si_ml_index)+1;
                    mlsel.selectedIndex = mlIn;//  selectedIndex = mlIn + 1;//minus 1 for the first blank row
                    for (let i = 0; i < innerHtmls.length; i++) {
                        innerHtmls[i].disabled = true;
                        innerHtmls[i].title = "You will need to edit multilingual text from the language tool.";
                    }  
                } else {
                    for (let i = 0; i < innerHtmls.length; i++) {
                        innerHtmls[i].removeAttribute('disabled');
                        innerHtmls[i].removeAttribute('title');
                    }  
                    mlsel.selectedIndex =0;//
                }


                let stylefield = document.getElementsByClassName("si-edit-attribute-GLOBAL-style");
                for (let i = 0; i < stylefield.length; i++) {
                    stylefield[i].value = element.style.cssText;
                }
            },

            //Clears the Attributes or the Styles
            Clear: {
                Attributes: function () {
                    SI.Tools.Class.Loop("si-edit-attribute", function (ele) {
                        if (!ele.dataset.siPreserve) {
                            ele.value = "";
                        }
                    });
                },
                Styles: function () {
                   SI.Tools.Class.Loop("si-edit-style", function (ele) {
                       if (!ele.dataset.siPreserve) {
                           ele.value = "";
                       }
                    });
                },
            }

        },
        ToolsPanel: {
            Init: function () {
                //Tools Menu	
                //Make a div for the tools panel
                var toolsMenu = Ele('div', {
                    id: 'si_edit_tools_menuitem',
                    style: {
                        backgroundColor : SI.Editor.Style.BackgroundColor,
                        position : 'absolute',
                        top : '45px',
                        left : '74px',
                        display : 'none',
                    }
                });

                //put a table in it so stuff stacks nice
                var toolsMenuTable = Ele('table', {
                    style: {
                        width: '100%',
                        borderCollapse : "collapse",
                    }
                });

                for (let i in SI.Editor.UI.Windows) {
                    let title = SI.Editor.UI.Windows[i];
                    var menuRow = toolsMenuTable.insertRow(i);
                    var menuItem = menuRow.insertCell(0);
                    menuItem.style.border = 'solid 1px #000';
                    menuItem.innerHTML = title;
                    menuItem.style.textAlign = 'center';
                    menuItem.style.cursor = 'pointer';
                    menuItem.style.paddingLeft = '5px';
                    menuItem.style.paddingRight = '5px';
                    menuItem.onclick = function (ev) {
                        //debugger;
                        //if the window is showing, hide it and bail
                        if (SI.Editor.UI[title].Window.IsVisible()) {
                            SI.Editor.UI[title].Window.Hide();
                            return;
                        }
                        //if not. position it to the right of the mouse and show it. 
                        let left = (ev.pageX + 100) + "px";
                        let top = ev.pageY + "px";
                        SI.Editor.UI[title].Window.SetPosition(top,left);
                        SI.Editor.UI[title].Window.Show();
                    };
                }
                toolsMenu.appendChild(toolsMenuTable);
                SI.Editor.UI.MainMenu.Element.appendChild(toolsMenu);          
            }
        },
        //Tool windows
        Page: {
            Window: null,
            Init: function () { //ParentId: 'si_edit_container',
                var options = { Name: "Page", Parent: "si_edit_container", Title: "Page", Width: '800px', Height: '600px' };
                SI.Editor.UI.Page.Window = new SI.Widget.Window(options);
                SI.Editor.Objects.Page.Draw();
            },
        },
        Media: {
            Window: null,
            Init: function () {
                var obj = { Name: "Media", Parent: "si_edit_container", BackgroundColor: "#999", Title: "Media", Width: '800px', Height: '600px', IconUrl:'/editor/media/icons/window-media.png'};
                SI.Editor.UI.Media.Window = new SI.Widget.Window(obj);
                let media = new SI.Editor.Objects.Media(SI.Editor.UI.Media.Window);
                media.Draw();
                SI.Editor.UI.Media.Window.Resize = media.ResizeWindow;
            }
        },
        Styler: {
            Window: null,
            Init: function () {
                var obj = { Name: "Styler", Parent: 'si_edit_container', Title: "Styler", Overflow:"HIDDEN"};
                SI.Editor.UI.Styler.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Styler.Draw();
            },
            Draw: function (content) {

                let styler = new SI.Editor.Objects.Styler();
                SI.Editor.UI.Styler.Window.Append(styler.Init());
            }
        },
        Scripter: {
            Window: null,
            Init: function () {               
                var obj = { Name: "Scripter", Parent: 'si_edit_container', Title: "Scripter", Width: '800px', Height: '600px' };
                SI.Editor.UI.Scripter.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Scripter.Window.Append( SI.Editor.Objects.Scripter.Draw() );
            }
        },
        Widgets: {
            Window: null,
                Init: function () {
                    var obj = { Name: "Widgets", Parent: 'si_edit_container', Title: "Widgets", Width: '800px', Height: '600px' };
                    SI.Editor.UI.Widgets.Window = new SI.Widget.Window(obj);
                    SI.Editor.UI.Widgets.Draw();
                },
            Draw: function () {
                let base = Ele('div', {
                    style: {
                        width: "100%",
                        height: "100%",
                        backgroundColor: '#111',
                        overflow: "scroll",
                        color: SI.Editor.Style.TextColor,
                    },
                });
                SI.Editor.UI.Widgets.Window.Append(base);
            },
        },
        Language: {
            Window: null,
            Init: function () {               
                var obj = { Name: "Language", Parent: 'si_edit_container', Title: "Language", Width: '800px', Height: '600px' };
                SI.Editor.UI.Language.Window = new SI.Widget.Window(obj);
                SI.Editor.Objects.Language.Draw();
            },
        },
        Entities: {
            Window: null,
            Init: function() {
                var obj = {
                    Name: "Entities", Parent: 'si_edit_container', Title: "Entities", Width: '800px', Height: '600px',
                    Resize: function(win){
                       //debugger;
                        
                        win.Container.height = win.GetHeight();
                        win.Container.width = win.GetWidth();
                    },
                };
                SI.Editor.UI.Entities.Window = new SI.Widget.Window(obj);
                SI.Editor.Objects.Entity.Draw();
            }
        },
        Plugins: {
            Window: null,
            Init: function () {
                var obj = {
                    Name: "Plugins", Parent: 'si_edit_container', Title: "Plugins", ResizeThickness: 5,
                    Resize: function (win) {
                        document.getElementById('si_edit_plugins_repo_content').style.height = win.Container.clientHeight - 127 + "px";
                        
                    },
                };
                SI.Editor.UI.Plugins.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Plugins.Draw();

            },
            Draw: function () {
                let container = Ele("div",{
                    style:{
                        width:"100%",
                        height:"100%",
                        backgroundColor:'green',

                    },
                });

                let tabs = new SI.Widget.Tabs({
                    OnChange: function (self) {
                        tab = self.dataset.tabname;
                        let pis = SI.Editor.Objects.Plugins.Repo.Plugins;
                        //if we have no plugins, we should probably try to get some
                        if ( pis.length === 0 ) {
                            SI.Editor.Objects.Plugins.Repo.GetMorePlugins();
                        }
                    }
                });

                //Currently Installed plugins
                let localPlugins = Ele("div", {
                    style: {
                        display: 'flex',
                        flexWrap:'wrap',
                    }
                });

                for (let i = 0; i < 100; i++) {
                    Ele("div", {
                        style: {  
                            backgroundColor: 'blue',
                            height: '100px',
                            width: '100px',
                            margin:'8px',
                        },
                        appendTo: localPlugins,
                    });
                }

                tabs.Items.Add("Local Plugins", SI.Editor.Objects.Plugins.Local.Build() );
                tabs.Items.Add("Plugins Repo", SI.Editor.Objects.Plugins.Repo.Build());
                tabs.Items.Add("Plugin Editor", SI.Editor.Objects.Plugins.Editor.Build());
 
                container.appendChild(tabs.Draw());
                SI.Editor.UI.Plugins.Window.Append(container); 
                SI.Editor.Objects.Plugins.Repo.AddCategory("All");
            },
        },
        Site: {
            Window: null,
            Init: function () {
                var obj = { Name: "Site", Parent: 'si_edit_container', Title: "Site", Width: '800px'};
                SI.Editor.UI.Site.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Site.Draw();
            },
            Draw: function () {

                let base = Ele('div', {
                    style: {
                        width: '100%',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        padding: '15px'
                    }
                });

               

                let fldNewPage = Ele('fieldset', {
                    append: Ele('legend', {innerHTML: 'Create a new Page' }),
                });
             //   fldNewPage.style.width = "300px";
            //    
            //    lgndNewPage.innerHTML = 'Create a new Page';
            //    fldNewPage.appendChild(lgndNewPage);

                let tblNewPage = document.createElement('table');
                let hgrNewPage = document.createElement('tr');
                let hBuNewPage = document.createElement('th');
                hBuNewPage.innerHTML = "Business Unit";
                hBuNewPage.title = 'sub-domain';
                hgrNewPage.appendChild(hBuNewPage);
                let hDoNewPage = document.createElement('th');
                hDoNewPage.innerHTML = "Domain";
                hgrNewPage.appendChild(hDoNewPage);
                let hPgNewPage = document.createElement('th');
                hPgNewPage.innerHTML = "Page";
                hgrNewPage.appendChild(hPgNewPage);
                let blankNewPage = document.createElement('th');
                hgrNewPage.appendChild(blankNewPage);

                tblNewPage.appendChild(hgrNewPage);

                let inRowNewPage = document.createElement('tr');
                let dBuNewPage = document.createElement('td');
                let dBuINewPage = document.createElement('input');
                dBuINewPage.id = "SI_Struct_NewPage_BU";
                dBuINewPage.value = SI.Editor.Data.Site.BusinessUnit;

                dBuINewPage.readOnly = <?= $notdomainadmin ?>;
                dBuNewPage.appendChild(dBuINewPage);
                inRowNewPage.appendChild(dBuNewPage);

                let dDoNewPage = document.createElement('td');
                let dDoINewPage = document.createElement('input');
                dDoINewPage.readOnly =  <?= $notsuperadmin ?>;
                dDoINewPage.id = "SI_Struct_NewPage_Domain";
                dDoINewPage.value = SI.Editor.Data.Site.Domain;
                dDoNewPage.appendChild(dDoINewPage);
                inRowNewPage.appendChild(dDoNewPage);

                let dPgNewPage = document.createElement('td');
                let dPgINewPage = document.createElement('input');
                dPgINewPage.id = "si_edit_site_newpage";
                dPgNewPage.appendChild(dPgINewPage);
                inRowNewPage.appendChild(dPgNewPage);

                let dSuNewPage = document.createElement('td');

                let dSuINewPage = document.createElement('input');
                dSuINewPage.type = 'button';
                dSuINewPage.onclick = function () {
                   //debugger;
                  //  let b = document.getElementById("SI_Struct_NewPage_BU").value;
                  //  let d = document.getElementById("SI_Struct_NewPage_Domain").value;
                    let p = document.getElementById("si_edit_site_newpage").value;
                    SI.Editor.Objects.Page.New(p);
                }
                dSuINewPage.value = 'Create';
                dSuNewPage.appendChild(dSuINewPage);
                inRowNewPage.appendChild(dSuNewPage);

                tblNewPage.appendChild(inRowNewPage);
                fldNewPage.appendChild(tblNewPage);
                base.appendChild(fldNewPage);


                //Directory

                let directory = Ele('fieldset', {
                    append : Ele('legend', { innerHTML: 'Directory' }),
                    appendTo:base,
                });

                //debugger;
                let pageData = SI.Editor.Data.Objects.Pages;
                let domains = [];
                for (let domain of pageData) {
                    //Deal with domain setup
                    if (!domains.includes(domain['domainName'])) {
                        let dom = Ele('fieldset', {
                            id: 'si_edit_site_domain_' + domain['domainName'],
                            style: {
                                backgroundColor:'#708090',
                            },
                            append: Ele('legend', {
                                innerHTML: "Domain",
                                style: {
                                    backgroundColor: '#d3d9de',
                                    color: '#374049',
                                    paddingLeft: '5px',
                                    paddingRight: '5px',
                                    border: '2px groove gray',
                                    borderRadius: '5px',
                                },
                            }),
                            appendTo: directory,
                        });
                        Ele('span', {
                            innerHTML: domain['domainName'],
                            appendTo: dom,
                        }),
                        domains.push(domain['domainName']);

                        //Deal with businessunit setup
                        let busunits = [];
                        for (let busunit of pageData) {  
                            if ((!busunits.includes(busunit['businessunitName'])) && (domain['domainName'] === busunit['domainName'])) {
                                let buname = ''
                                if (busunit['businessunitName'] === '') {
                                    buname = 'NONE';
                                } else {
                                    buname = busunit['businessunitName'] ;
                                }
                                let bu = Ele('fieldset', {
                                    id: 'si_edit_site_domain_' + busunit['domainName'] + '_' + buname,
                                    style: {
                                        backgroundColor: '#778899',
                                    },
                                    append: Ele('legend', {
                                        innerHTML:"BusinessUnit",
                                        style: {
                                            backgroundColor: '#d3d9de',
                                            color: '#374049',
                                            paddingLeft: '5px',
                                            paddingRight: '5px',
                                            border: '2px groove gray',
                                            borderRadius: '5px',
                                        },
                                    }),
                                    appendTo: dom,
                                });
                                Ele('span', {
                                    innerHTML: buname,
                                    appendTo: bu
                                }),
                                busunits.push(busunit['businessunitName']);
                                let pages = [];
                                for (let page of pageData) {
                                    let pgname = ''
                                    if (page['pageName'] === '') {
                                        pgname = 'ROOT';
                                    } else {
                                        pgname = page['pageName'];
                                    }
                                    if ((!pages.includes(page['pageName'])) && (page['businessunitName'] === busunit['businessunitName'])) {

                                        let pageid = '0x' + page['pageId'].toLowerCase();

                                        let pg = Ele('fieldset', {
                                            id: 'si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname,
                                            style: {
                                                backgroundColor: '#a8b3bd',
                                            },
                                            append: Ele('legend', {
                                                innerHTML: pgname,
                                                style: {
                                                    backgroundColor: '#d3d9de',
                                                    color: '#374049',
                                                    paddingLeft: '5px',
                                                    paddingRight: '5px',
                                                    border: '2px groove gray',
                                                    borderRadius: '5px',
                                                },
                                            }),
                                            appendTo: bu,
                                        });

                                        //try to round up some relationships
                                        let relationships = SI.Editor.Data.Objects.Entities.Relationships;
                                        //debugger;

                                        


                                        

                                        let removeredirect = Ele('button', {
                                            id: 'si_edit_site_rmredirect_' + pageid,
                                            innerHTML: 'Remove Redirect',
                                            style: {
                                                margin: '15px',
                                                display: 'none',
                                            },
                                            appendTo: pg,
                                            onclick: function (e) {
                                                let options = {};
                                                options.Data = {};
                                                options.Data.KEY = "RemoveRedirect";
                                                options.Data.pageid = this.id.replace('si_edit_site_rmredirect_','');
                                                SI.Editor.Ajax.Run(options);
                                            },
                                        });


                                        if (page.redirecttopage) {
                                            removeredirect.style.display = 'block';
                                        } else {

                                        }

                                        let parentEntBox = Ele('fieldset', {
                                            id: 'si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname,
                                            style: {
                                                backgroundColor: '#a8b3bd',
                                            },
                                            append: Ele('legend', {
                                                innerHTML: "Parent Entities",
                                                style: {
                                                    backgroundColor: '#d3d9de',
                                                    color: '#374049',
                                                    paddingLeft: '5px',
                                                    paddingRight: '5px',
                                                    border: '2px groove gray',
                                                    borderRadius: '5px',
                                                },
                                            }),
                                            appendTo: pg,
                                        });

                                        let childEntBox = Ele('fieldset', {
                                            id: 'si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname,
                                            style: {
                                                backgroundColor: '#a8b3bd',
                                            },
                                            append: Ele('legend', {
                                                innerHTML: "Child Entities",
                                                style: {
                                                    backgroundColor: '#d3d9de',
                                                    color: '#374049',
                                                    paddingLeft: '5px',
                                                    paddingRight: '5px',
                                                    border: '2px groove gray',
                                                    borderRadius: '5px',
                                                },
                                            }),
                                            appendTo: pg,
                                        });

                                        let parentEnts = [];
                                        let childEnts = [];

                                        for (let r in relationships) {

                                            let relation = relationships[r];
                                            //check for parents or children
                                            let relid = '0x' + relation.id.toLowerCase();
                                            let parentid = '0x' + relation.parent_id.toLowerCase();
                                            let childid = '0x' + relation.child_id.toLowerCase();

                                            let pEntName = relation.parententity_name;
                                            let cEntName = relation.childentity_name;
                                            //debugger;
                                            //save only the correct id
                                            if (parentid !== pageid) {
                                                parentid = null;
                                            }
                                            if (childid !== pageid) {
                                                childid = null;
                                            }
                                            //this should never be both
                                            if (parentid || childid) {
                                                //debugger;
                                                //put the remaining id into the id
                                                let id = (parentid || childid);
                                                ;
                                                let entName = null;
                                                let appendto = null;
                                                let makeFS = false;
                                                let pg;
                                                if (parentid) {  //The page is the parent  
                                                    if (!parentEnts.includes(parentid)) {
                                                        parentEnts.push(parentid);
                                                        entName = pEntName;
                                                        appendto = parentEntBox;
                                                        makeFS = true;
                                                        //debugger;
                                                    } else {
                                                        entName = pEntName;
                                                        appendto = parentEntBox;
                                                    }
                                                } else {    //The page is the child 
                                                    if (childEnts.includes(childid)) {
                                                        childEnts.push(childid);
                                                        entName = cEntName;
                                                        appendto = childEntBox;
                                                        makeFS = true;
                                                        //debugger;
                                                    }
                                                    else {

                                                    }
                                                }
                                                //debugger;
                                                if (makeFS) {
                                                    pg= Ele('fieldset', {
                                                        id: 'si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname,
                                                        style: {
                                                            backgroundColor: '#a8b3bd',
                                                        },
                                                        append: Ele('legend', {
                                                            innerHTML: cEntName,
                                                            style: {
                                                                backgroundColor: '#d3d9de',
                                                                color: '#374049',
                                                                paddingLeft: '5px',
                                                                paddingRight: '5px',
                                                                border: '2px groove gray',
                                                                borderRadius: '5px',
                                                            },
                                                        }),
                                                        appendTo: appendto,
                                                    });

                                                } else {
                                                    //debugger;
                                                    pg = document.getElementById('si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname);
                                                }
                                                //debugger;
                                                let relbox = Ele('div', {
                                                    id: 'si_edit_site_domain_' + page['domainName'] + '_' + buname + '_' + pgname +"_"+ id,
                                                    innerHTML: relation.note,
                                                    style: {
                                                        display:'inline-block',
                                                        backgroundColor: SI.Editor.Style.BackgroundColor,
                                                    },
                                                    appendTo: pg,
                                                });

                                            }            
                                            //then check for children
                                        }
                                        pages.push(page['pageName']);
                                    }
                                }
                            }
                        }
                    }
                }

                //let pageLibrary = SI.Editor.Objects.Page.Current;

                //let selectCurrentPages = document.createElement('select');
                

                //for (let page in pageLibrary){
                ////    console.log("PAGE");
                //    let pg = pageLibrary[page];

                //    let bu = pg['businessunitName'];
                //    if (bu.length > 0) {
                //        bu = bu + '.';
                //    }
                //    let domain = pg['domainName'];
                //    let pagename = pg['pageName'];

                //    let option = document.createElement('option');
                //    option.value = bu + domain + "/" + pagename;
                //    option.innerHTML = bu + domain + "/" + pagename;
                //    selectCurrentPages.appendChild(option);
                //}


                //let btnOpenPage = document.createElement('button');
                //btnOpenPage.innerHTML = 'Open';
               // fldCurrentPages.appendChild(selectCurrentPages);
           //     base.appendChild(fldCurrentPages);

   
                let fldNewInstance = Ele('fieldset', {
                    append: Ele('legend', { innerHTML: 'Create a new Instance' }),
                    appendTo:base,
                });
                let tblNewInstance = Ele('table', { appendTo:fldNewInstance});
                let tblHdrInstance = Ele('tr', { appendTo: tblNewInstance });

                Ele('th', { innerHTML: 'Business Unit', appendTo: tblHdrInstance });
                Ele('th', { innerHTML: 'Domain', appendTo: tblHdrInstance });
                Ele('th', { appendTo: tblHdrInstance });

                let tblDtaInstance = Ele('tr', { appendTo: tblNewInstance });
                let tblDtaBuInstance = Ele('td', { appendTo: tblDtaInstance });
                Ele('input', { appendTo: tblDtaBuInstance });
                let tblDtaDoInstance = Ele('td', { appendTo: tblDtaInstance });
                Ele('input', { appendTo: tblDtaDoInstance });
                let tblDtaSubInstance = Ele('td', { appendTo: tblDtaInstance });
                Ele('input', { appendTo: tblDtaSubInstance });


                SI.Editor.UI.Site.Window.Append(base);
            },
        },
        Scenegraph: {
            Window: null,
            Init: function () {
                var obj = { Name: "Scenegraph", Parent: 'si_edit_container', Title: "Scenegraph", Width: '800px', Height: '600px' };
                SI.Editor.UI.Scenegraph.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Scenegraph.Draw();
            },
            Draw: function () {
                let base = Ele('div', {
                    style: {
                        width: "100%",
                        height: "100%",
                        backgroundColor:'#111',
                        overflow: "scroll",
                        color:SI.Editor.Style.TextColor,
                    },
                });
                //debugger;
                let ul =  SI.Tools.Object.ToDataTree(SI.Editor.Data.Site.SessionPageData);

                let pre = Ele('div', {
                    style: {
                        tabSize: '0',
                        color:'white',
                    },
                    append: ul,
                    appendTo:base,
                })
                SI.Editor.UI.Scenegraph.Window.Append(base);
            },
        },
        Security: {
            Window: null,
            Init: function () {
                var obj = { Name: "Security", Parent: 'si_edit_container', Title: "Security", Width: '800px', Height: '600px' };
                SI.Editor.UI.Security.Window = new SI.Widget.Window(obj);
                SI.Editor.Objects.Security.Draw();
            },
        },
        Users: {
            Window: null,
            Init: function () {
                var obj = { Name: "Users", Parent: 'si_edit_container', Title: "Users", StartWidth:'1000px', StartHeight: '600px' };
                SI.Editor.UI.Users.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.Users.Draw();
            },
            Draw: function () {
                let base = Ele('div', {
                    style: {
                        width: "100%",
                        height: "100%",
                        overflow: "scroll",
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: SI.Editor.Style.TextColor,
                    },
                });

                let newuser = Ele('button', {
                    innerHTML: "New",
                    style: {
                    },
                    onclick: function () {

                        SI.Editor.Objects.User.New();
                    },
                    appendTo: base,
                });

                let rolewindow = Ele('div', {
                    id: 'si_edit_users_rolewindow',
                    innerHTML: "",
                    style: {
                        backgroundColor: SI.Editor.Style.MenuColor,
                        top: '0px',
                        left: '0px',
                        position: 'relative',
                        padding: '5px',
                        display:'none',
                    },
                    appendTo: base,
                })
                let currentroles = SI.Editor.Data.Objects.Security.Roles;
                //debugger;
                for (let role of currentroles) {

                    let rolebox = Ele('div', {

                        appendTo: rolewindow,
                    })
                    let rolename = role.name;
                    let label = Ele('label', {
                        for: 'si_edit_users_rolecb_' + role.id,
                        innerHTML:role.name,
                        appendTo: rolebox,
                    });

                    let cb = Ele('input', {
                        id: 'si_edit_users_rolecb_' + role.id,
                        class: 'si-edit-users-rolecb-' + role.name,
                        type: 'checkbox',
                        style: {
                            float:'right',
                        },
                        onchange: SI.Editor.Objects.User.UpdateRoles,
                        appendTo: rolebox,
                    });



                }

                let pre = Ele('div', {
                    innerHTML: "",
                    style: {
                        tabSize: '0',
                    },
                    appendTo: base,
                })
                pre.insertAdjacentHTML('beforeend', SI.Editor.Data.Objects.Users);



                SI.Editor.UI.Users.Window.Append(base);


            },
        },
        Settings: {
            Window: null,
            Init: function () {
                    var obj = { Name: "Settings", Parent: 'si_edit_container', Title: "Settings", StartWidth: '800px', StartHeight: '600px' };
                    SI.Editor.UI.Settings.Window = new SI.Widget.Window(obj);
                    SI.Editor.Objects.Settings.Draw();
                },

        },
        //Tool Sub-Windows
        BlockTemplates: {
            Window: null,
            Init: function () {
                var obj = { Name: "BlockTemplates", BackgroundColor:'CadetBlue', Parent: 'si_edit_container', Title: "Block Templates", Width: '600px', Height: '400px' };
                SI.Editor.UI.BlockTemplates.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.BlockTemplates.Window.Append(SI.Editor.UI.BlockTemplates.Draw());
                SI.Editor.UI.BlockTemplates.Draw(SI.Editor.UI.BlockTemplates.Window.GetContentId());
            },
            Draw: function (content) {
                let draw = document.createElement('div');

                
                let blockTemplateBox = document.createElement('div');
                for (let key in SI.Editor.Data.Objects.Blocks) {
                    if (SI.Editor.Data.Objects.Blocks.hasOwnProperty(key)) {

                        if (typeof (SI.Editor.Data.Objects.Blocks[key]) != "undefined") {
                            blockTemplateBox.appendChild(SI.Editor.UI.BlockTemplates.Add(SI.Editor.Data.Objects.Blocks[key]));
                        }

                    }
                }

                draw.appendChild(blockTemplateBox);
                return draw;
            },
            Add: function (template) {
                //debugger;
                let table = Ele('table', {
                    style: {
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        margin : '5px',
                    },
                });

                let tr = document.createElement('tr');

                let pic = document.createElement('td');
                let data = document.createElement('td');

                let frame = Ele('div',{
                    style: {
                        position : 'relative',
                        height : '150px',
                        width : '150px',
                    },
                    appendTo:pic,
                });
                //                    src: '/editor/media/images/blockthumbs/' + template['thumb'] + '.jpg',
                let thumb = Ele('img', {

                    style: {
                        position : 'absolute',
                        maxWidth : '100%',
                        width : '100%',
                        maxHeight : 'auto',
                        heigth : 'auto',
                        margin : 'auto',
                        top : "0",
                        bottom : "0",
                        left : "0",
                        right : "0",
                    },
                    appendTo:frame,
                });

                tr.appendChild(pic);

               // console.log(Template);
                //debugger;
                let options = null;
                try {
                    options = JSON.parse(template['options']);
                }
                catch (error) {
                    console.log(error);
                }
                if (options) {
                    for (let s in options.style) {
                        options[s] = options.style[s];
                    }

                    for (let option in options) {


                        if (option != 'order' && option != 'category' && option != 'style') {
                            let box = Ele('div', {
                                style: {
                                    display: 'inline-block',
                                    margin: '5px',
                                },
                            });
                            let label = Ele('span', {
                                innerHTML: option,
                                style: {
                                    margin: '5px',
                                },
                                appendTo: box,
                            });

                            let input = Ele('input', {
                                value: options[option],
                                size: "5",
                                appendTo: box,
                            });

                            data.appendChild(box);

                        }
                    }

                }



             //   console.log(options);

                let btn = document.createElement('button');
                btn.innerHTML = 'Add Block Template';
                btn.style.float = 'right';
                btn.style.marginTop = '40px';
                btn.style.marginRight = '10px';
                data.appendChild(btn);
                tr.appendChild(data);
                table.appendChild(tr);
                return table;
            }
        },
        ImportBlock: {
            Window: null,
            Init: function () {
                var obj = {
                    Name: "ImportBlock", BackgroundColor: 'CadetBlue', Parent: 'si_edit_container',
                    Title: "Import Block", StartWidth: '268px', StartHeight: '75px',
                    StartTop: "400px", StartLeft: "300px", Resizable: false, WindowControls:"CLOSE",
                };
                SI.Editor.UI.ImportBlock.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.ImportBlock.Window.Append(SI.Editor.UI.ImportBlock.Draw());


            },
            Draw: function () {
                let container = document.createElement('div');
                let blSelect = Ele("select", {
                    id: 'si_edit_importblock_select',
                    style: {
                        margin: '20px',
                    },
                    onchange: function (ev) {
                        let val = this.value;
                        let name = this.innerHTML;
                    },
                    appendTo: container,
                });
                let blButton = Ele("input", {
                    type:'button',
                    id: 'si_edit_importblock_button',
                    style: {
                        margin: '20px',
                    },
                    value:'Import',
                    onclick: function (ev) {
                        let sel = document.getElementById('si_edit_importblock_select');
                        //debugger;
                        SI.Editor.Objects.Blocks.Relate(sel.value);
                    },
                    appendTo: container,
                });
                let options = {};
                options.Data = {
                    Operation: "Retrieve",
                    Entity: {
                        Name: 'blocks',
                    },
                    Columns: "id,name",
                };
                options.Callback = SI.Editor.UI.ImportBlock.PopulateBlocks;
                //debugger;
                SI.Tools.Api.Send(options); 
                return container;
            },
            PopulateBlocks: function(blocks) {
              
                let sel = document.getElementById('si_edit_importblock_select');
                for (let b in blocks) {
                    if (blocks.hasOwnProperty(b) && b !== 'Return') {
                        //debugger;
                        Ele("option", {
                            innerHTML: blocks[b].name,
                            value: '0x' + blocks[b].id,
                            title: '0x' + blocks[b].id,
                            appendTo: sel,
                        });
                    }
                }
            },
        },
        HUD: {
            Window: null,
            Init: function () {
                var obj = {
                    Name: "HUD", Parent: 'si_edit_container', Title: "HUD", StartWidth: '200px', StartHeight: '150px', StartTop:'30%', StartLeft:'1%', Overflow: "hidden", Position: "fixed", "WindowControls": "CLOSE",
                    OnClose: function () {  //sync the cb in settings
                        document.getElementById('si_edit_settings_hudcb').checked = false;
                    }
                };
                SI.Editor.UI.HUD.Window = new SI.Widget.Window(obj);
                SI.Editor.UI.HUD.Draw();
            },
            Draw: function () {
                let container = Ele('div', {
                    style: {
                        width: "100%",
                        height: "100%",
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: SI.Editor.Style.TextColor,
                        fontSize: '10px',
                    },
                });

                Ele('span', {
                    innerHTML: "Mouse X:",
                    appendTo: container,
                });
                Ele('span', {
                    id: 'si_edit_hud_xpos',
                    appendTo: container,
                });
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Mouse Y:",
                    appendTo: container,
                });
                Ele('span', {
                    id: 'si_edit_hud_ypos',
                    appendTo: container,
                });
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Selected Element:",
                    appendTo: container,
                });
                Ele('span', {
                    id: 'si_edit_hud_selectedelement',
                    appendTo: container,
                });

                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Dragging Element:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_draggingelement',
                    appendTo: container,
                });
                //offparent
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Offset Parent:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_offsetparent',
                    appendTo: container,
                });
                //parent elementid
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Parent Id:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_parentid',
                    appendTo: container,
                });
                //offsetX
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Offest X:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_offsetx',
                    appendTo: container,
                });
                //offsetY
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Offset Y:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_offsety',
                    appendTo: container,
                });

                //DropParent
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Drop Parent:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_dropparent',
                    appendTo: container,
                });
                //DropParent
                Ele('br', { appendTo: container });
                Ele('span', {
                    innerHTML: "Editor Is Dragging:",
                    appendTo: container,

                });
                Ele('span', {
                    id: 'si_edit_hud_editisdragging',
                    appendTo: container,
                });

              //  this.dataset.offsetparent = this.offsetParent;
              //  this.dataset.parentid = this.parentElement.id;
              //  this.dataset.mOffX = ev.offsetX;
              //  this.dataset.mOffY = ev.offsetY;


                document.body.addEventListener("mousemove", function (ev) {
                    document.getElementById("si_edit_hud_xpos").innerHTML = ev.pageX;
                    document.getElementById("si_edit_hud_ypos").innerHTML = ev.pageY;
                });

                SI.Editor.UI.HUD.Window.Append(container);
            },
        },
        Phpinfo: {
            Window: null,
            Init: function () {
                    var obj = { Name: "PhpInfo", Parent: 'si_edit_container', Title: "PhpInfo", StartWidth: '990px', StartHeight: '600px' };
                    SI.Editor.UI.Phpinfo.Window = new SI.Widget.Window(obj);
                    SI.Editor.UI.Phpinfo.Draw();
                },
            Draw: function () {
                let container = Ele('div', {
                    innerHTML: `<?php echo Tools::GetPhpInfo() ?>`,
                });
                SI.Editor.UI.Phpinfo.Window.Append(container);
            },
        },
    },
    Objects: {
        Language: {
            Added: function(lang) {               
                //debugger;
                [].forEach.call(document.getElementById('si_edit_lang_availablelangs').options, function (opt) {
                    if (opt.value === lang.langcode) {
                        //debugger;
                        opt.disabled = 'true';
                    }
                })
                let newlang = Ele("option", { innerHTML: lang.name, value: lang.langcode });
                let installedLangs = document.getElementById('si_edit_lang_supportedlangs');
                installedLangs.add(newlang);
                SI.Tools.Select.Sort(installedLangs);
            },
            Draw: function () {
                // var localtext = SI.Editor.Data.Objects.Entities.Definitions.localtext.attributes;
                //Base
                let base = Ele('div', {
                    style: {
                        width: '100%',
                        height: '100%',
                        padding: '20px',
                        background: SI.Editor.Style.BackgroundColor,
                    },

                });
                //top menu
                let menu = Ele('div', {
                    style: {
                        width: '100%',
                        lineHeight: '25px',
                    },
                    appendTo: base,
                });
                //get the current users lang stuff incase they would like to see it
                let mylangs = <?= $myLangs ?>;
                //track the installed languages as they populate 
                let instLangs = [];
                menu.appendChild(Ele('span', {
                    innerHTML: "Detected Languages: ",
                }));
                for (let lang in mylangs) {
                    let comma = (lang != mylangs.length - 1) ? "," : "";
                    menu.appendChild(Ele('span', { innerHTML: mylangs[lang] + comma + " " }));
                }
                menu.appendChild(Ele('br'));
                menu.appendChild(Ele('span', {
                    innerHTML: "Installed Languages: ",
                }));

                let installedLangs = Ele('select', {
                    id: 'si_edit_lang_supportedlangs',
                    innerHTML: "<?= $supportedLanguages ?>",
                    appendTo: menu,
                    onchange: function () {


                    }
                });
                menu.appendChild(Ele('br'));
                menu.appendChild(Ele('span', { innerHTML: " Install a new language: " }));
                let instalableList = Ele('select', {
                    innerHTML: "<?= $langoptions ?>",
                    appendTo: menu,
                    onchange: function () {
                        document.getElementById('si_edit_language_add').innerHTML = 'Add ' + this.options[this.selectedIndex].text;
                    }
                });
                instalableList.innerHTML += "<?= $langoptions ?>";

                SI.Tools.Select.Sort(installedLangs);
                //debugger;
                [].forEach.call(instalableList.options, function (opt) {
                    if (opt.value.length !== 0) {
                        [].forEach.call(installedLangs.options, function (installed) {
                            if (opt.value === installed.value) {
                                opt.disabled = 'true';
                            }
                        })
                    }

                });

                for (let langopt in installedLangs.children) {
                    if (typeof installedLangs[langopt].innerText !== 'undefined') {
                        instLangs.push(installedLangs[langopt].value);
                    }
                }
                SI.Editor.Objects.Language.CurrentInstalled = instLangs;
                let availLang = mylangs.filter(value => instLangs.includes(value))
                if (availLang.length > 0) {
                    SI.Editor.Objects.Language.PerferredInstalledLanguage = availLang[0].toLowerCase();
                }

                menu.appendChild(Ele('span', { innerHTML: "*Irreversible", style: { color: 'red', marginLeft: '20px', marginRight: '20px', }, }));
                menu.appendChild(Ele('button', {
                    id: 'si_edit_language_add',
                    innerHTML: "Add",
                    style: {
                        color: 'red',
                    },
                    onclick: function () {

                        //debugger;

                        sellang = document.getElementById("si_edit_lang_availablelangs");
                        langnode = sellang[sellang.selectedIndex];

                        let obj = {};
                        obj.Data = {};
                        obj.Data.KEY = "AddLanguage";
                        obj.Data.langcode = langnode.value;
                        obj.Data.name = langnode.innerHTML;
                        SI.Editor.Ajax.Run(obj);

                    }
                }));


                let cmLabel = Ele("div", {
                    innerHTML: "Char Map",
                    appendTo: base,
                    style: {
                        margin: '5px 0px 5px 0px',
                    },
                });
                Ele("input", {
                    type: "checkbox",
                    onchange: function (e) {
                        if (SI.Editor.Objects.Language.LastChar === 32) {
                            SI.Editor.Objects.Language.DrawChars(3000);
                        }
                        if (this.checked) {
                            document.getElementById("si_edit_language_charmap").style.display = 'block';
                        } else {
                            document.getElementById("si_edit_language_charmap").style.display = 'none';
                        }
                    },
                    appendTo: cmLabel,
                });

                //Char Map
                let charmap = Ele('div', {
                    id: 'si_edit_language_charmap',
                    style: {
                        padding: '10px',
                        height: '150px',
                        width: '95%',
                        top: '0px',
                        backgroundColor: 'grey',
                        color: 'white',
                        overflowY: 'scroll',
                        overflowX: 'auto',
                        font: '20px/ 40px Arial, Helvetica, sans-serif',
                        display: 'none',
                        letterSpacing: '.5em',
                        cursor: 'pointer',
                    },
                    contentEditable: true,
                    appendTo: base,

                });
                SI.Tools.Text.FingAutoCorrect(charmap);
                charmap.onscroll = function (e) {
                    SI.Editor.Objects.Language.DrawChars(1000);
                };

                //Text Authoring/Editing
                //NEW controls
                let newLabel = Ele("div", {
                    innerHTML: "New: ",
                    style: {
                        display: 'inline-block',
                        margin: '5px 5px 5px 0px',
                    },
                    appendTo: base,
                });
                //New Text start data. a text is started by simply adding text to the field...
                Ele("input", {
                    id: 'si_edit_lang_newtext',
                    placeholder: availLang[0] + " text",
                    data: {
                        language: availLang[0],
                    },
                    appendTo: newLabel,
                });
                //and clicking new.
                Ele("input", {
                    type: "button",
                    value: 'New',
                    style: {
                        marginRight: '20px',
                    },
                    onclick: function (e) {
                        if (this.previousSibling.value.length > 0) {
                            SI.Editor.Objects.Language.New();
                        } else {
                            alert("Add some text first");
                        }
                        this.value = '';
                    },
                    appendTo: newLabel,
                });


                //Existing text selector. since selecting by token would suck we populate the select box with live text in the users language
                //label
                let tsLabel = Ele("div", {
                    innerHTML: "Edit: ",
                    appendTo: base,
                    style: {
                        display: 'inline-block',
                    },
                });
                //On Change function for the selector will swap out all of text boxes contents for that of the text selected
                let LocalChange = function (e) {
                    //debugger;
                    SI.Editor.Objects.Language.Clear();
                    let index = this.selectedIndex-1;
                    //let opt = this.selectedOptions[0];
                    let localtext = SI.Editor.Objects.Language.Current[index];
                    for (let lang in localtext) {
                        if (lang.charAt(0) == '_') {
                            let langbox = document.getElementById('si_edit_lang_box' + lang);
                            if (langbox) {
                                langbox.innerHTML = localtext[lang];
                            }
                        }
                    }
                };
                //Select drop down to select the text currently being edited
                let textselect = Ele('select', {
                    id:'si_edit_lang_textselect',
                    appendTo: tsLabel,
                    onchange: LocalChange,
                });
                //A blank option for the first blaank line
                Ele('option', { innerHTML: '', value: '', appendTo: textselect, });
                //Button to save the currently selected text in that language
                Ele("input", {
                    type: "button",
                    id:'si_edit_lang_save',
                    value: 'Save',
                    onclick: function (e) {
                        //debugger
                        let sel = this.previousSibling;//document.getElementById('si_edit_lang_textselect');
                        let index = sel.selectedIndex;
                        if (index > -1) {
                            let option = sel.options[index];
                            
                            let language = SI.Editor.Objects.Language.CurrentInstalled[this.dataset.index];
                            SI.Editor.Objects.Language.Update(index - 1, language);
                        }
                    },
                    data: {
                        index:0,
                    },
                    appendTo: tsLabel,
                });

                let langtabs =new SI.Widget.Tabs({
                    Width: '90%',
                    Height: '70%',
                    OnChange: function (ele) {
                        let lang = ele.dataset.tabname;
                        let index = ele.dataset.tabnum;
                        ele = document.getElementById('si_edit_lang_save')
                        ele.value = "Save " + lang;
                        ele.dataset.index = index;
                    },
                });
                //debugger;
                let langSync = function (e) {
                    lang = this.id.replace('si_edit_lang_box', '');
                    let index = document.getElementById('si_edit_lang_textselect').selectedIndex - 1;
                    if (index > -1) {
                        let content = this.innerHTML
                        SI.Editor.Objects.Language.Current[index][lang] = content;
                        let tok = SI.Editor.Objects.Language.Current[index].name;
                        //debugger;
                        //if it is the one from our language then update the onscreen text.
                        if ('_'+SI.Editor.Objects.Language.CurrentPreference.toLowerCase().split(',')[0] == lang) {                    
                            SI.Tools.Class.Loop("si-multilingual-" + tok, function (ele) {
                                ele.innerHTML = content;
                            })
                        }
                       
                    }

                }

                for (let langopt in instLangs) {

                    let langbox = Ele('div', {
                        id: 'si_edit_lang_box_' + instLangs[langopt],
                        class: 'si_edit_lang_box',
                        contentEditable: true,
                        style: {
                            minHeight: '500px',
                            width: '100%',
                            color: 'black',
                            backgroundColor: 'silver',
                            padding: '15px',
                        },
                        onkeyup: langSync,
                        onmouseup: langSync,
                    });
                    
                    langtabs.Items.Add(installedLangs[langopt].innerText, langbox);

                }

                //sort to have longest, most specific value first.
                mylangs = mylangs.sort(function (a, b) { //10630766
                    // ASC  -> a.length - b.length
                    // DESC -> b.length - a.length
                    return b.length - a.length;
                });

                let allLocalTexts = SI.Editor.Objects.Language.Current;
                //debugger;
                for (let l in allLocalTexts) {
                    let localTexts = allLocalTexts[l];
                    for (let la in mylangs) {
                        let lan = mylangs[la].toLowerCase();
                        if (typeof SI.Editor.Objects.Language.Current[l]['_' + lan] !== 'undefined') {
                            let text = SI.Editor.Objects.Language.Current[l]['_' + lan];
                            if (text && text.length > 0) {
                                if (text.length > 32) {
                                    text = text.substr(0, 32) + "\u2026";  //18146354
                                }
                                let guid = '0x' + SI.Editor.Objects.Language.Current[l].id;
                                let token = SI.Editor.Objects.Language.Current[l].name;
                                Ele('option', {
                                    innerHTML: text,
                                    value: guid,
                                    data: {
                                        token: token,
                                        lang: lan,
                                    },
                                    appendTo: textselect,
                                });
                                break;
                            }
                        }
                    }
                }
                base.appendChild(langtabs.Draw());
                SI.Editor.UI.Language.Window.Append(base);
            },
            Created: function(response) {
                //debugger;
                if (response['language'] && response['text'] && response['id'] && response['token']) {
                    let language = response['language'].replace('_', '');
                    let ts = document.getElementById('si_edit_lang_textselect');
                    let text = response['text'];
                    if (text.length > 32) {
                        text = text.substr(0, 32) + "\u2026";  //18146354
                    }


                    let opt = Ele('option', {
                        innerHTML: text,
                        value: response['id'],
                        data: {
                            token: response['token'],
                            lang: language,
                        },
                    });
                    ts.options.add(opt);


                    let langbox = document.getElementById('si_edit_lang_box_' + language);
                    if (langbox) {
                        langbox.innerHTML = response['text'];
                    }


                    let item = {
                        createdon: new Date().toISOString().slice(0, 19).replace('T', ' '),
                        entity_id: SI.Editor.Data.Objects.Entities.Definitions.localtext.instanceguid,//dont need this but its in entities
                        id: response['id'],
                        modifiedon: null,
                        name: response['token'],
                        options: {},
                        status: "active",
                    }
                    for (let l in SI.Editor.Objects.Language.CurrentInstalled) {
                        //debugger;
                        let lan = '_'+SI.Editor.Objects.Language.CurrentInstalled[l];
                        if (lan == response['language']) {
                            item[lan] = response['text'];
                        }
                        else {
                            item[lan] = null;
                        }
                    }
                    SI.Editor.Objects.Language.Current.push(item);
                }
            },
            Current: <?= $localtexts ?>,
            CurrentPreference: "<?= SI_LANGS ?>",
            PerferredInstalledLanguage: "",
            CurrentInstalled:[],
            LastChar: 32,
            DrawChars: function(quant) {
                 //debugger;

                this.copyChar = function (self) { alert("poof"); }
                let last = SI.Editor.Objects.Language.LastChar;
                if (last < 300000) {   //71000
                    if (typeof quant === 'undefined') {
                        quant = 100;
                    }
                    quant += last;
                    let charMap = document.getElementById('si_edit_language_charmap');
                    let chars = "";
                    for (let i = last; i < quant; i++) {
                        //let char = String.fromCharCode(i);
                        let char = " &#" + i + "; ";
                        if (char.length) {
                            chars += char;
                        }
                    }
                    charMap.innerHTML += chars;
                    SI.Editor.Objects.Language.LastChar += chars.length; 
                }
            },
            New: function() {
                //debugger;
                this.Clear();
                let localtxt = document.getElementById('si_edit_lang_newtext');
                let lang = localtxt.dataset.language;
                let text = localtxt.value;

                let options = {
                    Data: {
                        KEY: "LocaltextNew",
                        language: lang,
                        text:text,
                    }
                }

                SI.Editor.Ajax.Run(options);
            },
            Clear: function() {
                SI.Tools.Class.Loop("si_edit_lang_box", function (ele) { ele.clear(); });
            },
            Update: function(langindex, lang) {
                if (SI.Editor.Objects.Language.Current[langindex]) {
                    let localtext = SI.Editor.Objects.Language.Current[langindex];
                    //debugger;
                    if (localtext.id.length == 32) {
                        localtext.id = '0x' + localtext.id;
                    }
                    let options = {
                        Data: {
                            KEY: "UpdateLocaltext",
                            id: localtext.id,
                            language: lang,
                            text: localtext['_'+lang],
                        }
                    }
                    SI.Editor.Ajax.Run(options);
                }
            },
        },
        Widgets: {
            List: function() {
                let widgets = ["Window"]

            },
        },
        Alerts: {
            StaticMove:"The element\'s positioning is static thus it cannot be moved. To move the element, first change the css position property",
        }
    },
    Ajax: {
        Run: function(options) {
            this.Defaults = {
                "Url": "/delegate-admin.php",
                "ContentType": "application/json",
                "Method": "POST",
                "Async": true,
                "Data": {},
            }
            options = SI.Tools.Object.SetDefaults(options, this.Defaults);
            var ajax = new XMLHttpRequest();
            ajax.open(options.Method, options.Url, options.Async);
            ajax.setRequestHeader("Content-Type", options.ContentType);
            ajax.onreadystatechange = function () {
                if (ajax.readyState === 4 && ajax.status === 200) {
                      //debugger;
                    try {
                        if (ajax.responseText != null && ajax.responseText.length > 0) {
                           // console.log(ajax.responseText);
                            json = JSON.parse(ajax.responseText.trim());
                            SI.Editor.Ajax.Complete(json,options);
                        }
                    } catch (ex) {
                        console.error(ajax.responseText);
                        console.error(ex);
                        //  document.body.appendText(xhr.responseText);
                    }

                }
            };
            var stringdata = JSON.stringify(options.Data);
            //debugger;
            ajax.send(stringdata);
        },
        Complete: function (json,options) {
           
            for (let prop in json) {
                if (json.hasOwnProperty(prop)) {
                    let value = json[prop];
                    switch (prop) {
                        case "CREATEELEMENT": alert(" just hit: SI.Editor.Data.Tools.CreateEditorElement(prop); ");
                        case "EXCEPTION": alert(JSON.stringify(value)); break;
                        case "REFRESH": location.reload(); break;
                        case "CONSOLELOG": console.log(value); break;
                        //
                        case "PAGECREATED": SI.Editor.Objects.Page.Created(value); break;
                        case "PAGESAVED": SI.Editor.Objects.Page.Saved(value); break;
                        //Blocks
                        case "BLOCKRELATED": SI.Editor.Objects.Blocks.Created(value); break;
                        case "BLOCKSAVED": SI.Editor.Objects.Blocks.Saved(value); break; 
                        case "BLOCKREMOVED": console.log(value); break; 

                        //Common
                        case "PROMOTED": SI.Editor.Data.Objects.Deployment.Promoted(value, options); break;

                        //Media
                        case "FILEPROMOTED": let media = new SI.Editor.Objects.Media(); media.Promoted(value); break;
                        //Language
                        case 'ADDEDLANGUAGE': SI.Editor.Objects.Language.Added(value); break;
                        case 'NEWLOCALTEXT': SI.Editor.Objects.Language.Created(value); break;
                        //User
                        case 'USERCREATED': SI.Editor.Objects.User.Created(value); break;
                        case 'RETRIEVEDROLES': SI.Editor.Objects.User.SetRoles(value); break;
                        case 'UPDATEDROLES': SI.Editor.Objects.User.UpdatedRoles(value); break;
                        //Plugins
                        case 'MOREPLUGINS': SI.Editor.Objects.Plugins.Repo.StockFetchedPlugins(value); break;
                        case 'DOWNLOADEDPLUGIN': SI.Editor.Objects.Plugins.Repo.DownloadedPlugin(value); break;
                        case 'INSTALLPLUGIN': SI.Editor.Objects.Plugins.Local.Installed(value); break;
                        case 'INSTALLPLUGINFAILED': alert('Plugin install has failed'); break;
                        case 'UNINSTALLPLUGIN': SI.Editor.Objects.Plugins.Local.Uninstalled(value); break;
                        case 'UNINSTALLPLUGINFAILED': alert('Plugin removal has failed'); break;
                        //Settings
                        case 'SETTINGCREATED': SI.Editor.Objects.Settings.Created(value); break;
                        case 'SETTINGDELETED': SI.Editor.Objects.Settings.Deleted(value); break;
                        //Security
                        case 'ROLEDELETED': SI.Editor.Objects.Security.Deleted(value); break;
                        case 'ROLEDELETED': SI.Editor.Objects.Security.Created(value); break;
                    }
                }
            }
            //console.log(json);
        } 
    }
}
SI.Editor.Run();

<?php 
}  //End the above if admin security role  
?>
