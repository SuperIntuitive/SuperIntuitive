
function Styler() {

    this.SelectedStyle = null;
    this.SelectorMenuEffects = null;
    this.LoadedType = null;
    this.LoadedSheet = null;
    this.LoadedComments = [];
    var hWin = this;

    this.Init = function () {
        //Init draws both the workspace and the codeview.

        let container = Ele("div", {
            id: "si_styler_container",
            style: {
                // width: '100%',
                // height: '100%',
            },
        });
        let mainmenu = Ele('div', {
            style: {
                position: 'relative',
                width: '99%',
                height: '24px',
                paddingLeft: '5px',
                backgroundColor: Editor.Style.MenuColor,
                border: 'solid 1px ' + Editor.Style.BackgroundColor,
            },
            appendTo: container,
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
        //Stylesheet selector dropdown
        let styleSheetSelect = Ele("select", {
            id: "si_styler_sheetselector",
            onchange: function (e) {
                //debugger;
                //before changing the style, put the selector menu back under the container.
                Tools.Element.SetParent(document.getElementById('si_styler_selectormenu'), document.getElementById('si_styler_container'));

                let workspace = document.getElementById("si_styler_workspace");
                workspace.innerHTML = '';

                let codepad = document.getElementById("si_styler_codepad");
                codepad.innerHTML = '';

                let option = this.options[this.selectedIndex];
                let stylesheet = this.value;
                let type = option.getAttribute('data-sourcetype');
                let style = null;
                switch (type) {
                    case "Block": style = Editor.Objects.Block.Current[stylesheet].style; break;
                    case "Plugin":
                        let parent = option.parentElement.label.trim();
                        style = Editor.Objects.Plugins.Current[parent].styles[stylesheet];
                        break;
                    case "Sheet": style = SI_StyleSheetsLibrary[stylesheet].style; break;
                    default: alert("No known group type. Can't get style"); return;
                }


                hWin.LoadedType = type;
                hWin.LoadedSheet = stylesheet;
                if (style) {
                    hWin.LoadStyleCode(style);

                }

            },
            appendTo: mainmenu,
        });
        if (Editor.Objects.Block.Current !== 'undefined') {
           //debugger;
            let blocks = Object.keys(Editor.Objects.Block.Current);
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
        //add plugins to the list
        if (Object.keys(Editor.Objects.Plugins.Current).length > 0) {
            //debugger;
            let pgroup = Ele("optgroup", {
                label: "Plugins",
                appendTo: styleSheetSelect,
            });

            for (plugin in Editor.Objects.Plugins.Current) {
                let styles = Editor.Objects.Plugins.Current[plugin]['styles'];
                if (!Array.isArray(styles)) {
                    let sgroup = Ele("optgroup", {
                        label: "    " + plugin,
                        appendTo: styleSheetSelect,
                    });

                    for (style in styles) {
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

        let newStyle = Ele('button', {
            innerHTML: 'New Style',
            style: {
                marginLeft: '8px',
            },
            onclick: function () {
                //  alert("add code to make a new style");
                document.getElementById("si_styler_workspace").appendChild(hWin.DrawStyleBlock({ property: '', selector: 'changeme' }));

            },
            appendTo: mainmenu,
        });

        //update codeview
        let updateCodeview = Ele("input", {
            type: 'button',
            style: {
                marginLeft: "8px",
            },
            value: "Update",
            onclick: this.BuildStyle,
            appendTo: mainmenu,
        });

        //update codeview
        let savestyle = Ele("input", {
            type: 'button',
            style: {
                marginLeft: "8px",
            },
            value: "Save",
            onclick: this.SaveStyle,
            appendTo: mainmenu,
        });

        //Gui View
        let workspace = Ele("div", {
            id: "si_styler_workspace",
            style: {
                position: 'absolute',
                width: '100%',
                height: '95%',
                backgroundColor: 'silver',
                overflow: 'auto',
            },
            ondragenter: function (e) { e.preventDefault(); },
            ondragover: function (e) { e.preventDefault(); },
            ondragleave: function (e) { },
            ondrop: function (e) { },
            appendTo: container
        });
        container.appendChild(this.SelectorMenu());


        let codeview = Ele("div", {
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
            appendTo: container
        });

        let codepad = Ele('pre', {
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
            appendTo: codeview
        });
        Tools.Text.FingAutoCorrect(codepad);

        return container;
    };

    this.LoadStyleCode = function (style) {
        //debugger;
        //write the code to the codeviewer
        document.getElementById('si_styler_codepad').innerHTML = style+"\n\n\n";

        //only after we write the code to the codeview do we replace the comments with flags

        let commentnum = 0;
        //JS comments /* */ & //
        //  /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm

        //CSS comments only  /* */
        // /\/\*[\s\S]*?\*\//g       

        style = style.replace(/\/\*[\s\S]*?\*\//g, (matched, index, original) => {
            //debugger;
            let flag = '_COMMENT__' + commentnum + "__ ";
            this.LoadedComments[commentnum] = matched;
            commentnum++;

            return flag;
        });
        //debugger;
        

        style = style.replace(";base", "__BASE__");  //this little iritent :-P

        //this is the gui workspace
        //it has a top and bottom section
        let workspace = document.getElementById("si_styler_workspace");



        document.getElementsByClassName('si-styler-stylebox').remove();
        
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
            workspace.appendChild(hWin.DrawStyleBlock(s));
        }
 
    };
    this.DrawStyleBlock = function (style) {
        let rand = Tools.String.RandomString(11);
        //Create the Main style box
        let stylebox = Ele('div', {
            class: "si-styler-stylebox",
            id: "si_styler_stylebox_" + rand,
            style: {
                width: '97%',
                backgroundColor: Editor.Style.BackgroundColor,
                color: Editor.Style.TextColor,
                display: 'table',
                marginLeft: '1%',
                textAlign: 'top',
                paddingTop: '3px',
                paddingBottom: '3px',
                border: "1px solid " + Editor.Style.TextColor,
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
                        Tools.Element.SwapNodes(this, e2);
                    }
                }
            },


        });

        //create a new Selector Box
        let styleSelectorCb = Ele("input", {
            type: "checkbox",
            class: "si-styler-stylebox-selector",
            style: {
                display: 'block',
            },
            onchange: function (ev) {
                //debugger;
                let b = this.checked;
                Tools.Class.Loop("si-styler-stylebox", function (ele) {
                    ele.style.backgroundColor = Editor.Style.BackgroundColor;
                });
                Tools.Class.Loop("si-styler-selectorcontainer", function (ele) {
                    ele.style.backgroundColor = Editor.Style.BackgroundColor;
                });

                Tools.Class.Loop("si-styler-stylebox-selector", function (ele) {
                    ele.checked = false;
                });

                if (this.parentElement !== hWin.SelectedStyle && b) {
                    this.parentElement.style.backgroundColor = 'rgb(92, 95, 107)';
                    this.parentElement.querySelector(".si-styler-selectorcontainer").style.backgroundColor = 'rgb(92, 95, 107)';
                    hWin.SelectedStyle = this.parentElements;
                    this.checked = true;
                } else {
                    hWin.SelectedStyle = null;
                }

            },
            appendTo: stylebox,
        });
        Ele("br", {
            appendTo: stylebox,
        });
        //create the selector box. (OLD just text)
        let selectorbox = Ele('div', {
            class: "si-styler-selectorcontainer",
            style: {
                padding: '10px',
                backgroundColor: Editor.Style.BackgroundColor,
                color: Editor.Style.TextColor,
                display: 'table-cell',
                width: '38%',
            },
            // innerHTML: style.selector,
            appendTo: stylebox,

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
            let seltool = hWin.Selector({ "Selector": select, "Order": i });
            selectorbox.appendChild(seltool);
        }

        if (!isComment) {
            let propertiesbox = Ele('table', {
                id: "si_styler_propertiestable_" + rand,
                style: {
                    backgroundColor: Editor.Style.BackgroundColor,
                    color: Editor.Style.TextColor,
                    width: '100%',
                    borderCollapse: 'collapse',
                },

                appendTo: stylebox,
            });

            let addRow = Ele("tr", { draggable: 'true', appendTo: propertiesbox });
            let addSelectCell = Ele("td", { appendTo: addRow });
            let addSelect = Ele("select", {
                id: "si_styler_propertiesselect_" + rand,
                value: null,
                appendTo: addSelectCell
            });
            Ele("option", { value: '', innerHTML: '', appendTo: addSelect });
            for (let group in Editor.Code.css_properties) {
                if (group !== "Pseudo Class" && group !== "Pseudo Element") {
                    let groupset = Ele("optgroup", { label: group, appendTo: addSelect });
                    let wholegroup = Editor.Code.css_properties[group];
                    for (let s in wholegroup) {
                        let prop = wholegroup[s].n;
                        if (!prop.startsWith("@"))
                            Ele("option", { value: prop, innerHTML: prop, title: wholegroup[s].d, appendTo: groupset });
                    }
                }

            }
            let addNewCell = Ele("td", { appendTo: addRow });
            let addNewButton = Ele("input", {
                id: "si_styler_propertiesbutton_" + rand,
                value: "Add new property",
                type: 'button',
                onclick: function (ev) {
                    //debugger; 
                    let select = document.getElementById(this.id.replace("_propertiesbutton_", "_propertiesselect_"));
                    if (select.value.length) {
                        let table = document.getElementById(this.id.replace("_propertiesbutton_", "_propertiestable_"));
                        let propControl = Editor.Objects.Style.UI({ "Property": select.value.trim(), "OnChange": function (ele) { /* { alert(ele) */ }, "Draggable": true,   });
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
                //let propertyList = style.properties.split(';');
                let propertyList = style.properties.match(/("[^"]*")|[^;]+/g); 
                //let propertyList2 = style.properties.match(/(".*?")|(/;+)/g);
                //BUG:: some urls have a ; in them such in the case of the MS only validation in jqueryui.css.
                //once this list is complete we will need to go through every cell and if there is a ' or " in this cell and the one before it, we are in quotes and should merge these two cells with a semicolon
                //the above match was supposed to work and it is only a few seconds longer to compile jqui.css but it does not seem to do the trick on the url(data;gif issue)
                
                for (let p in propertyList) {
                    var kvp = propertyList[p].split(':');
                    if (typeof kvp[1] !== "undefined") {
                        //determine if we have a comment
                        if (kvp[0].indexOf('_COMMENT__') !== -1) {
                            //debugger;
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
                            //debugger;
                            let k = kvp[0];
                            kvp.shift();
                            let v = kvp.join(':');
                            let tmp = [k, v];
                            kvp = tmp;
                        }

                        //if (index !== -1) {
                        //    let sub = kvp[0].substring(index)
                        //}
                        kvp[1] = kvp[1].replace("__BASE__", ";base");  //this little iritent :-P
                        let propControl = Editor.Objects.Style.UI({ "Property": kvp[0].trim(), "InitialValue": kvp[1].trim(), "OnChange": function (ele) { /* { alert(ele) */ }, "Draggable": true, "Removable":true });
                        propControl.ondrop = function (e) {
                            //   alert(e.target.id);
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
                        backgroundColor: Editor.Style.BackgroundColor,
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


    };
    this.Add = function (selector, appendTo) {
        let parent = this.parentElement;
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
            id: "si_styler_selector_" + Tools.String.RandomString(),
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
        Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
    };
    this.Selector = function (options) {
        
        this.Defaults = {
            "Selector": "body",
            "Order":0,
        };
        options = Tools.Object.SetDefaults(options, this.Defaults);
        let randId = Tools.String.RandomString(11);


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
            hWin.UpdateClasses();
            hWin.UpdateIds();
            //get the selector menu
            let menu = document.getElementById('si_styler_selectormenu');
            let b = menu.parentElement === selector.parentElement;

            Tools.Element.SetParent(menu, selector.parentElement);
            hWin.SelectorMenuEffects = selector;

            Tools.Class.Loop("si-styler-selector-picker", function (s) {
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
    };
    this.SelectorMenu = function (options) {
        this.Defaults = {
            "Position": "default",
        };
        options = Tools.Object.SetDefaults(options, this.Defaults);


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
        let selectorTypes = ["element", "class", "id", "attribute", 'pseudo class', 'pseudo element', 'combinator'];
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
                    if (hWin.SelectorMenuEffects.tagName === "BUTTON") {
                        let picked = this.options[this.selectedIndex];
                        hWin.SelectorMenuEffects.innerHTML = picked.innerHTML;
                        hWin.SelectorMenuEffects.value = picked.value;
                        switch (stype) {
                            case "element": hWin.SelectorMenuEffects.style.backgroundColor = 'yellow'; break;
                            case "class": hWin.SelectorMenuEffects.style.backgroundColor = "lightgreen"; break;
                            case "id": hWin.SelectorMenuEffects.style.backgroundColor = "lightblue"; break;
                            case "attribute": hWin.SelectorMenuEffects.style.backgroundColor = "lightsalmon"; break;
                            case "pseudo_class": hWin.SelectorMenuEffects.style.backgroundColor = 'plum'; break;
                            case "pseudo_element": hWin.SelectorMenuEffects.style.backgroundColor = "palevioletred"; break;
                            default: break;
                        }
                        //cleanup
                        let menu = document.getElementById('si_styler_selectormenu');
                        menu.style.display = 'none';
                        Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
                    }
                    else if (hWin.SelectorMenuEffects.tagName === "SPAN") {
                        let picked = this.options[this.selectedIndex];
                        hWin.Add(picked.innerHTML, this.parentElement.parentElement.parentElement.parentElement);
                    }
                },
                onmouseout: function (ev) {
                    this.style.display = "none";
                },
                appendTo: selectorSubButton,
            });

            Ele("option", {
                innerHTML: "",
                value: "",
                appendTo: selectorPicker,
            });
            //debugger;
            switch (type) {
                case 'element':
                    for (let elegroup in Editor.Code.html_elements) {
                        let optgroup = Ele("optgroup", { label: elegroup, appendTo: selectorPicker });
                        for (ele in Editor.Code.html_elements[elegroup]) {
                            //debugger;
                            let html = Editor.Code.html_elements[elegroup][ele];
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
                    for (let attrgroup in Editor.Code.html_attributes) {
                        let optgroup = Ele("optgroup", { label: attrgroup, appendTo: selectorPicker });
                        for (ele in Editor.Code.html_attributes[attrgroup]) {
                            //debugger;
                            let attr = Editor.Code.html_attributes[attrgroup][ele];
                            Ele("option", {
                                innerHTML: attr.n,
                                value: attr.n,
                                title: attr.d,
                                appendTo: optgroup,
                            });
                        }
                    }
                    break;
                case 'pseudo class':
                    for (let i in Editor.Code.css_properties["Pseudo Class"]) {
                        let pc = Editor.Code.css_properties["Pseudo Class"][i];
                        Ele("option", {
                            innerHTML: pc.n,
                            value: pc.n,
                            title: pc.d,
                            appendTo: selectorPicker,
                        });
                    }
                    break;
                case 'pseudo element':
                    for (let i in Editor.Code.css_properties["Pseudo Element"]) {
                        let pe = Editor.Code.css_properties["Pseudo Element"][i];
                        Ele("option", {
                            innerHTML: pe.n,
                            value: pe.n,
                            title:pe.d,
                            appendTo: selectorPicker,
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
                            appendTo: selectorPicker,
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
                Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));

                let greybox = hWin.SelectorMenuEffects.parentElement.parentElement;
                hWin.SelectorMenuEffects.parentElement.parentElement.removeChild(hWin.SelectorMenuEffects.parentElement);

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

                Tools.Element.SetParent(menu, document.getElementById('si_styler_container'));
                let selcount = hWin.SelectorMenuEffects.parentElement.parentElement.parentElement.parentElement.querySelectorAll('.si-styler-selectorbox').length;
                let seltool = hWin.Selector({ "Selector": "ChangeMe", "Order":selcount });
                hWin.SelectorMenuEffects.parentElement.parentElement.parentElement.appendChild(seltool);
            },
            appendTo: toolsCell,
        });

        return mainTable;
    };
    this.BuildStyle = function () {
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
                            allSels += Tools.String.TrimR(sel.innerText,'+');
                        } else {
                           
                            allSels += ",\n" + Tools.String.TrimR(sel.innerText, '+');
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
    };
    this.SaveStyle = function () {
        //debugger;
        let s = this;
        //let casheStyle = SI_BlockLibrary
        let csstype = hWin.LoadedType; 
        let sheetname= hWin.LoadedSheet;
        let code = document.getElementById("si_styler_codepad").innerText;
        if (csstype === 'Block') {
            Editor.Objects.Block.Current[sheetname].style = code;
            //debugger;
            Editor.Objects.Block.Save(sheetname, 'style');

            //update everything so we dont need to reload
            let currentStyle = document.getElementById('si_page_style');
            currentStyle.parentElement.removeChild(currentStyle);
          //  let head = document.getElementsByTagName('head')[0];
            let style = document.createElement('link');
            style.id = 'si_page_style';
            style.href = 'style/page.css?' + Date.now();
            document.head.appendChild(style);
        }

        //let entityid = Editor.
    };
    this.LoadStyleByBlock = function (blockname) {
        let style = '';
        if (typeof Editor.Objects.Block.Current[blockname].style !== 'undefined') {
            style = Editor.Objects.Block.Current[blockname].style;
        }
        this.LoadStyleCode(style);
    };
    this.UpdateClasses = function (selectorPicker) {
        if (typeof selectorPicker === 'undefined') {
            selectorPicker = document.getElementById('si_styler_selector_picker_class');
        }
        selectorPicker.innerHTML = "";
        for (let c in Editor.Objects.Elements.Classes) {
            let cl = Editor.Objects.Elements.Classes[c];
            if (cl.trim().length > 0) {
                Ele("option", {
                    innerHTML: "." + cl,
                    value: "." + cl,
                    appendTo: selectorPicker,
                });
            }
        }
    };
    this.UpdateIds = function (selectorPicker) {
        if (typeof selectorPicker === 'undefined') {
            selectorPicker = document.getElementById('si_styler_selector_picker_id');
        }
        selectorPicker.innerHTML = "";
        for (let i in Editor.Objects.Elements.Ids) {
            let id = Editor.Objects.Elements.Ids[i];
            Ele("option", {
                innerHTML: "#" + id,
                value: "#" + id,
                appendTo: selectorPicker,
            });
        }
    };

}
 