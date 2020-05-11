function Menu(options) {
    //Default Fields. make sure to implement these. they are used to allow UI setting
    this.Defaults = {
        "ContainerClass": "",
        "Direction": "h", // h= horizontal, v verticle,  
        "Type": 'text', // default BUT if Items exist set to parent auto
        "Title": "Name Me",
        "ContainerPosition": "relative", //to stack in, the submenus need to be absolute as not to move everything around
        "ContainerParentID": "",
        "SelectMech":"hover", //hover, or click or maybe dblclick in the late future for assholes.
        "ItemMinWidth": "100px",
        "ItemMinHeight": "24px",
        "ContainerTop": "200px",
        "ContainerBottom": "",
        "ContainerLeft": "20px",
        "ContainerRight": "",
        "FontSize": "1em",
        "FontColor": "black",
        "Border": 'solid 1px rgba(64,64,64,.5)',
        "BackgroundColor": "",
        "TextColor": "white",
        "ItemBackgroundColor": "",
        "SelectedItemBackgroundColor": "slategrey",
        "ItemFilter": "brightness(100%)",
        "HoverItemFilter": "brightness(110%)",
        "SelectedItemFilter": "brightness(125%)",
        "ItemPadding": "2px 6px 2px 6px",

        "Items": {},
    };
    //debugger;
    options = Tools.Object.SetDefaults(options, this.Defaults);
    //private members
    let randId = Tools.String.RandomString(11);
    let SelectedId = '';

    //The main container. it is used mainly for positioning and cascading defaults
    let container = Ele('div', {
        id: "si_menu_" + randId,
        class: options.ContainerClass,
        style: {
            minHeight: options.MinHeight,
            fontSize:options.FontSize,
            color: options.TextColor,
            position: options.ContainerPosition,
            top: options.ContainerTop,
            left: options.ContainerLeft,
            cursor: 'pointer',
            backgroundColor: 'green',
        }
    });
    let level = 0;
    this.CreateMenu = function (createoptions, parent) {



        //debugger;
        createoptions = Tools.Object.SetDefaults(createoptions, this.Defaults);
        let randmenuId = Tools.String.RandomString(11);
        let display = "";
        let position = '';
        if (createoptions.Direction == 'h' && level == 0) {

            display = "inline-block";
            position = 'relative';
        } else {
            display = "none";
            position = 'absolute';
        }

        let menuitem = Ele("span", {
            innerHTML: createoptions.Text,
            style: {
                margin: createoptions.ItemPadding,
            },
        });

        let menuitemcontainer = Ele('div', {
            style: {
                display: display,
                position: position,
                minWidth: menuitem.ItemMinWidth,
                height: options.Height,
                backgroundColor: 'blue',
                textAlign: 'center',
            },
            append: menuitem,
            appendTo: parent,
        })

        if (options.SelectMech === 'hover') {
            menuitemcontainer.onmouseover = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "block";
                }
                e.stopPropagation();
            };
            menuitemcontainer.onmouseout = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "none";
                }
                e.stopPropagation();
            };
        }

        if (Object.keys(createoptions.Items).length >0) {
           //debugger;  
           //I need to loop here, and take each Item out and add it to the top of the tree. 
            for (let index in createoptions.Items) {
                var item = createoptions.Items[index];
                level++;
                this.CreateMenu(item, menuitemcontainer);
            }

        } else {
            level--;
        }

    }


    //if direction = horizontal start with display inline-block, else display block on all subsequent submenus.
    //all
    //would be wonderfull to be recursive but not quite yet
    // TOP LEVEL BLUE
    
    for (let index in options.Items) {
       
        let menuobject = options.Items[index];
        this.CreateMenu(menuobject, container);
    }



    this.Container = container;

    var par = document.getElementById(options.ContainerParentID);
    if (par != null) {
        par.appendChild(container);
    } else {
        return container;
    }

}


    /*
        //debugger;
        //we hava a menu item and all the params that come with it. 
        //lets see what happens when we run the Set Defaults on the Items. this will allow the items to inherit properties as well as overwrite them. 
        let menuitemspan = Ele("span", {
            innerHTML: menuitem.Text,
            style: {
                margin: '7px 10px 7px 10px',
            },
        });

        let menuitemcontainer = Ele('div', {
            style: {
                display: display,
                minWidth: menuitem.ItemMinWidth,
                height: options.Height,
                backgroundColor: 'blue',
                textAlign: 'center',
            },
            append: menuitemspan,
            appendTo: container,
        })

        //Menu Item Event handler
        if (options.SelectMech === 'hover') {
            menuitemcontainer.onmouseover = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "block";
                }
                e.stopPropagation();
            };
            menuitemcontainer.onmouseout = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "none";
                }
                e.stopPropagation();
            };
        }
        if (options.SelectMech === 'click') { //need help to work
            menuitemcontainer.onclick = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "block";
                }
                e.stopPropagation();
            };
            menuitemcontainer.onmouseout = function (e) {
                var kid = this.getElementsByTagName('div')[0];
                if (kid != null) {
                    kid.style.display = "none";
                }
                e.stopPropagation();
            };
        }



        //if we have submenuitems
        if (typeof menuitem.Items != 'undefined') {
            menuitem.ContainerTop = '0px';
            menuitem.ContainerLeft = '0px';
            menuitem.Level++;
            //if we have a sub menu
            let next = new Menu(menuitem.Items);
            menuitemcontainer.appendChild(next);
            //debugger;
            /*

            let submenucontainer = Ele('div', {
                
                style: {
                    position: 'absolute',
                    display: 'none',
                    backgroundColor: 'red',
                    top: options.Height,
                },

                appendTo: menuitemcontainer,
            });

            for (let subindex in menuitem.Items) {

                let submenuitem = menuitem.Items[subindex];
                let submenutext = "";
                if (typeof submenuitem.Text != 'undefined') {
                    submenutext = submenuitem.Text;
                }

                let submenuitemcontainer = Ele('div', {
                    innerHTML: submenutext,
                    appendTo: submenucontainer,
                });

               // if (typeof submenuitem.Items === 'undefined')



            }
            */

