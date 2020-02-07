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

    //Get all the relations 
    $settingsentities = new Entity('settings');
    $settings = $settingsentities->Retrieve('settingname,settingvalue');
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
        'Audio': ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/midi', 'audio/ogg', 'audio/flac','audio/webm'],
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


    $dataage = "html_elements: $htmlElementsAge,
            html_attributes: $htmlAttributesAge,
            css_properties: $cssPropertiesAge,
            js_methods : $jsMethodsAge,
            php_methods : $phpMethodsAge,
            sql_methods : $sqlMethodsAge, ";
    //echo $dataage;

    $entities =  $_SESSION['SI']['domains'][SI_DOMAIN_NAME]['businessunits'][SI_BUSINESSUNIT_NAME]['entities'];
    $entityInfo = json_encode($entities);
    $entityData = array();
    $recordCount = count($entities);
    $entityJson = "";


?> 

if (!SI) {
    var SI = {};
}

SI.Editor = {
    Style: {

        BackgroundColor: 'rgb(72, 75, 87)',
        TextColor: 'rgb(172, 175, 187)',
        MenuColor: 'slategrey',
        ButtonColor: '#9A9',
        DraggerColor: '#99A',
        FontFace: 'Roboto',
        SetTheme: function () {
            let theme = SI.Tools.Color.GetTheme();
            if (theme === 'dark') {
                SI.Editor.Style.BackgroundColor = 'rgb(72, 75, 87)';
                SI.Editor.Style.TextColor= 'rgb(172, 175, 187)';
                SI.Editor.Style.MenuColor= 'slategrey';
                SI.Editor.Style.ButtonColor= '#9A9';
                SI.Editor.Style.DraggerColor= '#99A';
            }
            else if (theme === 'light') {
                SI.Editor.Style.BackgroundColor = '#AAA';
                SI.Editor.Style.TextColor = '#111';
                SI.Editor.Style.MenuColor = '#777';
                SI.Editor.Style.ButtonColor = '#345';
                SI.Editor.Style.DraggerColor = '#234';
            }
        }
    },
    Run: function () {
      //  let t0 = performance.now(); //how long does the editor take to load?
        console.time('EditorLoadTime');
        SI.Editor.Code.Init(); 
        //wait for all the code to load before continuing. 
        var starttimmer = setInterval(function () {
            if (SI.Editor.Code.loaded) {
                clearInterval(starttimmer);
                SI.Editor.Style.SetTheme();
                SI.Editor.Objects.Elements.Init();
                SI.Editor.UI.Init();


            }
        }, 50);
        console.timeEnd('EditorLoadTime');
        console.log(window.Editor);
       // setTimeout(function () { SI.Editor.Ajax.PostSetup.Go() }, 1000);
    },
    //SI.Editor.Code object stores all needed to maintain the 5 semantics that will be supported. html,css,js,php,sql
    Code: {
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
        DataLists: {
            HtmlElementDataList: null,
            HtmlAttributeDataList: null,
            CssPropertiesDataList: null,
            JsMethodsDataList: null,
            PhpMethodsDatalist: null,
            SqlMethodsDataList: null, 
            AcceptedMimeTypes: <?=$mimes ?>,
            AdminData:<?=$sessionPageData?>,
        },
        Init: function () {
            var codes = ["html_elements", "html_attributes", "css_properties", "js_methods", "php_methods", "sql_methods"];
            let loadedcount = 0;
            codes.forEach(function (codetype) {
                //debugger;
                //get the lastest and greatest date
                let lastmoddate = codetype + "_last_modified";
                let timestamp = localStorage.getItem(lastmoddate);   

                let jsonstring = localStorage.getItem(codetype);

                if ( timestamp === "undefined" || (SI.Editor.Code.DataAge[codetype] != null && timestamp <= SI.Editor.Code.DataAge[codetype] && jsonstring === null)  ) {
                    var request = new XMLHttpRequest();
                    try {
                        request.onreadystatechange = function () {
                            if (this.readyState == 4 && this.status == 200) {
                                if (request.responseText.length > 0) {
                                    SI.Tools.Storage.OverwriteStorage(codetype, request.responseText);
                                    SI.Tools.Storage.OverwriteStorage(codetype + "_last_modified", SI.Editor.Code.DataAge[codetype]);
                                    SI.Editor.Code[codetype] = JSON.parse(request.responseText);
                                    loadedcount++;
                                    if (loadedcount == codes.length) {
                                        SI.Editor.Code.loaded = true;
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
                    //    console.log(jsonstring);
                        try {
                            SI.Editor.Code[codetype] = JSON.parse(jsonstring);
                            loadedcount++;
                            if (loadedcount == codes.length) {       
                                SI.Editor.Code.loaded = true;
                            }
                        } catch (ex) {
                            console.warn(ex);                           
                        }
                        
                    }
                }
            });

            SI.Editor.Code.Tools.SupplementData();
        },
        OptionSets: {
            HTML: {
              Elements:{}
            },
            CSS:{
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
        },
        User: {
            HelpLinks: <?= $helplinks ?>,
        },
        Tools: {

            ClearSelection: function () {
                if (document.selection && document.selection.empty) {
                    document.selection.empty();
                } else if (window.getSelection) {
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                }
            },
            CreateEditorElement: function (prop) {
                alert("TODO Make create emelent work");
                // this will be simple. we will have a json object the same as sent to Ele() but also having a tag attribute. 
                // we remove the tag attribute into a varibable, then pass the two remaining to the Ele funcition. simple.  
            },
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
                for (let i in SI.Editor.Code.css_properties) {
                    let group = SI.Editor.Code.css_properties[i];
                    for (let j in group) {
                        if (group[j].n === name) {
                            SI.Editor.Code.css_properties[i][j].group = i;
                            SI.Editor.Code.css_properties[i][j].index = j;
                            return SI.Editor.Code.css_properties[i][j];
                        }
                    }
                }
            },
            //GetAttributesByName returns the first instance of the attribute. there are several listed under multiple divs. they are not guaranteed unless a group is specified
            GetAttributeByName: function (name, group=null) {
                for (let i in SI.Editor.Code.html_attributes) {
                    let curgroup = SI.Editor.Code.html_attributes[i];
                    if (curgroup == group || group == null) {
                        for (let j in curgroup) {
                            debugger;
                            if (curgroup[j].s === name) {
                                //debugger;
                                SI.Editor.Code.html_attributes[i][j].curgroup = i;
                                SI.Editor.Code.html_attributes[i][j].index = j;
                                return SI.Editor.Code.html_attributes[i][j];
                            }
                        }
                    }
                }
            },
            BuildDataLists: function () {
                //debugger;
                if (SI.Editor.UI.Container != null) {
                    if (SI.Editor.Code.html_elements) {
                        htmlTagDataList = document.createElement('datalist');
                        htmlTagDataList.id = "html-elements-datalist";
                        SI.Editor.UI.Container.append(htmlTagDataList);
                    }
                }
            },
            SupplementData: function () {
                let SetEntityLists = function () {
                    let info = SI.Editor.Objects.Entity.Info;
                    let notallowednames = SI.Editor.Objects.Entity.Lists.NotAllowedNames;
                    let entkey = {}
                    for (ent in info) {
                        entdata = info[ent]
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
                    SI.Editor.Objects.Entity.Lists.FwdRevLookup = entkey;
                    SI.Editor.Objects.Entity.Lists.NotAllowedNames = notallowednames;
                };
                //the relations data is nothign but guids. lets try to make this more readable and useable
                let SupplementRelationsData = function () {  
                    let relations = SI.Editor.Objects.Entity.Relationships;
                    let lookup = SI.Editor.Objects.Entity.Lists.FwdRevLookup;
                    for (r in relations) {
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
                //run our functions
                SetEntityLists();
                SupplementRelationsData();//dependent on the function above it to have run.

            },
        },
    },
    "UI": {
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
        SetDocumentEvents: function() {
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
                //To google. I really wish this worked.
                //debugger;
                ev.preventDefault();
                let list = '';
                let blocks = SI.Editor.Objects.Block;
                for (name of blocks.Names) {
                    if (blocks.Current[name].IsDirty) {
                        list += name + ", ";
                    }
                }
                if (list != '') {
                    //return ev.returnValue = 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                    return 'There are unsaved changes in blocks: ' + list + '. Leave now?';
                }
            };

            var map = {}; // You could also use an array  so-5203407
            onkeydown = onkeyup = function (e) {
                var selected = SI.Editor.Objects.Elements.Selected;
                var isFocused = (document.activeElement === selected);      //so-36430561

                var movable = true;
                if (selected) {
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
                        for (var i = 0; i < winds.length; i++) {
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
                } else {
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
                let tabs = SI.Widgets.Tabs();
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

                let box = Ele('div', {
                    innerHTML: "Widgets",
                    style: {
                        backgroundImage: "url('/editor/media/images/underconstruction.png')",
                        backgroundSize: "contain",
                        width: '100%',
                        height:'100%',
                    },
                    
                });


                return box;
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
                
                for (let group in SI.Editor.Code.html_elements) {
                    if (SI.Editor.Code.html_elements.hasOwnProperty(group)) {
                        let tagbox = Ele('div', { innerHTML : group });
                        let tagtable = Ele('table', {
                            style:{backgroundColor: SI.Editor.Style.BackgroundColor, width:'100%'}
                        });
                        //debugger;
                        let tagGroup = SI.Editor.Code.html_elements[group]; 

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
                                                SI.Editor.Code.Objects.Blocks[block].IsDirty = true;
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

                var tabs = new SI.Widgets.Tabs({ Height: '100%' });
                tabs.Items.Add('Main', SI.Editor.UI.EditPanel.DrawMain());
                tabs.Items.Add('Attributes', SI.Editor.UI.EditPanel.DrawAttributes());
                tabs.Items.Add('Styles', SI.Editor.UI.EditPanel.DrawStyles());

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
                let mylang = <?= $myLangs ?>;
                //not that easy
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
                                    for (lang of mylang) {
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
                    for (lang of mylang) {
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
                SI.Editor.UI.EditPanel.DrawUserShortcuts(maintable);
                return container
            },
            UserShortcuts:<?= $quickmenuitems ?>,
            DrawUserShortcuts: function(maintable) {
                maintable.innerHTML = "";
                let sc = SI.Editor.UI.EditPanel.UserShortcuts;
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

                for (let group in SI.Editor.Code.html_attributes) {
                    //           console.log(eletype + "  " + prop);
                    if (SI.Editor.Code.html_attributes.hasOwnProperty(group)) {

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
                        for (let attribute in SI.Editor.Code.html_attributes[group]) {
                            if (SI.Editor.Code.html_attributes[group].hasOwnProperty(attribute)) {
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
                for (let group in SI.Editor.Code.css_properties) {
                    if (SI.Editor.Code.css_properties.hasOwnProperty(group)) {

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
                            for (let css in SI.Editor.Code.css_properties[group]) {
                                if (SI.Editor.Code.css_properties[group].hasOwnProperty(css)) {
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

            //When a element is selected, update ALL the Attributes and styles UIs to reflect the elements values.
            SetSelectedElementValues: function (element) {
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
                for (var i = 0; i < element.attributes.length; i++) {
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
                        for (var j = 0; j < children.length; j++) {
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
                        ele.value = "";
                    });
                },
                Styles: function () {
                   SI.Tools.Class.Loop("si-edit-style", function (ele) {
                        ele.value = "";
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
                var obj = { Name: "Page", ParentId: "si_edit_container",  Title: "Page", Width: '800px', Height: '600px' };
                SI.Editor.UI.Page.Window = new SI.Widgets.Window(obj);
                SI.Editor.UI.Page.Draw();
            },
            Draw: function () {
                SI.Editor.UI.BlockTemplates.Init();
                SI.Editor.UI.ImportBlock.Init();

                let base = Ele('div', {
                    style: {
                        width : '100%',
                        height : '100%',
                        backgroundColor : "teal",
                        overflowY : 'scroll',
                    }

                });

                let sub =SI.Tools.GetSubdomain();
                let dir =SI.Tools.GetPathDirectory();
             
                //Path Section
                let pageContainer = Ele('section', {
                    innerHTML: 'Page',
                    style: {
                        backgroundColor: 'black',
                        color: SI.Editor.Style.TextColor,
                        margin: '7px',
                        padding: '6px',
                    },
                    appendTo: base,
                });

                //
                //Save Page Button
                //
                let dirSave = Ele('button', {
                    appendTo: pageContainer,
                    style: {
                        width: '20px',
                        height: '20px',
                        float:'right',
                        backgroundImage: "url('/editor/media/icons/save.png')",
                        backgroundSize: 'cover'
                    },
                    title: "Save the Page",
                    //SAVE THE PAGE HERE
                    onclick: function () {
                        SI.Editor.Objects.Page.Save();
                    }

                });

                let pathFieldset = Ele("fieldset", {
                    style: {
                        margin: '6px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        width: "95%",
                        display: 'block',
                        borderRadius: '10px',
                    },
                    appendTo: pageContainer,
                    append: Ele("legend", { innerHTML: "Path" }),
                });

                let pathTable = Ele("table", {
                    style: {
                        margin: '6px',
                        padding: '3px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        width:'99%',
                    },
                    appendTo: pathFieldset,
                }); 
                
                let pathHeaderRow = Ele('tr', { appendTo: pathTable, style: { color: SI.Editor.Style.TextColor }, });
                let subHeader = Ele('th', { innerHTML: "Business Unit", appendTo: pathHeaderRow, userSelect:'none' });
                let domainHeader = Ele('th', { innerHTML: "Domain", appendTo: pathHeaderRow, userSelect:'none' });
                let pageHeader = Ele('th', { innerHTML: "Directory", appendTo: pathHeaderRow, userSelect:'none' });
                let spaceHeader = Ele('th', { appendTo: pathHeaderRow });
                let pathDataRow = Ele('tr', { appendTo: pathTable });
                let subData = Ele('td', {appendTo: pathDataRow});
                let subInput = Ele('input', { readOnly: true, value: sub, appendTo: subData, style: { width: '95%', backgroundColor: '#aababc' } });
                let domainData = Ele('td', { innerHTML: '. ', appendTo: pathDataRow });
                let domainInput = Ele('input', { readOnly: true, value: document.domain, appendTo: domainData, style: { width: '90%', backgroundColor: '#aababc' } })
                let dirData = Ele('td', { innerHTML: '/ ', appendTo: pathDataRow });
                let dirInput = Ele('input', { id: 'si_page_directory_field', data: {name:dir}, style: { width: '90%' }, value: dir, appendTo: dirData })
                let saveBtn = Ele('td', { appendTo: pathDataRow });

                //Redirect
                let pageredirectrow = Ele('tr', { appendTo: pathTable });


                let pageredirectto = Ele('td', {
                    style: {
                        paddingTop: '15px',
                    },
                    colSpan: 4,
                    appendTo: pageredirectrow,
                });
                let redirectLuLbl = Ele('label', { for: 'si_edit_page_redirectlu', appendTo: pageredirectto, innerHTML: "Redirect To: ", });
                let redirectLu = Ele('input', {
                    id: "si_edit_page_redirectlu",
                    type: "lookup",
                    appendTo: pageredirectto,
                    enabled: 'false',
                    data: {
                        type: "pages",
                        column: 'path'
                    }, style: {
                        width:'300px',
                    }
                });
                redirectLu.addEventListener('change', 
                    function () {
                        if (this.value != "LOOK IT UP!") {
                            if (confirm('If you redirect this page, you will only be able to remove the redirect from the Site tool. Are you sure you want to redirect it?')) {
                            } else {
                                this.value = null;
                            }
                        }
                    },
                    false);

                //End Path Section

                //Meta Section
                let bodyFieldset = Ele("fieldset", {
                    style: {
                        margin: '6px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        width: "95%",
                        display: 'block',
                        borderRadius: '10px',
                    },
                    appendTo: pageContainer,
                    append: Ele("legend", { innerHTML: "Meta Tags" }),
                });

                let metaTable = Ele("table", {
                    style: {
                        margin: '6px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        width: "99%",
                    },
                    appendTo: bodyFieldset,
                });

                let metaPageTitleRow = Ele('tr', { appendTo: metaTable, style: { color: SI.Editor.Style.TextColor }, });
                let metaPageTitle = Ele('td', { innerHTML: "Title", appendTo: metaPageTitleRow, style: { width: '150px' } });
                let metaPageTitleCell = Ele('td', { appendTo: metaPageTitleRow });
                let cleantitle = document.title.replace("dev - ", "");
                let metaPageTitleInput = Ele('input', {
                    placeholder: "The Page Title that appears in the tab",
                    value: cleantitle,
                    appendTo: metaPageTitleCell,
                    style: {
                        width: '97%',
                    },
                    onkeyup: function (e) {
                        var title = document.getElementById('si_pagetitle');
                        title.innerHTML = this.value.replace("dev - ", '');
                    },
                });
                //Favicon
                //debugger;
                var nodeList = document.getElementsByTagName("link");
                var favicon = null;
                for (var i = 0; i < nodeList.length; i++) {
                    if ((nodeList[i].getAttribute("rel") == "icon") || (nodeList[i].getAttribute("rel") == "shortcut icon")) {
                        favicon = nodeList[i].getAttribute("href");
                        break;
                    }
                }
                if (favicon) {
                    favicon = favicon.replace("media/images/dev_", '');
                }
                

                let metaPageIconRow = Ele('tr', { appendTo: metaTable, style: { color: SI.Editor.Style.TextColor }, });
                let metaPageIcon = Ele('td', { innerHTML: "Favicon", appendTo: metaPageIconRow });
                let metaPageIconLookupCell = Ele('td', {appendTo: metaPageIconRow });
                let metaPageIconLookup = Ele('input', {
                    type: "lookup",
                    data: { type: "media", column: 'path' },
                    placeholder: "Temp",
                    value: favicon,
                    appendTo: metaPageIconLookupCell,
                    style: {
                        width: '97%',
                    },
                    onkeyup: function (e)
                    {
                        //debugger;
                        var icon = document.getElementById('si_favicon');
                        pathonly = icon.href.substring(0, icon.href.lastIndexOf("dev_"))+"dev_";
                        icon.href = pathonly+this.value;
                    },
                });

                nodeList = document.getElementsByTagName("meta");
                var charset;
                for (var i = 0; i < nodeList.length; i++) {
                    if ((nodeList[i].getAttribute("charset") !=null)) {
                        charset = nodeList[i].getAttribute("charset");
                        break;
                    }
                }

                let metaPageCharsetRow = Ele('tr', { appendTo: metaTable, style: { color: SI.Editor.Style.TextColor }, });
                let metaPageCharset = Ele('td', { innerHTML: "Charset", appendTo: metaPageCharsetRow });
                let metaPageCharsetLookupCell = Ele('td', { appendTo: metaPageCharsetRow });

                let metaPageCharsetLookup = Ele('input', {
                    placeholder: "utf-8",
                    value: charset,
                    list: "si_datalist_charsets",
                    appendTo: metaPageCharsetLookupCell,
                    style: {
                        width: '97%',
                    },
                    onkeyup: function (e) {
                        var meta = document.getElementById('si_meta_charset');
                        meta.setAttribute("charset", this.value);
                    },
                });

                //More or Less link
                let metaPageMoreRow = Ele('tr', { appendTo: metaTable, style: { color: SI.Editor.Style.TextColor }, });
                let metaPageMore = Ele('th', {
                    innerHTML: "more",
                    id: 'si_moremetatoggle',
                    appendTo: metaPageMoreRow,
                    colspan:'1',
                    style: {
                        color: SI.Editor.Style.TextColor,
                        fontSize: 'x-small',
                        cursor: 'pointer',
                        backgroundColor: '#333',
                        borderStyle: 'inset',
                        borderRadius: '8px',
                        borderColor: 'navy',
                    },
                    onclick: function () {
                        metafieldfix = document.getElementsByClassName("si-editor-page-metainput");
                        for (let i = 0; i < metafieldfix.length; i++) {
                            if (this.innerHTML == "more") {
                                metafieldfix[i].style.display = 'table-row';
                            } else {
                                metafieldfix[i].style.display = 'none';
                            }
                        }
                        if (this.innerHTML == "more") {
                            this.innerHTML = 'less';
                        } else {
                            this.innerHTML = 'more';
                        }
                    },
                });
                //loop meta items so that they are all controlable
                //debugger;
                let metaPageMoreMetaRow = Ele('tr', { id: 'si_moremetabox', appendTo: metaTable, colspan:2, style: { color: SI.Editor.Style.TextColor }, });
                
                // let metaitems = { 'description': 'Page Description', 'keywords': 'Website builder cms', 'author': 'You!', 'viewport': 'width=device-width, initial-scale=1' };
                let metaitems = {  };
                let metas = document.getElementsByTagName('meta');
                //debugger;
                for (let i = 0; i < metas.length; i++) {
                    let name = null;
                    if (metas[i].getAttribute('name') != null && metas[i].getAttribute('name').length > 0 ) {
                        metaitems[metas[i].getAttribute('name')] = metas[i].getAttribute('content') ;
                    }
                    else if (metas[i].getAttribute('httpEquiv') !== "undefined") {
                    //debugger;
                        metaitems[metas[i].getAttribute('http-equiv')] = metas[i].getAttribute('content');
                    }
                }
                
                for (item in metaitems) {
                    if (item != 'null') {
                        let currentMetaValue = '';

                        for (let i = 0; i < metas.length; i++) {
                            if (metas[i].getAttribute('name') === item) {
                                currentMetaValue = metas[i].getAttribute('content');
                                break;
                            }
                        }

                        let metaRow = Ele('tr', { appendTo: metaTable, class: "si-editor-page-metainput", style: { color: SI.Editor.Style.TextColor, display: 'none' }, });
                        let metaName = Ele('td', {
                            innerHTML: item,
                            style: {
                                width: '100px',

                            },
                            appendTo: metaRow
                        });
                        let metaInput = Ele('input', {
                            placeholder: currentMetaValue,
                            id: "si_meta_" + item.replace(/-/g, '_'),
                            value: currentMetaValue,
                            style: {
                                width: '97%',
                            },
                            onchange: function (e) {
                                let name = this.id.replace('si_meta_', '').replace(/_/g, '-');
                                let metas = Q('meta');
                                for (let i in metas) {
                                    let meta = metas[i];
                                    if (meta.name != null && meta.name === name) {
                                        meta.content = this.value;
                                        break;
                                    } else if (meta.httpEquiv != null && meta.httpEquiv === name) {
                                        meta.content = this.value;
                                    }
                                }
                            }
                        });
                        let metainputCell = Ele('td', {
                            style: {
                            },
                            append: metaInput,
                            appendTo: metaRow
                        });
                    }

                }
  

               // let metaPageMoreMetaBox = Ele('td', { append: metaMoreTable, appendTo: metaPageMoreMetaRow, style: {} });


                var bodyStyleEle = document.getElementById("si_bodystyle");
                if (bodyStyleEle) {
                    var bodystyle = bodyStyleEle.innerHTML;
                    //Body Styles
                    let bodyTable = Ele("fieldset", {
                        style: {
                            margin: '6px',
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                            width: "95%",
                            display: 'block',
                            borderRadius: '10px',
                        },
                        appendTo: pageContainer,
                        append: Ele("legend", { innerHTML: "Body Style" }),
                    });

                    bodystyle = "{\"" + bodystyle.replace("body {", "").replace(/:/g, '":"').replace(/;/g, '","').replace(',"}', '}');
                    bodystyle = JSON.parse(bodystyle);

                    let tablebox = Ele("div", {
                        style: {
                            display:'flex',
                        },
                        appendTo: bodyTable,
                    })
                    let leftTable = Ele("table", {
                        style: {
                            display: 'inline-block',
                        },
                        appendTo: tablebox,
                    });
                    let rightTable = Ele("table", {
                        style: {
                            float: 'right',
                        },
                        appendTo: tablebox,

                    });

                    let onleft = true;
                    //this would be better with a bunch of inline blocks
                    for (item in bodystyle) {
                        //debugger;
                        //let style = SI.Editor.Code.Tools.GetStyleByName(item);
                        let styleobj = {
                            "Property": item,
                            "Effected": 'body',
                            "InitialValue": bodystyle[item],
                            "InputId": 'si_page_body_style_' +SI.Tools.CssProp2JsKey(item),
                            "AccessClass": "si-editor-page-bodystyle"
                        };

                        let stylerow = SI.Editor.Objects.Elements.Styles.Widget(styleobj);// "Group": style.group, "Index": style.index, "Effect": 'body' });
                        if (stylerow != null) {
                            if (onleft) {
                                leftTable.appendChild(stylerow);
                            } else {
                                rightTable.appendChild(stylerow);
                            }
                            onleft = !onleft;
                        }
                    }
                }

                //Page Deployment
                if (document.body.dataset.guid != null && document.body.dataset.guid.length === 34) {
                    let pageid = document.body.dataset.guid;
                    let deployment = Ele("fieldset", {
                        style: {
                            margin: '6px',
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                            width: "95%",
                            display: 'block',
                            borderRadius: '10px',
                        },
                        appendTo: pageContainer,
                        append: Ele("legend", { innerHTML: "Deployment" }),
                    });

                    let dFields = { "options": "pages" };

                    for (df in dFields) {
                        if (dFields.hasOwnProperty(df)) {
                            //debugger;
                            let dField = df;
                            let dEnt = dFields[df];
                            let deployoptions = { EntityName: dEnt, EntityId: pageid, Attribute: dField };
                            deployment.appendChild(SI.Editor.Objects.Deployment.UI(deployoptions));
                        }
                    }
                }


                //BLOCKS Initially created here:
                let blocklib = Ele('section', {
                    id:"si_editor_page_block_container",
                    style: {
                        backgroundColor : 'black',
                        width : '96.5%',
                        padding : '6px',
                        margin : '7px',
                    },
                    onclick: function (e) { SI.Editor.Objects.Blocks.Select(); },
                    onmouseenter: function () {
                        SI.Editor.Objects.Blocks.Reorder();
                    }
                });


                base.appendChild(blocklib);

                SI.Editor.UI.Page.Window.Append(base);


                let blocklabel = Ele('span', {
                    innerHTML : "Blocks",
                    style:{
                        color : SI.Editor.Style.TextColor,
                    },
                    appendTo: blocklib,
                });

 
                //
                //New Block Button
                //
                let newblockbutton = Ele('button', {
                    appendTo: blocklib,
                    style: {
                        width: '20px',
                        height: '20px',
                        float: 'right',
                        backgroundImage: "url('/editor/media/icons/new-block-btn.png')",
                        backgroundSize: 'cover'
                    },
                    title: "New Block",         
                    onclick: function (ev) {
                        let newBlockName = prompt("Please enter a unique name for the Block : ", "");
                        if (newBlockName != null) {
                            var potentialId =SI.Tools.RegEx.Fix("OkId", newBlockName);
                            if (document.getElementById("si_bid_" + potentialId) == null) {
                                SI.Editor.Objects.Blocks.New(newBlockName);
                            } else {
                                alert("That Blockname is already in use on this page.");
                            }

                        }
                    },

                });

                //
                //Import Block Button
                //
                let blockImportLabel = Ele('button', {
                    appendTo: blocklib,
                    style: {
                        width: '20px',
                        height: '20px',
                        float: 'right',
                        backgroundImage: "url('/editor/media/icons/import.png')",
                        backgroundSize: 'cover'
                    },
                    title: "Import Existing Block",
                    onclick: function (e) {

                        SI.Editor.UI.ImportBlock.Window.SetPosition(e.pageY+25, e.pageX-250);
                        SI.Editor.UI.ImportBlock.Window.Show();
                    }

                });

                //
                //Block Template Button
                //
                let blockTemplateLabel = Ele('button', {
                    appendTo: blocklib,
                    style: {
                        width: '20px',
                        height: '20px',
                        float: 'right',
                        backgroundImage: "url('/editor/media/icons/page-template-btn.png')",
                        backgroundSize: 'cover'
                    },
                    title: "Block Template Library",
                    onclick: function () {
                        SI.Editor.UI.BlockTemplates.Window.Show();
                    }

                });


                let blockstablebox = Ele("div", {
                    appendTo: blocklib,
                })
                let leftBlockTable = Ele("table", {
                    style: {
                        display: 'inline-block',
                    },
                    appendTo: blockstablebox,
                });
                let rightBlockTable = Ele("table", {
                    style: {
                        float: 'right',
                    },
                    appendTo: blockstablebox,

                });

                let onleft = true;

                //Build the block library
                //debugger;
                for (let key in SI.Editor.Code.Objects.Blocks) {
                    if (SI.Editor.Code.Objects.Blocks.hasOwnProperty(key)) {
                        if (typeof (SI.Editor.Objects.Blocks.Names[key]) == "undefined") {
                            SI.Editor.Objects.Blocks.Names.push(key);
                            //debugger;
                            blocklib.appendChild(SI.Editor.Objects.Blocks.UI(key, SI.Editor.Code.Objects.Blocks[key]));
                        }
                    }
                }

            //    base.appendChild(blocklib);

            //    SI.Editor.UI.Page.Window.Append(base);
            },
        },
        Media: {
            Window: null,
            Init: function () {
                var obj = { Name: "Media", Resize: SI.Editor.UI.Media.ResizeWindow, ParentId: "si_edit_container", BackgroundColor: "#999", Title: "Media", Width: '800px', Height: '600px', IconUrl:'/editor/media/icons/window-media.png'};
                SI.Editor.UI.Media.Window = new SI.Widgets.Window(obj);
                SI.Editor.UI.Media.Draw();


            },
            Draw: function () {
                var tabs = new SI.Widgets.Tabs({});
                
                tabs.Items.Add('Images', SI.Editor.UI.Media.MediaTab('Images'));
                tabs.Items.Add('Audio', SI.Editor.UI.Media.MediaTab('Audio'));
                tabs.Items.Add('Video', SI.Editor.UI.Media.MediaTab('Video'));
                tabs.Items.Add('Documents', SI.Editor.UI.Media.MediaTab('Docs'));
                tabs.Items.Add('Data', SI.Editor.UI.Media.MediaTab('Data'));
                tabs.Items.Add('Fonts', SI.Editor.UI.Media.MediaTab('Fonts'));

                SI.Editor.UI.Media.Window.Append(tabs.Draw());

                //want the uploader to be fixed to the lower left on all tabs.
                var uploader = new Uploader({ Bottom: '20px', Left: '20px' });
                SI.Editor.UI.Media.Window.Append(uploader); 
                
                //try to load the first image so we dont have blanks...  ...lol this silly hack works 
                let tiles = document.getElementsByClassName('si_media_Images');
                if (tiles != null) {
                   SI.Tools.Events.Fire(tiles[0],'click');
                }
            },
            MediaTab: function (tabname) {
                this.CurrentMediaPath = "",
                tabname = tabname.replace(/ /g, '');
                //Container
                var container = Ele('div', {
                    style: {
                        width : '100%',
                        height : '100%',
                    }
                });
                //Left Menu
                var menu = Ele('div', {
                    class: 'si-media-menu',
                    style:{
                        position : 'relative',
                        top : "0px",
                        bottom : "205px",
                        width : '220px',
                        height : '280px',
                        backgroundColor : SI.Editor.Style.BackgroundColor,
                        padding : '20px',
                        color: SI.Editor.Style.TextColor,
                        overflowY: 'scroll',
                        overflowX: 'hidden',
                    },
                    appendTo:container,
                });
                //Menu Fields

                var globalFields = ['Name', 'Filename', 'Mime', 'Size'];
                let filter = ""
                switch (tabname) {
                    case "Images":
                        globalFields.push("Width");
                        globalFields.push("Height");
                        filter = 'image/*';
                        break;
                    case "Audio":
                        globalFields.push("Duration");
                        filter = 'audio/*';
                        break;
                    case "Video":
                        globalFields.push("Width");
                        globalFields.push("Height");
                        globalFields.push("Duration");
                        filter = 'video/*';
                        break;
                    case "Documents":
                        globalFields.push("Width");
                        globalFields.push("Height");
                        filter = 'application/*';
                        break;
                    case "Data":
                        filter = 'application';
                        break;
                    case "Fonts":
                        filter = 'application/x-font*';
                        break;


                }

                for (var fields in globalFields) {
                    let fieldBox = Ele('fieldset', {
                        style: {
                            float: 'left',
                        },
                        appendTo: menu,
                        append: Ele("legend", { innerHTML: globalFields[fields] })
                    });

                    var input = Ele('input', {
                        id: 'si_media_' + tabname + '_' + globalFields[fields].replace(/ /g, ''),
                        style: {
                            width : '150px',
                            float : 'left',
                        },
                        onchange: SI.Editor.UI.Media.Save(this),
                        appendTo: fieldBox,
                    });

                }

                let fileOpsBox = Ele('fieldset', {
                    style: {
                        float: 'left',
                    },
                    appendTo: menu,
                    append:  Ele("legend", { innerHTML: "File Opps" })
                });

                //Replace File button;
                Ele('label', {
                    innerHTML:"Replace Dev File",
                    htmlFor: 'si_media_' + tabname + '_update_dev',
                    appendTo: fileOpsBox,
                });
                //
                Ele('input', {
                    id: 'si_media_' + tabname + '_update_dev',
                    type: 'file',
                    accept: filter,
                    style: {
                        position: 'relative',
                        
                    },
                    appendTo: fileOpsBox,
                });
                Ele("br", { appendTo: fileOpsBox }); Ele("br", { appendTo: fileOpsBox });
                //   updateButtonLabel.htmlFor = 'si_media_' + tabname.replace(/ /g, '') + '_UpdateButton';
                Ele('input', {
                    id: 'si_media_' + tabname + '_recycle',
                    type: 'button',  
                    value: 'Move To Recycle',
                    title: "Moves the 4 images to the recycle bin and deletes the entity",
                    style: {
                        position: 'relative',
                        display:'block',
                    },
                    appendTo: fileOpsBox,
                    onclick: SI.Editor.Objects.Media.Recycle,
                });


                var deployments = ['dev', 'test', 'live'];
                for (let d in deployments) {
                    let deployment = deployments[d];
                    let Deploy =SI.Tools.String.CapFirst(deployment);

                    let bgcolor = '';
                    switch(deployment) {
                        case "live": bgcolor = "red"; break;
                        case "test": bgcolor = "yellow"; break;
                        case "dev": bgcolor = "green"; break;
                    }

                    var previewbox = Ele('fieldset', {
                        style: {
                            float: 'left',
                        },
                        appendTo: menu,
                        append: Ele("legend",{innerHTML:Deploy}),
                    });
                    if (tabname === "Images") {
                        Ele('img', {
                            src: this.CurrentMediaPath,
                            id: 'si_media_' + tabname + '_' + Deploy + 'Preview',
                            style: {
                                float: 'left',
                                marginTop: "1px",
                                width: '200px',
                                height: 'auto',
                                backgroundImage: "url('/editor/media/icons/transparentBackground.jpg')",
                            },
                            appendTo: previewbox,
                        });
                    }
                    else if (tabname === "Audio" || tabname === "Video") {
                        let h = (tabname === "Audio") ? "50px" : "150px";
                        let file = this.CurrentMediaPath;
                        let ext = file.split('.').pop();
                        let type = (tabname === "Audio") ? "audio/mp3" : "video/mp4";
                        //debugger;
                        let av = Ele(tabname, {
                            id: 'si_media_' + tabname + '_' + Deploy + 'PreviewContainer',
                            style: {
                                float: 'left',
                                marginTop: "1px",
                                width: '200px',
                                height: h,
                            },
                            controls:'controls',
                            appendTo: previewbox,
                        });
                        Ele('source', {
                            src: this.CurrentMediaPath,
                            id: 'si_media_' + tabname + '_' + Deploy + 'Preview',
                            type: type,
                            appendTo: av,
                        });

                    }


                    let promotelabel = "Rollback";
                    if (deployment == "dev") {
                        promotelabel = "Promote To Test";
                    } else if (deployment == "test") {
                        promotelabel = "Promote To Live";
                    }

                    Ele('button', {
                        id: 'si_media_' + tabname + '_' + Deploy + 'Promote',
                        title: promotelabel,
                        style: {
                            float: 'right',
                            marginRight: '10px',
                            marginTop: '10px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '9px',
                            backgroundColor: bgcolor,
                        },
                        data: {
                            Deployment: deployment,
                        },
                        onclick: function (e) {
                            SI.Editor.Objects.Media.Promote(this, e);
                        },
                        appendTo: previewbox,
                    });

                }
                //Media Toolbar
                var mediatoolbar = Ele('div', {
                    class: 'si-edit-mediatoolbar',
                    style: {
                        position: 'absolute',
                        width: '538px',
                        height: "24px",
                        top:'0px',
                        backgroundColor: '#011',
                        left: '260px',
                    },
                    appendTo: container,
                    onclick: function () { alert("Sort and filter stuff will be here soon"); },

                });
                
                //Media Scroller
                var mediascroller = Ele('div', {
                    id: 'si_edit_mediascroller_' + tabname,
                    class: 'si-edit-mediascroller',
                    style: {
                        position : 'absolute',
                        display : 'inline-block',
                        overflow : 'scroll',
                        left : '260px',
                        top : '24px',
                        minWidth: '538px',
                      //  minWidth: '2002px',
                        
                        height : '100%',
                        backgroundColor : '#708080',
                        paddingRight : '0px',
                    },
                    appendTo: container,

                });


                //clear spacer to keep icons off the toolbar
                var mediaspacer = Ele('div', { style: { position: 'relative', width: '100%',  height: "20px",  pointerEvents:'none', }, appendTo: mediascroller });

                let medialibrary = SI.Editor.Code.Objects.Media;

                for (var media in medialibrary) {
                    if (medialibrary.hasOwnProperty(media)) {
                 //       
                        let data = medialibrary[media];
                        if (data.hasOwnProperty('mime')) {
                     
                            if (SI.Editor.Code.DataLists.AcceptedMimeTypes[tabname].indexOf(data.mime) > -1) {
                             //debugger;
                            //    console.log(data);
                                let validPath =SI.Tools.GetMediaFilePath("dev_" + data['path']);
                                if (validPath != null) {
                                    let options = {
                                        Type: tabname,
                                        Data: { "path": data['path'], "mime": data['mime'], "name": data['name'],"tabname":tabname, "url":validPath,"id":'0x'+data['id'] },
                                        Group: 'si_media_' + tabname,
                                        Url: validPath,
                                        BackgroundColor: 'silver',
                                        Text: data['name'],
                                        OnChange: SI.Editor.Objects.Media.OnChange,
                                    }

                                    let tile = new Tiles(options);
                                    mediascroller.appendChild(tile);
                                } else {
                                    console.warn("Unknown file could not be loaded into media viewer: " + data['path']);
                                }
                            }
                        }
                    }
                }

                return container;

            },
            ResizeWindow: function () {
                let w = SI.Editor.UI.Media.Window.GetWidth();
                let h = SI.Editor.UI.Media.Window.GetHeight();
               SI.Tools.Class.Loop("si-edit-mediascroller", function (ele) {
                    ele.style.width = (w - 260) + "px";
                });   
               SI.Tools.Class.Loop("si-media-menu", function (ele) {
                    ele.style.height = (h - 320) + "px";
                }); 
            },
            Save: function (input) {
               // console.log(input);
            }
        },
        Styler: {
            Window: null,
            Styler: null,
            Init: function () {
                var obj = { Name: "Styler", ParentId: 'si_edit_container', Title: "Styler", Overflow:"HIDDEN"};
                SI.Editor.UI.Styler.Window = new SI.Widgets.Window(obj);
                SI.Editor.UI.Styler.Draw();
            },
            Draw: function (content) {
                SI.Editor.UI.Styler.Styler = new Styler();
                var code = SI.Editor.UI.Styler.Styler.Init();
                SI.Editor.UI.Styler.Window.Append(code);
            }
        },
        Scripter: {
            Window: null,
            Scripter: null,
            Init: function () {               
                var obj = { Name: "Scripter", ParentId: 'si_edit_container', Title: "Scripter", Width: '800px', Height: '600px' };
                SI.Editor.UI.Scripter.Window = new SI.Widgets.Window(obj);
                SI.Editor.UI.Scripter.Draw();
            },
            Draw: function () {                
                var scr = new Scripter()
                SI.Editor.UI.Scripter.Window.Append(scr.Draw());
            },
        },
        Widgets: {
            Window: null,
                Init: function () {
                    var obj = { Name: "Widgets", ParentId: 'si_edit_container', Title: "Widgets", Width: '800px', Height: '600px' };
                    SI.Editor.UI.Widgets.Window = new SI.Widgets.Window(obj);
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
                var obj = { Name: "Language", ParentId: 'si_edit_container', Title: "Language", Width: '800px', Height: '600px' };
                SI.Editor.UI.Language.Window = new SI.Widgets.Window(obj);
                SI.Editor.Objects.Language.Draw();
            },
        },
        Entities: {
            Window: null,
            Init: function() {
                var obj = {
                    Name: "Entities", ParentId: 'si_edit_container', Title: "Entities", Width: '800px', Height: '600px',
                    Resize: function(win){
                       //debugger;
                        
                        win.Container.height = win.GetHeight();
                        win.Container.width = win.GetWidth();
                    },
                };
                SI.Editor.UI.Entities.Window = new SI.Widgets.Window(obj);
                SI.Editor.Objects.Entity.Draw();
            }
        },
        Plugins: {
            Window: null,
            Init: function () {
                var obj = {
                    Name: "Plugins", ParentId: 'si_edit_container', Title: "Plugins", ResizeThickness: 5,
                    Resize: function (win) {
                        document.getElementById('si_edit_plugins_repo_content').style.height = win.Container.clientHeight - 127 + "px";
                        
                    },
                };
                SI.Editor.UI.Plugins.Window = new SI.Widgets.Window(obj);
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

                let tabs = new SI.Widgets.Tabs({
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
                var obj = { Name: "Site", ParentId: 'si_edit_container', Title: "Site", Width: '800px'};
                SI.Editor.UI.Site.Window = new SI.Widgets.Window(obj);
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
                dBuINewPage.value = "<?= SI_BUSINESSUNIT_NAME ?>";

                dBuINewPage.readOnly = <?= $notdomainadmin ?>;
                dBuNewPage.appendChild(dBuINewPage);
                inRowNewPage.appendChild(dBuNewPage);

                let dDoNewPage = document.createElement('td');
                let dDoINewPage = document.createElement('input');
                dDoINewPage.readOnly =  <?= $notsuperadmin ?>;
                dDoINewPage.id = "SI_Struct_NewPage_Domain";
                dDoINewPage.value = "<?= SI_DOMAIN_NAME ?>";
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
                let pageData = SI.Editor.Code.Objects.Pages;
                let domains = [];
                for (domain of pageData) {
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
                        for (busunit of pageData) {  
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
                                for (page of pageData) {
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
                                        let relationships = SI.Editor.Objects.Entity.Relationships;
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
                                            relid = '0x' + relation.id.toLowerCase();
                                            parentid = '0x' + relation.parent_id.toLowerCase();
                                            childid = '0x' + relation.child_id.toLowerCase();

                                            pEntName = relation.parententity_name;
                                            cEntName = relation.childentity_name;
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
                

                //for (page in pageLibrary){
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
                var obj = { Name: "Scenegraph", ParentId: 'si_edit_container', Title: "Scenegraph", Width: '800px', Height: '600px' };
                SI.Editor.UI.Scenegraph.Window = new SI.Widgets.Window(obj);
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
                let obj = <?= $sessionPageData ?>;
                //debugger;
                let ul =  SI.Tools.Object.ToDataTree(obj);

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
                var obj = { Name: "Security", ParentId: 'si_edit_container', Title: "Security", Width: '800px', Height: '600px' };
                SI.Editor.UI.Security.Window = new SI.Widgets.Window(obj);
                SI.Editor.Objects.SecurityRoles.Draw();
            },
        },
        Users: {
            Window: null,
            Init: function () {
                var obj = { Name: "Users", ParentId: 'si_edit_container', Title: "Users", StartWidth:'1000px', StartHeight: '600px' };
                SI.Editor.UI.Users.Window = new SI.Widgets.Window(obj);
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
                let currentroles = SI.Editor.Objects.SecurityRoles.Current;
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
                pre.insertAdjacentHTML('beforeend', " <?= $usertable ?> ");



                SI.Editor.UI.Users.Window.Append(base);


            },
        },
        Settings: {
            Window: null,
            Init: function () {
                    var obj = { Name: "Settings", ParentId: 'si_edit_container', Title: "Settings", StartWidth: '800px', StartHeight: '600px' };
                    SI.Editor.UI.Settings.Window = new SI.Widgets.Window(obj);
                    SI.Editor.UI.Settings.Draw();
                },
            Draw: function () {
                SI.Editor.UI.HUD.Init();
                SI.Editor.UI.Phpinfo.Init();
                let container = Ele('div', {
                    style: {
                        width: "100%",
                        height: "100%",
                        overflow: "scroll",
                        padding:'20px',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: SI.Editor.Style.TextColor,
                    },
                });



                let toolsbox = Ele('fieldset', {
                    style: {
                        width: '90%',
                        borderRadius:'10px',
                    },
                    append: Ele('legend', { innerHTML: 'Tools' }),
                    appendTo: container,
                });

                //Show hide HUD
                let hudcb = Ele('input', {
                    id:'si_edit_settings_hudcb',
                    type: 'checkbox',
                    style: {
                        marginRight: '30px',
                    },
                    onchange: function(){
                        if (this.checked) {
                            SI.Editor.UI.HUD.Window.Show();
                        } else {
                            SI.Editor.UI.HUD.Window.Hide();
                        }
                    }
                });
                let hudcblabel = Ele('label', {
                    innerHTML: "HUD",
                    append: hudcb,
                    appendTo: toolsbox,
                });



                //let installergobutton = Ele('button', {
                //    id: 'si_edit_settings_installermakergo',
                //    innerHTML:"Build Installer",
                //    appendTo: container,
                //    onclick: function () {
                //        let options = {}
                //        let data = { KEY: "BuildInstallerFile" }
                //        options.Data = data;
                //        SI.Editor.Ajax.Run(options);
                //    }
                //});
                let openPhpInfo = Ele('button', {
                    id: 'si_edit_settings_phpinfo',
                    innerHTML: "PHP Info",
                    appendTo: toolsbox,
                    title: "VIew php info",
                    style: {
                        marginRight:'10px',
                    },
                    onclick: function (e) {
                        SI.Editor.UI.Phpinfo.Window.SetPosition(e.pageY + 25, e.pageX - 250);
                        SI.Editor.UI.Phpinfo.Window.Show();

                    }
                });

                let checkBadImages = Ele('button', {
                    id: 'si_edit_settings_checkbadimages',
                    innerHTML: "Look for Image problems",
                    appendTo: toolsbox,
                    title: 'Some browsers can try to load a page twice+ if there is a missing image. \nMake sure you have images at the end of all your image urls!\nThis will search the document for all invalid images and return their ids.',
                    onclick: function () {
                        let error = [];
                        images = document.querySelectorAll('img');
                        for (i in images) {
                            if (images.hasOwnProperty(i)) {
                                if (!images[i].complete) {
                                    //debugger;
                                    error.push(images[i].id);
                                }
                            }
                        }
                        if (error.length > 0) {
                            alert("These images did not load correctly: " + error.join(','));
                        } else {
                            alert("All images seem OK :-) ");
                        }

                    }
                });
                Ele('br', {appendTo: container,});
                let newbox = Ele('fieldset', {
                    style: {
                        width: '90%',   
                        borderRadius: '10px',
                    },
                    append: Ele('legend', {innerHTML:'Custom Settings'}),
                    appendTo: container,
                });
                Ele("span", { innerHTML:'New Setting: Name ',appendTo: newbox });
                let newsettingname = Ele("input", {id:'si_edit_settings_newname', appendTo: newbox });
                Ele("span", { innerHTML: ' Value ', appendTo: newbox });
                let newsettingvalue = Ele("input", { id: 'si_edit_settings_newvalue', appendTo: newbox });
                Ele("button", {
                    innerHTML: 'Create',
                    appendTo: newbox,
                    onclick: function () {
                        let name = document.getElementById('si_edit_settings_newname').value;
                        let value = document.getElementById('si_edit_settings_newvalue').value;
                        SI.Editor.Objects.Settings.New(name, value);
                    }
                });

                let existingbox = Ele('fieldset', {
                    style: {
                        width: '90%',
                        borderRadius: '10px',
                    },
                    append: Ele('legend', { innerHTML: 'Current Settings' }),
                    appendTo: newbox,
                });
                let settingstable = Ele('table', {
                    id:'si_edit_settings_table',
                    appendTo: existingbox,
                }); 
                let settings = SI.Editor.Objects.Settings.Current;
                for (name in settings) {    
                    //debugger;
                    if (settings.hasOwnProperty(name)) {
                        let setting = settings[name];

                        SI.Editor.Objects.Settings.Add(name, setting, settingstable);
                    }
                }



                SI.Editor.UI.Settings.Window.Append(container);
            },
        },
        //Tool Sub-Windows
        BlockTemplates: {
            Window: null,
            Init: function () {
                var obj = { Name: "BlockTemplates", BackgroundColor:'CadetBlue', ParentId: 'si_edit_container', Title: "Block Templates", Width: '600px', Height: '400px' };
                SI.Editor.UI.BlockTemplates.Window = new SI.Widgets.Window(obj);
                SI.Editor.UI.BlockTemplates.Window.Append(SI.Editor.UI.BlockTemplates.Draw());
                SI.Editor.UI.BlockTemplates.Draw(SI.Editor.UI.BlockTemplates.Window.GetContentId());
            },
            Draw: function (content) {
                let draw = document.createElement('div');

                
                blockTemplateBox = document.createElement('div');
                for (let key in SI.Editor.Code.Objects.Blocks) {
                    if (SI.Editor.Code.Objects.Blocks.hasOwnProperty(key)) {

                        if (typeof (SI.Editor.Code.Objects.Blocks[key]) != "undefined") {
                            blockTemplateBox.appendChild(SI.Editor.UI.BlockTemplates.Add(SI.Editor.Code.Objects.Blocks[key]));
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
                    for (s in options.style) {
                        options[s] = options.style[s];
                    }

                    for (option in options) {


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
                    Name: "ImportBlock", BackgroundColor: 'CadetBlue', ParentId: 'si_edit_container',
                    Title: "Import Block", StartWidth: '268px', StartHeight: '75px',
                    StartTop: "400px", StartLeft: "300px", Resizable: false, WindowControls:"CLOSE",
                };
                SI.Editor.UI.ImportBlock.Window = new SI.Widgets.Window(obj);
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
                for (b in blocks) {
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
                    Name: "HUD", ParentId: 'si_edit_container', Title: "HUD", StartWidth: '200px', StartHeight: '150px', StartTop:'30%', StartLeft:'1%', Overflow: "hidden", Position: "fixed", "WindowControls": "CLOSE",
                    OnClose: function () {  //sync the cb in settings
                        document.getElementById('si_edit_settings_hudcb').checked = false;
                    }
                };
                SI.Editor.UI.HUD.Window = new SI.Widgets.Window(obj);
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
                    var obj = { Name: "PhpInfo", ParentId: 'si_edit_container', Title: "PhpInfo", StartWidth: '990px', StartHeight: '600px' };
                    SI.Editor.UI.Phpinfo.Window = new SI.Widgets.Window(obj);
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
        Entity: {
            Draw: function () {
                //Draw the Container to pass to the Window
                let container = Ele("div", {
                    id: 'si_edit_entities_container',
                    style: {
                        width: '100%',
                        height: '100%',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        overflow: 'scroll',
                    },
                });
                SI.Editor.UI.Entities.Window.Append(container);


                
                //debugger;
                //let tabs = new SI.Widgets.Tabs();
                //for (let tab in SI.Editor.Objects.Entity.Tabs) {
                //    tabs.Items.Add(tab, SI.Editor.Objects.Entity.Tabs[tab]);
                //}
                //tabs.Draw(container);



                //Select Entity Text
                Ele('span', {
                    innerHTML: ' Select Entity:',
                    appendTo: container,
                });

                //debugger;
                //Get all the entity data
                let ent = SI.Editor.Objects.Entity.Info

                entitiesSelectChange = function (e) {
                    //debugger;
                    SI.Tools.Class.Loop('si-edit-entities-attributes-container', function (ele) {
                        ele.style.display = 'none';
                    });
                    if (this.value !== 'null') {
                        document.getElementById('si_edit_entities_attributes_container_' + this.value).style.display = "block";
                        let options = {};
                        options.Data = {
                            Operation: "Retrieve",
                            Entity: {
                                Name: this.value,
                            },
                        };
                        options.Callback = SI.Editor.Objects.Entity.PopulateEntityGrid;
                        SI.Tools.Api.Send(options);
                    }
                }

                //Entities List
                let entitiesSelect = Ele('select', {
                    id: 'si_edit_entities_select',
                    appendTo: container,
                    onchange: entitiesSelectChange,
                });



                //Top blank
                Ele("option", {
                    value: null,
                    innerHTML: "",
                    appendTo: entitiesSelect,
                });

                let newEntity = Ele('button', {
                    innerHTML: "New Entity &#9746",
                    style: { marginLeft: '10px' },
                    appendTo: container,
                    onclick: function () {

                        let controls = document.getElementById("si_edit_entity_new_controls");
                        if (controls.style.display == 'block') {
                            this.innerHTML = "New Entity &#9746",
                                controls.style.display = 'none';
                        } else {
                            this.innerHTML = "New Entity &#9745",
                                controls.style.display = 'block';
                        }
                    }
                });

                let newEntityControls = Ele('div', {
                    id: 'si_edit_entity_new_controls',
                    style: {
                        position: 'absolute',
                        height: '100%',
                        width: '100%',
                        display: 'none',
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        padding: '10px',
                    },
                    appendTo: container,
                    append: SI.Editor.Objects.Entity.NewEntityDialog(),
                });
                //append: SI.Editor.UI.Entities.Methods.NewEntityDialog(),

                for (let e in ent) {
                    let entity = ent[e];
                    //create an option tag for each entity
                    Ele("option", {
                        value: e,
                        innerHTML: e,
                        appendTo: entitiesSelect,

                    });

                    //create the entity box for both the view and form
                    let entityContainer = Ele("div", {
                        id: 'si_edit_entities_attributes_container_' + e,
                        class: 'si-edit-entities-attributes-container',
                        style: {
                            display: 'none',
                        },
                        appendTo: container,
                    });

                    //create the tabbox
                    let tabView = Ele('div', {
                        id: 'si_edit_entities_view_' + e,
                        class: 'si-edit-entities-view',
                        style: {
                            width: "100%",
                            height: "100%",
                            backgroundColor: "black",
                            paddingLeft: '5px',
                            overflow: 'visible',
                        },
                        appendTo: entityContainer,
                    });

                    //UI Buttons
                    let newBtn = Ele('button', {
                        id: 'si_edit_entities_new_' + e,
                        innerHTML: "new",
                        appendTo: tabView,
                        onclick: SI.Editor.Objects.Entity.New,

                    });
                    //SI.Editor.UI.Entities.Methods.New,
                    let editBtn = Ele('button', {
                        id: 'si_edit_entities_edit_' + e,
                        innerHTML: "edit",
                        appendTo: tabView,
                        onclick: SI.Editor.Objects.Entity.Edit,
                    });
                    //SI.Editor.UI.Entities.Methods.Edit,
                    //View tab 
                    let entityTable = Ele("table", {
                        id: "si_edit_entity_table_" + e,
                        style: {
                            backgroundColor: "rgba(43,87,79,1)",
                            borderCollapse: 'collapse',
                        },
                        appendTo: tabView,
                    });

                    //Form tab
                    var tabForm = Ele('div', {
                        id: 'si_edit_entities_form_' + e,
                        style: {
                            width: "100%",
                            height: "500px",
                            backgroundColor: "black",
                            paddingLeft: '5px',
                            //   overflow: 'auto',
                            display: 'none',
                        },
                        appendTo: entityContainer,
                    });

                    //let attributesSelect = Ele('select', {
                    //    id: 'si_edit_attributes_select_' + e,
                    //    class: 'si-edit-attributes-select',

                    //});

                    let closeBtn = Ele('button', {
                        id: 'si_edit_entities_close_' + e,
                        innerHTML: "Close",
                        onclick: SI.Editor.Objects.Entity.Close,
                        appendTo: tabForm,
                    });
                    //SI.Editor.UI.Entities.Methods.Close,
                    let saveBtn = Ele('button', {
                        id: 'si_edit_entities_save_' + e,
                        innerHTML: "Save",
                        appendTo: tabForm,
                        onclick: SI.Editor.Objects.Entity.Save,
                    });
                    //SI.Editor.UI.Entities.Methods.Save,
                    let entityform = Ele("form", {
                        id: 'si_edit_entities_formdata_' + e,
                        style: {
                            display: 'flex',
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                        },
                        data: {
                            entityname: e
                        },
                        appendTo: tabForm,
                    });


                    //Attributes loop
                    let hiddenFields = ["instanceguid", 'deployable', 'p_id', 'id', 'sum', 'entity_id'];
                    let readonlyFields = ["createdon", 'modifiedon'];

                    for (let a in entity.attributes) {
                        //debugger;
                        let attribute = entity.attributes[a.trim()];
                        if (hiddenFields.indexOf(a) > -1) {
                            //debugger;
                            switch (a) {
                                case "instanceguid": entityform.dataset.recordid = attribute; break;
                            }
                        } else {
                            let type;
                            let options;
                            let deployable;
                            let textcolor = SI.Editor.Style.TextColor;
                            let title;
                            //debugger;
                            if (typeof attribute['type'] !== 'undefined') {
                                type = attribute.type;
                            }
                            if (typeof attribute['deployable'] !== 'undefined') {
                                deployable = true;
                                textcolor = "rgba(0, 255, 0)";
                            } else {
                                deployable = false;
                            }
                            switch (type) {
                                case "optionset": type = 'select'; options = attribute['options'].replace(/'/g, "").replace(/"/g, "").split(","); break;
                                case "datetime": type = "datetime-local"; break;
                                case "lookup": textcolor = "rgba(0,255,255)"; title = attribute['lookup']; break;
                                //  default: type = 'text'; break;
                            }

                            let attrControl = Ele("div", {
                                appendTo: entityform,
                                style: {
                                    backgroundColor: SI.Editor.Style.BackgroundColor,
                                }
                            });

                            let attrLabel = Ele("label", {
                                id: 'si_edit_attributes_label_' + e + '_' + a,
                                for: 'si_edit_attributes_input_' + e + '_' + a,
                                innerHTML: a,
                                appendTo: attrControl,
                                style: {
                                    color: textcolor,
                                    margin: '2px',
                                }
                            });
                            let attrInput;

                            if (type == "select") {
                                attrInput = Ele("select", {

                                    type: type,
                                    appendTo: attrControl,
                                    style: {
                                        //  color: textcolor,
                                        margin: '12px',
                                    },
                                })
                                for (let o in options) {

                                    Ele('option', {
                                        innerHTML: options[o],
                                        value: o,
                                        appendTo: attrInput,
                                    });
                                }
                            }
                            else if (type == "textarea") {
                                attrInput = Ele("textarea", {

                                    type: type,
                                    appendTo: attrControl,
                                    style: {
                                        //    color: textcolor,
                                        margin: '12px',
                                    },
                                })
                            }
                            else if (type == 'lookup') {
                                if (typeof attribute['lookup'] !== 'undefined') {


                                    attrInput = Ele("input", {
                                        id: 'si_edit_attributes_input_' + e + '_' + a,
                                        type: type,
                                        appendTo: attrControl,
                                        style: {
                                            // color: textcolor,
                                            margin: '12px',
                                        },
                                        data: {
                                            type: attribute['lookup'],
                                        },
                                    })

                                }
                            }
                            else {
                                attrInput = Ele("input", {

                                    appendTo: attrControl,
                                    style: {
                                        // color: textcolor,
                                        margin: '12px',
                                    },
                                    placeholder: type,
                                })
                            }
                            if (!attrInput.id) {
                                attrInput.id = 'si_edit_attributes_input_' + e + '_' + a;
                            }

                            attrInput.name = a;

                            if (title) {
                                attrLabel.title = title;
                            }
                            if (readonlyFields.indexOf(a) > -1) {
                                attrInput.readOnly = true;
                            }
                            attrInput.classList.add("si-edit-entity-form-input");
                        }
                    }

                    entityContainer.appendChild(tabView);
                    entityContainer.appendChild(tabForm);

                }

               // SI.Editor.UI.Entities.Window.Append(container);

            },
            Tabs: {  //TODO chage entities into a tabbed workspace.
                Query: function(){
                    tabcontainer = Ele('div', {
                        innerHTML:'Query',
                        style: {
                            width: '100%',
                            height: '100%',
                            backgroundColor:'blue',
                        }
                    });



                    return tabcontainer
                },
                Manage: function() {
                    tabcontainer = Ele('div', {
                        innerHTML: 'Manage',
                        style: {
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'green',
                        }
                    });

                    return tabcontainer
                },
                New: function() {
                    tabcontainer = Ele('div', {
                        innerHTML: 'New',
                        style: {
                            width: '100%',
                            height: '100%',
                            backgroundColor: 'red',
                        }
                    });

                    return tabcontainer
                },

            },
            //CRUD   maybe just use api
            Create: function(ent){

            },
            Retrieve: function(ent){

            },
            Update: function(ent) {

            },
            Delete: function(ent) {

            },
            //Current
            Count: <?= $recordCount ?>,
            Info: <?= $entityInfo ?>,
            Find: function(search) {
                if (typeof SI.Editor.Objects.Entity.Info[search] !== 'undefined') {
                    return SI.Editor.Objects.Entity.Info[search];
                }
                else {
                    let info = SI.Editor.Objects.Entity.Info;
                    for (let item in info) {
                        if (typeof item.instanceguid !== 'undefined') {
                            if (search == item.instanceguid || '0x' + search == item.instanceguid) {
                                return item;
                            }
                        }
                    }
                }
            },
            Relationships:  <?= $relationsjson ?>,
            Lists: {
                FwdRevLookup: { },
                NotAllowedNames: ['domain', 'domains', 'businessunit', 'businessunits', 'entity', 'entities'],
                NotAllowedAttributes: ['p_id','id', 'status', 'statusreason', 'createdon','modifiedon','entity_id'],
            },            

            NewEntityDialog: function() {
                //Container
                let container = Ele('div', { style: { width: '95%', height: '95%', padding: '4px'}});

                //New Entity Singular Name label
                Ele('span', { innerHTML: 'Singular Name:', appendTo: container });
                //New Entity Name input
                let sname = Ele('input', {
                    id: 'si_edit_entity_newSname',
                    style: { marginLeft: '10px' },
                    appendTo: container,
                    onchange: function () {
                        //debugger;
                        let lowname = this.value.toLowerCase();
                        if (lowname) {
                            if (SI.Editor.Objects.Entity.Lists.NotAllowedNames.indexOf(lowname) !== -1) {
                                alert("An entity by that name already exists.");
                                this.value = "";
                                return;
                            } else { }
                            this.value = lowname;
                        }
                        if (lowname.length>0)
                        document.getElementById('si_edit_entity_newPname').value = lowname + "s";
                    }
                });

                //New Entity Plural Name label
                Ele('span', { innerHTML: ' Plural Name:', appendTo: container });
                //New Entity Name input
                let pname = Ele('input', {
                    id:'si_edit_entity_newPname',
                    style: { marginLeft: '10px' },
                    appendTo: container,
                    onchange: function () {
                        //debugger;
                        let lowname = this.value.toLowerCase();
                        if (lowname) {
                            if (SI.Editor.Objects.Entity.Lists.NotAllowedNames.indexOf(lowname) !== -1) {
                                alert("An entity by that name already exists.");
                                this.value = "";
                                return;
                            } else {}
                            this.value = lowname;
                        }

                    }
                });

                // Is Global Entity label
                Ele('label', {innerHTML: " Global",for: "si_edit_entities_globalcb",style: { marginLeft: '10px' },  appendTo: container });
                
                Ele('input', {
                    id: "si_edit_entities_globalcb",
                    type: 'checkbox',
                    style: {
                        marginLeft: '10px'
                    },
                    title: "Make the entity global to all domains",
                    appendTo: container,
                    onchange: function () {
                    },
                });

                //Attributes Box
                let lgndAttributes = Ele('legend', {
                    innerHTML: 'Attributes',
                });

                let attributes = Ele('fieldset', {
                    id:"si_edit_entities_attributesbox",
                    append: lgndAttributes,
                    appendTo: container,
                });

                //Add Attributes Box
                let lgndAddAttr = Ele('legend', {
                    innerHTML: 'Add',
                });

                let addattr = Ele('fieldset', {
                    style: {
                        lineHeight:'28px',
                    },
                    append: lgndAddAttr,
                    appendTo: attributes,
                });

                Ele('span', {
                    innerHTML: 'Name:',
                    appendTo: addattr,
                });
                let attrname = Ele('input', {
                    id: "si_edit_entities_newattrname",
                    style: {
                        width: '300px',
                        marginLeft: '10px',
                    },
                    appendTo: addattr,
                });
                Ele('br', { appendTo: addattr, });
                Ele('span', {
                    innerHTML: 'Type:',
                    appendTo: addattr,
                });
                //Add a entity attribute
                let datatypeTable = Ele('select', {
                    id: "si_edit_entities_newattrtype",
                    style: {
                        width: '304px',
                        marginLeft: '18px',
                    },
                    appendTo: addattr,
                    onchange: function () {
                        //debugger;
                        document.getElementById('si_edit_entities_lookup_select').style.display = 'none';
                        document.getElementById('si_edit_entities_lookup_select').required =false;
                        document.getElementById('si_edit_entities_enum_label').style.display = 'none';
                        document.getElementById('si_edit_entities_enum_input').style.display = 'none';
                        document.getElementById('si_edit_entities_enum_input').required = false;
                        document.getElementById('si_edit_entities_enum_input').value = '';
                        document.getElementById('si_edit_entities_size_label').style.display = 'none';
                        document.getElementById('si_edit_entities_size_input').style.display = 'none';
                        document.getElementById('si_edit_entities_size_input').required = false;
                        document.getElementById('si_edit_entities_size_input').value = '';
                        let seltxt = this.options[this.selectedIndex].text;
                        if (seltxt === 'LOOKUP') {
                            document.getElementById('si_edit_entities_lookup_select').style.display = 'inline-block';
                            document.getElementById('si_edit_entities_lookup_select').required = true;
                        }
                        else if (seltxt === 'ENUM' || seltxt === 'SET') {
                            document.getElementById('si_edit_entities_enum_label').style.display = 'inline-block';
                            document.getElementById('si_edit_entities_enum_input').style.display = 'inline-block';
                            document.getElementById('si_edit_entities_enum_input').required = true;
                        }
                        else if (seltxt === 'CHAR' || seltxt === 'VARCHAR' || seltxt === 'BINARY'  || seltxt === 'VARBINARY' || seltxt === 'VARCHAR') {
                            let max = 0;
                            let def = null;
                            switch (seltxt) {
                                case 'CHAR': max = 255; def = 1; break;
                                case "VARCHAR": max = 65535; break;
                                case "BINARY": max = 65535;  def = 1; break;

                            }
                            document.getElementById('si_edit_entities_size_label').style.display = 'inline-block';
                            document.getElementById('si_edit_entities_size_input').style.display = 'inline-block';
                            document.getElementById('si_edit_entities_size_input').max = max;
                            if (def) {
                                document.getElementById('si_edit_entities_size_input').value= def;
                            }
                        }
                        //set default type. first text and then catch other type.
                        document.getElementById('si_edit_entities_newattrdefault').type = 'text';
                        let def = document.getElementById('si_edit_entities_newattrdefault');
                        if (seltxt === 'TINYINT' || seltxt === 'SMALLINT' || seltxt === 'MEDIUMINT' || seltxt === 'INT' || seltxt === 'BIGINT') {
                            def.type = 'number';
                            def.step = 1;
                        }



                    },
                });
                //Jacked from phpmyadmin for the most part

                Ele('option', { innerHTML: "", appendTo: datatypeTable });
                Ele('option', { title: "A guid key for another entity", innerHTML: "LOOKUP", appendTo: datatypeTable });
                Ele('option', { title: "A 4-byte integer, signed range is -2,147,483,648 to 2,147,483,647, unsigned range is 0 to 4,294,967,295", innerHTML: "INT", appendTo: datatypeTable });
                Ele('option', { title: "A variable-length (0-65,535) string, the effective maximum length is subject to the maximum row size", innerHTML: "VARCHAR", appendTo: datatypeTable });
                Ele('option', { title: "A TEXT column with a maximum length of 65,535 (2^16 - 1) characters, stored with a two-byte prefix indicating the length of the value in bytes", innerHTML: "TEXT", appendTo: datatypeTable });
                Ele('option', { title: "A date, supported range is 1000-01-01 to 9999-12-31", innerHTML: "DATE", appendTo: datatypeTable });
                let numeric = Ele('optgroup', { label: "Numeric", appendTo: datatypeTable });
                Ele('option', { title: "A 1-byte integer, signed range is -128 to 127, unsigned range is 0 to 255", innerHTML: "TINYINT", appendTo: numeric });
                Ele('option', { title: "A 2-byte integer, signed range is -32,768 to 32,767, unsigned range is 0 to 65,535", innerHTML: "SMALLINT", appendTo: numeric });
                Ele('option', { title: "A 3-byte integer, signed range is -8,388,608 to 8,388,607, unsigned range is 0 to 16,777,215", innerHTML: "MEDIUMINT", appendTo: numeric });
                Ele('option', { title: "A 4-byte integer, signed range is -2,147,483,648 to 2,147,483,647, unsigned range is 0 to 4,294,967,295", innerHTML: "INT", appendTo: numeric });
                Ele('option', { title: "An 8-byte integer, signed range is -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807, unsigned range is 0 to 18,446,744,073,709,551,615", innerHTML: "BIGINT", appendTo: numeric });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: numeric });
                Ele('option', { title: "A fixed-point number (M, D) - the maximum number of digits (M) is 65 (default 10), the maximum number of decimals (D) is 30 (default 0)", innerHTML: "DECIMAL", appendTo: numeric });
                Ele('option', { title: "A small floating-point number, allowable values are -3.402823466E+38 to -1.175494351E-38, 0, and 1.175494351E-38 to 3.402823466E+38", innerHTML: "FLOAT", appendTo: numeric });
                Ele('option', { title: "A double-precision floating-point number, allowable values are -1.7976931348623157E+308 to -2.2250738585072014E-308, 0, and 2.2250738585072014E-308 to 1.7976931348623157E+308", innerHTML: "DOUBLE", appendTo: numeric });
                Ele('option', { title: "Synonym for DOUBLE (exception: in REAL_AS_FLOAT SQL mode it is a synonym for FLOAT)", innerHTML: "REAL", appendTo: numeric });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: numeric });
                Ele('option', { title: "A bit-field type (M), storing M of bits per value (default is 1, maximum is 64)", innerHTML: "BIT", appendTo: numeric });
                Ele('option', { title: "A synonym for TINYINT(1), a value of zero is considered false, nonzero values are considered true", innerHTML: "BOOLEAN", appendTo: numeric });
                Ele('option', { title: "An alias for BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE", innerHTML: "SERIAL", appendTo: numeric });
                let datatime = Ele('optgroup', { label: "Date and time", appendTo: datatypeTable });
                Ele('option', { title: "A date, supported range is 1000-01-01 to 9999-12-31", innerHTML: "DATE", appendTo: datatime });
                Ele('option', { title: "A date and time combination, supported range is 1000-01-01 00:00:00 to 9999-12-31 23:59:59", innerHTML: "DATETIME", appendTo: datatime });
                Ele('option', { title: "A timestamp, range is 1970-01-01 00:00:01 UTC to 2038-01-09 03:14:07 UTC, stored as the number of seconds since the epoch (1970-01-01 00:00:00 UTC)", innerHTML: "TIMESTAMP", appendTo: datatime });
                Ele('option', { title: "A time, range is -838:59:59 to 838:59:59", innerHTML: "TIME", appendTo: datatime });
                Ele('option', { title: "A year in four-digit (4, default) or two-digit (2) format, the allowable values are 70 (1970) to 69 (2069) or 1901 to 2155 and 0000", innerHTML: "YEAR", appendTo: datatime });
                let string = Ele('optgroup', { label: "String", appendTo: datatypeTable });
                Ele('option', { title: "A fixed-length (0-255, default 1) string that is always right-padded with spaces to the specified length when stored", innerHTML: "CHAR", appendTo: string });
                Ele('option', { title: "A variable-length (0-65,535) string, the effective maximum length is subject to the maximum row size", innerHTML: "VARCHAR", appendTo: string });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
                Ele('option', { title: "A TEXT column with a maximum length of 255 (2^8 - 1) characters, stored with a one-byte prefix indicating the length of the value in bytes", innerHTML: "TINYTEXT", appendTo: string });
                Ele('option', { title: "A TEXT column with a maximum length of 65,535 (2^16 - 1) characters, stored with a two-byte prefix indicating the length of the value in bytes", innerHTML: "TEXT", appendTo: string });
                Ele('option', { title: "A TEXT column with a maximum length of 16,777,215 (2^24 - 1) characters, stored with a three-byte prefix indicating the length of the value in bytes", innerHTML: "MEDIUMTEXT", appendTo: string });
                Ele('option', { title: "A TEXT column with a maximum length of 4,294,967,295 or 4GiB (2^32 - 1) characters, stored with a four-byte prefix indicating the length of the value in bytes", innerHTML: "LONGTEXT", appendTo: string });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
                Ele('option', { title: "Similar to the CHAR type, but stores binary byte strings rather than non-binary character strings", innerHTML: "BINARY", appendTo: string });
                Ele('option', { title: "Similar to the VARCHAR type, but stores binary byte strings rather than non-binary character strings", innerHTML: "VARBINARY", appendTo: string });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
                Ele('option', { title: "A BLOB column with a maximum length of 255 (2^8 - 1) bytes, stored with a one-byte prefix indicating the length of the value", innerHTML: "TINYBLOB", appendTo: string });
                Ele('option', { title: "A BLOB column with a maximum length of 16,777,215 (2^24 - 1) bytes, stored with a three-byte prefix indicating the length of the value", innerHTML: "MEDIUMBLOB", appendTo: string });
                Ele('option', { title: "A BLOB column with a maximum length of 65,535 (2^16 - 1) bytes, stored with a two-byte prefix indicating the length of the value", innerHTML: "BLOB", appendTo: string });
                Ele('option', { title: "A BLOB column with a maximum length of 4,294,967,295 or 4GiB (2^32 - 1) bytes, stored with a four-byte prefix indicating the length of the value", innerHTML: "LONGBLOB", appendTo: string });
                Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
                Ele('option', { title: "An enumeration, chosen from the list of up to 65,535 values or the special '' error value", innerHTML: "ENUM", appendTo: string });
                Ele('option', { title: "A single value chosen from a set of up to 64 members", innerHTML: "SET", appendTo: string });
                let spatial = Ele('optgroup', { label: "Spatial", appendTo: datatypeTable });
                Ele('option', { title: "A type that can store a geometry of any type", innerHTML: "GEOMETRY", appendTo: spatial });
                Ele('option', { title: "A point in 2-dimensional space", innerHTML: "POINT", appendTo: spatial });
                Ele('option', { title: "A curve with linear interpolation between points", innerHTML: "LINESTRING", appendTo: spatial });
                Ele('option', { title: "A polygon", innerHTML: "POLYGON", appendTo: spatial });
                Ele('option', { title: "A collection of points", innerHTML: "MULTIPOINT", appendTo: spatial });
                Ele('option', { title: "A collection of curves with linear interpolation between points", innerHTML: "MULTILINESTRING", appendTo: spatial });
                Ele('option', { title: "A collection of polygons", innerHTML: "MULTIPOLYGON", appendTo: spatial });
                Ele('option', { title: "A collection of geometry objects of any type", innerHTML: "GEOMETRYCOLLECTION", appendTo: spatial });
                //debugger;
                
                //Entities List
                let lookupEntity = Ele('select', {
                    id: 'si_edit_entities_lookup_select',
                    appendTo: addattr,
                    style: {
                        display: 'none',
                        marginLeft:'15px',
                    },
                    onchange: function () {

                    }
                });
                Ele("option", {
                    value: '',
                    innerHTML: '',
                    appendTo: lookupEntity,
                });
                let ent = SI.Editor.Objects.Entity.Info;
                for (let e in ent) {
                    let entity = ent[e];
                    //create an option tag for each entity
                    Ele("option", {
                        value: e,
                        innerHTML: e,
                        appendTo: lookupEntity,
                    });
                }
                Ele('br', { appendTo: addattr, });
                Ele('span', { id:'si_edit_entities_enum_label', innerHTML: "Comma seperated values:", style: { display: 'none'}, appendTo: addattr });
                let enumvals = Ele('input', {
                    id: 'si_edit_entities_enum_input',
                    style: {
                        display: 'none',
                        width: '300px',
                        marginLeft: '55px',
                    },
                    appendTo: addattr,
                    onchange: function () {
                        let enumchoices = "'"+this.value.replace(/([\'\"])/g, '').split(',').join("','")+"'";
                        this.value = enumchoices;
                    },
                });

                Ele('span', { id: 'si_edit_entities_size_label', innerHTML: "Size:", style: { display: 'none' }, appendTo: addattr });
                let datasize = Ele('input', {
                    type:'number',
                    id: 'si_edit_entities_size_input',
                    style: {
                        display: 'none',
                        width: '300px',
                        marginLeft: '22px',
                    },
                    appendTo: addattr,
                });


                Ele('br', { appendTo: addattr });
                //Deployable switch
                Ele('span', { innerHTML: "Deployable:", appendTo: addattr });
                Ele('input', {
                    id:'si_edit_entities_newattrdeploy',
                    type: 'checkbox',
                    style: {
                        marginLeft: '10px'
                    },
                    title: "Make the field deployable from dev to test to live",
                    appendTo: addattr
                });
                //Default value
                Ele('br', { appendTo: addattr, });
                Ele('span', { innerHTML: "Default:", appendTo: addattr });
                let defaultval = Ele('input', {
                    id: 'si_edit_entities_newattrdefault',
                    style: {
                        width: '295px',
                        marginLeft: '6px',
                    },
                    appendTo: addattr,
                });
                Ele('br', { appendTo: addattr, });

                Ele('button', {
                    innerHTML: 'Add Attribute',
                    style: { marginLeft: '10px' },
                    appendTo: addattr,
                    onclick: function () {
                        //debugger;
                        let name = document.getElementById('si_edit_entities_newattrname').value;
                        let type = document.getElementById('si_edit_entities_newattrtype').value;
                        let lookup = document.getElementById('si_edit_entities_lookup_select').value;
                        let enumchoices = document.getElementById('si_edit_entities_enum_input').value;
                        let size = document.getElementById('si_edit_entities_size_input').value;
                        let deploy = document.getElementById('si_edit_entities_newattrdeploy').checked;
                        let def = document.getElementById('si_edit_entities_newattrdefault').value;

                        let attrBox = Ele('div', {
                            class:'si-edit-entity-newattr',
                            style: {
                                minWidth: '200px',
                                minHeight:'40px',
                                display: 'inline-block',
                                margin: '5px',
                                borderRadius: '5px',
                                padding: '10px',
                                border: '3px groove #111',
                                background: 'radial-gradient(circle, rgba(15,136,226,0.5) 8%, rgba(48,54,135,0.5) 76%, rgba(14,36,41,0.5) 100%)',
                            },
                            data: {
                                name :name,
                                type: type,
                                lookup: lookup,
                                enumchoices: enumchoices,
                                size: size,
                                deploy: deploy,
                                def: def,
                            },
                            appendTo: attributes,
                        });
                        let close = Ele('div', {
                            innerHTML: 'x',
                            style: {
                                width: '16px',
                                height: '14px',
                                backgroundColor: 'firebrick',
                                display: 'inline-block',
                                float: 'right',
                                borderRadius: '2px',
                                textAlign: 'center',
                                paddingBottom: '3px',
                                cursor: 'pointer',
                                border:'2px outset #222',
                            },
                            onclick: function () {
                                this.parentElement.parentElement.removeChild(this.parentElement);
                            },
                            appendTo: attrBox,
                        });


                        let attrname = Ele('span', {
                            class: 'si-edit-entity-newattr-name',
                            innerHTML: "Name: "+name,
                            style: {
                                color: 'white',
                                margin: '2px',
                            },
                            appendTo: attrBox,
                        });
                        Ele('br', { appendTo: attrBox });
                        let attrtype = Ele('span', {
                            class: 'si-edit-entity-newattr-type',
                            innerHTML: "Type: "+type,
                            style: {
                                color: 'white',
                                margin: '5px',
                            },
                            appendTo: attrBox,
                        });


                        if (lookup.length > 0) {
                            Ele('br', { appendTo: attrBox });
                            Ele('span', {
                                class: 'si-edit-entity-newattr-lookupentity',
                                innerHTML: "Lookup Entity: " + lookup,
                                style: {
                                    color: 'white',
                                    margin: '5px',
                                },
                                appendTo: attrBox,
                            });
                        }

                        if (enumchoices.length > 0) {
                            Ele('br', { appendTo: attrBox });
                            Ele('span', {
                                class: 'si-edit-entity-newattr-enumchoices',
                                innerHTML: "Enum Chioces: " + enumchoices,
                                style: {
                                    color: 'white',
                                    margin: '5px',
                                },
                                appendTo: attrBox,
                            });
                        }

                        if (size.length > 0) {
                            Ele('br', { appendTo: attrBox });
                            Ele('span', {
                                class: 'si-edit-entity-newattr-size',
                                innerHTML: "Size: " + size,
                                style: {
                                    color: 'white',
                                    margin: '5px',
                                },
                                appendTo: attrBox,
                            });
                        }

                        if (deploy) {
                            Ele('br', { appendTo: attrBox });
                            Ele('span', {
                                class: 'si-edit-entity-newattr-deploy',
                                innerHTML: "Deployable: " + deploy,
                                style: {
                                    color: 'white',
                                    margin: '5px',
                                },
                                appendTo: attrBox,
                            });
                        }

                        if (def) {
                            Ele('br', { appendTo: attrBox });
                            Ele('span', {
                                class: 'si-edit-entity-newattr-default',
                                innerHTML: "Default: " + def,
                                style: {
                                    color: 'white',
                                    margin: '5px',
                                },
                                appendTo: attrBox,
                            });
                        }

                        document.getElementById('si_edit_entities_newattrname').value = '';
                        document.getElementById('si_edit_entities_newattrtype').value = '';
                        document.getElementById('si_edit_entities_lookup_select').value = '';
                        document.getElementById('si_edit_entities_enum_input').value = '';
                        document.getElementById('si_edit_entities_size_input').value = '';
                        document.getElementById('si_edit_entities_newattrdeploy').checked = true;
                        document.getElementById('si_edit_entities_newattrdefault').value = '';
                        document.getElementById('si_edit_entities_lookup_select').style.display = 'none';
                        document.getElementById('si_edit_entities_size_input').style.display = 'none';
                        document.getElementById('si_edit_entities_enum_input').style.display = 'none';
                        document.getElementById('si_edit_entities_newattrdeploy').checked = false;
                    }
                });

                Ele('br', { appendTo: container });

                let save = Ele('button', {
                    innerHTML: 'Create',
                    style: { marginLeft: '10px' },
                    appendTo: container,
                    onclick: function () {
                        let attrboxes = document.querySelectorAll("#si_edit_entities_attributesbox .si-edit-entity-newattr");

                        let sname = document.getElementById('si_edit_entity_newSname').value;
                        let pname = document.getElementById('si_edit_entity_newPname').value;
                        let global = document.getElementById('si_edit_entities_globalcb').checked;


                        //build the entity
                        let entity = {
                            type: 'entity',
                            KEY: 'NewEntity',
                            sname: sname,
                            pname: pname,
                            global: global,
                            attributes: [],
                        }

                        for (abox of attrboxes) {
                            let i = entity.attributes.push();
                            entity.attributes[i] = {};
                            let data = abox.dataset;
                            for (d in data) {
                                if (data.hasOwnProperty(d)) {
                                    if (data[d].length > 0) {
                                        entity.attributes[i][d] = data[d];
                                    }     
                                }
                            } 
                        }

                        let options = {}
                        options.Data = entity;
                        console.log(entity);
                        SI.Editor.Ajax.Run(options);
                    }
                });

                return container;
            },
            New: function(ev) {
                //debugger;
                //first clear the fields
                SI.Editor.Objects.Entity.ClearFields();
                //then show the form
                let form = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_form_'));
                let entityName = this.id.replace('si_edit_entities_new_', '');
                let view = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_view_'));
                let formdata = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_formdata_'));
                formdata.dataset.recordid = "";
                view.style.display = 'none';
                form.style.display = 'block';
                form.dataset.operation = 'create';
                formdata.dataset.operation = 'create';
            },
            Edit: function(ev) {
                //debugger;
                SI.Editor.Objects.Entity.ClearFields();
                let selEnt = document.getElementById('si_edit_entities_select').value;
                if (selEnt) {
                    let cbs = document.querySelectorAll('.si-edit-entity-checkbox-' + selEnt + ":checked");
                    if (cbs.length > 0) {
                        let formdata = document.getElementById(this.id.replace('si_edit_entity_checkbox_', 'si_edit_entities_formdata_'));
                        formdata.dataset.operation = 'update';
                        let colrow = document.getElementById('si_edit_entity_tableheader_' + selEnt);
                        let cols = colrow.childNodes;
                        let rowid = cbs[0].id.replace('si_edit_entity_checkbox_', 'si_edit_entity_datarow_');
                        let row = document.getElementById(rowid);
                        let recordid = row.dataset.recordid;
                        if (typeof recordid !== 'undefined') {
                            let cells = row.childNodes;
                            if (cols.length > 0) {
                                for (let i = 1; i < cols.length; i++) {
                                    //debugger;
                                    let column = cols[i].innerHTML;
                                    let val = cells[i].innerHTML;
                                    let input = document.getElementById('si_edit_attributes_input_' + selEnt + '_' + column).value = val;
                                }
                                let form = document.getElementById(this.id.replace('si_edit_entities_edit_', 'si_edit_entities_form_'));
                                let view = document.getElementById(this.id.replace('si_edit_entities_edit_', 'si_edit_entities_view_'));
                                view.style.display = 'none';
                                form.style.display = 'block';
                                form.dataset.operation = 'update';
                            }
                        } else {
                            console.error('Datarow does not have an id');
                        }
                    } else {
                        alert("Please select a row to edit it");
                    }
                }
            },
            Close: function(ev) {
                //debugger;
                let self = this;
                let form = document.getElementById(self.id.replace('si_edit_entities_close_', 'si_edit_entities_form_'));
                let view = document.getElementById(self.id.replace('si_edit_entities_close_', 'si_edit_entities_view_'));
                view.style.display = 'block';
                form.style.display = 'none';
            },
            Save: function(ev) {
                //debugger;
                let entity = {};
                let form = document.getElementById(this.id.replace('si_edit_entities_save_', 'si_edit_entities_form_'));
                let entityname = this.id.replace('si_edit_entities_save_', '');
                entity['entityname'] = entityname;
                let formdata = document.getElementById(this.id.replace('si_edit_entities_save_', 'si_edit_entities_formdata_'));
                let oper2 = formdata.dataset.operation;
                let entityAttributes = {};
                let done = false;
                let i = 0;
                while (!done) {
                    if (formdata[i]) {
                        if (!entityAttributes.hasOwnProperty(formdata[i])) {
                            entityAttributes[formdata[i].name] = formdata[i].value;
                            i++;
                        }
                    } else {
                        done = true;
                    }

                }

                entity.attributes = entityAttributes;

                let oper = form.dataset.operation;
                if (typeof oper !== 'undefined') {
                    if (oper === 'create') {

                    } else if (oper === 'update') {

                    }
                }
            },
            PopulateEntityGrid: function (options) {
                //debugger;
                let done = false;
                let entityName = options.Return.Entity.Name;
                let table = document.getElementById("si_edit_entity_table_" + entityName);
                while (table.hasChildNodes()) {
                    table.removeChild(table.firstChild);
                }
                let rownum = 0;
                let columnBlacklist = ['id', 'entity_id']; //we dont need to see these in our grid
                while (!done) {
                    if (rownum === 0) {  //make the table header
                        let header = Ele('tr', {
                            id: 'si_edit_entity_tableheader_' + entityName,
                            style: {
                                maxHeight: '20px',
                            },
                        });
                        Ele('th', {
                            style: {
                                maxHeight: '20px',
                            },
                            innerHTML: "select",
                            appendTo: header,
                        });
                        for (let f in options[0]) {
                            if (columnBlacklist.indexOf(f) === -1) {
                                Ele('th', {
                                    style: {
                                        height: '20px',
                                        border: '1px solid black',
                                    },
                                    innerHTML: f,
                                    appendTo: header,
                                });
                            }
                        }
                        table.appendChild(header);
                    }
                    if (typeof options[rownum] != 'undefined') { //make the data
                        let rowdata = options[rownum];

                        let tr = Ele('tr', {
                            id: 'si_edit_entity_datarow_' + entityName + "_" + rownum,
                            style: {
                                height: '20px',
                            },
                            data: {

                            },
                        });

                        let cbd = Ele('th', {
                            style: {
                                height: '20px',
                                border: '1px solid black',
                            },

                            appendTo: tr,
                        });
                        let cb = Ele("input", {
                            id: 'si_edit_entity_checkbox_' + entityName + "_" + rownum,
                            class: 'si-edit-entity-checkbox-' + entityName,
                            type: 'checkbox',
                            appendTo: cbd,
                            data: {
                                entityname: entityName,
                            },
                            onchange: function () {
                                //debugger;
                                let checked = this.checked;
                                SI.Tools.Class.Loop('si-edit-entity-checkbox-' + this.dataset.entityname, function (ele) { ele.checked = false; })
                                if (checked) {
                                    this.checked = true;
                                } else {
                                    this.checked = false;
                                }
                            },
                        });
                        for (let f in rowdata) {
                            if (columnBlacklist.indexOf(f) === -1) {
                                //debugger;
                                let value = rowdata[f];
                                if (typeof SI.Editor.Objects.Entity.Info[entityName] !== 'undefined' && typeof SI.Editor.Objects.Entity.Info[entityName][f] !== 'undefined') {
                                    fieldAttrs = SI.Editor.Objects.Entity.Info[entityName][f];
                                    //debugger;

                                }
                                try {
                                    if (value && value.indexOf && value.indexOf("</") > -1) {
                                        value = value.replace(/&/g, "&amp").replace(/</g, "&lt");
                                        //  value = "<pre><code> " + value + " </code></pre>";
                                    }
                                } catch (ex) {
                                    console.error("PopulateEntityGrid gt&lt replace error: " + ex.message);
                                }

                                let maxlength = 64;
                                let cellvalue = value;
                                if (cellvalue != null && cellvalue.length > maxlength) {
                                    //debugger;
                                    cellvalue = value.substring(0, maxlength) + "...";
                                } else {
                                    value = "";
                                }

                                let title = "";



                                let td = Ele('td', {
                                    style: {
                                        height: '20px',
                                        overflow: 'auto',
                                        border: '1px solid black',
                                        resize: 'both'
                                    },
                                    data: {
                                        extvalue: value,
                                    },
                                    class: 'si-edit-entity-',
                                    contentEditable: true,
                                    title: title,
                                    innerHTML: cellvalue,
                                    appendTo: tr,
                                    onfocus: function (ev) {
                                        //debugger;
                                        if (this.dataset.extvalue && this.dataset.extvalue.length > 0) {
                                            //we know we have big text. put it in the value so this person can edit it.
                                            this.innerHTML = this.dataset.extvalue;
                                            //this.dataset.extvalue = '';
                                        }

                                    },
                                    onblur: function (ev) {
                                        //debugger;
                                        if (this.innerHTML.length > 64) {
                                            //we know we have big text. put it in the value so this person can edit it.
                                            this.dataset.extvalue = this.innerHTML;
                                            this.innerHTML = this.innerHTML.substring(0, 64) + "...";
                                        }
                                    },
                                });

                                //if (value) {
                                //    if (value.length > 50) {
                                //        title = value.replace(/&amp/g, "&").replace(/&lt/g, "<");
                                //        value = value.substr(0, 50) + '...';
                                //    }
                                //}
                            } else {
                                if (f === 'id') {
                                    tr.dataset.recordid = '0x' + rowdata[f];
                                }
                            }
                        }
                        table.appendChild(tr);
                        rownum++;
                    } else {
                        done = true;
                    }
                }
            },
            ClearFields: function() {
                SI.Tools.Class.Loop("si-edit-entity-form-input", function (ele) { ele.value = '' });
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
            UI: function(options) {
                this.Defaults = {
                    "EntityName": null,
                    "EntityId":null,
                    "Attribute": null,
                    "Parent": null,
                    "LabelMargin":null,
                };
                this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
                if (this.options.EntityName != null && this.options.EntityId != null && this.options.Attribute != null) {
                    let box = Ele("div", {
                        style: {
                            cursor:'default',
                        }
                    });
                    //debugger;
                    //add the label
                    let label = Ele("span", {
                        innerHTML: options.Attribute,
                        appendTo: box,
                    });
                    if (options.LabelMargin) {
                        label.style.marginRight=options.LabelMargin;
                    }
                    let deployments = SI.Editor.Objects.Deployment.Levels;
                    for (deployment in deployments) {
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
            Promoted: function(val) {
                console.log(val);
            },

        },

        User: {
            ChangePassword: function(self) {
                let pw = prompt("Enter the new password", "password");
                if (pw != null) {
                    let cells = self.parentElement.parentElement.children;
                    let id = '0x' + cells[1].innerHTML;
                    let options = {};
                    options.Data = { "KEY": "ChangePassword", "newpassword": pw, "userid": id };
                    SI.Editor.Ajax.Run(options);
                }
            },
            New: function(self) {
                //debugger;
                var email = prompt("Enter the new user's email", "");
                if (email !== null || email.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g)) {
                    var user = prompt("Enter the new user's username", "");
                    if (user == null || user.match(/[A-Za-z0-9_]{3,16}/)) {
                        var password = prompt("Enter the new user's password", "");



                        if (password == null || password.match(<?php $PasswordStrength ?>)) {
                            //we have what we need
                            let options = {};

                            options.Data = { "KEY": "NewUser", "newpassword": password, "email": email, "name": user };

                            SI.Editor.Ajax.Run(options);

                        }
                    }
                }
            },
            Created: function(value) {

            },
            GetRoles: function(self) {  
                //debugger;
                let confcell = self.parentElement;
                let rolewindow = document.getElementById('si_edit_users_rolewindow');
                
                //handle if the role is already in the cell and just hidden
                if (confcell.id == rolewindow.parentElement.id) {
                    if (rolewindow.style.display == 'none') {
                        rolewindow.style.display = 'block';
                    } else {
                        rolewindow.style.display = 'none';
                    }
                    return;
                }
                //uncheck all cbs in rolewindow
                let cbs = rolewindow.querySelectorAll('input');
                cbs.forEach(function (ele) {
                    ele.checked = false;
                });

                rolewindow.style.display = 'block';
                confcell.appendChild(rolewindow);

                let cells = self.parentElement.parentElement.children;
                let id = '0x' + cells[1].innerHTML;
                rolewindow.dataset.userid = id;
                let options = {};
                options.Data = { "KEY": "GetUserRoles", "userid": id };
                SI.Editor.Ajax.Run(options);
            },       
            SetRoles: function(value) {            
                for (let guid in value) {
                    
                    let cb = document.getElementById('si_edit_users_rolecb_' + guid);
                    if (cb) {
                        cb.checked = true;
                        cb.dataset.relid = value[guid]; //relid if deleting
                    }
                }
            },
            UpdateRoles: function(value) {
                let userid = document.getElementById('si_edit_users_rolewindow').dataset.userid;
                let roleguid = '0x'+this.id.replace('si_edit_users_rolecb_', '');
                //debugger;
                let options = {};
                if (this.checked) {
                    options.Data = { "KEY": "AddUserRole", "userid": userid, "roleid": roleguid };
                } else {
                    options.Data = { "KEY": "RemoveUserRole", "relid": '0x'+this.dataset.relid };
                }



                SI.Editor.Ajax.Run(options);
            },
            Delete: function(id) {
                if (typeof id === 'undefined') {
                    let cells = self.parentElement.parentElement.children;
                    id = '0x' + cells[1].innerHTML;
                }

                let options = {};
                options.Data = { "KEY": "DeleteUser", 'id':id };
                SI.Editor.Ajax.Run(options);
            },
        },
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
                // var localtext = SI.Editor.Objects.Entity.Info.localtext.attributes;
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

                for (langopt in installedLangs.children) {
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

                let langtabs =new SI.Widgets.Tabs({
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

                for (langopt in instLangs) {

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
                    for (la in mylangs) {
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
                        entity_id: SI.Editor.Objects.Entity.Info.localtext.instanceguid,//dont need this but its in entities
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
        Plugins: {
            Style: {
                menucolor: '#888',
                selectedtab: 'linear-gradient(180deg, rgba(34,34,34,1) 0%, rgba(51,51,51,1) 35%, rgba(68,68,68,1) 100%)',
                nonselectedtab: 'linear-gradient(0deg, rgba(34,34,34,1) 0%, rgba(51,51,51,1) 35%, rgba(68,68,68,1) 100%)',
                piboxcolor: '#222',
                tabcolor: '#333',
                pagecolor: '#444',
                titlecolor: '#ccc',
                textcolor: '#bbb',
		    },
            Repo: {
                Build: function() {
                    let style = SI.Editor.Objects.Plugins.Style;
                    let container = Ele('div', {});
                    let menu = Ele('div', {
                        id:'si_edit_plugins_repo_menu',
                        style: {
                            width: '100%',
                            height: '100px',
                            backgroundColor: style.menucolor,
                            position: 'relative',
                            paddingLeft: '10px',
                            userSelect: 'none',
                        },
                        appendTo: container,
                    });
                    let content = Ele('div', {
                        id:'si_edit_plugins_repo_content',
                        style: {
                            width: '100%',
                            height: '500px',
                            backgroundColor: style.pagecolor,
                            display: 'flex',
                            flexWrap: 'wrap',
                            overflow: 'scroll',
                        },
                        appendTo: container,
                    });
                    //Tools.StopOverscroll(content);

                    let title = Ele('span', {
                        innerHTML: 'Super Intuitive Plugins',
                        style: {
                            position: 'absolute',
                            top: '15px',
                            left: '15px',
                            color: style.titlecolor,
                            textSize: '18px',
                        },
                        appendTo: menu,
                    });


                    return container;
                },
                Categories: ['All'],
                Plugins:[],
                AddCategory: function(cat) {               
                    let style = SI.Editor.Objects.Plugins.Style;
                    menu = document.getElementById('si_edit_plugins_repo_menu');
                    if (menu) {
                        let h = '24px';
                        let col = style.nonselectedtab;  //style.tabcolor;
                        if (cat === 'All') {
                            h = '25px';
                            col = style.selectedtab; // style.pagecolor;
                        }
                        Ele('div', {
                            innerHTML: cat,
                            style: {
                                width: '100px',
                                height: h,
                                background: col,
                                color: '#bbb',
                                position: 'relative',
                                display: 'inline-block',
                                marginTop: '65px',
                                marginRight: '5px',
                                textAlign: 'center',
                                paddingTop: '10px',
                                cursor: 'pointer',
                                borderRadius: '5px 5px 0px 0px',
                                textTransform:'capitolize',
                            },
                            onclick: function () {
                                //set the tabs
                                let kids = this.parentElement.children;
                                for (k in kids) {
                                    let kid = kids[k];
                                    if (kid.tagName == 'DIV') {
                                        if (kid.innerHTML === this.innerHTML) {
                                            kid.style.height = '25px';
                                            kid.style.background = style.selectedtab ;
                                        } else {
                                            kid.style.height = '24px';
                                            kid.style.background = style.nonselectedtab;
                                        }
                                    }
                                }
                                let cat = this.innerHTML.trim();
                                if (cat === 'All') {
                                    SI.Tools.Class.Show('si-edit-plugins-plugin', 'inline-block');
                                } else {
                                    SI.Tools.Class.Hide('si-edit-plugins-plugin');
                                    //	debugger;
                                    let unhide = 'si-edit-plugins-type-' + cat.toLowerCase();
                                    SI.Tools.Class.Show(unhide, 'inline-block');
                                }
                            },
                            appendTo: menu,
                        });
                    }
                },
                AddPlugin: function(plugin) {
                    let name = plugin['name'];
                    if (SI.Editor.Objects.Plugins.Repo.Plugins.indexOf(name) === -1) {
                        let style = SI.Editor.Objects.Plugins.Style;
                        let container = document.getElementById('si_edit_plugins_repo_content');
                        let type = plugin['type'];
                        let cla = type.replace(/[^0-9a-z]/gi, '');
                        let shortdesc = plugin['shortdesc'];
                        let longdesc = plugin['longdesc'];
                        let author = plugin['author'];
                        let download = plugin['download'];
                        let downloads = plugin['downloads'];
                        let screenshots = plugin['Screenshots'];

                        let pluginbox = Ele('div', {
                            style: {
                                width: '150px',
                                height: '200px',
                                backgroundColor: style.piboxcolor,
                                display: 'table',
                                textAlign: 'center',
                                margin: '10px',
                                border: '2px groove black',
                                borderRadius: '8px',
                            },
                            class: 'si-edit-plugins-plugin si-edit-plugins-type-' + cla,
                            appendTo: container,
                        });
                        Ele('span', {
                            innerHTML: 'Name: ' + name,
                            style: {
                                width: '150px',
                                color: style.textcolor,
                            },
                            appendTo: pluginbox,
                        });
                        Ele('br', { appendTo: pluginbox, });


                        Ele('div', {

                            style: {
                                width: '150px',
                                height: '100px',
                                backgroundColor: 'black',
                            },
                            appendTo: pluginbox,
                        });

                        Ele('button', {
                            innerHTML: 'Download',
                            style: {
                                borderRadius: '7px',
                                padding: '4px',
                                color: '#000',
                            },
                            data: {
                                app: download
                            },
                            onclick: function () {
                                let options = {
                                    Data: {
                                        KEY: 'DownloadPlugin',
                                        appname: this.dataset.app
                                    }
                                };
                                SI.Editor.Ajax.Run(options);
                            },
                            appendTo: pluginbox,
                        });
                        Ele('br', { appendTo: pluginbox, });
                        let infobox = Ele('div', {
                            style: {
                                float: 'right',
                                fontSize: '10px',
                                textTransform: 'capitalize',
                                right: '5px',
                                color: style.textcolor,
                                marginTop: '4px',
                                marginRight:'4px',
                            },
                            appendTo: pluginbox,
                        });
                        Ele('span', {
                            innerHTML: type + '   ▼' + downloads,
                            appendTo: infobox,
                        });
                        Ele('br', { appendTo: infobox, });
                        Ele('span', {
                            innerHTML: 'by: ' + author,
                            appendTo: infobox,
                        });
                        SI.Editor.Objects.Plugins.Repo.Plugins.push(name);

                    }
                },
                GetMorePlugins: function(quant = 50) {
                    let morePlugins = {
                        Data: { KEY: 'GetMorePlugins', quant: quant }
                    };
                    SI.Editor.Ajax.Run(morePlugins);
                },
                StockFetchedPlugins: function(value) {
                    let plugins = JSON.parse(value);      
         
                    for (p in plugins) {
                        let plugin = plugins[p];
                        let type = plugin['type']
                        if (SI.Editor.Objects.Plugins.Repo.Categories.indexOf(type) === -1) {
                            //make the category
                            SI.Editor.Objects.Plugins.Repo.AddCategory(type);
                            SI.Editor.Objects.Plugins.Repo.Categories.push(type);
                        }
                        SI.Editor.Objects.Plugins.Repo.AddPlugin(plugin);
                    }
                },
                DownloadedPlugin: function(plugin) {
                    //debugger;
                    plugin = plugin.replace('.zip', '');
                    document.getElementById('si_edit_plugins_local_content').appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin,false));
                    alert( plugin+ " has been downloaded and is ready to be installed.");

                },
            },
            Local: {
                Build: function() {
                    let style = SI.Editor.Objects.Plugins.Style;
                    let container = Ele('div', {});
                    let menu = Ele('div', {
                        id: 'si_edit_plugins_local_menu',
                        style: {
                            width: '100%',
                            height: '50px',
                            backgroundColor: style.menucolor,
                            position: 'relative',
                            paddingLeft: '10px',
                            userSelect: 'none',
                        },
                        appendTo: container,
                    });
                    let content = Ele('div', {
                        id: 'si_edit_plugins_local_content',
                        style: {
                            width: '100%',
                            height: '550px',
                            backgroundColor: style.pagecolor,
                            overflow: 'scroll',
                        },
                        appendTo: container,
                    });
                    let title = Ele('span', {
                        innerHTML: 'Local Plugins',
                        style: {
                            position: 'absolute',
                            top: '15px',
                            left: '15px',
                            color: style.titlecolor,
                            textSize: '18px',
                        },
                        appendTo: menu,
                    });

                    let installed = SI.Editor.Objects.Plugins.Current;
                    let setup = [];
                    for (plugin in installed) {
                        if (setup.indexOf(plugin) === -1) {
                            content.appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin, installed[plugin]))
                            setup.push(plugin);
                        }
                    }

                    let downloaded = SI.Editor.Objects.Plugins.Downloaded;
                    for (p in downloaded) {
                        let plugin = downloaded[p];
                        plugin = plugin.replace('.zip', '');
                        if (setup.indexOf(plugin) === -1) {
                            content.appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin, false))
                            setup.push(plugin);
                        }
                    }


                    return container;
                },
                AddPlugin: function(name, vals) {
                    let style = SI.Editor.Objects.Plugins.Style;
                    let box = Ele('div', {
                        innerHTML: name,
                        id:'si_edit_plugin_box_'+name,
                        style: {
                            position:'relative',
                            border: '2px solid black',
                            width: '95%',
                            margin: '10px',
                            padding: '10px',
                            border: '2px groove black',
                            borderRadius: '8px',
                            backgroundColor: style.piboxcolor,
                        },

                    });
                    let checked = true;
                    if (vals == false) {
                        checked = false;
                    } 

                    let onoff = Ele('input', {
                        type:'checkbox',
                        checked: checked,
                        appendTo: box,
                        data: {
                            plugin:name,
                        },
                        onchange: function () {
                            if (this.checked) {
                                if (confirm("Are you sure you want to install the plugin: " + this.dataset.plugin)) {
                                    //install the plugin. extract the zip to its neighboring directory
                                    let options = {
                                        Data: {
                                            KEY: "InstallPlugin",
                                            "plugin": this.dataset.plugin
                                        }
                                    }
                                    SI.Editor.Ajax.Run(options);
                                    this.checked = true;

                                } else {
                                    this.checked = false;
                                    return false;
                                }
                            } else {
                                if (confirm("Are you sure you want to remove the plugin: " + this.dataset.plugin+"? You will lose any modifications that you made to this plugin.")) {
                                    //remove the plugin. just delete the directory. leave the zip where it is
                                    let options = {
                                        Data: {
                                            KEY: "UninstallPlugin",
                                            "plugin": this.dataset.plugin
                                        }
                                    }
                                    SI.Editor.Ajax.Run(options);
                                    this.checked = false;

                                } else {
                                    this.checked = true;
                                    return false;
                                }
                            }
                        },
                    });

                    if (vals == true) {
                        //debugger;


                    } 


                    return box;
                },
                Installed: function(plugin){
                    alert('Plugin has been installed'); 
                    //add data to plugin UI and move it above the top uninstalled plugin
                    //add the plugin to Current


                },
                Uninstalled: function(plugin) {
                    alert('Plugin has been removed');
                    //remove data from UI and move it to the bottom
                },
            },
            Editor: {
                Build: function() {
                    this.loaded = '';
                    let container = Ele("div", {
                        style:{
                            width: "100%",
                            height: '600px',
                            backgroundColor: 'blue',
                            backgroundImage: "url('/editor/media/images/underconstruction.png')",
                        }
                    });
                    return container;
                },
            },
            Current: <?= $currentPlugins ?>,
            Downloaded: <?= $downloadedplugs ?>,
        },
        Widgets: {
            List: function() {
                let widgets = ["Window"]

            },
        },
        Settings: {
            Current: <?= $settingsjson ?>,
            New: function(name, value) {
                if (SI.Editor.Objects.Settings.Current.hasOwnProperty(name)) {
                    alert("This setting already exists");
                } else {
                    let options = {
                        Data: {
                            KEY: "NewSetting",
                            settingname: name,
                            settingvalue: value
                        }
                    }
                    console.log(name + " " + value);
                    SI.Editor.Ajax.Run(options);
                }
            },
            Created: function(value) {
                if (value.length == 2) {
                    SI.Editor.Objects.Settings.Add(value[0], value[1]);
                    SI.Editor.Objects.Settigns.Current[value[0]] = value[1];
                }
            },
            Add: function(name,value,table=null) {
                let settingsrow = Ele('tr', {
                });
                let settingname = Ele('th', {
                    innerHTML: name,
                    appendTo: settingsrow,
                });
                let settingvalue = Ele('td', {
                    appendTo: settingsrow,
                });

                let settingedit = Ele('input', {
                    value: value,
                    data: {
                        name: name,
                    },
                    onchange: SI.Editor.Objects.Settings.Update,
                    appendTo: settingvalue,
                });

                let settingdelete = Ele('input', {
                    type: 'button',

                    data: {
                        name: name,
                    },
                    style: {
                        position: 'relative',
                        top: '5px',
                        marginLeft:'5px',
                        width: '20px',
                        height: '20px',
                        backgroundSize: 'cover',
                        backgroundImage: "url('/editor/media/icons/deleteButton.png')",
                    },
                    onclick: SI.Editor.Objects.Settings.Delete,
                    appendTo: settingvalue,
                });

                if (!table) {
                    document.getElementById('si_edit_settings_table').appendChild(settingsrow);
                } else {
                    table.appendChild(settingsrow);
                }
            },
            Update: function(ev){
                let self = this;
                //debugger;
                let options = {
                    Data: {
                        KEY: "UpdateSetting",
                        settingname: this.dataset.name,
                        settingvalue: this.value
                    }
                }
                SI.Editor.Ajax.Run(options);

            },
            Delete: function(ev) {
                let self = this;
                //debugger;
                let options = {
                    Data: {
                        KEY: "DeleteSetting",
                        settingname: this.dataset.name,
                        index:this.parentElement.parentElement.rowIndex,
                    }
                }
                SI.Editor.Ajax.Run(options);

            },
            Deleted: function(value) {
                if (value.length == 2) {
                    let name = value[0];
                    let ind = value[1];
                    document.getElementById('si_edit_settings_table').deleteRow(ind);
                    if (SI.Editor.Objects.Settings.Current.hasOwnProperty(name)) {
                        delete SI.Editor.Objects.Settings.Current[name];
                    }
                }
            },
            Help: {
                Sites: {
                    mdn: {
                        types: ['tags','styles'],
                        company: "mozilla",
                        domain: 'https://developer.mozilla.org',
                    },
                    w3:{
                        types: ['attributes', 'tags', 'styles'],
                        company: "w3schools",
                        domain: 'https://www.w3schools.com',
                    },
                    dphp: {
                        types: [],
                        company: "developphp",
                        domain: 'https://www.developphp.com',
                    },

                },
                Show: function(type, codeobj, appendTo) {
                    for (let site of SI.Editor.Code.User.HelpLinks) {
                        if (site in SI.Editor.Objects.Settings.Help.Sites && site in codeobj) {
                            let obj = SI.Editor.Objects.Settings.Help.Sites[site];
                            let types = obj.types;
                            if (types.includes(type)) {
                                let company = obj.company;
                                let domain = obj.domain;
                                let path = domain + codeobj[site];
                                appendTo.appendChild(IconLink({ "IconUrl": '/editor/media/icons/' + company + '.png', "Link": path, "Type": 'td', "Title": "Look up " + codeobj.n+" on " + company }));
                            }
                        }
                    }

                }

            },
        },
        SecurityRoles: {
            Draw: function () {
                let base = Ele('div', {
                    id: "si_edit_security_base",
                    style: {
                        width: "100%",
                        height: "100%",
                        overflow: "scroll",
                        backgroundColor: 'teal',
                        color: SI.Editor.Style.TextColor,
                    },
                });

                let roleFs = Ele('fieldset', {
                    id: "si_edit_security_rolesfs",
                    style: {
                        marginTop: '10px',
                        backgroundColor: 'black',
                    },
                    append: Ele("legend", {
                        innerHTML: "Roles",
                    }),
                    appendTo: base,
                });

                let newRollBtn = Ele('input', {
                    type: 'button',
                    value: 'New Role',
                    onclick: SI.Editor.Objects.SecurityRoles.New,
                    appendTo: roleFs,
                });
                let srdata = SI.Editor.Objects.SecurityRoles.Current;
                for (let i in srdata) {
                    let roleent = srdata[i];
                    roleFs.appendChild(SI.Editor.Objects.SecurityRoles.DrawRoleControls(roleent));
                }

                SI.Editor.UI.Security.Window.Append(base);
            },
            Operations: ['create', 'read', 'write', 'append', 'appendTo', 'delete'],
            DrawRoleControls: function(roleent) {
                    let rolenameid = SI.Tools.Element.SafeId(roleent.name);
                    let roleFs = Ele('fieldset', {
                        id: "si_edit_security_rulefs_" + rolenameid,
                        style: {
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                        },
                        append: Ele("legend", {
                            innerHTML: roleent.name,
                            style: {
                                cursor: 'pointer',
                            },
                            onclick: SI.Editor.Objects.SecurityRoles.ShowHideRole,
                        }),
                    });

                    roleentid = "NEW";
                    if (roleent.id) {
                        roleentid = '0x' + roleent.id;
                    }

                    let controlbox = Ele('section', {
                        class: 'si-edit-security-entity-box-' + rolenameid,
                        style: {
                            display: 'block',
                        },
                        appendTo: roleFs,
                    });

                    if (roleent.name != 'Admin') {
                        let ruleSave = Ele('input', {
                            id: "si_edit_security_rule_update_" + rolenameid,
                            value: 'Save',
                            type: 'button',
                            data: {
                                roleid: roleentid,
                                rolename: roleent.name,
                            },
                            style: {
                                margin: '3px',
                            },
                            appendTo: controlbox,
                            onclick: SI.Editor.Objects.SecurityRoles.Update,
                        });
                    }

                    if (roleent.name != 'Admin' && roleent.name != 'Guest') {
                        let ruleDelete = Ele('input', {
                            id: "si_edit_security_rule_delete_" + rolenameid,
                            value: 'Delete',
                            type: 'button',
                            data: {
                                roleid: roleentid,
                                rolename: roleent.name,
                            },
                            style: {
                                margin: '3px',
                            },
                            appendTo: controlbox,
                            onclick: SI.Editor.Objects.SecurityRoles.Delete,
                        });
                    }

                    let rules = roleent.rules;
                    for (let rule in rules) {
                        let myrule = rules[rule];

                        let rulebox = Ele('div', {
                            class: "si-edit-security-entity-box-" + rolenameid,
                            style: {
                                display: 'inline-block',
                                backgroundColor: "grey",
                                margin: '3px',
                                border: "1px solid lightgrey",
                                padding: '3px',
                            },
                            appendTo: roleFs,
                        });
                        let rulename = Ele('span', {
                            id: "si_edit_security_rulename_" + myrule.name,
                            innerHTML: '<b>' + myrule.name + "</b><br />",
                            style: {
                                color: 'black',
                            },
                            data: {
                                id: rule,
                            },
                            appendTo: rulebox,
                        });
                        for (let o in SI.Editor.Objects.SecurityRoles.Operations) {

                            let op = SI.Editor.Objects.SecurityRoles.Operations[o];

                            let rulecb = Ele('input', {
                                id: "si_edit_security_rule_" + rolenameid + "_" + op + "_" + myrule.name,
                                type: 'checkbox',
                                appendTo: rulebox,
                                style: {
                                    float: 'right',
                                },
                            });

                            let rulelabel = Ele('label', {
                                innerHTML: op,
                                for: "si_edit_security_rule_" + rolenameid + "_" + op + "_" + myrule.name,
                                appendTo: rulebox,
                                style: { float: 'right', fontSize: "small", fontWeight: "bold" },
                            });


                            Ele('br', { appendTo: rulebox, });
                            if (myrule[op] == 'true') {
                                rulecb.checked = true;
                            }
                        }
                    }
                    return roleFs;
                },
            ShowHideRole: function() {
                let name = SI.Tools.Element.SafeId(this.innerHTML);

                let eles = document.querySelectorAll(".si-edit-security-entity-box-" + name);
                if (eles) {
                    if (eles[0].style.display == "block") {
                        for (e in eles) {
                            if (typeof eles[e] !== 'undefined' && typeof eles[e].style !== 'undefined') {
                                eles[e].style.display = 'none';
                            }

                        }
                    } else {
                        for (e in eles) {
                            if (typeof eles[e] !== 'undefined' && typeof eles[e].style !== 'undefined')
                                if (eles[e].tagName == "DIV") {
                                    eles[e].style.display = "inline-block";
                                } else {
                                    eles[e].style.display = "block";
                                }

                        }
                    }
                }
            },
            Current: <?php echo $rolesdata ?>,
            New: function() {
                var result = window.prompt('Enter a new role name:');
                if (result) {
                    console.log("Createing Role: " + result);
                    let entities = SI.Editor.Objects.Entity.Info;
                    let obj = {};
                    obj.name = result;
                    obj.rules = {};
                    for (let e in entities) {
                        let entity = entities[e];
                        let entityid = entity.instanceguid.toLowerCase();
                        obj.rules[entityid] = {};
                        obj.rules[entityid].name = e;
                        obj.rules[entityid].create = false;
                        obj.rules[entityid].read = false;
                        obj.rules[entityid].write = false;
                        obj.rules[entityid].append = false;
                        obj.rules[entityid].appendTo = false;
                    }
                    let base = document.getElementById('si_edit_security_rolesfs');
                    let ui = SI.Editor.Objects.SecurityRoles.DrawRoleControls(obj);
                    base.appendChild(ui);

                   // SI.Editor.Objects.SecurityRoles.Update(null, ui );
                }
            },
            Updated: function(value) {
                //debugger;
                if (value !== true ) {
                    if (value.CreatedId) {
                        if (value.Return) {
                            if (value.Return.Query) {
                                if (value.Input) {
                                    if (value.Input.RoleName) {
                                        for (let i in value.Return.Query) {
                                            let button = document.getElementById(value.Return.Query[i]);
                                            if (button) {
                                                button.dataset.roleid = value.CreatedId;
                                                button.dataset.rolename = value.Input.RoleName.replace('_', " ");
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }               
                }   
            },
            Add: function(value) {

            },
            Update: function(ev, self) {
                if (typeof self === 'undefined') {
                    self = this;
                }
               //debugger;
                let entity = {};
                entity.Id = self.dataset.roleid;
                entity.Name = "securityroles";
                entity.Attributes = {};
                entity.Attributes.name = self.dataset.rolename;
                let ops = SI.Editor.Objects.SecurityRoles.Operations;
                let rolename = self.id.replace("si_edit_security_rule_update_", "");
                let rolenameid = SI.Tools.Element.SafeId(rolename);
                let fsid = 'si_edit_security_rulefs_' + rolenameid;
                let entities = document.querySelectorAll("#" + fsid + " span");
                let json = {};
                for (let e in entities) {
                    if (entities.hasOwnProperty(e)) {
                        let id = entities[e].dataset.id;
                        json[id] = {};
                        let name = entities[e].id.replace("si_edit_security_rulename_", "");
                        json[id]["name"] = name;
                        for (let o in ops) {
                            let op = ops[o];
                            let cbid = "si_edit_security_rule_" + rolename + "_" + op + '_' + name;
                            let cb = document.getElementById(cbid);
                            if (!cb) {
                                alert(cbid);
                            }
                            //debugger;
                            if (cb.checked) {
                                json[id][ops[o]] = 'true';
                            } else {
                                json[id][ops[o]] = 'false';
                            }
                        }
                    }
                }
                entity.Attributes.rules = json;
                let options = {};
                options.Data = {};
                if (entity.Id == "NEW") {
                    options.Data.Operation = 'Create';
                } else {
                    options.Data.Operation = 'Update';
                }
                options.Data.Entity = entity;
                options.Data.RoleName = rolename;
                options.Callback = SI.Editor.Objects.SecurityRoles.Updated;
                options.Data.ReturnQuery = ['si_edit_security_rule_update_' + rolename, 'si_edit_security_rule_delete_' + rolename];
                //debugger;
                SI.Tools.Api.Send(options);

            },
            Delete: function(ev) {
                if (confirm("This will delete this role and any references to it. Are you sure?")) {
                    //debugger;
                    if (this.dataset.roleid == 'NEW') {
                        SI.Editor.Objects.SecurityRoles.Deleted (SI.Tools.Element.SafeId(this.dataset.rolename))
                    } else {
                        let options = {
                            Data: {
                                KEY: "DeleteRole",
                                roleid: this.dataset.roleid,
                                rolename: SI.Tools.Element.SafeId(this.dataset.rolename),
                            }
                        }
                        SI.Editor.Ajax.Run(options); 
                    }
                }
            },
            Deleted: function(value) {
                let id = "si_edit_security_rulefs_" + value;
                let fs = document.getElementById(id); 
                if (fs) {
                    let par = fs.parentElement;
                    if (par) {
                        par.removeChild(fs);
                    }
                }
            },
        },
        Alerts: {
            StaticMove:"The element\'s positioning is static thus it cannot be moved. To move the element, first change the css position property",

        },
    },
    Ajax: {
        Run: function (options) {
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
           
            for (var prop in json) {
                if (json.hasOwnProperty(prop)) {
                    //debugger;
                    let value = json[prop];
                    switch (prop) {
                        case "CREATEELEMENT": editor.Code.Tools.CreateEditorElement(prop);
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
                        case "PROMOTED": SI.Editor.Objects.Deployment.Promoted(value, options); break;

                        //Media
                        case "FILEPROMOTED": SI.Editor.Objects.Media.Promoted(value); break;
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
                        case 'ROLEDELETED': SI.Editor.Objects.SecurityRoles.Deleted(value); break;
                        case 'ROLEDELETED': SI.Editor.Objects.SecurityRoles.Created(value); break;
                    }
                }
            }
            //console.log(json);
        },  
    },
}
SI.Editor.Run();

    <?php 
    }  //End the above role security if
    ?>
