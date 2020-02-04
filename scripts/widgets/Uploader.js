if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

function Uploader(options) {
    //properties that can be set in the UI
    //debugger;
    this.Defaults = {
        "Name": { "value": "Window", "type": "TEXT" },
        "ParentId": { "value": "body", "type": "ELE" },
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

    options = SI.Tools.Object.SetDefaults(options, this.Defaults);


    this.Container = null;
    this.Progress = null;
    //private members
    var randId = SI.Tools.String.RandomString(11);


    //if we dont have a options object

    //debugger;
    let container = Ele('div', {
        id: "uploader_" + randId,
        innerHTML: options.Text,
        style:
        {
            "position": options.Position,
            "left": options.Left,
            "right": options.Right,
            "top": options.Top,
            "bottom": options.Bottom,
            "width": options.Width,
            "height": options.Height,
            "fontSize": options.FontSize,
            "color": options.FontColor,
            "textAlign": options.TextAlign,
            "border": options.Border,
            "userSelect": "none",
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
            this.style.border = options.OverBorder;
        },
        ondragleave: function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.style.border = options.Border;;
        },
        ondrop: function (e) {
           // this.className = '';
            //debugger;
            e.preventDefault();
            ReadFiles(e.dataTransfer.files);
        }
    });

    let progressbar = Ele('progress', {
        id: "progressbar_" + randId,
        style: {
            "width": '70%',
            "height": '16px',
            "left": '15%',
            "radius": '3px',
            "position": "relative",
            "display": 'none',

        },
        appendTo: container,
    });
    //Allow public access to the Container
    this.Container = container;

    var tests = {
        filereader: typeof FileReader != 'undefined',
        dnd: 'draggable' in document.createElement('span'),
        formdata: !!window.FormData,
        progress: "upload" in new XMLHttpRequest
    };


    var ReadFiles = function (files) {
        var formData = new FormData();
        let fileData = {};
        progressbar.style.display = 'block';
        for (var i = 0; i < files.length; i++) {
            let file = files[i];
            formData.append('files[]', file);
            fileData.file = files[i];
            PreviewFile(files[i]);
        }
       //debugger;
       
        //    formData.sender = "DD";
        var xhr = new XMLHttpRequest();
        xhr.open('POST', options.ServerScript);
        xhr.onload = function () {
            progressbar.value = progressbar.innerHTML = 100;
        };

        if (tests.progress) {
            xhr.upload.onprogress = function (event) {
                if (event.lengthComputable) {
                    //debugger;
                    var complete = (event.loaded / event.total * 100 | 0);
                    progressbar.value = progressbar.innerHTML = complete;
                    // alert("Upload Complete");
                    //cool little animation of it leving the box and going to an icon in the tray would be nice. 
                
                    setTimeout(function () {
                        Tools.Style.FadeOut('si_media_preview_image', 1000);
                        let interval = setInterval(function () {
                            var img = document.getElementById('si_media_preview_image');
                            if (img.style.display === 'none') {
                                img.parentElement.removeChild(img);
                                progressbar.style.display = 'none';
                                clearInterval(interval);
                            }
                        }, 500);
                    }, 1000);
                    
                }
            }
        }
        //debugger;
        xhr.send(formData);
    }

    var PreviewFile = function (file) {
        //   if (tests.filereader === true && acceptedTypes[file.type] === true) {
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
            container.appendChild(obj);
        };

        reader.readAsDataURL(file);
        //   } else {
        //       container.innerHTML += '<p>Uploaded ' + file.name + ' ' + (file.size ? (file.size / 1024 | 0) + 'K' : '');
        //      console.log(file);
        //   }
    }


    //if we have a parent, append to it, if not return the container element.
    if (options.ParentId.length > 0) {
        var par = document.getElementById(options.ParentId);
        if (par != null) {
            par.appendChild(this.Container);
            return;
        }
    }     
    return this.Container;
}