/*

    //Sample Menu  Items{}

Items = {
    [0]: {
        Text:"File",
        Type:"parent",

        Items:{
            [0]: {
                Text: "New",
                Type: "WindowOpener",
                Window : "NewWidgetWindow",
            },
            [1]: {
                Text: "Open",
                Type: "WindowOpener"
            },
            [2]: {
                Text: "Export",
                Items: {
                    [0]: {
                        Text: "Select All",
                        type: "function",
                        func: function (this,e) { },

                    },

                }
            }
        }
    },
    [1]: {
        Text: "Edit";
        Type: 'parent',

    }


}




*/


    //it may be trickey to allow these opperations post menu init. I will concentrate on setting up a menu with a provided json object then make it more dynamic. 
    //Items Object
    /*
    this.Items = {
        Count: 0,
        Add: function (addOptions) {
            addDefaults = {
                "Text": "Menu Item",
                "Type": "parent",

                "ContainerClass": "",
                "Width": "auto",
                "Height": "auto",
                "FontSize": "1em",
                "FontColor": "black",
                "Border": 'solid 1px rgba(64,64,64,.5)',
                "BackgroundColor": "#6a739c",
                "TextColor": "white",
                "ItemBackgroundColor": "slategrey",
                "SelectedTabBackgroundColor": "slategrey",
                "ItemFilter": "brightness(100%)",
                "HoverItemFilter": "brightness(110%)",
                "SelectedItemFilter": "brightness(125%)",
                "ItemHeight": "18px",
                "ItemPadding": "6px",
                "Items": {},
            };
            addOptions = Tools.Object.SetDefaults(addOptions, addDefaults);
            var i = this.Count;
            var d[tabname] = content;
            var d = {}
            this[i] = d;
            this.Count++;
        },
        Remove: function (tab) {
            if (typeof tab == 'number') {
                delete this[tab];
                this.Count--;
            } else {
                var i = this.Index(tab);
                delete this[i];
                this.Count--;
            }
            var reset = 0;
            for (let key in this) {
                if (this.hasOwnProperty(key)) {
                    if (!isNaN(key)) {
                        if (key != reset) {
                            this[reset] = this[key];
                            delete this[key];
                        }
                        reset++;
                        log(reset);
                    }

                }
            }
        },
        Contents: function (tab, content) {
            if (typeof tab == 'number') {

            } else {

            }
        },
        Index: function (tabname) {
            for (let i = 0; i < this.Count; i++) {
                if (this[i] != null && this[i][tabname] != null) {
                    return i;
                }
            }
        },
        GetSelected: function () {
            return document.getElementById(SelectedId);
        }
    };
    */