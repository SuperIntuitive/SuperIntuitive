if(!SI.Widgets.CodePad){SI.Widgets.CodePad = {}};
SI.Widget.CodePad = function (options) { 
    if (!(this instanceof SI.Widget.CodePad)) { return new SI.Widget.CodePad(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("CodePad");}
    this.Input = {...options};
    SI.Widgets.CodePad[this.Id] = this;

    this.Defaults = {
        "Parent": { "value": null, "type": "attr.parentElement", "affected": '#'+this.Id  },
        "Position": { "value": "absolute", "type": "style.position", "affected": '#'+this.Id  },
        "Display": { "value": "block", "type": "style.display", "affected": '#'+this.Id  },
        "Width": { "value": "30em", "type": "style.width", "affected": '#'+this.Id  },
        "Height": { "value": "20em", "type": "style.height", "affected": '#'+this.Id  },
        "Top": { "value": "0px", "type": "style.top", "affected": '#'+this.Id  },
        "Left": { "value": "0px", "type": "style.left", "affected": '#'+this.Id  },
        "DarkBackgroundImage":{ "value": "url('/scripts/widgets/media/images/chalkboard.jpg')", "type": "style.background-image","affected": '#'+this.Id },
        "LightBackgroundImage":{ "value": "url('/scripts/widgets/media/images/whiteboard.jpg')", "type": "style.background-image","affected": '#'+this.Id },
        "Border": { "value": "0", "type": "style.border", "affected": '#'+this.Id  },
        "TabIndex": { "value": "0", "type": "attr.tabindex", "affected": '#'+this.Id  },
        "Language": { "value": "js", "type": "cust.codeLanguage"},
        "TabSize": { "value": "4", "type": "style.tab-size", "affected": '#'+this.Id }
    };
    //debugger;
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    //for event handelers
    options = this.Options;

    this.ActiveCode;
    this.LanguageSyntax={  };

    this.LoadedScript= null;
    this.LoadedType= null;
    this.SyntaxLoaded= false;
    this.Container =null;
    this.SelectorMenu=null;
    this.Codeview=null;
    this.Codepad=null;





    let self = this;
    let backgroundImage, textColor;

    if(SI.Theme.UserPreference === 'dark'){
        backgroundImage= this.Options.DarkBackgroundImage;
        textColor="#EEE";
    }else{
        backgroundImage= this.Options.LightBackgroundImage;
        textColor="#111";
    }

    this.Container = Ele("pre", {
        id: this.Id,
        class: "si-widget si-widget-codepad",
        contentEditable:"true",
        tabindex: this.Options.TabIndex,
        style: {
            position: this.Options.Position,
            display: this.Options.Display,
            backgroundImage: backgroundImage,
            width: this.Options.Width,
            height: this.Options.Height,
            top: this.Options.Top,
            left: this.Options.Left,
            border: this.Options.Border,
            position: "absolute",
            tabSize: this.Options.TabSize,
            margin: '0px',
            marginLeft: '65px',
            textShadow: '1px 1px 2px #555',
            fontFamily: 'Inconsolata',
            overflow:"auto",
            outline:'none',
        },

        onscroll: function(){
            self.LineNumbers.style.height = this.scrollHeight+'px';
        },
        onclick:function(e){
            e.preventDefault();
        },
        onkeydown: function (e) {
        /*
            debugger;
            let pad = e.target;
            let doc = pad.ownerDocument.defaultView;
            let sel = doc.getSelection();
            let range = sel.getRangeAt(0);
            if (e.keyCode === 9) { //TAB KEY
                e.preventDefault();
                var tabNode = document.createTextNode("\t");
                range.insertNode(tabNode);
                range.setStartAfter(tabNode);
                sel.removeAllRanges();
                sel.addRange(range);
                return false;
            }
            */
        },
        onkeyup: function (e) {
            let code = e.keyCode;
            switch (code) {
                case 9:
                    e.preventDefault();
                    return false;
                case 37: break;
                debugger;
                    if (window.getSelection) {

                        sel = window.getSelection();
                    }
                    break;
                case 191:
                    if (e.ctrlKey) {
                       // SI.Editor.Objects.Scripter.HighlightSyntax(this);
                    } else if (e.altKey) {
                       // SI.Editor.Objects.Scripter.ComputeLineNumbers();
                    }
                    break;
            }
        },
    });
    this.LineNumbers = Ele("pre", {
        id: this.Id+"_linenumbers",
        style: {
            position: 'absolute',
            width: '45px',
            left:'0px',
            top:'0px',
            minHeight:'100%',
            overflow: 'hidden',
            textAlign: 'right',
            borderRight: '5px ridge rgba(39, 40, 60,.5)',
            backgroundImage: 'linear-gradient(to right,	#445566, #112233, #001122, #000)',
        },     
        contentEditable:"false",
        ondragenter: function (e) { e.preventDefault(); },
        ondragover: function (e) { e.preventDefault(); },
        ondragleave: function (e) { },
        ondrop: function (e) { },
        appendTo: this.Container
    });




    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }

    this.GetLanguage= function(language){
        //So that we dont always have to load these json files, we will put their data in local storage.
        //We also put the last modified date in local storage so that if the server file is newer than the local data we download the updated copy.
        //debugger;
        //request the last modified date of this language file from the server
        let dataAgeRequest = new XMLHttpRequest();
        dataAgeRequest.open('GET', '/scripts/widgets/media/data/dataage.php?language='+language, true);
        dataAgeRequest.onload = function() {
            if (dataAgeRequest.status >= 200 && dataAgeRequest.status < 400) {    
                //The server data last modified timestamp
                var serverDataAge = dataAgeRequest.responseText;
                //The client data last modified timestamp
                let localDataAge = language + "_modified";
                localDataAge = localStorage.getItem(localDataAge); 
                //Need new code bool
                let getNewCode = false;
                //If there is NO data on the clinet, get new data
                if(!localDataAge){
                    getNewCode = true;
                }
                //if the server timestamp is greater(newer), get new data
                if(serverDataAge > localDataAge){
                    getNewCode = true;
                }
                //if we need to get new language data
                if(getNewCode){
                    //Create a request for the data. 
                    let updatedLanguageRequest = new XMLHttpRequest();
                    //Tell it what language we want in the query string
                    updatedLanguageRequest.open('GET', '/scripts/widgets/media/data/'+language+".json", true);
                    updatedLanguageRequest.onload = function() {
                        if (updatedLanguageRequest.status >= 200 && updatedLanguageRequest.status < 400) {
                          
                            //Overwrite our old data with new data
                            SI.Tools.Storage.OverwriteStorage("codepad-"+language, updatedLanguageRequest.responseText);
                            //Overwrite our old timestamp with the new timestamp.
                            SI.Tools.Storage.OverwriteStorage(language + "_modified", serverDataAge);
                            self.DefineLanguage(language);
                            return;
                        }
                    };
                    updatedLanguageRequest.onerror = function(er) {
                        SI.Tools.SuperAlert(er.message,4000);
                    };
                    updatedLanguageRequest.send();
                }else{
                    self.DefineLanguage(language);
                }
            }
        };
        dataAgeRequest.onerror = function(er) {
            SI.Tools.SuperAlert(er.message,4000);
        };
        dataAgeRequest.send();
    }
    this.DefineLanguage = function(language){
        let langData = JSON.parse(localStorage.getItem("codepad-"+language));
        //loop through the objects and put them in the LanguageSyntax object.
        switch(language){
            case "js":
                this.ParseJavascript(langData);
                break;
            case "css":this.DefineCSS();
                break;
        }
    }
    this.ParseJavascript=function(langData){
        this.LanguageSyntax={ keywords:{},objects:[],functions:{},properties:{}, higharchy: langData };
        debugger;
        for(let val in langData){
            if(langData.hasOwnProperty(val)){

                
                //pretty much 4 categories. the others are determined differently with regex or something. 
                //keywords
                //objects
                //function
                //properties
                this.LanguageSyntax.objects.push(val);
                let obj = langData[val];
                for(let stuff in obj){
                    if(obj.hasOwnProperty(stuff)){                 
                        if(val === "Statements"){
                            this.LanguageSyntax.keywords[stuff] = langData[val][stuff];
                        }else{
                            switch(langData[val][stuff].type){
                                case "function": 
                                    if(!this.LanguageSyntax.functions[val]){
                                        this.LanguageSyntax.functions[val] = {};
                                    }
                                    this.LanguageSyntax.functions[val][stuff] = langData[val][stuff]; 
                                    break;
                                case "event" : 
                                    if(!this.LanguageSyntax.properties[val]){
                                        this.LanguageSyntax.properties[val] = {};
                                    }
                                    this.LanguageSyntax.properties[val]["on"+stuff] = langData[val][stuff]; 
                                    break;
                                case "property": 
                                    if(!this.LanguageSyntax.properties[val]){
                                        this.LanguageSyntax.properties[val] = {};
                                    }
                                    this.LanguageSyntax.properties[val][stuff] = langData[val][stuff]; 
                                    break;
                            }
                        }
                    }
                }
            }

        }
debugger;
    };
    this.DefineElements = function(){
        //To be less verbos make our own tags
        if (!SI.Widgets.CodePad.ElementsDefined) { //only do this once
            //create html elements for all of the script types that we can pick  
            /*
            'cp-rxp'  //Regular Expression
            'cp-lnm' //line number
            'cp-com'  //comment
            'cp-sym'  //symbol
            'cp-kwd'  //keywords
            'cp-sqt'  //single quotes
            'cp-dqt'  //double quotes
            'cp-obj'  //objects
            'cp-fnc'  //function
            'cp-prp'  //properties
            'cp-url'  //urls
            */
            window.customElements.define('cp-rxp', class extends HTMLElement { //Regular Expression
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-lnm', class extends HTMLElement { //line number
                constructor() {
                    super();
                }
            });   
            window.customElements.define('cp-com', class extends HTMLElement { //comment
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-sym', class extends HTMLElement {//symbol
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-kwd', class extends HTMLElement { //keywords
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-sqt', class extends HTMLElement { //single quotes
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-dqt', class extends HTMLElement { //double quotes
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-obj', class extends HTMLElement { //object - classes
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-fnc', class extends HTMLElement { //functions
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-prp', class extends HTMLElement { //properties
                constructor() {
                    super();
                }
            });
            window.customElements.define('cp-url', class extends HTMLElement { //url
                constructor() {
                    super();
                    this.addEventListener('dblclick', e => {
                        if (!this.disabled) {
                            window.open(this.innerHTML, '_blank');
                        }
                    });
                }
            });

            SI.Widgets.CodePad.ElementsDefined = true;
        }

    }

    this.InitLineNumbers = function (count = 1) {
        let total = self.LineNumbers.children.length;
        for (let i = 1; i < total + count; i++) {
            self.LineNumbers.appendChild(Ele('cp-lnm', { innerHTML: i }));
        }
    }

    this.AddLineNumbers = function () {
        let num = self.LineNumbers.children.length +1;
        self.LineNumbers.appendChild(Ele('cp-lnm', { innerHTML: num }));
    }


    this.DefineElements();
    this.GetLanguage(this.Options.Language);
    this.InitLineNumbers(14);









    this.Draw= function () {
    
            
            //debugger;
            SI.Editor.Objects.Scripter.Container = Ele("div", {
                id: "si_scripter_container",
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    width: '100%',
                    height: '100%',
                },
    
            });
    
            //Drw the Main menu
            let mainmenu = Ele("div", {
                id: "si_scripter_mainmenu",
                style: {
                    backgroundColor: "grey",
                    width: '100%',
                    height: '20px',
                },
    
                appendTo: SI.Editor.Objects.Scripter.Container,
    
            });
            let codeOrGuiCbLabel = Ele("label", {
                innerHTML: "Code",
                for: "si_scripter_codeorguidcb",
                appendTo: mainmenu,
            });
            let codeOrGuiCb = Ele("input", {
                id: "si_scripter_codeorguidcb",
                type: "checkbox",
                checked: 'checked',
                onclick: function (e) {
                    if (this.checked) {
                        document.getElementById('si_scripter_codeview').style.display = 'block';
                    } else {
                        document.getElementById('si_scripter_codeview').style.display = 'none';
                    }
                },
                appendTo: codeOrGuiCbLabel,
            });
            //Draw the script selector box
            let scriptSelect = Ele("select", {
                id: "si_scripter_scriptselect",
                appendTo: mainmenu,
                onchange: function (ev) {
                    let option = this.options[this.selectedIndex];
                    let scriptname = this.value;
                    let type = option.getAttribute('data-sourcetype');
                    let script = null;
                    switch (type) {
                        case "Block":
                            SI.Editor.Objects.Scripter.OpenScript(scriptname, type);
                            break;
                        case "Plugin":
                            let parent = option.parentElement.label.trim();
                            SI.Editor.Objects.Scripter.OpenScript(scriptname, type, parent);
                            break;
                        case "Script": script = null; break;//SI_StyleSheetsLibrary[stylesheet].style; break;  for now
                        default: alert("No known group type. Can't get script"); return;
                    }
    
                }
            });
            //Add the blocks to the selector menu
            //Add blocks to the dropdown list
            if (Object.keys(SI.Editor.Data.Objects.Blocks).length > 0) {
                let bgroup = Ele("optgroup", {
                    label: "Blocks",
                    appendTo: scriptSelect,
                });
    
                for (let block in SI.Editor.Data.Objects.Blocks) {
                    Ele("option", {
                        innerHTML: "\t" + block,
                        appendTo: bgroup,
                        data: {
                            sourcetype: "Block",
                        }
                    });
                }
            }
            //add plugins to the list
            if (Object.keys(SI.Editor.Data.Objects.Plugins.Current).length > 0) {
                let pgroup = Ele("optgroup", {
                    label: "Plugins",
                    appendTo: scriptSelect,
                });
    
                for (let plugin in SI.Editor.Data.Objects.Plugins.Current) {
                    let sgroup = Ele("optgroup", {
                        label: "    " + plugin,
                        appendTo: scriptSelect,
                    });
                    let scripts = SI.Editor.Data.Objects.Plugins.Current[plugin]['scripts'];
                    for (let script in scripts) {
                        Ele("option", {
                            innerHTML: "\t" + script,
                            appendTo: sgroup,
                            data: {
                                sourcetype: "Plugin",
                            }
                        });
                    }
    
                }
            }
    
            //update codeview
            let updateCodeview = Ele("input", {
                type: 'button',
                style: {
                    marginLeft: "8px",
                },
                value: "Update",
                onclick: this.BuildScript,
                appendTo: mainmenu,
            });
    
            //update codeview
            let savescript = Ele("input", {
                type: 'button',
                style: {
                    marginLeft: "8px",
                },
                value: "Save",
                onclick: this.SaveScript,
                appendTo: mainmenu,
            });
    
            //Workspace
            SI.Editor.Objects.Scripter.Workspace = Ele("div", {
                id: "si_scripter_workspace",
                style: {
                    position: 'absolute',
                    width: '100%',
                    height: '95%',
                    backgroundColor: SI.Editor.Style.FavoriteColor,
                    overflow: 'auto',
                },
                ondragenter: function (e) { e.preventDefault(); },
                ondragover: function (e) { e.preventDefault(); },
                ondragleave: function (e) { },
                ondrop: function (e) { },
                appendTo: SI.Editor.Objects.Scripter.Container
            });
            //Codeview
            SI.Editor.Objects.Scripter.Codeview = Ele("div", {
                id: "si_scripter_codeview",
                style: {
                    position: 'absolute',
                    width: '100%',
                    height: '96%',
                    backgroundColor: '#282e2b',
                    overflow: 'auto',
                    backgroundImage: "url('/editor/media/images/chalkboard.jpg')",
    
                },
                ondragenter: function (e) { e.preventDefault(); },
                ondragover: function (e) { e.preventDefault(); },
                ondragleave: function (e) { },
                ondrop: function (e) { },
                appendTo: SI.Editor.Objects.Scripter.Container
            });
            let linenums = Ele("pre", {
                id: "si_scripter_linenums",
                style: {
                    position: 'absolute',
                    width: '45px',
                    overflow: 'hidden',
                    fontFamily: 'Inconsolata',
                    textAlign: 'right',
                    paddingRight: '5px',
                    paddingTop: '13px',
                    marginTop: '0px',
                    borderRight: '5px ridge rgba(39, 40, 60,.5)',
                    backgroundImage: 'linear-gradient(to right,	#445566, #112233, #001122, #000)',
                },
                ondragenter: function (e) { e.preventDefault(); },
                ondragover: function (e) { e.preventDefault(); },
                ondragleave: function (e) { },
                ondrop: function (e) { },
                appendTo: SI.Editor.Objects.Scripter.Codeview
            });
            SI.Editor.Objects.Scripter.Codepad = Ele('pre', {
                id: 'si_scripter_codepad',
                class: 'si-scripter-codepad',
                contentEditable: "True",
                style: {
                    color: 'white',
                    position: "absolute",
                    tabSize: '4',
                    top: '13px',
                    left: '0px',
                    width: "97%",
                    height: "94%",
                    margin: '0px',
                    marginLeft: '65px',
                    textShadow: '1px 1px 2px #555',
                    fontFamily: 'Inconsolata',
                     
                },
                onkeydown: function (e) {
                    debugger;
                    let pad = e.target;
                    let doc = pad.ownerDocument.defaultView;
                    let sel = doc.getSelection();
                    let range = sel.getRangeAt(0);
                    if (e.keyCode === 9) { //TAB KEY
                        e.preventDefault();
                        var tabNode = document.createTextNode("\t");
                        range.insertNode(tabNode);
                        range.setStartAfter(tabNode);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        return false;
                    }
                },
                onkeyup: function (e) {
                    let code = e.keyCode;
                    switch (code) {
                        case 9:
                            e.preventDefault();
                            return false;
                        case 37: break;
                        case 191:
                            if (e.ctrlKey) {
                                SI.Editor.Objects.Scripter.HighlightSyntax(this);
                            } else if (e.altKey) {
                                SI.Editor.Objects.Scripter.ComputeLineNumbers();
                            }
                            break;
                    }
                },
    
                appendTo: SI.Editor.Objects.Scripter.Codeview
            });
            SI.Tools.Text.FingAutoCorrect(SI.Editor.Objects.Scripter.Codepad);
          //  SI.Tools.Events.Fire(scriptSelect, "change");
            return SI.Editor.Objects.Scripter.Container;
    };
    this.OpenScript= function (name, type, parent = null) {
    
            //Clear the workspace
            SI.Editor.Objects.Scripter.Workspace.innerHTML = '';
            //Clear the codepad
            SI.Editor.Objects.Scripter.Codepad.innerHTML = '';
    
            let script = false;
            switch (type) {
                case "Block":
                    script = SI.Tools.Object.GetIfExists("SI.Editor.Data.Objects.Blocks." + name + ".script");
                    break;
                case "Plugin":
                    if (parent !== null) {
                        script = SI.Tools.Object.GetIfExists("SI.Editor.Objects.Plugins.Current." + parent + ".scripts" + name);
                    }
                    break;
                case "Script": script = null; break;//maybe add other types, widgets stands out
                default: alert("No known group type. Can't get script"); return;
            }
            //debugger;
    
    
                SI.Editor.Objects.Scripter.LoadedScript = name;
                SI.Editor.Objects.Scripter.LoadedType = type;
    
                SI.Editor.Objects.Scripter.LoadScriptCode(script);
    
    
    };
    this.LoadScriptCode= function (script) {  
            if (script) {
                SI.Editor.Objects.Scripter.Codepad.innerHTML = script.replaceAll(">", "&gt;").replaceAll("<", "&lt;");//lose the html breakers
                //this functino will run through a codepad and highlight the syntax of the javascript
                //Nice to see how long the script takes
                let rand = SI.Tools.String.RandomString(); //required becuase there does not seem to be a way to reset these things. 
                console.time("si-loadScript" + rand);
                this.HighlightSyntax(SI.Editor.Objects.Scripter.Codepad);
                numlines = this.ComputeLineNumbers();
                if (numlines === 1) {
                    this.AddLineNumbers(30);
                }
                console.timeLog("si-loadScript" + rand);
            }
    };
    this.SaveScript= function () {
            //debugger;
            let s = this;
            //   let casheStyle = SI_BlockLibrary
            let scripttype = SI.Editor.Objects.Scripter.LoadedType;
            let scriptname = SI.Editor.Objects.Scripter.LoadedScript;
            let code = SI.Editor.Objects.Scripter.Codepad.innerText;
            if (scripttype === 'Block') {
                SI.Editor.Data.Objects.Blocks[scriptname].script = code;
                SI.Editor.Objects.Blocks.Save(scriptname, 'script');
                //update everything so we dont need to reload
                let currentScript = document.getElementById('si_page_script');
                currentScript.parentElement.removeChild(currentScript);
                // let head = document.head;//document.getElementsByTagName('head')[0];
                let script = document.createElement('script');
                script.id = 'si_page_script';
                script.src = 'scripts/page.js?' + Date.now();
                document.head.appendChild(script);
            }
    };
    this.HighlightSyntax=function (codepad) {
      
        //This is a destructuve process. for now, the whole pad is completly rebuilt on every run. 
        //That being said it would bee nice to save the mouse position so that we can put it back for the user rather than drop them back at the beginning each time.
        let curele = null;  //The index of the selected element from the codepad
        let curoff = null;  //the cursor position in chars from the left
        //debugger;
        //does not work yet
        if (document.activeElement.id === codepad.id) {
            let selected = window.getSelection();
            curoff = selected.anchorOffset;
            let myNode = selected.anchorNode.parentElement;
            if (myNode) {
                if (myNode !== codepad) {
                    curele = Array.from(myNode.parentNode.childNodes).indexOf(myNode);
                } else {
                    curele = Array.from(codepad.childNodes).indexOf(myNode);
                }
            }

        }

        //get the text of the codepad
        let script = codepad.innerText;

        script = script.replaceAll('>', '&gt;').replaceAll('<', '&lt;');

        //Substitutions: we need to sub out comments and strings first so thaat we dont parse inside of them. we will replace them with their color tags and values at the bottom
        /* turns out these must be done in a first in last out fasion */
        /* Sub out Comments */

        let flags = ['UR', 'CM', 'CS', 'DQ', 'SQ', 'RX', 'ARF', 'ARP', 'STF', 'STP', 'DTF', 'DTP', 'ELF', 'ELP'];
        let indexes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        let replacements = {};
        let jstrack = ''; //this has all the function names. many classes has funcitons with the same name. we will need to tune this later but we dont want dupes. 

        //get all of the javascript methods into a regex and add tehm all to custom tags on a group basis
        let jsMethods = {};
        let jsProps = {};

        let topKeys = {
            'ARF': "Array",
            'ARP': "Array",
            'DTF': "Date",
            'DTP': "Date",
            'STF': "String",
            'STP': "String",
            'ELF': "Element",
            'ELP': "Element"
        };

        let toRemove = ['constructor'];


        for (let k in topKeys) {
            if (topKeys.hasOwnProperty(k)) {
                let flg = k;

                var type = flg[flg.length - 1];
                switch (type) {
                    case 'F': type = 'function'; break;
                    case 'P': type = 'property'; break;
                }
                //    let flg = topKeys[category];
                //debugger;
                let index = flags.indexOf(flg);
                let count = 0;
                if (index > -1 && typeof indexes[index] !== 'undefined') {
                    count = indexes[index];
                }
                else {
                    indexes.push(0);
                    count = indexes[index];
                }

                // if (!jsMethods[flg]) {
                //     jsMethods[flg] = [];
                //  }
                let category = topKeys[flg];
                let tmp = [];
                for (let name in SI.Editor.Data.js_methods[category]) {
                    let rem = toRemove.indexOf(name);
                    if (rem === -1) { 
                        if (SI.Editor.Data.js_methods[category].hasOwnProperty(name)) {
                            if (SI.Editor.Data.js_methods[category][name].type === type) {
                                tmp.push(name);
                            }
                        }
                    }

                }

                jsMethods[flg] = tmp.join('|');


            }
        }




        //

        for (let f = 0; f < flags.length; f++) {
            let flag = flags[f];
            let index = indexes[f];
            if (!replacements[flag]) {
                replacements[flag] = [];
            }
            let reg = '';
            switch (flag) {
                case 'UR': reg = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g; break; //URL
                case 'RX': reg = /\/((?![*+?])(?:[^\r\n\[/\\]|\\.|\[(?:[^\r\n\]\\]|\\.)*\])+)\/()/g; break; //Regular Expression
                case 'SQ': reg = /(?<!\\)('[\s\S]*?(?<!\\)')/g; break; //Single Quote
                case 'DQ': reg = /(?<!\\)("[\s\S]*?(?<!\\)")/g; break; //Double Quote
                case 'CM': reg = /(\/\*[\s\S]*?\*\/)/g; break; //Multiline Comment
                case 'CS': reg = /(?<!"|')(\/\/.*)/g; break; //Singleline Comment 
                // case 'NU': reg = /[0-9]+([,.0-9]+)?/g; break;
                case 'ARF':
                case 'ARP':
                case 'DTF':
                case 'DTP':
                case 'STF':
                case 'STP':
                case 'ELF':
                case 'ELP':
                    //debugger;
                    reg = new RegExp('(?<=[\.])(' + jsMethods[flag] + ")(?![0-9a-zA-Z])", 'g'); break;
            }

            script = script.replace(reg, (matched) => {

                let token = '_REPLACE_' + flag + '_' + index + "_";

                //if any tags need custom finagling
                //switch (flag) {

                //}


                replacements[flag][index] = matched;
                index++;
                return token;
            });

            indexes[f] = index;
        }



        let tokens = /(?<![0-9a-zA-Z])(function|var|let|const|typeof|this|class|delete|return|if|else|for|while|new|try|catch|throw|true|false|g)(?![0-9a-zA-Z])/g;
        let symbols = /(:|;|\{|\}|\(|\)|\.|=|\[|\]|\+|\-|\!|\,|\&)/g;  //:|;|\{|\}|\(|\)|\.|===|==|=|
        let squote = true; //true is odd
        let dquote = true;

        //   script = script.replace(/(^| |.|)[A-Z]+[a-z]+[A-Z]?[a-z]*/g, function (s) { return "<span style='color:teal' >" + s + "</span>"; });

        script = script.replace(symbols, function (symbol, x, y) {
            switch (symbol) {
                case ":":
                case ";":
                case "{":
                case "}":
                case "(":
                case ")":
                case ".":
                case "=":
                case "[":
                case "]":
                case "+":
                case "-":
                case "!":
                case "&":
                case ",":
                    let sym = Ele('si-jssym', {
                        innerHTML: symbol
                    });
                    return sym.outerHTML;
            }
        });

        script = script.replace(tokens, function (token, x, y) {

            let randid = 'si_sytax_' + SI.Tools.String.RandomString();
            switch (token) {
                case "function":
                case "var":
                case "let":
                case "const":
                case "typeof":
                case "this":
                case "if":
                case "else":
                case "for":
                case "while":
                case "return":
                case "new":
                case "class":
                case "try":
                case "catch":
                case "throw":
                case "true":
                case "false":
                case "g":
                    let kw = Ele('si-jskw', {
                        innerHTML: token
                    });
                    return kw.outerHTML;
                case "document":
                case "window":
                    let win = Ele('si-jswin', {
                        innerHTML: token
                    });
                    return win.outerHTML;
                case "getElementById":
                    let met = Ele('si-jsmet', {
                        innerHTML: token
                    });
                    return met.outerHTML;
            }
        });


        //put the comments and strings back
        for (let f = flags.length - 1; f > -1; f--) {
            let flag = flags[f];

            let tag = '';
            let reg = null;
            switch (flag) {
                case 'UR': tag = 'si-jsur'; reg = /(_REPLACE_UR_\d+_)+/g; break;
                case 'RX': tag = 'si-jsrx'; reg = /(_REPLACE_RX_\d+_)+/g; break;
                case 'CS': tag = 'si-jscom'; reg = /(_REPLACE_CS_\d+_)+/g; break;
                case 'CM': tag = 'si-jscom'; reg = /(_REPLACE_CM_\d+_)+/g; break;
                case 'SQ': tag = 'si-jssq'; reg = /(_REPLACE_SQ_\d+_)+/g; break;
                case 'DQ': tag = 'si-jsdq'; reg = /(_REPLACE_DQ_\d+_)+/g; break;
                //  case 'NU': tag = 'si-jsnu'; reg = /(_REPLACE_NU_\d+_)+/g; break;
                case 'ARF': tag = 'si-jsarf'; reg = /(_REPLACE_ARF_\d+_)+/g; break;
                case 'ARP': tag = 'si-jsarp'; reg = /(_REPLACE_ARP_\d+_)+/g; break;
                case 'DTF': tag = 'si-jsdtf'; reg = /(_REPLACE_DTF_\d+_)+/g; break;
                case 'DTP': tag = 'si-jsdtp'; reg = /(_REPLACE_DTP_\d+_)+/g; break;
                case 'STF': tag = 'si-jsstf'; reg = /(_REPLACE_STF_\d+_)+/g; break;
                case 'STP': tag = 'si-jsstp'; reg = /(_REPLACE_STP_\d+_)+/g; break;
                case 'ELF': tag = 'si-jself'; reg = /(_REPLACE_ELF_\d+_)+/g; break;
                case 'ELP': tag = 'si-jselp'; reg = /(_REPLACE_ELP_\d+_)+/g; break;
            }

            script = script.replace(reg, (matched) => {

                let parts = matched.split('_');
                let type = parts[2];
                let index = parts[3];

                let replace = replacements[flag][index];




                let met = Ele(tag, {
                    innerHTML: replace
                });

                //final modifications to the replaces
                switch (flag) {
                    case 'UR': met.title = "Double Click to go to: " + met.innerHTML; break;

                }

                return met.outerHTML;

            });

        }

        //script = script.replace(/<\<\/si-jssym>\s<si-jssym>/g, "");

        codepad.innerHTML = script + "\n\n\n";
        //debugger;

        if (curele) {
            //debugger;
            let node = codepad.childNodes[curele];
            let range = document.createRange();
            var sel = window.getSelection();
            //debugger;
            var childNode = codepad.childNodes[curele];
            range.setStart(childNode, childNode);
            range.setEnd(node, curoff);
            sel.removeAllRanges();
            sel.addRange(range);
            sel = window.getSelection();

            //   sel.modify('move', 'forward', curoff);

        }


    
    };
    this.ComputeLineNumbers= function (offset = 1) {
            let code = SI.Editor.Objects.Scripter.Codepad.innerText;
            let numlines = code.split(/\r\n|\r|\n/).length;
            let linebox = document.getElementById("si_scripter_linenums");
            linebox.innerHTML = '';
            for (var i = 1; i < numlines + offset; i++) {
                linebox.appendChild(Ele('si-linm', { innerHTML: i }));
            }
            return i;
    };
    this.AddLineNumbers=function (count = 1) {
        let linebox = document.getElementById("si_scripter_linenums");
        for (let i = 1; i < linebox.children.length + count; i++) {
            linebox.appendChild(Ele('si-linm', { innerHTML: i }));
        }
    };

    



    return this;
};

