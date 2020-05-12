if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.Tile = function(options) {
    if (!(this instanceof SI.Widget.Tile)) { return new SI.Widget.Tile(); }
    this.Defaults = {
        "Type": "Images",
        "Url": "",
        "ContainerClass": "",
        "Position": "relative",
        "Mime":null,
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
        "BackgroundColor": "gray",
        "SelectedBrightness": '125%',
        "Radius": "3px",
        "FontSize": "1em",
        "FontColor": "black",
        "Text": '',
        "TextAlign": "center",
        "ParentId": "",
        "Data": {},
        "Enabled": true,
        "SelectedShadow": "0px 0px 10px 2px rgba(218, 165, 32, 0.5)",
        "OnChange": null,
        "Group": "Generic",
        "NameChanged": function () { }
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.Random = SI.Tools.String.RandomString(11);
    options = this.Options;
    let self = this;

    

    let height, width, labelH, labelW, pos;
    switch (this.Options.Type) {
        case "Images":
            height = "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            this.Thumb = Ele('img', {
                src: SI.Tools.GetMediaFilePath(this.Options.Url),
                style: {
                    backgroundImage: "url('/editor/media/icons/transparentBackground.jpg')", //if the image has transpency to checkerboards
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
            if (this.Options.Mime === null) {
                "audio/mpeg";
            }
            //debugger;
            this.Thumb  = Ele('audio', {
                controls: 'controls',
                style: {
                    width: '90%'
                },
                append: Ele('source', { src: SI.Tools.GetMediaFilePath(this.Options.Url), type: this.Options.Mime })
            });
            break;

        case "Video":
            height = "240px";
            width = "320px";
            labelH = (parseInt(height) - 240) + 'px';
            labelW = '180px';
            pos = 'relative';
            if (this.Options.Mime === null) {
                "video/mp4";
            }
            this.Thumb  = Ele('video', {
                controls: 'controls',
                style: {
                    width: '90%'
                },
                append: Ele('source', { src: SI.Tools.GetMediaFilePath(this.Options.Url), type: this.Options.Mime })
            });
            break;

        case "Docs":
            height =  "320px";
            width = "240px";
            labelH = (parseInt(height) - 15) + 'px';
            labelW = '180px';
            pos = 'absolute';
            this.Thumb  = Ele('embed', {
                src: SI.Tools.GetMediaFilePath(this.Options.Url),
                type: mime,
                style: {
                    width: '90%',
                    height: '90%',
                    overflowY: 'hidden',
                }
            });
            break;

        case "Data":
            height = "148px";
            width = "100px";
            labelH = (parseInt(height) - 40) + 'px';
            labelW = '80px';
            pos = 'absolute';
            this.Thumb = Ele('img', {
                src: '/editor/media/icons/datafile.png',
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
            this.Thumb = Ele('img', {
                src: '/editor/media/icons/fontfile.png',
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
            this.Thumb = Ele('img', {
                src: '/editor/media/icons/window-media.png',
                style: {
                    width: '90%'
                }
            });
            break;
    }

    //set this for the media type ONLY if it is not passed in
    this.Options.Height = this.Options.Height ? this.Options.Height : height;
    this.Options.Width = this.Options.Width ? this.Options.Width : width;
    this.Options.LabelHeight = this.Options.LabelHeight ? this.Options.LabelHeight : labelH;
    this.Options.LabelWidth = this.Options.LabelWidth ? this.Options.LabelWidth : labelW;
    this.Options.TextPosition = this.Options.TextPosition ? this.Options.TextPosition : pos;

    this.Container = Ele("div", {
        id: "si_tile_" + this.Random,
        class: this.Options.Group,
        style: {
            width: this.Options.Width,
            height: this.Options.Height,
            position: this.Options.Position,
            margin: this.Options.Margin,
            display: this.Options.Display,
            verticalAlign: 'top',
            textAlign: this.Options.TextAlign,
            backgroundColor: SI.Editor.Style.BackgroundColor,
            borderRadius: this.Options.Radius,
            paddingTop: (parseInt(height) / 20) + 'px'
        },
        data: this.Options.Data,
        onclick: function (ev) {
            let b = (self.Options.Group !== null && self.Options.Enabled);
            SI.Tools.Class.Loop(self.Options.Group, function (ele) {
                if (b) {
                    ele.style.boxShadow = '';
                    ele.style.filter = "brightness(100%)";
                }
            });
            if (b) {
                this.style.boxShadow = self.Options.SelectedShadow;
                this.style.filter = "brightness(120%)";
            }
            if (self.Options.OnChange) {
                self.Options.OnChange(ev, this);
            }
        },
        append: this.Thumb
    });

    this.Title = Ele('span', {
        innerText: this.Options.Text,
        style: {
            position: this.Options.TextPosition,
            backgroundColor: '#F5FFFA',
            padding: '2px',
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: this.Options.Radius,
            left: '8px',
            top: this.Options.LabelHeight,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: this.Options.LabelWidth,
            maxHeight: '40px'
        },
        data: {
            simediatype: this.Options.Type
        },
        ondblclick: function () {
            if (!title.contentEditable) {
                title.contentEditable = 'true';
            }
            else {
                title.contentEditable = 'false';
            }
        },
        onblur: function (e) {
            this.title = this.innerText;
            document.getElementById("si_media_" + this.dataset.simediatype + "_Name").value = this.innerText;
        },
        appendTo: this.Container
    });

    
    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }

    return this;
}

