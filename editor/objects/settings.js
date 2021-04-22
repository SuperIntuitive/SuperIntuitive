
SI.Editor.Objects.Settings = {
    Draw: function () {

        let container = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                overflow: "auto",
                padding: '20px',
                backgroundColor: SI.Editor.Style.FavoriteColor,

            },
        });



        let toolsbox = Ele('fieldset', {
            style: {
                width: '90%',
                marginLeft:'3%',
                borderRadius: '10px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                marginTop:'8px'
            },
            append: Ele('legend', { 
                innerHTML: 'More Tools',
                class:'si-edit-legend'
            }),
            appendTo: container,
        });
        //HUD
        let hudcb = Ele('input', {
            id: 'si_edit_hud_trigger',
            type: 'checkbox',
            style: {
                marginRight: '30px',
            },
            onclick:function(){
                if(!SI.Widgets.Window.si_edit_hud_window){
                    var hudwin = {
                        Id: "si_edit_hud_window",
                        Trigger: '#si_edit_hud_trigger',
                        Title: "HUD",
                        Width: '200px',
                        Height: '150px',
                        Top: '30%',
                        Left: '1%',
                        Padding:'5px',
                        Overflow: "hidden",
                        Position: "fixed",
                        WindowControls: "CLOSE",
                        IconImg: '/editor/media/icons/hud.png',
                        OnClose: function () {  //sync the cb in settings
                            document.getElementById('si_edit_hud_trigger').checked = false;
                        },
                        Populate: SI.Editor.Objects.Settings.DrawHUD,
                    };
                    new SI.Widget.Window(hudwin);
                    SI.Widgets.Window.si_edit_hud_window.Show();
                }
            }
        });
        let hudcblabel = Ele('label', {
            innerHTML: "HUD",
            append: hudcb,
            appendTo: toolsbox,
        });
        //PhpInfo
        let openScenegraph = Ele('button', {
            id: 'si_edit_settings_scenegraph',
            innerHTML: "Scenegraph",
            appendTo: toolsbox,
            title: "View Scenegraph",
            style: {
                margin: '5px',
            },
            onclick:function(){
                if(!SI.Widgets.Window.scenegraph){
                    var scenegraph = {
                        Id: "si_edit_scenegraph_window",
                        Trigger:"#si_edit_settings_scenegraph",
                        Title: "Scenegraph",
                        IconImg: '/editor/media/icons/scenegraph.png',
                        Populate: SI.Editor.Objects.Settings.DrawScenegraph
                    };
                    new SI.Widget.Window(scenegraph);
                    SI.Widgets.Window.si_edit_scenegraph_window.Show();
                }
            },
        });
        //PhpInfo
        let openPhpInfo = Ele('button', {
            id: 'si_edit_settings_phpinfo',
            innerHTML: "PHP Info",
            appendTo: toolsbox,
            title: "View php info",
            style: {
                margin: '5px',
            },
            onclick:function(){
                if(!SI.Widgets.Window.si_edit_phpinfo_window){
                    var phpwin = {
                        Id: "si_edit_phpinfo_window",
                        Trigger:"#si_edit_settings_phpinfo",
                        Title: "PhpInfo",
                        Width: '990px',
                        IconImg: '/editor/media/icons/php.png',
                        Populate:SI.Editor.Objects.Settings.DrawPhpInfo
                    };
                    new SI.Widget.Window(phpwin);
                    SI.Widgets.Window.si_edit_phpinfo_window.Show();
                }
            },
        });

        let checkBadImages = Ele('button', {
            id: 'si_edit_settings_checkbadimages',
            innerHTML: "Look for Image problems",
            style: {
                margin: '5px',
            },
            appendTo: toolsbox,
            title: 'Some browsers can try to load a page twice+ if there is a missing image. \nMake sure you have images at the end of all your image urls!\nThis will search the document for all invalid images and return their ids.',
            onclick: function () {
                let error = [];
                images = document.querySelectorAll('img');
                for (let i in images) {
                    if (images.hasOwnProperty(i)) {
                        if (!images[i].complete) {
                            //debugger;
                            error.push(images[i].id);
                        }
                    }
                }
                if (error.length > 0) {
                    alert("These images did not load correctly: " + error.join(','));
                } else {
                    alert("All images seem OK :-) ");
                }

            }
        });
        let createInstallerFile = Ele('button', {
            id: 'si_edit_settings_createinstaller',
            innerHTML: "Create Installer",
            appendTo: toolsbox,
            title: "Build a installer file from the existing database",
            style: {
                margin: '5px',
            },
            onclick: function (e) {

                let filename = prompt("Please name the installer file or leave blank for default", "");

                let options = {
                    Data: {
                        KEY: "BuildInstallerFile",
                    }
                };  
                if (filename !== "") {
                    if(SI.Tools.File.IsValid(filename)){
                        options.Data.Name = filename;
                    }
                    else{
                        alert("Illegal filename, please provide a legal filename");
                        return false;
                    }
                }
                if (filename !== null) {
                    SI.Editor.Ajax.Run(options);
                }
            }
        });
        let createBackupFile = Ele('button', {
            id: 'si_edit_settings_createbackup',
            innerHTML: "Backup Database",
            appendTo: toolsbox,
            title: "Make a backup file from the existing database",
            style: {
                margin: '5px',
            },
            onclick: function (e) {
                let options = {
                    Data: {
                        KEY: "BuildBackupFile",
                    }
                };  
                SI.Editor.Ajax.Run(options);
            }
        });
        let performUpdate = Ele('button', {
            id: 'si_edit_settings_getupdate',
            innerHTML: "Update SI",
            appendTo: toolsbox,
            title: "Update files from Github",
            style: {
                margin: '5px',
            },
            onclick: function (e) {
                let options = {
                    Data: {
                        KEY: "PerformUpdate",
                        branch:'dev'
                    }
                };  
                SI.Editor.Ajax.Run(options);
            }
        });



        Ele('br', { appendTo: container, });
        let newbox = Ele('fieldset', {
            style: {
                width: '90%',
                borderRadius: '10px',
                marginLeft:'3%',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
            },
            append: Ele('legend', { 
                innerHTML: 'Custom Settings',
                class:'si-edit-legend'
            }),
            appendTo: container,
        });
        Ele("span", { innerHTML: 'New Setting: Name ', appendTo: newbox });
        let newsettingname = Ele("input", {
            id: 'si_edit_settings_newname',
            onchange: function () {
                this.value = this.value.replace(/\W/g, '');
            },
            appendTo: newbox
        });
        Ele("span", { innerHTML: ' Value ', appendTo: newbox });
        let newsettingvalue = Ele("input", { id: 'si_edit_settings_newvalue', appendTo: newbox });
        Ele("button", {
            innerHTML: 'Create',
            appendTo: newbox,
            onclick: function () {
                let name = document.getElementById('si_edit_settings_newname').value;
                let value = document.getElementById('si_edit_settings_newvalue').value;
                SI.Editor.Objects.Settings.New(name, value);
            }
        });
        Ele("hr",{appendTo: newbox});
        let existingbox = Ele('fieldset', {
            style: {
                width: '96%',
                borderRadius: '10px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                filter: "brightness(1.2)"
            },
            append: Ele('legend', { 
                innerHTML: 'Current Settings',
                class:'si-edit-legend'
            }),
            appendTo: newbox,
        });
        let settingstable = Ele('table', {
            id: 'si_edit_settings_table',
            appendTo: existingbox,
        });
        let settings = SI.Editor.Data.Objects.Settings;

        for (let index in settings) {
            
            if (settings.hasOwnProperty(index)) {
                let setting = settings[index];
                let name = setting.settingname;
                let value = setting.settingvalue;
                SI.Editor.Objects.Settings.Add(name, value, settingstable);
            }
        }

        return container;
    },
    New: function (name, value) {
    //Creates a new Setting in the table settings
        name = name.replace(/\W/g, '');
        if (SI.Editor.Data.Objects.Settings.hasOwnProperty(name)) {
            alert("This setting already exists");
        }
        else {
            let options = {
                Data: {
                    KEY: "NewSetting",
                    settingname: name,
                    settingvalue: value
                },
                Callback: SI.Editor.Objects.Settings.Created
            };  
            console.log(name + " " + value);
            SI.Editor.Ajax.Run(options);
        }
    },
    Created: function (setting) {
        if (setting.length === 3) {
            let id = setting[0];
            let name = setting[1];
            let val = setting[2];
            SI.Editor.Objects.Settings.Add(name, val);
            
            SI.Editor.Data.Objects.Settings.push( {"id":id,"settingname": name,'settingvalue': val} );
            //update the page
            SI.Editor.Objects.Page.AddSetting(name);
            document.getElementById("si_edit_settings_newname").value = "";
            document.getElementById("si_edit_settings_newvalue").value = "";
        }
    },
    Add: function (name, value, table = null) {
        let settingsrow = Ele('tr', {
        });
        let settingname = Ele('th', {
            innerHTML: name,
            appendTo: settingsrow,
            style:{
                paddingRight:"30px",
            }
        });
        let settingvalue = Ele('td', {
            appendTo: settingsrow
        });

        let settingedit = Ele('input', {
            value: value,
            data: {
                name: name,
            },
            style:{
                width:"230px",
            },
            onchange: SI.Editor.Objects.Settings.Update,
            appendTo: settingvalue,
        });

        let settingdelete = Ele('input', {
            type: 'button',

            data: {
                name: name,
            },
            style: {
                position: 'relative',
                top: '5px',
                marginLeft: '5px',
                width: '20px',
                height: '20px',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/deleteButton.png')",
            },
            onclick: SI.Editor.Objects.Settings.Delete,
            appendTo: settingvalue,
        });

        if (!table) {
            document.getElementById('si_edit_settings_table').appendChild(settingsrow);
        } else {
            table.appendChild(settingsrow);
        }
    },
    Update: function (ev) {
        let self = this;
        //debugger;
        let options = {
            Data: {
                KEY: "UpdateSetting",
                settingname: this.dataset.name,
                settingvalue: this.value
            }
        }
        SI.Editor.Ajax.Run(options);

    },
    Delete: function (ev) {
        let self = this;
        //debugger;
        let options = {
            Data: {
                KEY: "DeleteSetting",
                settingname: this.dataset.name,
                index: this.parentElement.parentElement.rowIndex,
            },
            Callback:SI.Editor.Objects.Settings.Deleted
        };
        SI.Editor.Ajax.Run(options);

    },
    Deleted: function (setting) {

            let index = SI.Tools.Array.GetIndexByObjKVP(SI.Editor.Data.Objects.Settings,"settingname",setting);

            document.getElementById('si_edit_settings_table').deleteRow(index);

            delete SI.Editor.Data.Objects.Settings[index];

            //Remove from the page window
            SI.Editor.Objects.Page.RemoveSetting(name);
    },
    Help: {
        Sites: {
            mdn: {
                types: ['tags', 'styles'],
                company: "mozilla",
                domain: 'https://developer.mozilla.org',
            },
            w3: {
                types: ['attributes', 'tags', 'styles'],
                company: "w3schools",
                domain: 'https://www.w3schools.com',
            },
            dphp: {
                types: [],
                company: "developphp",
                domain: 'https://www.developphp.com',
            },

        },
        Show: function (type, codeobj, appendTo) {
            for (let site of SI.Editor.Data.User.HelpLinks) {
                if (site in SI.Editor.Objects.Settings.Help.Sites && site in codeobj) {
                    let obj = SI.Editor.Objects.Settings.Help.Sites[site];
                    let types = obj.types;
                    if (types.includes(type)) {
                        let company = obj.company;
                        let domain = obj.domain;
                        let path = domain + codeobj[site];
                        let icon = new SI.Widget.IconLink({ "Parent": appendTo, "IconUrl": '/editor/media/icons/' + company + '.png', "Link": path, "Type": 'td', "Title": "Look up " + codeobj.n + " on " + company })
                        //  appendTo.appendChild(icon.Container);
                    }
                }
            }

        }

    },
    DrawHUD: function () {
        let container = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                fontSize: '10px',
            },
        });

        Ele('span', {
            innerHTML: "Mouse X:",
            appendTo: container,
        });
        Ele('span', {
            id: 'si_edit_hud_xpos',
            appendTo: container,
        });
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Mouse Y:",
            appendTo: container,
        });
        Ele('span', {
            id: 'si_edit_hud_ypos',
            appendTo: container,
        });
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Selected Element:",
            appendTo: container,
        });
        Ele('span', {
            id: 'si_edit_hud_selectedelement',
            appendTo: container,
        });

        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Dragging Element:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_draggingelement',
            appendTo: container,
        });
        //offparent
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Offset Parent:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_offsetparent',
            appendTo: container,
        });
        //parent elementid
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Parent Id:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_parentid',
            appendTo: container,
        });
        //offsetX
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Offest X:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_offsetx',
            appendTo: container,
        });
        //offsetY
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Offset Y:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_offsety',
            appendTo: container,
        });

        //DropParent
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Drop Parent:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_dropparent',
            appendTo: container,
        });
        //DropParent
        Ele('br', { appendTo: container });
        Ele('span', {
            innerHTML: "Editor Is Dragging:",
            appendTo: container,

        });
        Ele('span', {
            id: 'si_edit_hud_editisdragging',
            appendTo: container,
        });

        document.body.addEventListener("mousemove", function (ev) {
            let hud = document.getElementById("si_edit_hud_xpos");
            if(hud){
                hud.innerHTML = ev.pageX;
                document.getElementById("si_edit_hud_ypos").innerHTML = ev.pageY;
            }
        });
        return container;
    },
    DrawScenegraph: function () {
        let base = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                backgroundColor:'#111',
                overflow: "scroll",
                color:SI.Editor.Style.TextColor,
            },
        });
        //debugger;
        let ul =  SI.Tools.Object.ToDataTree(SI.Editor.Data.Site.SessionPageData);
        let pre = Ele('div', {
            style: {
                tabSize: '0',
                color:'white',
            },
            append: ul,
            appendTo:base,
        })
        return base;
    },
    DrawPhpInfo: function () {
        let container = Ele('div', {
            innerHTML: SI.Editor.Data.Objects.PhpInfo,
        });
        return container;
    },
};

