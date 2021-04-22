if(!SI.Widgets.Tile){SI.Widgets.Tile = {}};
SI.Widget.Tile = function (options) { 
    if (!(this instanceof SI.Widget.Tile)) { return new SI.Widget.Tile(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Tile");}
    this.Input = {...options};
    SI.Widgets.Tile[this.Id] = this;

    this.Defaults = {
        "Parent":null,
        "Type": "Images",
        "Url": "/scripts/widgets/media/icons/default_image.png",
        "ContainerClass": "",
        "Position": "relative",
        "Mime":"application/octet-stream",
        "ImageHeight": "140px",
        "ImageWidth": "100px",
        "AudioHeight": "83px",
        "AudioWidth": "530px",
        "VideoHeight": "240px",
        "VideoWidth": "320px",
        "DocumentHeight": "320px",
        "DocumentWidth": "240px",
        "Display": "inline-block",
        "Margin": "6px",
        "Border": "1px solid #ccc",
        "BackgroundColor": SI.Editor.Style.BackgroundColor,
        "SelectedBrightness": '110%',
        "Radius": "3px",
        "FontSize": "1em",
        "FontColor": "black",
        "Text": false,
        "TextAlign": "center",
        "Data": {},
        "Enabled": true,
        "SelectedShadow": "0px 0px 10px 2px rgba(218, 165, 32, 0.5)",
        "OnChange": function (ev, self) { },
        "Group": "generic-tile",
        "NameChanged": function (ev, self) { }
    };
    options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    let height, width, labelH, labelW, pos, classtype, mime;
    switch (options.Type) {
        case "Images":
            height = "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            classtype = "si-tile-image";
            if (!options.Text) {
                let len = document.getElementsByClassName("si-tile-image").length;
                options.Text = "ImageTile" + len;
            }
            this.Thumb = Ele('img', {
                src: SI.Tools.GetMediaFilePath(options.Url),
                style: {
                    backgroundImage: "url('/scripts/widgets/media/icons/transparent_background.jpg')",
                    width: '90%'
                }
            });
            break;

        case "Audio":
            height =  "83px";
            width = "530px";
            labelH =  '1px';
            labelW = '180px';
            pos = 'relative';
            classtype = "si-tile-audio";
            if (options.Mime === null) {
                "audio/mpeg";
            }
            //debugger;
            this.Thumb  = Ele('audio', {
                controls: 'controls',
                style: {
                    width: '90%'
                },
                append: Ele('source', { src: SI.Tools.GetMediaFilePath(options.Url), type: options.Mime })
            });
            break;

        case "Video":
            height = "240px";
            width = "320px";
            labelH = (parseInt(height) - 240) + 'px';
            labelW = '180px';
            pos = 'relative';
            classtype = "si-tile-video";
            if (options.Mime === null) {
                "video/mp4";
            }
            this.Thumb  = Ele('video', {
                controls: 'controls',
                style: {
                    width: '90%'
                },
                append: Ele('source', { src: SI.Tools.GetMediaFilePath(options.Url), type: options.Mime })
            });
            break;

        case "Docs":
            height =  "360px";
            width = "240px";
            labelH = (parseInt(height) - 15) + 'px';
            labelW = '180px';
            pos = 'absolute';
            classtype = "si-tile-docs";
            this.Thumb  = Ele('object', {
                data: SI.Tools.GetMediaFilePath(options.Url),
                type: options.Mime,
                title:options.Text,
                style: {
                    width: '90%',
                    height: '90%',
                    overflow: 'hidden',
                }

            });
            break;

        case "Data":
            height = "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            classtype = "si-tile-data";

            this.Thumb = Ele('img', {
                src: '/scripts/widgets/media/icons/datafile.png',
                style: {
                    width: '90%'
                }
            });
        
            break;

        case "Fonts":
            height = "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            classtype = "si-tile-font";
            this.Thumb = Ele('img', {
                src: '/scripts/widgets/media/icons/fontfile.png',
                style: {
                    width: '90%'
                }
            });
            break;
    
        default:
            height =  "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            classtype = "si-tile-other";
            this.Thumb = Ele('img', {
                src: '/scripts/widgets/media/icons/window-media.png',
                style: {
                    width: '90%'
                }
            });
            break;
    }
    //set this for the media type ONLY if it is not passed in
    options.Height = options.Height ? options.Height : height;
    options.Width = options.Width ? options.Width : width;
    options.LabelHeight = options.LabelHeight ? options.LabelHeight : labelH;
    options.LabelWidth = options.LabelWidth ? options.LabelWidth : labelW;
    options.TextPosition = options.TextPosition ? options.TextPosition : pos;
    if (!options.Data.hasOwnProperty("mime") && options.hasOwnProperty("Mime")) {
        options.Data.mime = options.Mime;
    }
    this.Container = Ele("div", {
        id: this.Id,
        class: options.Group + " " + classtype,
        style: {
            width: options.Width,
            height: options.Height,
            position: options.Position,
            margin: options.Margin,
            display: options.Display,
            verticalAlign: 'top',
            textAlign: options.TextAlign,
            backgroundColor: options.BackgroundColor,
            borderRadius: options.Radius,
            paddingTop: (parseInt(height) / 20) + 'px'
        },
        data: options.Data,
        onclick: function (ev) {
            let b = (options.Group !== null && options.Enabled);
            SI.Tools.Class.Loop(options.Group, function (ele) {
                if (b) {
                    ele.style.boxShadow = '';
                    ele.style.filter = "brightness(100%)";
                }
            });
            if (b) {
                this.style.boxShadow = options.SelectedShadow;
                this.style.filter = "brightness("+options.SelectedBrightness+")";
            }
            if (options.OnChange) {
                options.OnChange(ev, this);
            }
        },

        append: this.Thumb
    });
    //Title
    let title = Ele('span', {
        innerText: options.Text,
        style: {
            position: options.TextPosition,
            backgroundColor: '#F5FFFA',
            padding: '2px',
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: options.Radius,
            left: '8px',
            top: options.LabelHeight,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: options.LabelWidth,
            maxHeight: '40px'
        },
        data: {
            simediatype: options.Type
        },
        contentEditable: false,
        ondblclick: function () {
            if (this.contentEditable === 'false') {
                this.contentEditable = 'true';
            }
            else {
                this.contentEditable = 'false';
            }
        },
        oninput: function () {
           // debugger;
            document.getElementById("si_media_" + this.dataset.simediatype + "_Name").value = this.innerText;
            
        },
        onblur: function (ev) {
            options.NameChanged(ev, this);
        },
        appendTo: this.Container
    });
    
    let fs = Ele('button', {
        innerHTML:'&#x26F6;',
        style:{
            padding:'0px',
            textAlign:'center',
            lineHeight:"0px",
            verticalAlign: 'middle',
            position:'absolute',
            bottom:"0px",
            right:'0px',
            width:'14px',
            height:'13px',
            color:'#fff',
            backgroundColor:'#555',
            opacity:'0.3',
            borderRadius: options.Radius,
        },
        onclick: function(){
            window.open(SI.Tools.GetMediaFilePath(options.Url), "_blank");
        },
        title:'Show original in new tab',
        appendTo: this.Container
    });

    if (options.Parent) {
        options.Parent.appendChild(this.Container);
    }

    return this;
}

