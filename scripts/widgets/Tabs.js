if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

SI.Widgets.Tabs = function (options) {
    //Default Fields. make sure to implement these. they are used to allow UI setting
    this.Defaults = {
        "ContainerClass": "",
        "Position": "absolute",
        "ParentId": "",
        "Width": "100%",
        "Height": "100%",
        "Top": "",
        "Bottom": "",
        "Left": "",
        "Right": "",
        "FontSize": "1em",
        "FontColor": "black",
        "TextAlign": "center",
        "Border": 'solid 1px rgba(64,64,64,.5)',
        "BackgroundColor": "#6a739c",
        "TabTextColor": "white",
        "TabBackgroundColor": "slategrey",
        "SelectedTabBackgroundColor": "slategrey",
        "TabFilter": "brightness(100%)",
        "HoverTabFilter": "brightness(110%)",
        "SelectedTabFilter": "brightness(125%)",
        "TabHeight": "20px",
        "TabPadding": "6px",
        "LeftOfTabsSpace": '18px',
        "Overflow":'hidden',
        "OnChange": null,
        "Selected": null,
    };
    this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    let hWin = this;
    //private members
    let randId = SI.Tools.String.RandomString(11);
    let SelectedId = '';
    //public vars
    this.RandomId = randId;
    this.Container = null;
    //Items Object
    this.Items = {
        Count:0,
        Add: function (tabname, content) {                
            var i = this.Count;
            var d = {};
            d[tabname] = content;
            this[i] = d;
            this.Count++;
        },
        Remove: function (tab) {
            if (typeof tab == 'number'){
                delete this[tab];
                this.Count--;
            }else{
                var i = this.Index(tab);
                delete this[i];
                this.Count--;
            }
            var reset = 0;
            for (var key in this) {
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
            for (var i = 0; i < this.Count; i++) {
                if(this[i] != null && this[i][tabname] != null){
                    return i;
                }
            }
        },
        GetSelected: function () {
            return document.getElementById(SelectedId);         
        }
    };
    this.Show = function () {
        this.container.style.display = 'block';
    };
    this.Hide = function () {
        this.container.style.display = 'none';
    };   
    this.SelectTab = function (tabname) {
        //debugger;

    };
    this.Draw = function (parentId) {
        //debugger;
        let container = Ele('div', {
            class: "si-tabs-container",
            style: {
                position: this.options.Position,
                top: this.options.Top,
                left: this.options.Left,
                right: this.options.Right,
                bottom: this.options.Bottom,
                height: this.options.Height,
                width: this.options.Width,
                overflow: this.options.Overflow,
            }
        });
        //debugger;
        let tabs = Ele("ul", {
            class: "tabmenu_" + randId,
            style: {
                listStyle: 'none',
                whiteSpace: 'nowrap',
                height: (parseInt(this.options.TabHeight) + (parseInt(this.options.TabPadding) - 3)) + 'px',
                backgroundColor: this.options.BackgroundColor,
                margin: '0px',
                //  verticalAlign: 'center',
                width: this.options.Width,
                paddingLeft: this.options.LeftOfTabsSpace,
            },
            appendTo: container,
        });

        //log(this.Items.Count);
        //loop the digits and make the lis
        for (var i = 0; i < this.Items.Count; i++) {
            let first = false;
            if (i === 0) {
                first = true;
            } 

            //debugger;
            var key = Object.keys(this.Items[i])[0];
            //   console.log("key");
            //    console.log(key);
            var val = this.Items[i][key];

            //if this is the first tab it is selected
            let filter = "";
            if (first) {
                filter = this.options.SelectedTabFilter;
            } else {
                filter = this.options.TabFilter;
            }

            let tabitem = Ele("li", {
                id: 'si_tabitem_' + key.replace(' ', '_') + '_' + randId,
                class: "si-tabitem-" + randId,
                style: {
                    display: 'inline',
                    border: this.options.Border,
                    height: this.options.TabHeight,
                    padding: this.options.TabPadding,
                    marginLeft: '0px',
                    cursor: 'pointer',
                    backgroundColor: this.options.TabBackgroundColor,
                    filter: filter,
                },
                data: {
                    tabname: key,
                    tabnum:i
                },
                onclick: function() {
                        //Hide all the tabs and contents
                    SI.Tools.Class.Loop("si-tabitem-" + randId, function (item) {
                        item.style.backgroundColor = hWin.options.TabBackgroundColor;
                        item.style.filter = hWin.options.TabFilter;
                    });
                    SI.Tools.Class.Loop("si-tabcontent-" + randId, function (item) {
                        item.style.display = 'none';
                    });

                    this.style.backgroundColor = hWin.options.SelectedTabBackgroundColor;
                    this.style.filter = hWin.options.SelectedTabFilter;

                    let contentid = this.id.replace('si_tabitem_', 'si_tabcontent_');
                    //    console.log(contentid);
                    //debugger;
                    document.getElementById(contentid).style.display = 'block';
                    SelectedId = this.id;
                    options.Selected = this.dataset.tabname;
                    //debugger;
                    //run passed handeler
                    if (hWin.options.OnChange !== null) {
                        hWin.options.OnChange(this);
                    }

                }, 
                onmouseenter: function () {
                    if (this.id !== SelectedId)
                        this.style.filter = hWin.options.HoverTabFilter;
                },
                onmouseleave: function () {
                    if (this.id !== SelectedId)
                        this.style.filter = hWin.options.TabFilter;
                },
            });

            if (first) {
                SelectedId = tabitem.id;
            } 

            let tablabel = Ele('span', {
                innerHTML:key,
                style: {
                    position: 'relative',
                    userSelect: 'none',
                    top: ((parseInt(this.options.TabPadding) / 2) - 2) + 'px',
                },
                appendTo:tabitem,
            });
            //Add tab to public
            this['tabitem_' + key] = tabitem;

            //The Tab Contents
            //if the tab is showing. we only show one at a time ;)
            let disp = 'none';
            if (first) {
                disp = 'block';
            } 
            //Create the element
            let content = Ele('div', {
                id: 'si_tabcontent_' + key.replace(' ', '_') + '_' + randId,
                class: "si-tabcontent-" + randId,
                style: {
                    minHeight: '100%',
                    backgroundColor: '#DDD',
                    position: 'absolute',
                    top: this.options.TabHeight,
                    width: '100%',
                    display: disp,
                }
            });
            //the incomming content can be a string to add to inner, or an element to append
            if (typeof val === 'string') {
                content.innerHTML = val;
            }
            else if (SI.Tools.Is.Element(val)) {
                content.appendChild(val);
            }

            this['tabcontent_' + key] = content;


            tabs.appendChild(this['tabitem_' + key]);
            container.appendChild(this['tabcontent_' + key])
            
        }
        this.Container = container;

        if (this.options.Selected) {
            SelectTab(this.options.Selected);
        }

        var par = document.getElementById(parentId);
        if (par !== null) {
            par.appendChild(container);
        } else {
            return container;
        }

    }

    return this;
}



