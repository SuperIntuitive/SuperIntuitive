if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }
if (!SI.Widgets.Uploaders) { SI.Widgets.Uploaders = {}; }

SI.Widgets.Uploader = function(options) {
    this.Defaults = {
        "Name": { "value": "Window", "type": "TEXT" },
        "ParentId": { "value": "", "type": "ELE" },
        "ContainerClass": { "value": "", "type": "CLASS" },
        "Position": "absolute",
        "Width": { "value": "200px", "type": "LEN" },
        "Height": { "value": "200px", "type": "LEN" },
        "Top": { "value": "", "type": "LEN" },
        "Left": { "value": "", "type": "LEN" },
        "Right": { "value": "", "type": "LEN" },
        "Bottom": { "value": "", "type": "LEN" },
        "Border": { "value": "5px dashed #ccc", "type": "BORDER" }, 
        "OverBorder": { "value":"7px dashed silver", "type": "BORDER" }, 
        "FontSize": "2em",
        "FontColor": "silver",
        "Text": '<br />Drag files here to upload',
        "TextAlign": "center",
        "ServerScript": "/filehandeler.php",
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.RandId = SI.Tools.String.RandomString(11);
    this.Container = Ele('div', {
        id: "uploader_" + this.RandId,
        innerHTML: options.Text,
        style:
        {
            "position": this.Options.Position,
            "left": this.Options.Left,
            "right": this.Options.Right,
            "top": this.Options.Top,
            "bottom": this.Options.Bottom,
            "width": this.Options.Width,
            "height": this.Options.Height,
            "fontSize": this.Options.FontSize,
            "color": this.Options.FontColor,
            "textAlign": this.Options.TextAlign,
            "border": this.Options.Border,
            "userSelect": "none"
        },
        ondragover: function (e) {
            //debugger;
           // this.className = 'SI_hover';
            return false;
        },
        ondragend: function (e) {
          //  this.className = '';
            return false;
        },
        ondragenter: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.border = self.Options.OverBorder;
        },
        ondragleave: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.border = self.Options.Border;
        },
        ondrop: function (e) {
           // this.className = '';
            //debugger;
            e.preventDefault();
            self.ReadFiles(e.dataTransfer.files);
        }
    });
    this.Progress = Ele('progress', {
        id: "progressbar_" + this.RandId,
        style: {
            "width": '70%',
            "height": '16px',
            "left": '15%',
            "radius": '3px',
            "position": "relative",
            "display": 'none'
        },
        appendTo: this.Container
    });
    this.Tests = {
        filereader: typeof FileReader !== 'undefined',
        formdata: !!window.FormData,
        progress: "upload" in new XMLHttpRequest
    };
    this.ReadFiles = function (files) {
        var formData = new FormData();
        let fileData = {};
        self.Progress.style.display = 'block';
        for (var i = 0; i < files.length; i++) {
            let file = files[i];
            formData.append('files[]', file);
            fileData.file = files[i];
            self.PreviewFile(files[i]);
        }
        var xhr = new XMLHttpRequest();
        xhr.open('POST', self.Options.ServerScript);
        xhr.onload = function () {
            self.Progress.value = self.Progress.innerHTML = 100;
        };

        if (self.Tests.progress) {
            xhr.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    //debugger;
                    var complete = (event.loaded / event.total * 100 | 0);
                    self.Progress.value = self.Progress.innerHTML = complete;
                    // alert("Upload Complete");
                    //cool little animation of it leving the box and going to an icon in the tray would be nice. 

                    setTimeout(function () {
                        SI.Tools.Style.FadeOut('si_media_preview_image', 1000);
                        let interval = setInterval(function () {
                            var img = document.getElementById('si_media_preview_image');
                            if (img.style.display === 'none') {
                                img.parentElement.removeChild(img);
                                self.Progress.style.display = 'none';
                                clearInterval(interval);
                            }
                        }, 500);
                    }, 1000);

                }
            }
        }
        xhr.send(formData);
    };
    this.PreviewFile = function (file) {
       // if (self.Tests.filereader === true && acceptedTypes[file.type] === true) {  //do local filetype check here but do not trust it. 
            var reader = new FileReader();
            reader.onload = function (event) {

                var obj = null;
                //debugger;
                if (file.type.startsWith("image/")) {
                    obj = new Image();
                    obj.src = event.target.result;
                } else if (file.type.startsWith("audio/")) {
                    obj = new Audio();
                    obj.src = event.target.result;
                } else if (file.type.startsWith("video/")) {
                    obj = Ele('video', {
                        style: {
                            verticalAlign: 'middle',
                        }

                    });
                    Ele('source', {
                        src: event.target.result,
                        appendTo: obj,
                    });
                    obj.currentTime += 5;
                    //  obj.src = event.target.result;
                } else if (file.type.startsWith("text/")) {

                }
                if (obj == null) {
                    obj = new Image();
                    obj.src = 'editor/media/images/nopreviewavailable.jpg';
                }
                obj.id = 'si_media_preview_image';
                obj.width = 250; // a fake resize
                obj.style.position = "absolute";
                obj.style.top = '-28px';
                obj.style.left = '-26px';
                self.Container.appendChild(obj);
            };
       // }
        reader.readAsDataURL(file);
        //   } else {
        //       container.innerHTML += '<p>Uploaded ' + file.name + ' ' + (file.size ? (file.size / 1024 | 0) + 'K' : '');
        //      console.log(file);
        //   }
    }
    let self = this;

    SI.Widgets.Uploaders[this.RandId] = this;

    if (this.Options.ParentId.length > 0) {
        var par = document.getElementById(this.Options.ParentId);
        if (par !== null) {
            par.appendChild(this.Container);
            return;
        }
    } else {
        return this.Container;
    }   
}
