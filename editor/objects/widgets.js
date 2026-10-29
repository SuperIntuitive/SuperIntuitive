
SI.Editor.Objects.Widgets = {
    SelectedWidget : null,
    Draw: function () {
        let container = Ele('div', {
            class: 'si-tool-body',});
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
            class: 'si-tool-panel-body'
        });
        let menu = Ele('div', {
            class: 'si-tool-toolbar',

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
        SI.Editor.Objects.Widgets.RefreshInstances(instanceselector);
        return base;
    },
    PlacementSize: function (name) {
        const sizes = {Field: [240, 60], IconLink: [160, 48], Table: [320, 200], DataGrid: [320, 200], Tab: [320, 240], Map: [320, 240], Menu: [240, 160], Tree: [240, 200], Tile: [160, 180]};
        const size = sizes[name] || [320, 240];
        return {width: size[0], height: size[1]};
    },
    AddInstance: function (block, widget, options) {
        const parent = options.Parent;
        if (!parent || !parent.closest('.si-block') || typeof SI.Widget[widget] !== 'function') throw new Error('Invalid widget destination');
        const id = SI.Tools.Element.SafeId(widget);
        const starter = {
            Field: {Label: 'Field', Placeholder: 'Enter text…'},
            Accordian: {Sections: {'Section 1': 'Your content'}},
            Menu: {Items: {item: {Text: 'Menu item'}}},
            Tree: {Leaves: {'Item 1': 'Your content'}},
            Window: {Title: 'Window'}
        };
        const input = Object.assign({}, starter[widget] || {}, options, {Id: id});
        // Constructors have historically returned either the instance or its DOM node.
        // Normalize both forms and mount exactly once, only after a valid placement.
        let result;
        try {
            result = new SI.Widget[widget](input);
        } catch (error) {
            const partial = document.getElementById(id);
            if (partial) partial.remove();
            if (SI.Widgets[widget]) delete SI.Widgets[widget][id];
            throw error;
        }
        const instance = SI.Widgets[widget] && SI.Widgets[widget][id] || result;
        let element = result instanceof HTMLElement ? result : result.Container;
        if (!element && typeof result.Draw === 'function') {
            if (widget === 'Tab' && result.Items && !result.Items.Count) result.Items.Add('Tab 1', 'Your content');
            element = result.Draw();
        }
        if (!(element instanceof HTMLElement)) {
            if (SI.Widgets[widget]) delete SI.Widgets[widget][id];
            throw new Error('Widget did not provide a page element');
        }
        element.id = id;
        if (widget === 'Window') element.style.display = 'block';
        if (element.parentElement !== parent) parent.appendChild(element);
        Object.assign(element.style, {position: 'absolute', width: options.Width, height: options.Height, margin: '0', boxSizing: 'border-box'});
        if (instance && !instance.Container) instance.Container = element;
        // Store a serializable parent reference, never a live DOM node in JSON.
        element.dataset.siWidget = widget;
        const saved = Object.assign({}, input, {Parent: parent.id});
        if (!SI.Page.Blocks[block].Widgets) SI.Page.Blocks[block].Widgets = {};
        if (!Array.isArray(SI.Page.Blocks[block].Widgets[widget])) SI.Page.Blocks[block].Widgets[widget] = [];
        SI.Page.Blocks[block].Widgets[widget].push(JSON.stringify(saved));
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) SI.Editor.Objects.Blocks.AddWidget(block, widget, saved, table);
        SI.Editor.Objects.Widgets.RefreshInstances();
        return element;
    },
    UpdatePlacement: function (element, oldBlock) {
        const type = element.dataset.siWidget;
        if (!type) return;
        const block = element.closest('.si-block').id.replace('si_block_', '');
        const previous = oldBlock ? oldBlock.id.replace('si_block_', '') : block;
        const records = SI.Page.Blocks[previous].Widgets || {};
        let options;
        for (const stored of records[type] || []) {
            const candidate = typeof stored === 'string' ? JSON.parse(stored) : stored;
            if (candidate.Id === element.id) options = candidate;
        }
        if (!options) return;
        SI.Editor.Objects.Widgets.Forget(previous, element.id, false);
        Object.assign(options, {Parent: element.parentElement.id, Position: 'absolute', Left: element.style.left, Top: element.style.top, Width: element.style.width, Height: element.style.height});
        const destination = SI.Page.Blocks[block].Widgets || (SI.Page.Blocks[block].Widgets = {});
        if (!destination[type]) destination[type] = [];
        destination[type].push(JSON.stringify(options));
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) SI.Editor.Objects.Blocks.AddWidget(block, type, options, table);
        SI.Editor.Objects.Widgets.RefreshInstances();
    },
    Forget: function (block, id, unregister = true) {
        const widgets = SI.Page.Blocks[block].Widgets || {};
        for (const type of Object.keys(widgets)) {
            if (!Array.isArray(widgets[type])) continue;
            widgets[type] = widgets[type].filter(stored => (typeof stored === 'string' ? JSON.parse(stored) : stored).Id !== id);
            if (unregister && SI.Widgets[type]) delete SI.Widgets[type][id];
        }
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) for (const row of Array.from(table.rows)) if (row.dataset.widgetId === id) row.remove();
    },
    RefreshInstances: function (selector) {
        selector = selector || document.getElementById('si_edit_widget_instance_selector');
        if (!selector) return;
        const selected = selector.value;
        selector.replaceChildren(new Option('Choose a widget…', ''));
        const groups = new Map();
        for (const element of document.querySelectorAll('.si-block [data-si-widget]')) {
            const block = element.closest('.si-block').id.replace('si_block_', '');
            if (!groups.has(block)) {
                const group = document.createElement('optgroup');
                group.label = block;
                groups.set(block, group);
                selector.appendChild(group);
            }
            groups.get(block).appendChild(new Option(element.dataset.siWidget + ' #' + element.id, element.id));
        }
        selector.value = selected;
    },
    SelectInstance: function (id) {
        const box = document.getElementById('si_edit_widget_instance_options');
        if (!box) return;
        box.replaceChildren();
        const element = id && document.getElementById(id);
        if (!element || !element.dataset.siWidget || !element.closest('.si-block')) return;
        SI.Editor.Objects.Elements.SelectNone(true);
        SI.Editor.Objects.Elements.Select(null, element.id);
        const description = document.createElement('p');
        description.textContent = element.dataset.siWidget + ' #' + element.id + ' is selected. Edit its content, attributes, and styles on the page.';
        box.appendChild(description);
        Ele('button', {id: 'si_edit_widget_instance_edit', type: 'button', innerText: 'Edit widget on page', onclick: function () {
            const menu = SI.Editor.UI.MainMenu.Element;
            menu.style.display = 'block';
            document.getElementById('si_edit_edit_menuitem').style.display = 'none';
            SI.Editor.UI.MainMenu.SelectMenu('si_edit_edit_menuitem');
        }, appendTo: box});
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

                backgroundSize: 'cover',
                position: "absolute"
            }
        });
        let menu = Ele('div', {
            style: {
                width: "100%",
                height: "26px",


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

                        class: 'si-tool-subheading',
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