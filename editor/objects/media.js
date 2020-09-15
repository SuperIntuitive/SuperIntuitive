
SI.Editor.Objects.Media = {
    Draw : function(){
        let container = Ele("div", {});
        var tabs = new SI.Widget.Tab({});

        tabs.Items.Add('Images', SI.Editor.Objects.Media.MediaTab('Images'));
        tabs.Items.Add('Audio', SI.Editor.Objects.Media.MediaTab('Audio'));
        tabs.Items.Add('Video', SI.Editor.Objects.Media.MediaTab('Video'));
        tabs.Items.Add('Documents', SI.Editor.Objects.Media.MediaTab('Docs'));
        tabs.Items.Add('Data', SI.Editor.Objects.Media.MediaTab('Data'));
        tabs.Items.Add('Fonts', SI.Editor.Objects.Media.MediaTab('Fonts'));

        container.appendChild(tabs.Draw());

        //want the uploader to be fixed to the lower left on all tabs.
        uploaderOptions = {
            Id:'si_edit_media_uploader',
            Bottom: '20px', 
            Left: '20px', 
            OnComplete: SI.Editor.Objects.Media.OnComplete
        };
        var uploader = new SI.Widget.Uploader(uploaderOptions);
        container.appendChild(uploader.Container);

        //try to load the first image so we dont have blanks...  ...lol this silly hack works ..at least it used to
        let tiles = document.getElementsByClassName('si_media_Images');
        if (tiles !== null) {
            SI.Tools.Events.Fire(tiles[0], 'click');
        }
        return container;
    },
    MediaTab : function (tabname) {
        this.CurrentMediaPath = "",
        tabname = tabname.replace(/ /g, '');
        let container = Ele('div', {
            style: {
                width: '100%',
                height: '100%'
            }
        });
        //Left Menu
        let menu = Ele('div', {
            class: 'si-media-menu',
            style: {
                position: 'relative',
                top: "0px",
                bottom: "205px",
                width: '220px',
                height: '280px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                padding: '20px',
                color: SI.Editor.Style.TextColor,
                overflowY: 'scroll',
                overflowX: 'hidden'
            },
            appendTo: container
        });
        //Left Menu Fields
        var globalFields = ['Name', 'Filename', 'Mime', 'Size'];
        let filter = "";
        switch (tabname) {
            case "Images":
                globalFields.push("Width");
                globalFields.push("Height");
                filter = 'image/*';
                break;
            case "Audio":
                globalFields.push("Duration");
                filter = 'audio/*';
                break;
            case "Video":
                globalFields.push("Width");
                globalFields.push("Height");
                globalFields.push("Duration");
                filter = 'video/*';
                break;
            case "Documents":
                globalFields.push("Width");
                globalFields.push("Height");
                filter = 'application/*';
                break;
            case "Data":
                filter = 'application';
                break;
            case "Fonts":
                filter = 'application/x-font*';
                break;
        }
        //Draw main menu fields
        for (let fields in globalFields) {
            let fieldBox = Ele('fieldset', {
                style: {
                    float: 'left'
                },
                appendTo: menu,
                append: Ele("legend", { innerHTML: globalFields[fields] })
            });
            let input = Ele('input', {
                id: 'si_media_' + tabname + '_' + globalFields[fields].replace(/ /g, ''),
                style: {
                    width: '150px',
                    float: 'left'
                },
                onchange: this.Save(this),
                appendTo: fieldBox
            });

        }

        let fileOpsBox = Ele('fieldset', {
            style: {
                float: 'left'
            },
            appendTo: menu,
            append: Ele("legend", { innerHTML: "File" })
        });
        //Replace File button;
        Ele('label', {
            innerHTML: "Replace Dev File",
            htmlFor: 'si_media_' + tabname + '_update_dev',
            appendTo: fileOpsBox,
        });
        Ele('input', {
            id: 'si_media_' + tabname + '_update_dev',
            type: 'file',
            accept: filter,
            style: {
                position: 'relative'
            },
            appendTo: fileOpsBox
        });
        //newline
        Ele("br", { appendTo: fileOpsBox }); Ele("br", { appendTo: fileOpsBox });
        //Move to Recycle
        Ele('input', {
            id: 'si_media_' + tabname + '_recycle',
            type: 'button',
            value: 'Move To Recycle',
            title: "Moves the 4 images to the recycle bin and deletes the entity",
            style: {
                position: 'relative',
                display: 'block',
            },
            appendTo: fileOpsBox,
            onclick: SI.Editor.Objects.Media.Recycle,
        });

        var deployments = ['dev', 'test', 'live'];
        for (let d in deployments) {
            let deployment = deployments[d];
            let Deploy = SI.Tools.String.CapFirst(deployment);
            let bgcolor = '';
            switch (deployment) {
                case "live": bgcolor = "red"; break;
                case "test": bgcolor = "yellow"; break;
                case "dev": bgcolor = "green"; break;
            }
            let previewbox = Ele('fieldset', {
                style: {
                    float: 'left'
                },
                appendTo: menu,
                append: Ele("legend", { innerHTML: Deploy }),
            });
            if (tabname === "Images") {
                Ele('img', {
                    src: this.CurrentMediaPath,
                    id: 'si_media_' + tabname + '_' + Deploy + 'Preview',
                    style: {
                        float: 'left',
                        marginTop: "1px",
                        width: '200px',
                        height: 'auto',
                        backgroundImage: "url('/editor/media/icons/transparentBackground.jpg')",
                    },
                    appendTo: previewbox,
                });
            }
            else if (tabname === "Audio" || tabname === "Video") {
                let h = (tabname === "Audio") ? "50px" : "150px";
                let file = this.CurrentMediaPath;
                let ext = file.split('.').pop();
                let type = (tabname === "Audio") ? "audio/mp3" : "video/mp4";
                //debugger;
                let av = Ele(tabname, {
                    id: 'si_media_' + tabname + '_' + Deploy + 'PreviewContainer',
                    style: {
                        float: 'left',
                        marginTop: "1px",
                        width: '200px',
                        height: h,
                    },
                    controls: 'controls',
                    appendTo: previewbox,
                });
                Ele('source', {
                    src: this.CurrentMediaPath,
                    id: 'si_media_' + tabname + '_' + Deploy + 'Preview',
                    type: type,
                    appendTo: av,
                });

            }

            let promotelabel = "Rollback";
            if (deployment === "dev") {
                promotelabel = "Promote To Test";
            } else if (deployment === "test") {
                promotelabel = "Promote To Live";
            }
            Ele('button', {
                id: 'si_media_' + tabname + '_' + Deploy + 'Promote',
                title: promotelabel,
                style: {
                    float: 'right',
                    marginRight: '10px',
                    marginTop: '10px',
                    width: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    backgroundColor: bgcolor,
                },
                data: {
                    Deployment: deployment,
                },
                onclick: function (e) {
                    SI.Editor.Objects.Media.Promote(this, e);
                },
                appendTo: previewbox,
            });

        }
        //Media Toolbar
        var mediatoolbar = Ele('div', {
            class: 'si-edit-mediatoolbar',
            style: {
                position: 'absolute',
                width: '540px',
                height: "24px",
                top: '0px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                left: '260px'
            },
            appendTo: container,
            onclick: function () { alert("Sort and filter stuff will be here soon"); },
        });
        //Media Scroller
        var mediascroller = Ele('div', {
            id: 'si_edit_mediascroller_' + tabname,
            class: 'si-edit-mediascroller',
            style: {
                position: 'absolute',
                display: 'inline-block',
                padding: '6px',
                overflow: 'auto',
                left: '260px',
                top: '24px',
                width: '538px',
                height: '100%',
                backgroundColor: SI.Editor.Style.FavoriteColor,
                paddingRight: '0px'
            },
            appendTo: container
        });

        //clear spacer to keep icons off the toolbar
        Ele('div', { style: { position: 'relative', width: '100%', height: "20px", pointerEvents: 'none' }, appendTo: mediascroller });
        //Populate the Meida Icons
        let medialibrary = SI.Editor.Data.Objects.Media;
        for (let media in medialibrary) {        
            if (medialibrary.hasOwnProperty(media)) {
                let data = medialibrary[media];
                if (data.hasOwnProperty('mime')) {
                    if (SI.Editor.Data.DataLists.AcceptedMimeTypes[tabname].indexOf(data.mime) > -1) {
                        let validPath = SI.Tools.GetMediaFilePath("dev_" + data['path']);
                        //debugger;
                        if (validPath.indexOf("/media/fonts/")>-1) {
                            //if we have a font, hack in the font @ style 
                            
                            let fontpath = SI.Tools.GetMediaFilePath("dev_" + data['path'],true);
                            let fontname = validPath.replace(/^.*(\\|\/|\:)/, '');
                            fontname = fontname.substring(fontname.lastIndexOf('.') + 1);
                            let fontstyle = document.getElementById('si_font_style');
                            if (!fontstyle) {
                                fontstyle = Ele('style', { id:"si_font_style", appendTo: document.head });
                            }
                            let fontface = document.createTextNode("@font-face {\n\tfont-family:" + fontname + ";\n\tsrc:" + fontpath + "\n}");    
                            fontstyle.appendChild(fontface);
                        }
                        if (validPath !== null) {
                            let options = {
                                Type: tabname,
                                Data: { "path": data['path'], "mime": data['mime'], "name": data['name'], "tabname": tabname, "url": validPath, "id": '0x' + data['id'] },
                                Group: 'si_media_' + tabname,
                                Url: validPath,
                                BackgroundColor: 'silver',
                                Text: data['name'],
                                Mime: data['mime'],
                                OnChange: SI.Editor.Objects.Media.OnChange,
                            };
                            let tile = new SI.Widget.Tile(options);
                            mediascroller.appendChild(tile.Container);
                        } else {
                            SI.Tools.Warn("Unknown file could not be loaded into media viewer: " + data['path']);
                        }
                    }
                }
            }
        }

        return container;

    },
    Resize: function () {
        let w = SI.Widgets.Window.si_edit_media_window.GetWidth();
        let h = SI.Widgets.Window.si_edit_media_window.GetHeight();
        SI.Tools.Class.Loop("si-edit-mediascroller", function (ele) {
            ele.style.width = (w - 265) + "px";
            ele.style.height = (h - 56) + "px";
        }); 
        SI.Tools.Class.Loop('si-edit-mediatoolbar', function (ele) {
            ele.style.width = (w - 260) + "px";
        });
        SI.Tools.Class.Loop("si-media-menu", function (ele) {
            ele.style.height = (h - 320) + "px";
        });
    },
    Save : function (input) {
        // console.log(input);
    },
    OnComplete : function (files, responseText) {
        let response = JSON.parse(responseText);
        for (let file in files) {
            if (files.hasOwnProperty(file)) {
                let filedata = files[file];
                let moredata = response[file];
                let tabname = SI.Tools.String.CapFirst(moredata['category']);
                let name = SI.Tools.String.CapFirst(moredata['name']).split('.')[0];
                let scroller = document.getElementById('si_edit_mediascroller_' + tabname );
                if (scroller) {
                    //debugger;
                    let options = {
                        Type: tabname,
                        Data: { "path": moredata['name'], "mime": moredata['mime'], "name": name, "tabname": tabname, "url": moredata['path'], "id": moredata['id'] },
                        Group: 'si_media_' + tabname,
                        Url: moredata['name'],
                        BackgroundColor: 'silver',
                        Text: name,
                        Mime: moredata['mime'],
                        OnChange: SI.Editor.Objects.Media.OnChange,
                    };
                    let tile = new SI.Widget.Tile(options);

                    scroller.appendChild(tile.Container);
                }
                

       
            }
        }

        
    },
    OnChange : function (ev,self) {
        let deploys = ["dev", "test", "live"];
        let filename = self.getAttribute('data-path');
        let name = self.getAttribute('data-name');
        let mime = self.getAttribute('data-mime');
        let tabname = self.getAttribute('data-tabname');
        let validPath = self.getAttribute('data-url');
        let id = self.getAttribute('data-id');

        //incase we want to recycle them
        let recycle = document.getElementById('si_media_' + tabname + '_recycle');
        recycle.dataset.id = id;
        recycle.dataset.url = validPath;
        recycle.dataset.type = tabname;

        //set the fields that we can
        document.getElementById('si_media_' + tabname + '_Name').value = name;
        document.getElementById('si_media_' + tabname + '_Filename').value = filename;
        document.getElementById('si_media_' + tabname + '_Mime').value = mime;
        document.getElementById('si_media_' + tabname + '_Size').value = SI.Editor.Data.Tools.GetFileSize(validPath);
        switch (tabname) {
            case "Images":
                document.getElementById('si_media_' + tabname + '_Width').value = self.firstChild.naturalWidth + 'px';
                document.getElementById('si_media_' + tabname + '_Height').value = self.firstChild.naturalHeight + 'px';
                break;
            case "Audio":
                document.getElementById('si_media_' + tabname + '_Duration').value = self.firstChild.duration;

                break;
            case "Video":
                document.getElementById('si_media_' + tabname + '_Duration').value = self.firstChild.duration;
                break;
            case "Documents":
                break;
            case "Data":
                break;
            case "Fonts":
                break;


        }

        for (let ittr in deploys) {
            let deploy = deploys[ittr];
            let deployC = deploy.charAt(0).toUpperCase() + deploy.slice(1)
            let media = document.getElementById('si_media_' + tabname + '_' + deployC + 'Preview');

            //no prefix for live but an underscore after dev and test
            if (deploy === 'live') {
                deploy = "";
            } else {
                deploy += "_";
            }


            if (media !== null) {
                media.src = SI.Tools.GetMediaFilePath(deploy + filename);
                media.type = mime;
                switch (tabname) {
                    case "Images":
                        media.title = deployC + " image   Width: " + media.naturalWidth + " Height: " + media.naturalHeight;
                        break;
                    case "Audio":
                        media.parentElement.load();
                        break;
                    case "Video":
                        media.parentElement.load();
                        break;
                    case "Documents":
                        break;
                    case "Data":
                        break;
                    case "Fonts":
                        break;


                }
            }
        }
    },
    Promote : function (self, e) {
        let img = document.getElementById(self.id.replace("Promote", "Preview"));
        let obj = {};
        obj.Data = {};
        obj.Data.KEY = 'MediaPromote';
        obj.Data.Url = img.src;
        obj.Data.Deployment = self.dataset.deployment;
        SI.Editor.Ajax.Run(obj);
    },
    Promoted : function (ok) {
        let previewSource = ok.split("|");
        let preview = previewSource[0];
        let category = previewSource[1];
        let source = previewSource[2];
        document.getElementById(preview).src = source;
    },
    Recycle : function () {

        var r = confirm("Are you sure you would like to delete this file?");
        if (r === false) {
            return;
        }

        let id = this.dataset.id;
        let url = this.dataset.url;
        let type = this.dataset.type;

        let options = {};
        let data = { "KEY": 'MediaRecycle', 'mediaId': id, 'url': url, 'type': type };
        options.Data = data;
        SI.Editor.Ajax.Run(options);
    },
    Recycled : function () {

    }

}