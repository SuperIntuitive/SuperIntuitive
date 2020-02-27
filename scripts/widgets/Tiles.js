<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>

if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

function Tiles(options) {

    this.Defaults = {
        "Type": "Images",
        "Url":"",
        "ContainerClass": "",
        "Position": "relative",
        "ImageHeight": "140px",
        "ImageWidth": "100px",
        "AudioHeight": "83px",
        "AudioWidth": "530px",
        "VideoHeight": "240px",
        "VideoWidth": "320px",
        "DocumentHeight": "320px",
        "DocumentWidth": "240px",
        "Display":"inline-block",
        "Margin": "6px",
        "Border": "1px solid #ccc",
        "BackgroundColor": "gray",
        "SelectedBrightness": '125%',
        "Radius":"3px",
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
        "NameChanged": function () { },
    };

    this.Container = null;
    this.Title = null;

    var randId = SI.Tools.String.RandomString(11);

    this.Init = function () {
        options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    //    console.log(options);
        //set the size contingent with the type of element
        let height = "";
        let width = "";
        let labelheight = "";
        switch (options.Type) {
            case "Images":
                height = options.ImageHeight;
                width = options.ImageWidth;
                labelheight = (parseInt(height) - 40) + 'px';
                labelwidth = '80px';
                textPosition = 'absolute';
                break;
            case "Audio":
                height = options.AudioHeight;
                width = options.AudioWidth;
                labelheight = '1px';
                labelwidth = '180px';
                textPosition = 'relative';
                break;
            case "Video":
                height = options.VideoHeight;
                width = options.VideoWidth;
                labelheight = (parseInt(height) - 240) + 'px';
                labelwidth = '180px';
                textPosition = 'relative';
                break;
            case "Docs":
                height = options.DocumentHeight;
                width = options.DocumentWidth;
                labelheight = (parseInt(height) - 15) + 'px';
                labelwidth = '180px';
                textPosition = 'absolute';
                break;
            default:
                height = options.ImageHeight;
                width = options.ImageWidth;
                labelheight = (parseInt(height) - 40) + 'px';
                labelwidth = '80px';
                textPosition = 'absolute';
                break;
        }

        let container = Ele('div', {
            id: "si_tile_" + randId,
            class: options.Group,
            style: {
                width: width,
                height: height,
                position: options.Position,
                margin: options.Margin,
                display: options.Display,
                verticalAlign: 'top',
                textAlign: options.TextAlign,
                backgroundColor: options.BackgroundColor,
                borderRadius: options.Radius,
         

                paddingTop: (parseInt(height) / 20) + 'px',
            },
            data: options.Data,
            onclick: function () {
                //debugger;
                let b = ((options.Group !== null) && options.Enabled);
                 SI.Tools.Class.Loop(options.Group, function (ele) {
                    if (b) {
                        ele.style.boxShadow = '';
                        ele.style.filter = "brightness(100%)";
                    }
                });
                if (b) {
                    this.style.boxShadow = options.SelectedShadow;
                    this.style.filter = "brightness(120%)";
                }

                //call the passed in OnChangee function
            },

        });

        if (options.OnChange !== null) {
            container.addEventListener('click', options.OnChange);
            //  options.OnChange(this);
        }

        let mime = "";
        if (typeof options.Data.mime !== 'undefined') {
            mime = options.Data.mime;
        }

        let thumb = null;
        switch (options.Type) {
            case "Images":
                thumb = Ele('img', {
                    src:  SI.Tools.GetMediaFilePath(options.Url),
                    style: {
                        backgroundImage: "url('/editor/media/icons/transparentBackground.jpg')", //if the image has transpency to checkerboards
                        width: '90%'
                    },
                    appendTo: container,
                });
                break;
            case "Audio":
                thumb = Ele('audio', {
                    controls: 'controls',
                    style: {
                        width: '90%'
                    },
                    append: Ele('source', { src:  SI.Tools.GetMediaFilePath(options.Url), type: "audio/mpeg" }),
                    appendTo: container,
                });

                break;
            case "Video":          
                thumb = Ele('video', {
                    controls: 'controls',
                    style: {
                        width: '90%'
                    },
                    append: Ele('source', { src:  SI.Tools.GetMediaFilePath(options.Url), type: "video/mp4" }),
                    appendTo: container,
                });

                break;
            case "Docs":
                thumb = Ele('embed', {
                    src:Tools.GetMediaFilePath(options.Url),
                    type: mime,
                    style: {
                        width: '90%',
                        height: '90%',
                        overflowY: 'hidden', 
                    },
                    appendTo: container,
                });
              
                break;
            case "Data":
                thumb = Ele('img', {
                    src: '/editor/media/icons/datafile.png',
                    style: {
                        width: '90%'
                    },
                    appendTo: container,
                });
                break;
            case "Fonts":
                thumb = Ele('img', {
                    src: '/editor/media/icons/fontfile.png',
                    style: {
                        width: '90%'
                    },
                    appendTo: container,
                });
                break;

        }

        let title = Ele('span', {
            innerText: options.Text,
            title: options.Text,
            style: {
                position: textPosition,
                backgroundColor: '#F5FFFA',
                padding: '2px',
                marginLeft: 'auto',
                marginRight: 'auto',
                borderRadius: options.Radius,
                left: '8px',
                top: labelheight,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: '200',
                width: labelwidth,
                maxHeight: '40px',
            },
            data: {
                simediatype: options.Type,
            },
            //onblur: function () {
            //    max = 16;
            //    if (this.innerText.length > max) {
            //        this.innerText = this.innerText.substring(0, max) + "...";

            //    }
            //},
            ondblclick: function () {
                title.contentEditable = 'true';
            },
            onblur: function (e) {
                this.title = this.innerText;
                document.getElementById("si_media_" + this.dataset.simediatype + "_Name").value = this.innerText;
            },
            appendTo: container,
        });
        //debugger;
        this.Container = container;
        //if we have a parent, append to it, if not return the container element.
        if (options.ParentId.length > 0) {
            var par = document.getElementById(options.ParentId);
            if (par !== null) {
                par.appendChild(this.Container);
                return;
            }
        }
        return this.Container;
    }


    return this.Init();
}

