
SI.Editor.Objects.Plugins = {
    Style: {
        menucolor: '#888',
        selectedtab: 'linear-gradient(180deg, rgba(34,34,34,1) 0%, rgba(51,51,51,1) 35%, rgba(68,68,68,1) 100%)',
        nonselectedtab: 'linear-gradient(0deg, rgba(34,34,34,1) 0%, rgba(51,51,51,1) 35%, rgba(68,68,68,1) 100%)',
        piboxcolor: '#222',
        tabcolor: '#333',
        pagecolor: '#444',
        titlecolor: '#ccc',
        textcolor: '#bbb',
    },
    Repo: {
        Build: function () {
            let style = SI.Editor.Objects.Plugins.Style;
            let container = Ele('div', {});
            let menu = Ele('div', {
                id: 'si_edit_plugins_repo_menu',
                style: {
                    width: '100%',
                    height: '100px',
                    backgroundColor: style.menucolor,
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
                    backgroundColor: style.pagecolor,
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
                    color: style.titlecolor,
                    textSize: '18px',
                },
                appendTo: menu,
            });


            return container;
        },
        Categories: ['All'],
        Plugins: [],
        AddCategory: function (cat) {
            let style = SI.Editor.Objects.Plugins.Style;
            menu = document.getElementById('si_edit_plugins_repo_menu');
            if (menu) {
                let h = '24px';
                let col = style.nonselectedtab;  //style.tabcolor;
                if (cat === 'All') {
                    h = '25px';
                    col = style.selectedtab; // style.pagecolor;
                }
                Ele('div', {
                    innerHTML: cat,
                    style: {
                        width: '100px',
                        height: h,
                        background: col,
                        color: '#bbb',
                        position: 'relative',
                        display: 'inline-block',
                        marginTop: '65px',
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
                                    kid.style.background = style.selectedtab;
                                } else {
                                    kid.style.height = '24px';
                                    kid.style.background = style.nonselectedtab;
                                }
                            }
                        }
                        let cat = this.innerHTML.trim();
                        if (cat === 'All') {
                            SI.Tools.Class.Show('si-edit-plugins-plugin', 'inline-block');
                        } else {
                            SI.Tools.Class.Hide('si-edit-plugins-plugin');
                            //	debugger;
                            let unhide = 'si-edit-plugins-type-' + cat.toLowerCase();
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
                let cla = type.replace(/[^0-9a-z]/gi, '');
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
                        backgroundColor: 'black',
                    },
                    appendTo: pluginbox,
                });

                Ele('button', {
                    innerHTML: 'Download',
                    style: {
                        borderRadius: '7px',
                        padding: '4px',
                        color: '#000',
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
        Build: function () {
            let style = SI.Editor.Objects.Plugins.Style;
            let container = Ele('div', {});
            let menu = Ele('div', {
                id: 'si_edit_plugins_local_menu',
                style: {
                    width: '100%',
                    height: '50px',
                    backgroundColor: style.menucolor,
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
                    backgroundColor: style.pagecolor,
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
                    color: style.titlecolor,
                    textSize: '18px',
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


            return container;
        },
        AddPlugin: function (name, vals) {
            let style = SI.Editor.Objects.Plugins.Style;
            let box = Ele('div', {
                innerHTML: name,
                id: 'si_edit_plugin_box_' + name,
                style: {
                    position: 'relative',
                    border: '2px solid black',
                    width: '95%',
                    margin: '10px',
                    padding: '10px',
                    border: '2px groove black',
                    borderRadius: '8px',
                    backgroundColor: style.piboxcolor,
                },

            });
            let checked = true;
            if (vals == false) {
                checked = false;
            }

            let onoff = Ele('input', {
                type: 'checkbox',
                checked: checked,
                appendTo: box,
                data: {
                    plugin: name,
                },
                onchange: function () {
                    if (this.checked) {
                        if (confirm("Are you sure you want to install the plugin: " + this.dataset.plugin)) {
                            //install the plugin. extract the zip to its neighboring directory
                            let options = {
                                Data: {
                                    KEY: "InstallPlugin",
                                    "plugin": this.dataset.plugin
                                }
                            }
                            SI.Editor.Ajax.Run(options);
                            this.checked = true;

                        } else {
                            this.checked = false;
                            return false;
                        }
                    } else {
                        if (confirm("Are you sure you want to remove the plugin: " + this.dataset.plugin + "? You will lose any modifications that you made to this plugin.")) {
                            //remove the plugin. just delete the directory. leave the zip where it is
                            let options = {
                                Data: {
                                    KEY: "UninstallPlugin",
                                    "plugin": this.dataset.plugin
                                }
                            }
                            SI.Editor.Ajax.Run(options);
                            this.checked = false;

                        } else {
                            this.checked = true;
                            return false;
                        }
                    }
                },
            });

            if (vals == true) {
                //debugger;


            }


            return box;
        },
        Installed: function (plugin) {
            alert('Plugin has been installed');
            //add data to plugin UI and move it above the top uninstalled plugin
            //add the plugin to Current


        },
        Uninstalled: function (plugin) {
            alert('Plugin has been removed');
            //remove data from UI and move it to the bottom
        },
    },
    Editor: {
        Build: function () {
            this.loaded = '';
            let container = Ele("div", {
                style: {
                    width: "100%",
                    height: '600px',
                    backgroundColor: 'blue',
                    backgroundImage: "url('/editor/media/images/underconstruction.png')",
                }
            });
            return container;
        },
    }
};
