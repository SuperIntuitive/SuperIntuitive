
SI.Editor.Objects.Widgets = {
    SelectedWidget : null,
    Draw: function () {
        let container = Ele('div', {});
        let tabs = new SI.Widget.Tab();
        tabs.Items.Add("Instances", SI.Editor.Objects.Widgets.Instances());
        tabs.Items.Add("Widget Editor", SI.Editor.Objects.Widgets.Editor());
        container.appendChild(tabs.Draw());

        //make the window
        var obj = {
            Id: "si_edit_widget_editor_window",
            Title: "Widget Editor",
            Trigger: "#si_edit_widget_editor_open_button"
        };
        new SI.Widget.Window(obj);

        return container;
    },
    //for managing current instances of widgets.
    Instances: function () {
        let base = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                overflow: "auto",
                backgroundImage: "url('/editor/media/images/blackslate.jpg')",
                backgroundSize: 'cover',
                position: "absolute"
            }
        });
        let menu = Ele('div', {
            style: {
                width: "100%",
                height: "26px",
                backgroundColor: SI.Editor.Style.MenuColor,
                color: SI.Editor.Style.TextColor
            },
            appendTo: base
        });
        Ele('label', {
            innerHTML: "Instance to edit:",
            for: "si_edit_widget_instance_selector",
            style: {
                marginLeft:'2em'
            },
            appendTo: menu
        })
        let instanceselector = Ele('select', {
            id: "si_edit_widget_instance_selector",
            style: {
                margin: '4px',
            },
            onchange: function (ev) {
                SI.Editor.Objects.Widgets.SelectInstance(this.options[this.selectedIndex].value);
            },
            appendTo: menu
        });
        Ele("option", {
            innerHTML: "",
            appendTo: instanceselector
        });


        let optionsBox = Ele('div', {
            id: "si_edit_widget_instance_options",
            style: {
                margin: "8px",
                backgroundColor: "rgba(128,128,128,0.2)"
            },
            appendTo: base
        });
        return base;
    },
    AddInstance: function (block, widget, options) {

        if (typeof SI.Page.Blocks[block].Widgets === 'undefined') {
            SI.Page.Blocks[block].Widgets = [];
        }
        let wig = new SI.Widget[widget](options);
        let id = wig.Id;

        let og = document.getElementById("si_edit_widgeteditselector_" + block + "_" + widget);
        if (!og) {
            og = Ele("optgroup", {
                id: "si_edit_widgeteditselector_" + block + "_" + widget,
                label: block + "-" + widget
            });
            let selector = document.getElementById("si_edit_widget_instance_selector");
            if(selector){
                selector.appendChild(og);
            }
            
        }
        let opt = Ele("option", {
            value: block + "-" + widget + "-" + id,
            innerHTML: id,
        });
        og.appendChild(opt);

        SI.Page.Blocks[block].Widgets[id] = wig;
        if (!options.hasOwnProperty('Id')) {
            options.Id = id;
        }
        //Add the widget to the block. 
        SI.Editor.Objects.Blocks.AddWidget(block, widget, options);

    },
    SelectInstance: function (instance) {
        //get the options box
        let optionsBox = document.getElementById("si_edit_widget_instance_options");
        //clear it
        optionsBox.innerHTML = "";
        //if the selector is the top blank, return
        if (instance.length === 0) { return; }

        let parts = instance.split('-');
        let block = parts[0];
        let id = parts[2];
        let widget = SI.Page.Blocks[block].Widgets[id];
        let defaults = widget.Defaults;
        let input = widget.Input;

        Ele("label",{
            for:"si_edit_widget_instance_valsinput",
            innerHTML:"Input Values",
            appendTo:optionsBox
        });
        Ele("input",{
            id:"si_edit_widget_instance_valsinput",
            value:JSON.stringify(input),
            appendTo:optionsBox
        });

        for (let d in defaults) {
            if (defaults.hasOwnProperty(d)) {
                let data = defaults[d];
                let defval = data.value;
                let types = data.type.split('.');
                let affected = data.affected;
                let type; //attr or style
                let property;
                if (types.length > 1) {
                    type = types[0];
                    value = types[1];
                }

                let control = null;

                if (type === "style") {
                    let styleobj = {
                        "Property": value,
                        "Affected":  affected,
                        "InitialValue": defval
                    };
                    control = SI.Editor.Objects.Elements.Styles.Widget(styleobj);
                }

                if (type === "attr") {
                    let attrobj = {
                        "Attribute": value,
                        "Affected": affected,
                        "InitialValue": defval
                    };
                    control = SI.Editor.Objects.Elements.Attributes.Widget(attrobj);
                }

                // "Group": style.group, "Index": style.index, "Affect": 'body' });
                if (control) {
                    optionsBox.appendChild(control);
                }

            }
        }


    },
    DeleteInstance: function (block, widgetid) {
        
    },
    //for editing widget scripts / styles. will effect all Instances
    Editor: function(){
        let base = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                overflow: "auto",
                backgroundImage: "url('/editor/media/images/blackslate.jpg')",
                backgroundSize: 'cover',
                position: "absolute"
            }
        });
        let menu = Ele('div', {
            style: {
                width: "100%",
                height: "26px",
                backgroundColor: SI.Editor.Style.MenuColor,
                color: SI.Editor.Style.TextColor,
            },
            appendTo: base
        });
        Ele('label', {
            innerHTML:"Widget to edit:",
            for: "si_edit_widget_editor_selector",
            style: {
                marginLeft: '2em'
            },
            appendTo: menu
        })
        let widgetselector = Ele('select', {
            id: "si_edit_widget_editor_selector",
            style: {
                margin: '4px',
            },
            onchange: function (ev) {
                SI.Editor.Objects.Widgets.SelectWidget(this.options[this.selectedIndex].value);
            },
            appendTo: menu
        });
        let editorWindowButton = Ele("button", {
            innerHTML: "Edit Window",
            id:"si_edit_widget_editor_open_button",
            appendTo: menu
        });



        Ele("option", {
            innerHTML: "",
            appendTo: widgetselector
        });
        //Populate Widget Selector
        let widgets = SI.Widget;
        for (let widget in widgets) {
            if (widgets.hasOwnProperty(widget)) {
                Ele("option", {
                    innerHTML: widget,
                    value: widget,
                    appendTo: widgetselector
                });
            }
        }

        let builderbox = Ele('div', {
            id: "si_edit_widget_editor_tools",
            style: {
                margin: "8px",
                backgroundColor: "rgba(128,128,128,0.2)"
            },
            appendTo: base
        });
        return base;
    },
    SelectWidget: function (widget) {
    },
    DeleteWidget: function (widget) {
    },

    Tools:{
        AllowedFileTypes: function(container, current){
            let allowedMimesBox = Ele('fieldset', {
                style: {
                    width: '90%',
                    borderRadius: '10px',
                    marginLeft:'3%',
                },
                append: Ele('legend', { innerHTML: 'Allowed File Types' }),
                appendTo: container,
            });
    
            let mimetypes = SI.Editor.Data.Objects.MimeTypes;   
            let categories = [];
            for (let ext in mimetypes) {
                let data = mimetypes[ext].split("|");
                let mime = data[0];
                let cat = data[1];
                if (!(cat in categories)) {
                    categories[cat] = [];
                }
                categories[cat][ext] = mime;
            }

            let allowedFileTypes = current.split(',');
          
            for (let cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    let cattitle = Ele("div", {
                        innerHTML: cat,
                        
                        style: {
                            color:'black',
                            backgroundColor: "darkgrey",
                            paddingLeft: "4px",
                            paddingRight: "4px",
                            border: "solid 1px black"
                        },
                        onclick: function () {
                            let box = document.getElementById('si_edit_settings_categories_' + cat);
                            if (box.style.display === 'none') {
                                box.style.display = 'flex';
                            } else {
                                box.style.display = 'none';
                            }
                        },
                        appendTo: allowedMimesBox
                    });
                    let catbox = Ele("div", {
                        id: 'si_edit_settings_categories_' + cat,
                        style: {
                            color: 'black',
                            backgroundColor: "grey",
                            display: 'none',
                            flexWrap: 'wrap',
                            justifyContent:'space-around'
                        },
                        appendTo: allowedMimesBox
                    });
                    for (let ext in categories[cat]) {
                        if (categories[cat].hasOwnProperty(ext)) {
                            let check = false;
                            if (allowedFileTypes.indexOf(ext)>-1) {
                                check = true;
                            }
                            let mimebox = Ele("span", {
                                appendTo: catbox,
                                style: {
                                    display:'inline',
                                    paddingLeft: "4px",
                                    paddingRight: "4px",
                                    border: "solid 1px black",
                                    borderRadius:'3px',
                                    backgroundColor: "darkgrey",
                                    margin:'1px'
                                }
                            });
                            let cb = Ele("input", {
                                type: 'checkbox',
                                class:"si-edit-settings-allowedfiletypes",
                                data: {
                                    extension: ext
                                },
                                appendTo: mimebox,
                                checked: check,
                                onchange: function () {
                                   
                                    let cbs = document.getElementsByClassName("si-edit-settings-allowedfiletypes");
                                    let fncsv = "";
                                    
                                    for (let i in cbs) {
                                        let cb = cbs[i];
                                        if (cb.checked) {
                                            fncsv += cb.dataset.extension+",";
                                        }
                                    }
                                    if (fncsv.length > 0) {
                                        fncsv = SI.Tools.String.TrimR(fncsv, ','); //lose the last comma.
                                    }
    
                                    let options = {
                                        Data: {
                                            KEY: "UpdateSetting",
                                            settingname: "AllowedFileTypes",
                                            settingvalue: fncsv
                                        }
                                    };
    
                                    SI.Editor.Ajax.Run(options);
                                }
                            });
                            
                            Ele("span", {
                                innerHTML: ext +"&nbsp;-&nbsp;",
                                style: {
                                    color:"blue",
                                },
                                appendTo: mimebox
                            });
                            Ele("span", {
                                innerHTML: categories[cat][ext],
                                appendTo: mimebox
                            });
    
                        }
                    }
    
    
                }
            }
    
            return allowedMimesBox;
        }

    }

}