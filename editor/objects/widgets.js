
SI.Editor.Objects.Widgets = {
    SelectedWidget : null,
    Draw: function () {
        let tabs = new SI.Widget.Tab();
        tabs.Items.Add("Instances", SI.Editor.Objects.Widgets.Instances());
        tabs.Items.Add("Widget Editor", SI.Editor.Objects.Widgets.Editor());
        SI.Editor.UI.Widgets.Window.Append(tabs.Draw());

        //make the window
        var obj = {
            Id: "si_edit_widget_editor_window",
            Title: "Widget Editor",
            Trigger: "#si_edit_widget_editor_open_button"
        };
        new SI.Widget.Window(obj);
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
            document.getElementById("si_edit_widget_instance_selector").appendChild(og);
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

        for (let d in defaults) {
            if (defaults.hasOwnProperty(d)) {
                let data = defaults[d];
                let val = data.value;
                let types = data.type.split('.');
                let effect = data.effect;
                let type1; //attr or style
                let type2;
                if (types.length > 1) {
                    type1 = types[0];
                    type2 = types[1];
                }

                let control = null;

                if (type1 === "style") {
                    let styleobj = {
                        "Property": type2,
                        "Effected": '#' + effect,
                        "InitialValue": val
                    };
                    control = SI.Editor.Objects.Elements.Styles.Widget(styleobj);
                }

                if (type1 === "attr") {
                    let attrobj = {
                        "Attribute": type2,
                        "Effected": '#' + effect,
                        "InitialValue": val
                    };
                    control = SI.Editor.Objects.Elements.Attributes.Widget(attrobj);
                }

                // "Group": style.group, "Index": style.index, "Effect": 'body' });
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



}