
SI.Editor.Objects.Settings = {
    Draw: function () {
        SI.Editor.UI.HUD.Init();
        SI.Editor.UI.Phpinfo.Init();
        let container = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                overflow: "scroll",
                padding: '20px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
            },
        });



        let toolsbox = Ele('fieldset', {
            style: {
                width: '90%',
                borderRadius: '10px',
            },
            append: Ele('legend', { innerHTML: 'Tools' }),
            appendTo: container,
        });

        //Show hide HUD
        let hudcb = Ele('input', {
            id: 'si_edit_settings_hudcb',
            type: 'checkbox',
            style: {
                marginRight: '30px',
            },
            onchange: function () {
                if (this.checked) {
                    SI.Editor.UI.HUD.Window.Show();
                } else {
                    SI.Editor.UI.HUD.Window.Hide();
                }
            }
        });
        let hudcblabel = Ele('label', {
            innerHTML: "HUD",
            append: hudcb,
            appendTo: toolsbox,
        });



        //let installergobutton = Ele('button', {
        //    id: 'si_edit_settings_installermakergo',
        //    innerHTML:"Build Installer",
        //    appendTo: container,
        //    onclick: function () {
        //        let options = {}
        //        let data = { KEY: "BuildInstallerFile" }
        //        options.Data = data;
        //        SI.Editor.Ajax.Run(options);
        //    }
        //});
        let openPhpInfo = Ele('button', {
            id: 'si_edit_settings_phpinfo',
            innerHTML: "PHP Info",
            appendTo: toolsbox,
            title: "VIew php info",
            style: {
                marginRight: '10px',
            },
            onclick: function (e) {
                SI.Editor.UI.Phpinfo.Window.SetPosition(e.pageY + 25, e.pageX - 250);
                SI.Editor.UI.Phpinfo.Window.Show();

            }
        });

        let checkBadImages = Ele('button', {
            id: 'si_edit_settings_checkbadimages',
            innerHTML: "Look for Image problems",
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
        Ele('br', { appendTo: container, });
        let newbox = Ele('fieldset', {
            style: {
                width: '90%',
                borderRadius: '10px',
            },
            append: Ele('legend', { innerHTML: 'Custom Settings' }),
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

        let existingbox = Ele('fieldset', {
            style: {
                width: '90%',
                borderRadius: '10px',
            },
            append: Ele('legend', { innerHTML: 'Current Settings' }),
            appendTo: newbox,
        });
        let settingstable = Ele('table', {
            id: 'si_edit_settings_table',
            appendTo: existingbox,
        });
        let settings = SI.Editor.Data.Objects.Settings2;
        debugger;
        for (let index in settings) {
            
            if (settings.hasOwnProperty(index)) {
                let setting = settings[index];
                let name = setting.settingname;
                let value = setting.settingvalue;

                SI.Editor.Objects.Settings.Add(name, value, settingstable);
            }
        }

        SI.Editor.UI.Settings.Window.Append(container);
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
                }
            };  
            console.log(name + " " + value);
            SI.Editor.Ajax.Run(options);
        }
    },
    Created: function (value) {
        if (value.length === 2) {
            SI.Editor.Objects.Settings.Add(value[0], value[1]);
            SI.Editor.Data.Objects.Settings[value[0]] = value[1];
            //update the page
            SI.Editor.Objects.Page.AddSetting(value[0]);
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
        });
        let settingvalue = Ele('td', {
            appendTo: settingsrow,
        });

        let settingedit = Ele('input', {
            value: value,
            data: {
                name: name,
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
        debugger;
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
            }
        };
        SI.Editor.Ajax.Run(options);

    },
    Deleted: function (value) {
        if (value.length === 2) {
            let name = value[0];
            let ind = value[1];
            document.getElementById('si_edit_settings_table').deleteRow(ind);
            if (SI.Editor.Data.Objects.Settings.hasOwnProperty(name)) {
                delete SI.Editor.Data.Objects.Settings[name];
            }
            //Remove from the page window
            SI.Editor.Objects.Page.RemoveSetting(value[0]);
        }
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

    }
};