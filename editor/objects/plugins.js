
SI.Editor.Objects.Plugins = {
    Style: {
        menucolor: 'var(--si-toolbar)',
        selectedtab: 'var(--si-selection)',
        nonselectedtab: 'var(--si-panel)',
        piboxcolor: 'var(--si-field)',
        tabcolor: 'var(--si-panel)',
        pagecolor: 'var(--si-panel)',
        titlecolor: 'var(--si-accent)',
        textcolor: 'var(--si-text)',
    },

    Draw: function () {
        let container = Ele("div",{
            class: 'si-tool-body',

        });

        let tabs = new SI.Widget.Tab({
            OnChange: function (self) {
                let tab = self.dataset.tabname;
                let pis = SI.Editor.Objects.Plugins.Repo.Plugins;
                //if we have no plugins, we should probably try to get some
                if ( pis.length === 0 ) {
                    SI.Editor.Objects.Plugins.Repo.GetMorePlugins();
                }
            }
        });

        //Currently Installed plugins
        let localPlugins = Ele("div", {
            style: {
                display: 'flex',
                flexWrap:'wrap',
            }
        });

        for (let i = 0; i < 100; i++) {
            Ele("div", {
                style: {  
                    backgroundColor: 'blue',
                    height: '100px',
                    width: '100px',
                    margin:'8px',
                },
                appendTo: localPlugins,
            });
        }

        tabs.Items.Add("Local Plugins", SI.Editor.Objects.Plugins.Local.Build());
        tabs.Items.Add("Plugins Repo", SI.Editor.Objects.Plugins.Repo.Build());
        tabs.Items.Add("Plugin Editor", SI.Editor.Objects.Plugins.Editor.Build());

        container.appendChild(tabs.Draw());

        return container; 
    },
    Repo: {
        Content:null,
        Build: function () {
            let container = Ele('div', {});
            let menu = Ele('div', {
                id: 'si_edit_plugins_repo_menu',
                style: {
                    width: '100%',
                    height: '75px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.menucolor,
                    position: 'relative',
                    paddingLeft: '10px',
                    userSelect: 'none',
                },
                appendTo: container,
            });
            let content = Ele('div', {
                id: 'si_edit_plugins_repo_content',
                style: {
                    width: '100%',
                    height: '500px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.pagecolor,
                    display: 'flex',
                    flexWrap: 'wrap',
                    overflow: 'scroll',
                },
                appendTo: container,
            });
            //Tools.StopOverscroll(content);

            let title = Ele('span', {
                innerHTML: 'Super Intuitive Plugins',
                style: {
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    color: SI.Editor.Objects.Plugins.Style.titlecolor,
                    textSize: '18px',
                },
                appendTo: menu,
            });

            SI.Editor.Objects.Plugins.Repo.AddCategory('All', menu);
            SI.Editor.Objects.Plugins.Repo.Content = content;
            return container;
        },
        Categories: ['All'],
        Plugins: [],
        AddCategory: function (cat, menu = document.getElementById('si_edit_plugins_repo_menu')) {
            if (menu) {
                let h = '24px';
                let col = SI.Editor.Objects.Plugins.Style.nonselectedtab;  //style.tabcolor;
                if (cat === 'All') {
                    h = '25px';
                    col = SI.Editor.Objects.Plugins.Style.selectedtab; // style.pagecolor;
                }
                Ele('div', {
                    textContent: cat,
                    style: {
                        width: '100px',
                        height: h,
                        background: col,
                        color: '#bbb',
                        position: 'relative',
                        display: 'inline-block',
                        marginTop: '41px',
                        marginRight: '5px',
                        textAlign: 'center',
                        paddingTop: '10px',
                        cursor: 'pointer',
                        borderRadius: '5px 5px 0px 0px',
                        textTransform: 'capitolize',
                    },
                    onclick: function () {
                        //set the tabs
                        let kids = this.parentElement.children;
                        for (let k in kids) {
                            let kid = kids[k];
                            if (kid.tagName == 'DIV') {
                                if (kid.innerHTML === this.innerHTML) {
                                    kid.style.height = '25px';
                                    kid.style.background = SI.Editor.Objects.Plugins.Style.selectedtab;
                                } else {
                                    kid.style.height = '24px';
                                    kid.style.background = SI.Editor.Objects.Plugins.Style.nonselectedtab;
                                }
                            }
                        }
                        let cat = this.textContent.trim();
                        if (cat === 'All') {
                            SI.Tools.Class.Show('si-edit-plugins-plugin', 'inline-block');
                        } else {
                            SI.Tools.Class.Hide('si-edit-plugins-plugin');
                            //	debugger;
                            let unhide = 'si-edit-plugins-type-' + cat.replace(/[^0-9a-z]/gi, '').toLowerCase();
                            SI.Tools.Class.Show(unhide, 'inline-block');
                        }
                    },
                    appendTo: menu,
                });
            }
        },
        AddPlugin: function (plugin) {
            let name = plugin['name'];
            if (SI.Editor.Objects.Plugins.Repo.Plugins.indexOf(name) === -1) {
                let style = SI.Editor.Objects.Plugins.Style;
                let container = document.getElementById('si_edit_plugins_repo_content');
                let type = plugin['type'];
                let cla = type.replace(/[^0-9a-z]/gi, '').toLowerCase();
                let shortdesc = plugin['shortdesc'];
                let longdesc = plugin['longdesc'];
                let author = plugin['author'];
                let download = plugin['download'];
                let downloads = plugin['downloads'];
                let screenshots = plugin['Screenshots'];

                let pluginbox = Ele('div', {
                    style: {
                        width: '150px',
                        height: '200px',
                        backgroundColor: style.piboxcolor,
                        display: 'table',
                        textAlign: 'center',
                        margin: '10px',
                        border: '2px groove black',
                        borderRadius: '8px',
                    },
                    class: 'si-edit-plugins-plugin si-edit-plugins-type-' + cla,
                    appendTo: container,
                });
                Ele('span', {
                    innerHTML: 'Name: ' + name,
                    style: {
                        width: '150px',
                        color: style.textcolor,
                    },
                    appendTo: pluginbox,
                });
                Ele('br', { appendTo: pluginbox, });


                Ele('div', {

                    style: {
                        width: '150px',
                        height: '100px',

                    },
                    appendTo: pluginbox,
                });

                Ele('button', {
                    innerHTML: 'Download',
                    style: {
                        borderRadius: '7px',
                        padding: '4px',

                    },
                    data: {
                        app: download
                    },
                    onclick: function () {
                        let options = {
                            Data: {
                                KEY: 'DownloadPlugin',
                                appname: this.dataset.app
                            }
                        };
                        SI.Editor.Ajax.Run(options);
                    },
                    appendTo: pluginbox,
                });
                Ele('br', { appendTo: pluginbox, });
                let infobox = Ele('div', {
                    style: {
                        float: 'right',
                        fontSize: '10px',
                        textTransform: 'capitalize',
                        right: '5px',
                        color: style.textcolor,
                        marginTop: '4px',
                        marginRight: '4px',
                    },
                    appendTo: pluginbox,
                });
                Ele('span', {
                    innerHTML: type + '   ▼' + downloads,
                    appendTo: infobox,
                });
                Ele('br', { appendTo: infobox, });
                Ele('span', {
                    innerHTML: 'by: ' + author,
                    appendTo: infobox,
                });
                SI.Editor.Objects.Plugins.Repo.Plugins.push(name);

            }
        },
        GetMorePlugins: function (quant = 50) {
            let morePlugins = {
                Data: { KEY: 'GetMorePlugins', quant: quant }
            };
            SI.Editor.Ajax.Run(morePlugins);
        },
        StockFetchedPlugins: function (value) {
            let plugins = JSON.parse(value);

            for (let p in plugins) {
                let plugin = plugins[p];
                let type = plugin['type']
                if (SI.Editor.Objects.Plugins.Repo.Categories.indexOf(type) === -1) {
                    //make the category
                    SI.Editor.Objects.Plugins.Repo.AddCategory(type);
                    SI.Editor.Objects.Plugins.Repo.Categories.push(type);
                }
                SI.Editor.Objects.Plugins.Repo.AddPlugin(plugin);
            }
        },
        DownloadedPlugin: function (plugin) {
            //debugger;
            plugin = plugin.replace('.zip', '');
            document.getElementById('si_edit_plugins_local_content').appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin, false));
            alert(plugin + " has been downloaded and is ready to be installed.");

        },
    },
    Local: {
        Content:null,
        Build: function () {
            let style = SI.Editor.Objects.Plugins.Style;
            let container = Ele('div', {});
            let menu = Ele('div', {
                id: 'si_edit_plugins_local_menu',
                style: {
                    width: '100%',
                    height: '75px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.menucolor,
                    position: 'relative',
                    paddingLeft: '10px',
                    userSelect: 'none',
                },
                appendTo: container,
            });
            let content = Ele('div', {
                id: 'si_edit_plugins_local_content',
                style: {
                    width: '100%',
                    height: '550px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.pagecolor,
                    display: 'flex',
                    flexWrap: 'wrap',
                    overflow: 'scroll',
                },
                appendTo: container,
            });
            let title = Ele('span', {
                innerHTML: 'Local Plugins',
                style: {
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    color: SI.Editor.Objects.Plugins.Style.titlecolor,
                    textSize: '18px',
                },
                appendTo: menu,
            });

            let uploadInput = Ele('input', {
                type: 'file',
                accept: '.zip,application/zip,application/x-zip-compressed',
                style: {
                    display: 'none',
                },
                onchange: function () {
                    SI.Editor.Objects.Plugins.Local.UploadSelected(this);
                },
                appendTo: menu,
            });

            Ele('button', {
                innerHTML: 'Upload Zip',
                style: {
                    position: 'absolute',
                    right: '15px',
                    top: '12px',
                    borderRadius: '7px',
                    padding: '4px 10px',

                },
                onclick: function () {
                    uploadInput.click();
                },
                appendTo: menu,
            });

            let installed = SI.Editor.Data.Objects.Plugins.Current;
            let setup = [];
            for (let plugin in installed) {
                if (setup.indexOf(plugin) === -1) {
                    content.appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin, installed[plugin]))
                    setup.push(plugin);
                }
            }

            let downloaded = SI.Editor.Data.Objects.Plugins.Downloaded;
            for (let p in downloaded) {
                let plugin = downloaded[p];
                plugin = plugin.replace('.zip', '');
                if (setup.indexOf(plugin) === -1) {
                    content.appendChild(SI.Editor.Objects.Plugins.Local.AddPlugin(plugin, false))
                    setup.push(plugin);
                }
            }

            SI.Editor.Objects.Plugins.Local.Content = content;
            return container;
        },
        AddPlugin: function (name, vals) {
            let style = SI.Editor.Objects.Plugins.Style;
            let box = Ele('div', {
                innerHTML: name+" ",
                id: 'si_edit_plugin_box_' + name,
                style: {
                    position: 'relative',
                    border: '2px solid black',
                    width: '220px',
                    margin: '10px',
                    padding: '10px',
                    minHeight: '200px',
                    height: 'auto',
                    border: '2px groove black',
                    textAlign: 'center',
                    borderRadius: '8px',
                    backgroundColor: style.piboxcolor,
                    color:SI.Editor.Objects.Plugins.Style.titlecolor,
                },

            });
            let checked = true;
            let isEnabled = "Uncheck to disable";
            let disableTools = "";
            if (vals == false) {
                checked = false;
                isEnabled = "Check to enable";
                disableTools = "disabled";
            }

            let onoff = Ele('input', {
                type: 'checkbox',
                checked: vals && vals.enabled !== undefined ? vals.enabled : checked,
                title: isEnabled,
                appendTo: box,
                data: {
                    plugin: name,
                    installed: vals !== false ? "true" : "false",
                },
                onchange: SI.Editor.Objects.Plugins.Local.ToggleEnabled
            });

            if (vals !== false) {
                for (const page of vals.pages || []) Ele('a', {textContent: page.title, href: page.path, style: {display: 'block'}, appendTo: box});
                for (const action of ['UpdatePlugin', 'UninstallPlugin']) Ele('button', {
                    textContent: action === 'UpdatePlugin' ? 'Update from downloaded ZIP' : 'Uninstall (keep data)', appendTo: box,
                    onclick: function () {
                        if (confirm(action === 'UninstallPlugin' ? 'Uninstall ' + name + '? Data and CMS edits are preserved.' : 'Update ' + name + ' from its downloaded ZIP?')) {
                            SI.Editor.Objects.Plugins.Local.Manage({KEY: action, plugin: name}).catch(error => SI.Tools.SuperAlert(error.message, 6000));
                        }
                    }
                });
            }
            return box;
        },
        Manage: async function (data) {
            const response = await fetch('/delegate-admin.php', {method: 'POST', credentials: 'same-origin',
                headers: {'Content-Type': 'application/json', 'X-SI-CSRF': SI.CSRF.Token}, body: JSON.stringify(data)});
            const result = await response.json();
            if (!response.ok || result.ERROR) throw new Error(result.ERROR || 'Plugin operation failed.');
            if (result.PLUGINCONFLICTS && result.PLUGINCONFLICTS.length) alert('CMS edits preserved in: ' + result.PLUGINCONFLICTS.join(', '));
            location.reload();
        },
        ToggleEnabled: async function () {
            const desired = this.checked;
            const installed = this.dataset.installed === 'true';
            const action = desired ? (installed ? 'EnablePlugin' : 'InstallPlugin') : 'DisablePlugin';
            if (!confirm(action.replace('Plugin', '') + ' ' + this.dataset.plugin + '? Data and CMS edits are preserved.')) { this.checked = !desired; return; }
            this.disabled = true;
            try { await SI.Editor.Objects.Plugins.Local.Manage({KEY: action, plugin: this.dataset.plugin}); }
            catch (error) { this.checked = !desired; SI.Tools.SuperAlert(error.message, 6000); }
            finally { this.disabled = false; }
        },
        UploadSelected: function (input) {
            if (!input || !input.files || input.files.length === 0) {
                return;
            }

            let file = input.files[0];
            if (!file.name || !file.name.toLowerCase().endsWith('.zip')) {
                SI.Tools.SuperAlert('Select a plugin .zip file to upload.', 4000);
                input.value = '';
                return;
            }

            if (window.SI && SI.BackendConfig && SI.BackendConfig.current === 'sipl') {
                if (file.size > 750000) { SI.Tools.SuperAlert('SIPL browser uploads are limited to 750 KB. Place larger ZIPs in plugins/downloaded on the server.', 6000); return; }
                const reader = new FileReader();
                reader.onload = function () {
                    SI.Editor.Ajax.Run({Data: {KEY: 'UploadPluginPackage', plugin: file.name.replace(/\.zip$/i, ''), archive: reader.result.split(',')[1]}});
                };
                reader.readAsDataURL(file); return;
            }
            let formData = new FormData();
            formData.append('KEY', 'UploadPluginPackage');
            formData.append('pluginzip', file);

            let ajax = new XMLHttpRequest();
            ajax.open('POST', '/delegate-admin.php', true);
            if (window.SI && SI.CSRF && SI.CSRF.Token) {
                ajax.setRequestHeader('X-SI-CSRF', SI.CSRF.Token);
            }
            ajax.onreadystatechange = function () {
                if (ajax.readyState !== 4) {
                    return;
                }

                input.value = '';
                if (ajax.status !== 200) {
                    SI.Tools.SuperAlert('Plugin upload failed.', 4000);
                    return;
                }

                try {
                    if (ajax.responseText !== null && ajax.responseText.length > 0) {
                        let json = JSON.parse(ajax.responseText.trim());
                        SI.Editor.Ajax.Complete(json, { Data: { KEY: 'UploadPluginPackage' } });
                    }
                } catch (ex) {
                    console.error(ajax.responseText);
                    console.error(ex);
                    SI.Tools.SuperAlert('Plugin upload failed.', 4000);
                }
            };
            ajax.send(formData);
        },
        Installed: function (plugin) {
            SI.Tools.SuperAlert(plugin+' plugin has been enabled');
            //add data to plugin UI and move it above the top uninstalled plugin
            //add the plugin to Current
            SI.Tools.Element.Reload.Script("si_plugin_script");
            SI.Tools.Element.Reload.Style("si_plugins_style");
            location.reload();
        },
        Uninstalled: function (plugin) {
            SI.Tools.SuperAlert(plugin+' plugin has been disabled');
            //add data to plugin UI and move it above the top uninstalled plugin
            //add the plugin to Current
            SI.Tools.Element.Reload.Script("si_plugin_script");
            SI.Tools.Element.Reload.Style("si_plugins_style");
            location.reload();
        },
    },
    Editor: {
        Content:null,
        Build: function () {
            let container = Ele('div', {});
            let menu = Ele('div', {
                id: 'si_edit_plugins_editor_menu',
                style: {
                    width: '100%',
                    height: '75px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.menucolor,
                    position: 'relative',
                    paddingLeft: '10px',
                    userSelect: 'none',
                },
                appendTo: container,
            });
            let content = Ele('div', {
                id: 'si_edit_plugins_editor_content',
                style: {
                    width: '100%',
                    height: '550px',
                    backgroundColor: SI.Editor.Objects.Plugins.Style.pagecolor,
                    overflow: 'scroll',
                },
                appendTo: container,
            });
            SI.Editor.Objects.Plugins.Editor.Content = content;

            let title = Ele('span', {
                innerHTML: 'Edit Plugins',
                style: {
                    position: 'absolute',
                    top: '15px',
                    left: '15px',
                    color: SI.Editor.Objects.Plugins.Style.titlecolor,
                    textSize: '18px',
                },
                appendTo: menu,
            });

            return container;
        },
    },
    Resize: function () {
       // debugger;
        let h = SI.Widgets.Window.si_edit_plugins_window.GetHeight() - 77 + "px";  
        SI.Editor.Objects.Plugins.Local.Content.style.height = h;      
        SI.Editor.Objects.Plugins.Repo.Content.style.height = h;  
        SI.Editor.Objects.Plugins.Editor.Content.style.height = h;           
    },
};
