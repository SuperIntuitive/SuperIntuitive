
SI.Editor.Objects.Styler = {

    SelectedStyle : null,
    SelectorMenuEffects : null,
    LoadedType : null,
    LoadedSheet : null,
    LoadedComments : [],
    Container :null,
    Workspace : null,
    SelectorMenu:null,
    Codeview:null,
    Codepad:null,
    Draw : function () {
        //Init draws both the workspace and the codeview.
        SI.Editor.Objects.Styler.Container = Ele("div", {
            id: "si_styler_container",
        });

        let mainmenu = Ele('div', {
            style: {
                position: 'relative',
                width: '99%',
                height: '24px',
                paddingLeft: '5px',
                backgroundColor: SI.Editor.Style.MenuColor,
                border: 'solid 1px ' + SI.Editor.Style.BackgroundColor,
            },
            appendTo: SI.Editor.Objects.Styler.Container,
        });

        //Code View Label/Checkbox
        let codeOrGuiCbLabel = Ele("label", {
            innerHTML: "Code",
            for: "si_styler_codeorguidcb",
            appendTo: mainmenu,
        });
        let codeOrGuiCb = Ele("input", {
            id: "si_styler_codeorguidcb",
            type: "checkbox",
            checked: 'checked',
            onclick: function (e) {
                if (this.checked) {
                    document.getElementById('si_styler_codeview').style.display = 'block';
                } else {
                    document.getElementById('si_styler_codeview').style.display = 'none';
                }
            },
            appendTo: codeOrGuiCbLabel,
        });

        //The Stylesheet selector dropdown
        let styleSheetSelect = Ele("select", {
            id: "si_styler_sheetselector",
            onchange: function (e) {
                
                //Using the style type, get the selected style data and pass it to the load function 
                let option = this.options[this.selectedIndex];
                let stylesheet = this.value;
                let type = option.getAttribute('data-sourcetype');
                let style = null;
                switch (type) {
                    case "Block": 
                        style = SI.Editor.Data.Objects.Blocks[stylesheet].style; 
                        break;
                    case "Plugin":
                        let parent = option.parentElement.label.trim();
                        style = SI.Editor.Data.Objects.Blocks[parent].styles[stylesheet];
                        break;
                    case "Sheet": 
                        style = SI_StyleSheetsLibrary[stylesheet].style; 
                        break;
                    default: 
                        SI.Tools.SuperAlert("No known group type. Can't get style"); 
                        return;
                }
                SI.Editor.Objects.Styler.LoadedType = type;
                SI.Editor.Objects.Styler.LoadedSheet = stylesheet;
                if (style) {
                    SI.Editor.Objects.Styler.LoadStyleCode(style);
                }
            },
            appendTo: mainmenu,
        });
        //Add blocks to the list
        if (SI.Editor.Data.Objects.Blocks !== 'undefined') {
           //debugger;
            let blocks = Object.keys(SI.Editor.Data.Objects.Blocks);
            let blocksGroup = Ele("optgroup", {
                label: "Block",
                appendTo: styleSheetSelect
            });
            for (let b in blocks) {
                Ele("option", {
                    value: blocks[b],
                    innerHTML: blocks[b],
                    data: {
                        "sourcetype": "Block",
                    },
                    appendTo: blocksGroup,
                });
            }
        }
        //Add plugins to the list
        if (Object.keys(SI.Editor.Data.Objects.Plugins.Current).length > 0) {
            //debugger;
            let pgroup = Ele("optgroup", {
                label: "Plugins",
                appendTo: styleSheetSelect,
            });

            for (let plugin in SI.Editor.Objects.Plugins.Current) {
                let styles = SI.Editor.Objects.Plugins.Current[plugin]['styles'];
                if (!Array.isArray(styles)) {
                    let sgroup = Ele("optgroup", {
                        label: "    " + plugin,
                        appendTo: styleSheetSelect,
                    });

                    for (let style in styles) {
                        Ele("option", {
                            innerHTML: "\t" + style,
                            appendTo: sgroup,
                            data: {
                                sourcetype: "Plugin",
                            }
                        });
                    }
                }
            }
        }
        //Add other style sheets to the list
        if (typeof SI_StyleSheetsLibrary !== 'undefined') {
            let sheets = Object.keys(SI_StyleSheetsLibrary);
            let sheetsGroup = Ele("optgroup", {
                label: "Style Sheets",
                appendTo: styleSheetSelect
            });
            for (let s in sheets) {
                Ele("option", {
                    value: sheets[s],
                    innerHTML: sheets[s],
                    data: {
                        "sourcetype": "Sheet",
                    },
                    appendTo: sheetsGroup,
                });
            }
        }

        //Menu Buttons
        //New Button adds a new style to the selected sheet
        Ele('button', {
            innerHTML: 'New Style',
            style: {
                marginLeft: '8px',
            },
            onclick: function () {
                SI.Editor.Objects.Styler.Workspace.appendChild(SI.Editor.Objects.Styler.DrawStyleBlock({ property: '', selector: 'changeme' }));
            },
            appendTo: mainmenu,
        });
        //Update the Codeview from the Worksheet
        //Add functionalliy: currently only turns workspace graphics into css. future IF codeview selected, turn css into workspace graphics using SI.Editor.Objects.Styler.LoadStyleCode(style);
        Ele("input", {
            type: 'button',
            style: {
                marginLeft: "8px",
            },
            value: "Update",
            onclick: SI.Editor.Objects.Styler.BuildStyle,
            appendTo: mainmenu,
        });
        //Save the style to its source
        Ele("input", {
            type: 'button',
            style: {
                marginLeft: "8px",
            },
            value: "Save",
            onclick: SI.Editor.Objects.Styler.SaveStyle,
            appendTo: mainmenu,
        });


        //Workspace: The non-coder friendly area for developing css style sheets.  
        SI.Editor.Objects.Styler.Workspace = Ele("div", {
            id: "si_styler_workspace",
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
            appendTo:  SI.Editor.Objects.Styler.Container
        });
        //SelectorMenu: The non-coder friendly menu with all the options in css.
        SI.Editor.Objects.Styler.SelectorMenu = SI.Editor.Objects.Styler.InitSelectorMenu()
        //Attach it to the container
        SI.Editor.Objects.Styler.Container.appendChild(SI.Editor.Objects.Styler.SelectorMenu);

        //The Codeview- possible future removal if caode pad does not need it 
        SI.Editor.Objects.Styler.Codeview = Ele("div", {
            id: "si_styler_codeview",
            style: {
                position: 'absolute',
                width: '100%',
                height: '96%',
                paddingBottom: '20px',
                backgroundColor: '#282e2b',
                overflow: 'auto',
                backgroundImage: "url('/editor/media/images/blackslate.jpg')",
                backgroundSize: 'cover',
            },
            ondragenter: function (e) { e.preventDefault(); },
            ondragover: function (e) { e.preventDefault(); },
            ondragleave: function (e) { },
            ondrop: function (e) { },
            appendTo: SI.Editor.Objects.Styler.Container
        });

        //The code pad for manually coding CSS
        SI.Editor.Objects.Styler.Codepad = Ele('pre', {
            id: 'si_styler_codepad',
            contentEditable: "True",
            style: {
                color: 'white',
                position: "absolute",
                tabSize: '4',
                top: '13px',
                left: '0px',
                width: "97%",
                height: "94%",
                padding: '10px',
                margin: '0px',
                textShadow: '1px 1px 4px rgba(128,128,160,.7)',
                fontFamily: 'Inconsolata',
            },
            onkeydown: function (e) {
                //debugger;
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
                if (e.keyCode === 9) { //TAB KEY
                    e.preventDefault();
                    return false;
                }
            },
            appendTo: SI.Editor.Objects.Styler.Codeview
        });
        //Disable the fucking autocorrect in the codepad
        SI.Tools.Text.FingAutoCorrect(SI.Editor.Objects.Styler.Codepad);

        //I forget what this does but it is empty in dev
        let animationnamelist = Ele('datalist', {
            id: 'si_styler_animationnames',
            appendTo: SI.Editor.Objects.Styler.Container
        });
        //load the animaiton list
        for (let animationname in SI.Editor.Data.DataLists.AnimationNames) {
            Ele("option", {
                value: animationname,
                appendTo: animationnamelist
            });
        }

        return SI.Editor.Objects.Styler.Container;
    },
    LoadStyleCode : function (style) {

        //First delete all the workspace and codepad data
        SI.Tools.Element.SetParent(SI.Editor.Objects.Styler.SelectorMenu, SI.Editor.Objects.Styler.Container);
        SI.Editor.Objects.Styler.Workspace.innerHTML = '';
        SI.Editor.Objects.Styler.Codepad.innerHTML = '';

        //debugger;
        //Write the style to the codepad
        SI.Editor.Objects.Styler.Codepad.innerHTML = style+"\n\n\n";

        //replace the comments with flags becuse who knows with they have in them that could fuck up our parsing
        let commentnum = 0;
        style = style.replace(/\/\*[\s\S]*?\*\//g, (matched, index, original) => {
            let flag = '_COMMENT__' + commentnum + "__ ";
            SI.Editor.Objects.Styler.LoadedComments[commentnum] = matched;
            commentnum++;
            return flag;
        });
        //debugger;
        //this seldom used thing fucks up the parse. maybe I should look at tokening all strings as well.
        style = style.replace(";base", "__BASE__");  

        let allstyles = style.split(/[\{\}]+/);
        //odd elements = selector;
        //even elements = properties;
        let styles = [];
        let itter = 0;

        //Loop through all of the styles in the stylesheet and put them in an object
        for (let s in allstyles) {
           
            if (typeof allstyles[itter] !== 'undefined' && typeof allstyles[itter + 1] !== 'undefined') {
                let selector = allstyles[itter];
                let tmp;
                if (selector.indexOf("_COMMENT__") > -1) {
                    let comments = selector.match(/__(.*)__/g);
                  //debugger;
                    for (let c in comments) {
                        if (comments.hasOwnProperty(c)) {
                            let num = comments[c];
                            let properties = parseInt( num.replace(/__/g, ''));
                            tmp = selector;
                            selector = "COMMENT";
                            styles.push({ selector, properties });
                            let remove = "_COMMENT" + num;
                            tmp = tmp.replace(remove, '').trim();
                        }
                    }
                    selector = tmp;
                }
                let properties = allstyles[itter + 1];
                styles.push({ selector, properties });
                itter += 2;
            }
        }
        //Loop through the object
        for (let s of styles) {
            SI.Editor.Objects.Styler.Workspace.appendChild(SI.Editor.Objects.Styler.DrawStyleBlock(s));
        }
    },
    DrawStyleBlock : function (style) {
        let rand =  SI.Tools.String.RandomString(11);
        //Create the Main style box
        let stylebox = Ele('div', {
            class: "si-styler-stylebox",
            id: "si_styler_stylebox_" + rand,
            style: {
                width: '97%',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                display: 'table',
                marginLeft: '1%',
                textAlign: 'top',
                paddingTop: '3px',
                paddingBottom: '3px',
                border: "1px solid " + SI.Editor.Style.TextColor,
            },
            draggable: 'true',
            // appendTo: workspace,
            ondragstart: function (ev) {
                ev.dataTransfer.setData("source", this.id);
            },
            ondrag: function (ev) {
            }, 
            ondrop: function (ev) {
                let source = ev.dataTransfer.getData('source');
                if (source) {
                    e2 = document.getElementById(source);
                    //make sure were only swapping with another stylebox
                    if (e2 && e2.classList.contains("si-styler-stylebox")) {
                         SI.Tools.Element.SwapNodes(this, e2);
                    }
                }
            }
        });

        //Create a Selector Box
        let styleSelectorCb = Ele("input", {
            type: "checkbox",
            class: "si-styler-stylebox-selector",
            style: {
                display: 'block',
            },
            onchange: function (ev) {
                //debugger;
                let b = this.checked;
                 SI.Tools.Class.Loop("si-styler-stylebox", function (ele) {
                    ele.style.backgroundColor = SI.Editor.Style.BackgroundColor;
                });
                 SI.Tools.Class.Loop("si-styler-selectorcontainer", function (ele) {
                    ele.style.backgroundColor = SI.Editor.Style.BackgroundColor;
                });

                 SI.Tools.Class.Loop("si-styler-stylebox-selector", function (ele) {
                    ele.checked = false;
                });

                if (this.parentElement !== SI.Editor.Objects.Styler.SelectedStyle && b) {
                    this.parentElement.style.backgroundColor = 'rgb(92, 95, 107)';
                    this.parentElement.querySelector(".si-styler-selectorcontainer").style.backgroundColor = 'rgb(92, 95, 107)';
                    SI.Editor.Objects.Styler.SelectedStyle = this.parentElements;
                    this.checked = true;
                } else {
                    SI.Editor.Objects.Styler.SelectedStyle = null;
                }

            },
            appendTo: stylebox
        });
        //Newline
        Ele("br", { appendTo: stylebox });

        let selectorbox = Ele('div', {
            class: "si-styler-selectorcontainer",
            style: {
                padding: '10px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                display: 'table-cell',
                width: '38%'
            },
            // innerHTML: style.selector,
            appendTo: stylebox
        });

        //debugger;
        let selector = style.selector.trim();
        //if there is a comma this is a piggy backed selector. split it into individual selectors.
        let selectorCsvs = selector.trim().split(',');
        let isComment = false;
        for (let i = 0; i < selectorCsvs.length; i++) {
            select = selectorCsvs[i];
            if (select === "COMMENT") {
                isComment = true;
                selectorbox.style.width = '16%';
            }
            let seltool = SI.Editor.Objects.Styler.Selector({ "Selector": select, "Order": i });
            selectorbox.appendChild(seltool);
        }

        if (!isComment) {
            let propertiesbox = Ele('table', {
                id: "si_styler_propertiestable_" + rand,
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    color: SI.Editor.Style.TextColor,
                    width: '100%',
                    borderCollapse: 'collapse',
                },

                appendTo: stylebox
            });

            let addRow = Ele("tr", { draggable: 'true', appendTo: propertiesbox });
            let addSelectCell = Ele("td", { appendTo: addRow });
            let addSelect = Ele("select", {
                id: "si_styler_propertiesselect_" + rand,
                value: null,
                appendTo: addSelectCell
            });
            Ele("option", { value: '', innerHTML: '', appendTo: addSelect });
            for (let group in SI.Editor.Data.css_properties) {
                if (group !== "Pseudo Class" && group !== "Pseudo Element") {
                    let groupset = Ele("optgroup", { label: group, appendTo: addSelect });
                    let wholegroup = SI.Editor.Data.css_properties[group];
                    for (let s in wholegroup) {
                        let prop = wholegroup[s].n;
                        if (!prop.startsWith("@")) {
                            Ele("option", { value: prop, innerHTML: prop, title: wholegroup[s].d, appendTo: groupset });
                        }
                    }
                }

            }
            let addNewCell = Ele("td", { appendTo: addRow });
            let addNewButton = Ele("input", {
                id: "si_styler_propertiesbutton_" + rand,
                value: "Add new property",
                type: 'button',
                onclick: function (ev) {
                    let select = document.getElementById(this.id.replace("_propertiesbutton_", "_propertiesselect_"));
                    if (select.value.length) {
                        let table = document.getElementById(this.id.replace("_propertiesbutton_", "_propertiestable_"));
                        let propControl = SI.Editor.Objects.Elements.Styles.Widget({ "Property": select.value.trim(),  "Effect": "none", "Preserve":true, "Draggable": true,   });
                        table.appendChild(propControl);
                    } else {
                        alert("To add a new property, select it from the drop down list.");
                    }
                },
                appendTo: addNewCell
            });
            //Loop through the properties and display their Style UI
            if (style.properties) {
                //debugger;
                let properties = style.properties.trim('"').trim('"');
                let propertyList = properties.match(/("[^"]*")|[^;]+/g); 

                //BUG:: some urls have a ; in them such in the case of the MS only validation in jqueryui.css.
                //once this list is complete we will need to go through every cell and if there is a ' or " in this cell and the one before it, we are in quotes and should merge these two cells with a semicolon
                //the above match was supposed to work and it is only a few seconds longer to compile jqui.css but it does not seem to do the trick on the url(data;gif issue)
                //debugger;
                for (let p in propertyList) {
                    var kvp = propertyList[p].split(':');
                    if (typeof kvp[1] !== "undefined") {
                        //determine if we have a comment
                        if (kvp[0].indexOf('_COMMENT__') !== -1) {
                            
                            kvp[0] = kvp[0].replace('_COMMENT__', '');
                            let tmp = kvp[0].split('__');
                            let num = tmp.shift().trim();
                            if (typeof this.LoadedComments[num] !== 'undefined') {
                                let commentbox = Ele('div', {
                                    appendTo: propertiesbox,
                                });
                                let commenttxt = Ele('textarea', {
                                    style: {
                                        width: '100%',
                                        color: 'lightgreen',
                                        backgroundColor: 'transparent',
                                    },
                                    class:"si-styler-comment-prop",
                                    innerHTML: this.LoadedComments[num],
                                    appendTo: commentbox,
                                });
                            }
                            kvp[0] = tmp.join('').trim();
                        }
                        if (kvp.length > 2) {
                           
                            let k = kvp[0];
                            kvp.shift();
                            let v = kvp.join(':');
                            let tmp = [k, v];
                            kvp = tmp;
                        }

                        kvp[1] = kvp[1].replace("__BASE__", ";base");  //this little iritent :-P
                        let propControl = SI.Editor.Objects.Elements.Styles.Widget({ "Property": kvp[0].trim(), "InitialValue": kvp[1].trim(), "OnChange": function (ele) { /* { alert(ele) */ }, "Draggable": true, "Removable":true });
                        propControl.ondrop = function (e) {
                               console.log(e);
                        },
                        propertiesbox.appendChild(propControl);
                    }
                }
            }



        } else {
            let comment = this.LoadedComments[style.properties];
          //debugger;
            if (comment) {
                let propertiesbox = Ele('textarea', {
                    id: "si_styler_propertiestable_" + rand,
                    style: {
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        color: "lightgreen",
                        width: '95%',
                        height: (comment.length / 100 * 24) + 'px',
                        minHeight: '32px'
                    },
                    class: "si-styler-comment",
                    innerHTML: comment,
                    appendTo: stylebox,
                });

            }

        }

        return stylebox;
    },
    Add : function (selector, appendTo) {
        debugger;

        let color = 'red';
        let type = 'ERROR';
        switch (selector.charAt(0)) {
            case '#':
                color = "lightblue"; type= 'id'; break;
            case '.':
                color = "lightgreen"; type= 'class'; break;
            case '[':
                color = "lightsalmon"; type= 'attribute'; break;
            case ':':
                if (selector.charAt(1) === ':') {
                    color = "palevioletred";
                    type = "psuedo element";
                } else {
                    color = "plum";
                    type = "psuedo class";
                }
                break;
            default:
                type = "element"; color = 'yellow'; break;
        }
        let selectorbuttonparent = Ele("div", {
            style: {
                display: 'inline-block',
            },

        });

        let selectorCount = appendTo.parentElement.querySelectorAll('button').length;

        let selectorbutton = Ele("button", {
            id: "si_styler_selector_" +  SI.Tools.String.RandomString(),
            innerHTML: selector,
            class: 'si-styler-selector' + selectorCount,
            style: {
                backgroundColor: color,
                padding: "5px 0px",
            },
            data: {
                type: type,
                order: selectorCount
            },
            onclick: function () {
                OpenMenu(this);
            },
            appendTo: selectorbuttonparent,
        });
        selectorbutton.classList.add("si-styler-selector");

        appendTo.parentElement.insertBefore(selectorbuttonparent, appendTo);
        //cleanup
        let menu = document.getElementById('si_styler_selectormenu');
        menu.style.display = 'none';
         SI.Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
    },
    Selector : function (options) {
        
        this.Defaults = {
            "Selector": "body",
            "Order":0,
        };
        options =  SI.Tools.Object.SetDefaults(options, this.Defaults);
        let randId =  SI.Tools.String.RandomString(11);


        sel = options.Selector.trim().replace(/::/g,"^");
        let parts = sel.split(/(?=\.)|(?=#)|(?=:)|(?=\^)|(?=\[)|(?=\+)|(?=~)|(?=>)/);
        //debugger;
        let order = options.Order;

        let selectorbox = Ele('div', {
            class: 'si-styler-selectorbox',
            data: {
                order:order
            },
            style: {
                backgroundColor: "rgba(128,128,128,.5)",
                padding: "2px",
                margin:'2px',
            },
        });
        if (sel === 'COMMENT') {
            selectorbox.style.position = 'absolute';
            selectorbox.style.width = '80px';
            selectorbox.innerHTML = "Comment:";

            return selectorbox;
        }

        let padding = "5px 0px 5px 5px";
        let count = 1;

        //|(?=\^)|(?=~)|(?=%) css selector combiners
        for (let p in parts) {
            let part = parts[p];
            let color = "red";
            let type = "ERROR";
            switch (part.charAt(0)) {
                case '#': color = "lightblue"; type='id'; break;
                case '.': color = "lightgreen"; type= 'class'; break;
                case '[': color = "lightsalmon"; type= 'attribute'; break;
                case ':': color = "plum";        type = "psuedo class"; break
                case '^': color = "palevioletred"; type = "psuedo element"; break;
                case '~':
                case '>':
                case '+': color = "aquamarine"; type = "combinator"; break;
                default: type = "element"; color='yellow'; break;
            }
            part = part.replace("^", "::");
            let selectorbuttonparent = Ele("div", {
                style: {
                    display: 'inline-block',
                },
                appendTo: selectorbox,

            });

            let selectorbutton = Ele("button", {
                id: "si_styler_selector_" + randId,
                innerHTML: part,
                class: 'si-styler-selector' + count,

                style: {
                    backgroundColor: color,
                    padding: padding,
                    cursor:'pointer',
                },
                data: {
                    type: type,
                },
                onclick: function () {
                    OpenMenu(this);  
                },
                appendTo: selectorbuttonparent,
            });
            selectorbutton.classList.add("si-styler-selector");
            padding = "5px 0px";
            count++;
        }
        let addParent = Ele('div', {
            appendTo: selectorbox,
            style: {
                display: 'inline-block',
            },
        });
        let add = Ele("span", {
            innerHTML: "+",
            style: {
                cursor: 'pointer',
            },
            onclick: function () {
                OpenMenu(this);
            },
            appendTo: addParent,
        });

        OpenMenu = function (selector) {
            //debugger;
            SI.Editor.Objects.Styler.UpdateClasses();
            SI.Editor.Objects.Styler.UpdateIds();
            //get the selector menu
            let menu = document.getElementById('si_styler_selectormenu');
            let b = menu.parentElement === selector.parentElement;

             SI.Tools.Element.SetParent(menu, selector.parentElement);
             SI.Editor.Objects.Styler.SelectorMenuEffects = selector;

             SI.Tools.Class.Loop("si-styler-selector-picker", function (s) {
                s.selectedIndex = "0";
                s.style.display = 'none';
            });

            //set menus position
            if (menu.style.display === 'none' || !b) {
                menu.style.display = 'block';
            } else {
                menu.style.display = 'none';
            }


            if (selector.tagName === 'BUTTON') {
                document.getElementById('si_styler_selector_menu_delete').style.display = 'block';
                document.getElementById('si_styler_selector_menu_new').style.display = 'none';
            } else {
                document.getElementById('si_styler_selector_menu_delete').style.display = 'none';
                document.getElementById('si_styler_selector_menu_new').style.display = 'block';
            }
        }
                
        return selectorbox;
    },
    InitSelectorMenu : function (options) {
        this.Defaults = {
            "Position": "default",
        };
        options =  SI.Tools.Object.SetDefaults(options, this.Defaults);


        let mainTable = Ele("table", {
            id: 'si_styler_selectormenu',
            style: {
                backgroundColor: "white",
                color:'black',
                display: 'none',
                position: 'absolute',
                fontFamily: 'RobotoThin',
                fontSize: '10pt',
            }
        });

        //build the selector menu
        let selectorTypes = ["element", "class", "id", "attribute", 'pseudo class', 'pseudo element', 'combinator','@'];
        let topOffset = 0;
        for (let type in selectorTypes) {
            type = selectorTypes[type];

            let selectorRow = Ele("tr", { appendTo: mainTable });
            let selectorLabel = Ele("th", { innerHTML: type, appendTo: selectorRow });
            let selectorSubButton = Ele("th", {
                innerHTML: " > ",
                onmouseover: function () {                  
                    document.querySelectorAll('.si-styler-selector-picker').hide();
                    document.getElementById('si_styler_selector_picker_' +type.replace(" ", "_")).style.display = "block";
                },
                appendTo: selectorRow
            });
            let selectorPicker = Ele("select", {
                id: 'si_styler_selector_picker_' + type.replace(" ", "_"),
                class: 'si-styler-selector-picker',
                style: {
                    position: 'absolute',
                    left: '110px',
                    top: topOffset+'px',
                    width: '150px',
                    display: 'none',
                    height:'21px',
                },
                onchange: function (ev) {
                    let stype = this.id.replace('si_styler_selector_picker_', '');
                    if (SI.Editor.Objects.Styler.SelectorMenuEffects.tagName === "BUTTON") {
                        let picked = this.options[this.selectedIndex];
                        SI.Editor.Objects.Styler.SelectorMenuEffects.innerHTML = picked.innerHTML;
                        SI.Editor.Objects.Styler.SelectorMenuEffects.value = picked.value;
                        switch (stype) {
                            case "element": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = 'yellow'; break;
                            case "class": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "lightgreen"; break;
                            case "id": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "lightblue"; break;
                            case "attribute": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "lightsalmon"; break;
                            case "pseudo_class": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = 'plum'; break;
                            case "pseudo_element": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "palevioletred"; break;
                            case "combinator": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "orange"; break;
                            case "@": SI.Editor.Objects.Styler.SelectorMenuEffects.style.backgroundColor = "green";
                                AtSelector(SI.Editor.Objects.Styler.SelectorMenuEffects);
                                break;
                            default: break;
                        }
                        //cleanup
                        let menu = document.getElementById('si_styler_selectormenu');
                        menu.style.display = 'none';
                        SI.Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
                    }
                    else if (SI.Editor.Objects.Styler.SelectorMenuEffects.tagName === "SPAN") {
                     
                        let picked = this.options[this.selectedIndex];
                        SI.Editor.Objects.Styler.Add(picked.innerHTML, this.parentElement.parentElement.parentElement.parentElement);
                    }
                },
                onmouseout: function (ev) {
                    this.style.display = "none";
                },
                appendTo: selectorSubButton
            });

            Ele("option", {
                innerHTML: "",
                value: "",
                appendTo: selectorPicker
            });
            //debugger;
            switch (type) {
                case 'element':
                    for (let elegroup in SI.Editor.Data.html_elements) {
                        let optgroup = Ele("optgroup", { label: elegroup, appendTo: selectorPicker });
                        for (let ele in SI.Editor.Data.html_elements[elegroup]) {
                            //debugger;
                            let html = SI.Editor.Data.html_elements[elegroup][ele];
                            Ele("option", {
                                innerHTML: html.n,
                                value: html.n,
                                title: html.d,
                                appendTo: optgroup,
                            });
                        }
                    }
                    break;
                case 'class':
                    this.UpdateClasses(selectorPicker);
                    break;
                case 'id':
                    this.UpdateIds(selectorPicker);
                    break;
                case 'attribute':
                    for (let attrgroup in SI.Editor.Data.html_attributes) {
                        let optgroup = Ele("optgroup", { label: attrgroup, appendTo: selectorPicker });
                        for (let ele in SI.Editor.Data.html_attributes[attrgroup]) {
                            //debugger;
                            let attr = SI.Editor.Data.html_attributes[attrgroup][ele];
                            Ele("option", {
                                innerHTML: attr.n,
                                value: attr.n,
                                title: attr.d,
                                appendTo: optgroup
                            });
                        }
                    }
                    break;
                case 'pseudo class':
                    for (let i in SI.Editor.Data.css_properties["Pseudo Class"]) {
                        let pc = SI.Editor.Data.css_properties["Pseudo Class"][i];
                        Ele("option", {
                            innerHTML: pc.n,
                            value: pc.n,
                            title: pc.d,
                            appendTo: selectorPicker
                        });
                    }
                    break;
                case 'pseudo element':
                    for (let i in SI.Editor.Data.css_properties["Pseudo Element"]) {
                        let pe = SI.Editor.Data.css_properties["Pseudo Element"][i];
                        Ele("option", {
                            innerHTML: pe.n,
                            value: pe.n,
                            title:pe.d,
                            appendTo: selectorPicker
                        });
                    }
                    break;
                case 'combinator':
                    let comb = ['>','+','~'];
                    for (let i in comb) {
                        let c = comb[i];
                        Ele("option", {
                            innerHTML: c,
                            value: c,
                            appendTo: selectorPicker
                        });
                    }
                    break;
                case '@':
                    for (let i in SI.Editor.Data.css_properties["At Selectors"]) {
                        let as = SI.Editor.Data.css_properties["At Selectors"][i];
                        Ele("option", {
                            innerHTML: as.n,
                            value: as.n,
                            title: as.d,
                            appendTo: selectorPicker
                        });
                    }
                    break;
            }
            topOffset += 20;
        }
        let toolsRow = Ele("tr", { appendTo: mainTable });
        let toolsCell = Ele("th", {
            appendTo: toolsRow
        });
        Ele("hr", { appendTo: toolsCell});
        let deleteButton = Ele('input', {
            id: 'si_styler_selector_menu_delete',
            type: 'button',
            value: 'delete',
            style: {
                marginLeft:"24px",
            },
            onclick: function () {
              
                let menu = document.getElementById('si_styler_selectormenu');
                menu.style.display = 'none';
                 SI.Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));

                let greybox = SI.Editor.Objects.Styler.SelectorMenuEffects.parentElement.parentElement;
                SI.Editor.Objects.Styler.SelectorMenuEffects.parentElement.parentElement.removeChild(SI.Editor.Objects.Styler.SelectorMenuEffects.parentElement);

                if (greybox.childElementCount === 1) {
                    let styleblock = greybox.parentElement.parentElement;
                    greybox.parentElement.removeChild(greybox);
                    //debugger;
                    let len = styleblock.querySelectorAll('.si-styler-selectorbox').length;
                    if (len === 0) {
                        styleblock.parentElement.removeChild(styleblock);
                    }
                }
            },
            appendTo: toolsCell,
        });

        let newSelButton = Ele('input', {
            id: 'si_styler_selector_menu_new',
            type: 'button',
            style: {
                marginLeft: "5px",
            },
            value: 'new selector',
            onclick: function () {            
                //hide the menu
                let menu = document.getElementById('si_styler_selectormenu');
                menu.style.display = 'none';

                 SI.Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
                let selcount = SI.Editor.Objects.Styler.SelectorMenuEffects.parentElement.parentElement.parentElement.parentElement.querySelectorAll('.si-styler-selectorbox').length;
                let seltool = SI.Editor.Objects.Styler.Selector({ "Selector": "ChangeMe", "Order":selcount });
                SI.Editor.Objects.Styler.SelectorMenuEffects.parentElement.parentElement.parentElement.appendChild(seltool);
            },
            appendTo: toolsCell,
        });

        let AtSelector = function (atButton) {

            let atType = atButton.innerHTML;
            let newParent = atButton.parentElement.nextSibling;
            switch (atType) {
                case '@keyframes':
                    //get the button, then the + and replace it with an input for the keyframe name
                    newParent.innerHTML = '';
                    let aniname = Ele('input', {
                        type: 'list',
                        
                        placeholder: "Animation Name",
                        style: {
                            marginLeft: '8px',
                            paddingLeft: '8px',
                            height: "20px",
                            width: '150px'
                        },
                        onchange: function () {
                            if (this.value.toLowerCase() === 'none') {
                                this.value = '';
                                alert("'none' cant be used for an animation name.");
                                return;
                            }
                            if (this.value.toLowerCase() !== 'none' && SI.Editor.Data.DataLists.AnimationNames.indexOf(this.value) === -1 && this.value.length > 0) {
                                SI.Editor.Data.DataLists.AnimationNames.push(this.value);
                                let anilist = document.getElementById('si_styler_animationnames');
                                anilist.innerHTML = "";
                                //load the animaiton list
                                for (let animationname of SI.Editor.Data.DataLists.AnimationNames) {
                                    Ele("option", {
                                        value: animationname,
                                        innerHTML: animationname,
                                        appendTo: anilist
                                    });
                                }
                            }
                        },
                        appendTo: newParent
                    });
                    aniname.setAttribute('list', 'si_styler_animationnames');
                    //the animation name list


                    break;
                case '@font-face':
                    //nothing can com after the font face selector. the properties must be filtered to font-family(req), src(req),
                       //unicode-range,font-variant,font-feature-settings,font-variation-settings,font-stretch,font-weight,font-style
                    newParent.innerHTML = '';
            }



        };

        return mainTable;
    },
    BuildStyle : function () {
        //debugger;
        console.time("StyleBuildTime");
        let styleText = "";
        //this function will examine the workspace and write a stylesheet from it
        let styleboxes = document.getElementsByClassName("si-styler-stylebox");
        for (let s in styleboxes) {
            if (styleboxes.hasOwnProperty(s)) {
                let stylebox = styleboxes[s];
                //debugger;
                let comment = stylebox.querySelector(".si-styler-comment");
                if (comment) {
                    styleText += comment.value+"\n\n";
                } else {
                    let selectors = stylebox.querySelectorAll(".si-styler-selectorbox");
                    let propboxes = stylebox.querySelectorAll(".si-edit-style-propertyrow");
                    let order = 0;
                    let allSels = '';
                    for (let sel of selectors) {
                        //debugger;
                        if (parseInt(sel.dataset.order) === 0) {
                            allSels +=  SI.Tools.String.TrimR(sel.innerText,'+');
                        } else {
                           
                            allSels += ",\n" +  SI.Tools.String.TrimR(sel.innerText, '+');
                        }
                    }
                    styleText += allSels.trim();
                    let props = "";
                    for (let pr in propboxes) {
                        if (propboxes.hasOwnProperty(pr)) {
                            //debugger;
                            let comment = propboxes[pr].querySelector(".si-styler-comment-prop");
                            if (comment) {
                                props += "\t" + comment.value + "\n";
                            } else {
                                let key = propboxes[pr].querySelector(".si-edit-style-propertyname").innerHTML;
                                let val = propboxes[pr].querySelector(".si-edit-style-propertyvalue").value;
                                props += "\t" + key + ":" + val + ";\n";
                            }

                        }
                    }
                    if (props.length) {
                        styleText += " {\n" + props + "}\n";
                    }
                }

            }
        }
        document.getElementById('si_styler_codepad').innerHTML = styleText;
        console.timeEnd("StyleBuildTime");
    },
    SaveStyle : function () {
        let s = this;
        let csstype = SI.Editor.Objects.Styler.LoadedType; 
        let sheetname= SI.Editor.Objects.Styler.LoadedSheet;
        let code = document.getElementById("si_styler_codepad").innerText;
        if (csstype === 'Block') {
            SI.Editor.Data.Objects.Blocks[sheetname].style = code.trim();
            //debugger;
            SI.Editor.Objects.Blocks.Save(sheetname, 'style');

            //update everything so we dont need to reload
            let currentStyle = document.getElementById('si_page_style');
            

            
            let head = document.getElementsByTagName('head')[0];
            Ele("link", {
                id : 'si_page_style',
                rel: 'stylesheet',
                type: 'text/css',
                href: 'style/page.css?' + Date.now(),
                media: 'all',
                appendTo:head
            });
            setTimeout(function () { debugger; currentStyle.parentElement.removeChild(currentStyle); }, 500);
        }

        //let entityid = SI.Editor.
    },
    LoadStyleByBlock : function (blockname) {
        let style = '';
        if (typeof SI.Editor.Data.Objects.Blocks[blockname].style !== 'undefined') {
            style = SI.Editor.Data.Objects.Blocks[blockname].style;
        }
        this.LoadStyleCode(style);
    },
    UpdateClasses : function (selectorPicker) {
        if (typeof selectorPicker === 'undefined') {
            selectorPicker = document.getElementById('si_styler_selector_picker_class');
        }
        selectorPicker.innerHTML = "";
        Ele("option", {
            innerHTML: "",
            value: "",
            appendTo: selectorPicker,
        });
        for (let c in SI.Editor.Objects.Elements.Classes) {
            let cl = SI.Editor.Objects.Elements.Classes[c];
            if (cl.trim().length > 0) {
                Ele("option", {
                    innerHTML: "." + cl,
                    value: "." + cl,
                    appendTo: selectorPicker,
                });
            }
        }
    },
    UpdateIds : function (selectorPicker) {
        if (typeof selectorPicker === 'undefined') {
            selectorPicker = document.getElementById('si_styler_selector_picker_id');
        }
        selectorPicker.innerHTML = "";
        Ele("option", {
            innerHTML: "",
            value: "",
            appendTo: selectorPicker,
        });
        for (let i in SI.Editor.Objects.Elements.Ids) {
            let id = SI.Editor.Objects.Elements.Ids[i];
            Ele("option", {
                innerHTML: "#" + id,
                value: "#" + id,
                appendTo: selectorPicker,
            });
        }
    }

}
 