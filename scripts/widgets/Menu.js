if(!SI.Widgets.Menu){SI.Widgets.Menu = {}};
SI.Widget.Menu = function  (options) { 
    if (!(this instanceof SI.Widget.Menu)) { return new SI.Widget.Menu(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Menu");}
    this.Input = {...options};
    SI.Widgets.Menu[this.Id] = this;

    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
        "ContainerClass": "",
        "Direction": "h",
        "Type": 'text',
        "Text": "Text Me",
        "ContainerPosition": "relative",
        "ContainerTop": "200px",
        "ContainerBottom": "",
        "ContainerLeft": "20px",
        "ContainerRight": "",
        "TextColor": "white",
        "Items": {},
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.Random = SI.Tools.String.RandomString(11);
    this.Container = Ele('div', {
        id: this.Id,
        class: this.Options.ContainerClass,
        style: {
            minHeight: this.Options.MinHeight,
            fontSize: this.Options.FontSize,
            color: this.Options.TextColor,
            position: this.Options.ContainerPosition,
            top: this.Options.ContainerTop,
            bottom: this.Options.ContainerBottom,
            left: this.Options.ContainerLeft,
            right: this.Options.ContainerRight,
            cursor: 'pointer',
            backgroundColor: 'green',
        },
    });
    let level = 0;

    this.CreateMenu = function (items, parent) {
        let menuRandId = SI.Tools.String.RandomString(11);

        //let menuContainer = Ele('div', {
        //    id: "si_menu_" + menuRandId,
        //    appendTo: parent,
        //    data: {
        //       level:level, 
        //    },
        //});

        for (let itter in items) {
            if (items.hasOwnProperty(itter)) {
                let menuItemRandId = SI.Tools.String.RandomString(11);

                menuitemDefaults = {
                    "ContainerClass": "",
                    "Type": 'text',
                    "Text": "Text Me",
                    "TextColor": "white",
                    "Height": '20px',
                    "TextMargin": "2px 5px 2px 5px",
                    "Items": {},
                };

                menuOptions = SI.Tools.Object.SetDefaults(items[itter], menuitemDefaults);

                let dir = options.Direction;
                display = "none";
                if (options.Direction == 'h'&& level ==0) {
                    display = "inline-block";
                }
                let menuItem = Ele('div', {
                    id: this.Id + "_menuitem_" + itter,
                    style: {
                        display: display,
                        height: menuOptions.Height,
                        fontSize: menuOptions.FontSize,
                        color: menuOptions.TextColor,
                        cursor: 'pointer',
                        backgroundColor: 'blue',
                    },
                    data: {
                        level:level, 
                    },
                    appendTo: parent,
                });
                let menuText = Ele('span', {
                    id: this.Id + "_menuitem_" + itter+"_label",
                    innerHTML: menuOptions.Text,
                    style: {
                        margin: menuOptions.TextMargin,
                        fontSize: menuOptions.FontSize,
                        color: menuOptions.TextColor,
                        cursor: 'pointer',
                        backgroundColor: 'blue',
                    },
                    appendTo:menuItem,
                });

                if (Object.keys(menuOptions.Items).length > 0) {
                    level++;
                    CreateMenu(menuOptions.Items, menuItem);
                } else {
                    
                    level--;
                    if (level < 0) {
                       level=0;
                    }
                }
            }
        }


    }

    if (Object.keys(this.Options.Items).length > 0) {
        this.CreateMenu(this.Options.Items, this.Container);
    }

    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }
    return this.Container;
}




        /*

        let options = {};
        options.Items = {
            [0]: {
                Label: "File",
                Type: "parent",
                ItemPadding: "2px 5px 2px 5px",

                Items: {
                    [0]: {
                        Label: "New",
                        Type: "window",
                        Window: "NewWidgetWindow",
                        Direction:"v",
                    },
                    [1]: {
                        Label: "Open",
                        Type: "link",
                        Direction: "v",
                    },
                    [2]: {
                        Label: "Export",
                        Items: {
                            [0]: {
                                Text: "Select All",
                                type: "function",


                            },

                        },
                        Direction: "v",
                    }
                }
            },
            [1]: {
                Label: "Edit",
                Type: 'parent',
                Padding: "2px 5px 2px 5px",
                Items: {
                    [0]: {
                        Label: "Cut",
                        Type: "function",       
                    },
                    [1]: {
                        Label: "Copy",
                        Type: "WindowOpener"
                    },
                    [2]: {
                        Label: "Paste",
                        Items: {
                            [0]: {
                                Label: "Custom Paste",
                                type: "function",


                            },

                        }
                    }
                }
            },
            [2]: {
                Label: "Test",
                Type: "link",



            }
        }






        let m = new Menu(options);

        container.appendChild(m);

*/