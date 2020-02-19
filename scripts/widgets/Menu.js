if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

SI.Widgets.Menu = function(options) {
    //debugger;
    this.Defaults = {
        "ContainerClass": "",
        "Direction": "h",
        "Type": 'text',
        "Text": "Text Me",
        "ContainerParentID": "",
        "ContainerPosition": "relative",
        "ContainerTop": "200px",
        "ContainerBottom": "",
        "ContainerLeft": "20px",
        "ContainerRight": "",
        "TextColor": "white",
        "Items": {},
    };
    this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    let randId = SI.Tools.String.RandomString(11);
    let container = Ele('div', {
        id: "si_menu_" + randId,
        class: options.ContainerClass,
        style: {
            minHeight: options.MinHeight,
            fontSize: options.FontSize,
            color: options.TextColor,
            position: options.ContainerPosition,
            top: options.ContainerTop,
            bottom: options.ContainerBottom,
            left: options.ContainerLeft,
            right: options.ContainerRight,
            cursor: 'pointer',
            backgroundColor: 'green',
        },
        appendTo:options.ContainerParentID,
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
                    id: "si_menuitem_" + menuItemRandId,
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
                    id: "si_menuitem_text_" + menuItemRandId,
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

    if (Object.keys(options.Items).length > 0) {
        CreateMenu(options.Items, container);
    }

    this.Container = container;
    if (typeof container.parentElement === 'undefined') {
        var par = document.getElementById(options.ContainerParentID);
        if (par != null) {
            par.appendChild(container);
        } 
    } 
    return container;
}




        /*

        let options = {};
        options.Items = {
            [0]: {
                Text: "File",
                Type: "parent",
                ItemPadding: "2px 5px 2px 5px",

                Items: {
                    [0]: {
                        Text: "New",
                        Type: "window",
                        Window: "NewWidgetWindow",
                        Direction:"v",
                    },
                    [1]: {
                        Text: "Open",
                        Type: "link",
                        Direction: "v",
                    },
                    [2]: {
                        Text: "Export",
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
                Text: "Edit",
                Type: 'parent',
                Padding: "2px 5px 2px 5px",
                Items: {
                    [0]: {
                        Text: "Cut",
                        Type: "function",       
                    },
                    [1]: {
                        Text: "Copy",
                        Type: "WindowOpener"
                    },
                    [2]: {
                        Text: "Paste",
                        Items: {
                            [0]: {
                                Text: "Custom Paste",
                                type: "function",


                            },

                        }
                    }
                }
            },
            [2]: {
                Text: "Test",
                Type: "link",



            }
        }






        let m = new Menu(options);

        container.appendChild(m);

*/