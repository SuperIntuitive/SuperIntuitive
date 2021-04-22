SI.Editor.Objects.Language = {
    Added: function (lang) {
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
                width: "100%",
                height: "100%",
                overflow: "auto",
                padding: '20px',
                backgroundColor: SI.Editor.Style.FavoriteColor,

            },

        });




        //top menu
        let menu = Ele('fieldset', {
            style: {
                margin: '6px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                width: "95%",
                display: 'block',
                borderRadius: '10px',
                lineHeight: '25px',
            },
            appendTo: base,
            append: Ele("legend", {
                innerHTML: "Available Languages",
                class:'si-edit-legend'
            })
        });
        //get the current users lang stuff incase they would like to see it
        let mylangs = SI.Editor.Data.Objects.Language.Installed;
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
            innerHTML: SI.Editor.Data.Objects.Language.SupportedLanguages,
            appendTo: menu,
            onchange: function () {


            }
        });
        menu.appendChild(Ele('br'));
        menu.appendChild(Ele('span', { innerHTML: " Install a new language: " }));
        let instalableList = Ele('select', {
            innerHTML: SI.Editor.Data.Objects.Language.Options,
            appendTo: menu,
            onchange: function () {
                document.getElementById('si_edit_language_add').innerHTML = 'Add ' + this.options[this.selectedIndex].text;
            }
        });

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
            appendTo: menu,
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
            appendTo: menu,

        });
        SI.Tools.Text.FingAutoCorrect(charmap);
        charmap.onscroll = function (e) {
            SI.Editor.Objects.Language.DrawChars(1000);
        };



        //Text Authoring/Editing

        //top menu
        let workspace = Ele('fieldset', {
            class:'si-edit-fieldset',
            style: {
                margin: '6px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                width: "95%",
                display: 'block',
                borderRadius: '10px',
                lineHeight: '25px',
                position:'relative'
            },
            appendTo: base,
            append: Ele("legend", {
                innerHTML: "Current Translations",
                class:'si-edit-legend',
                title:"These are the current translations on this page."

            })
        });
        //NEW controls
        let newLabel = Ele("div", {
            innerHTML: "New: ",
            style: {
                display: 'inline-block',
                margin: '5px 5px 5px 0px',
            },
            appendTo: workspace,
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
            appendTo: workspace,
            style: {
                display: 'inline-block',
            },
        });

        //On Change function for the selector will swap out all of text boxes contents for that of the text selected
        let LocalChange = function (e) {
            //debugger;
            SI.Editor.Objects.Language.Clear();
            let index = this.selectedIndex - 1;
            //let opt = this.selectedOptions[0];
            let localtext = SI.Editor.Data.Objects.Language.Current[index];
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
            id: 'si_edit_lang_textselect',
            appendTo: tsLabel,
            onchange: LocalChange,
        });
        //A blank option for the first blaank line
        Ele('option', { innerHTML: '', value: '', appendTo: textselect, });
        //Button to save the currently selected text in that language
        Ele("input", {
            type: "button",
            id: 'si_edit_lang_save',
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
                index: 0,
            },
            appendTo: tsLabel,
        });


        let tabBox = Ele('div', {
            style:{
                position:'relative',
            },
            appendTo:workspace,
        });


        //Create the Language Tabs
        let langtabs = new SI.Widget.Tab({
            OnChange: function (ele) {
                let lang = ele.dataset.tabname;
                let index = ele.dataset.tabnum;
                ele = document.getElementById('si_edit_lang_save')
                ele.value = "Save " + lang;
                ele.dataset.index = index;
            },
        });
        //Get the multilingual text from the page
        let langSync = function (e) {
            lang = this.id.replace('si_edit_lang_box', '');
            let index = document.getElementById('si_edit_lang_textselect').selectedIndex - 1;
            if (index > -1) {
                let content = this.innerHTML
                SI.Editor.Data.Objects.Language.Current[index][lang] = content;
                let tok = SI.Editor.Data.Objects.Language.Current[index].name;
                //debugger;
                //if it is the one from our language then update the onscreen text.
                if ('_' + SI.Editor.Data.Objects.Language.CurrentPreference.toLowerCase().split(',')[0] == lang) {
                    SI.Tools.Class.Loop("si-multilingual-" + tok, function (ele) {
                        ele.innerHTML = content;
                    })
                }

            }

        }
        //Draw the Tab Items
        for (let langopt in instLangs) {
            let langbox = Ele('div', {
                id: 'si_edit_lang_box_' + instLangs[langopt],
                class: 'si_edit_lang_box',
                contentEditable: true,
                style: {
                    height:'246px',
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

        let allLocalTexts = SI.Editor.Data.Objects.Language.Current;
        //debugger;
        for (let l in allLocalTexts) {
            let localTexts = allLocalTexts[l];
            for (let la in mylangs) {
                let lan = mylangs[la].toLowerCase();
                if (typeof SI.Editor.Data.Objects.Language.Current[l]['_' + lan] !== 'undefined') {
                    let text = SI.Editor.Data.Objects.Language.Current[l]['_' + lan];
                    if (text && text.length > 0) {
                        if (text.length > 32) {
                            text = text.substr(0, 32) + "\u2026";  //18146354
                        }
                        let guid = '0x' + SI.Editor.Data.Objects.Language.Current[l].id;
                        let token = SI.Editor.Data.Objects.Language.Current[l].name;
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
        tabBox.appendChild(langtabs.Draw());


        return base;
    },
    Created: function (response) {
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
                let lan = '_' + SI.Editor.Objects.Language.CurrentInstalled[l];
                if (lan == response['language']) {
                    item[lan] = response['text'];
                }
                else {
                    item[lan] = null;
                }
            }
            SI.Editor.Data.Objects.Language.Current.push(item);
        }
    },
    PerferredInstalledLanguage: "",
    CurrentInstalled: [],
    LastChar: 32,
    DrawChars: function (quant) {
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
    New: function () {
        //debugger;
        this.Clear();
        let localtxt = document.getElementById('si_edit_lang_newtext');
        let lang = localtxt.dataset.language;
        let text = localtxt.value;

        let options = {
            Data: {
                KEY: "LocaltextNew",
                language: lang,
                text: text,
            }
        }

        SI.Editor.Ajax.Run(options);
    },
    Clear: function () {
        SI.Tools.Class.Loop("si_edit_lang_box", function (ele) { ele.clear(); });
    },
    Update: function (langindex, lang) {
        if (SI.Editor.Data.Objects.Language.Current[langindex]) {
            let localtext = SI.Editor.Data.Objects.Language.Current[langindex];
            //debugger;
            if (localtext.id.length == 32) {
                localtext.id = '0x' + localtext.id;
            }
            let options = {
                Data: {
                    KEY: "UpdateLocaltext",
                    id: localtext.id,
                    language: lang,
                    text: localtext['_' + lang],
                }
            }
            SI.Editor.Ajax.Run(options);
        }
    },
}