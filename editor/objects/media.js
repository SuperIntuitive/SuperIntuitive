if (!SI) { var SI = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }
if (!SI.Objects) { SI.Objects = {}; }


SI.Editor.Objects.Media = {
    Create: function() {

    },
    OnChange: function (ev) {
        //debugger;
        let deploys = ["dev", "test", "live"];

        let filename = this.getAttribute('data-path');
        let name = this.getAttribute('data-name');
        let mime = this.getAttribute('data-mime');
        let tabname = this.getAttribute('data-tabname');
        let validPath = this.getAttribute('data-url');
        let id = this.getAttribute('data-id');

        //incase we want to recycle them
        let recycle = document.getElementById('si_media_' + tabname + '_recycle');
        recycle.dataset.id = id;
        recycle.dataset.url = validPath;
        recycle.dataset.type = tabname;

        //set the fields that we can
        document.getElementById('si_media_' + tabname + '_Name').value = name;
        document.getElementById('si_media_' + tabname + '_Filename').value = filename;
        document.getElementById('si_media_' + tabname + '_Mime').value = mime;
        document.getElementById('si_media_' + tabname + '_Size').value = SI.Editor.Code.Tools.GetFileSize(validPath);
        switch (tabname) {
            case "Images":
                document.getElementById('si_media_' + tabname + '_Width').value = this.firstChild.naturalWidth + 'px';
                document.getElementById('si_media_' + tabname + '_Height').value = this.firstChild.naturalHeight + 'px';
                break;
            case "Audio":
                document.getElementById('si_media_' + tabname + '_Duration').value = this.firstChild.duration;

                break;
            case "Video":
                document.getElementById('si_media_' + tabname + '_Duration').value = this.firstChild.duration;
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
            if (deploy === 'live') {
                deploy = "";
            } else {
                deploy += "_";
            }


            if (media != null) {
                media.src = SI.Tools.GetMediaFilePath(deploy + filename);
                switch (tabname) {
                    case "Images":
                        let imgt = 10;
                        var imgpoll = setInterval(function () {
                            if (media.naturalWidth) {
                                clearInterval(imgpoll);
                                media.title = deployC + " image   Width: " + media.naturalWidth + " Height: " + media.naturalHeight;
                            } else {
                                imgt = imgt + 10;
                            }
                            if (imgt > 100) {
                                clearInterval(imgpoll);
                            }
                        }, imgt);
                        break;
                    case "Audio":
                        let audt = 10;
                        var audpoll = setInterval(function () {
                            if (media.duration) {
                                clearInterval(audpoll);
                                media.load();
                            } else {
                                audt = audt + 10;
                            }
                            if (audt > 100) {
                                clearInterval(audpoll);
                            }
                        }, audt);
                        break;
                    case "Video":
                        let vidt = 10;
                        var vidpoll = setInterval(function () {
                            if (media.naturalWidth) {
                                clearInterval(vidpoll);
                                media.title = deployC + " video   Width: " + media.naturalWidth + " Height: " + media.naturalHeight;
                                media.load();
                            } else {
                                vidt = vidt + 10;
                            }
                            if (vidt > 100) {
                                clearInterval(vidpoll);
                            }
                        }, vidt);
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
    Promote: function (self, e) {
        let img = document.getElementById(self.id.replace("Promote", "Preview"));
        let obj = {};
        //debugger;
        obj.Data = {};
        obj.Data.KEY = 'MediaPromote';
        obj.Data.Url = img.src;
        obj.Data.Deployment = self.dataset.deployment;
        SI.Editor.Ajax.Run(obj);
    },
    Promoted: function (ok) {
        //debugger;

        let previewSource = ok.split("|");
        let preview = previewSource[0];
        let category = previewSource[1];
        let source = previewSource[2];

        document.getElementById(preview).src = source;
    },
    Recycle: function () {
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
    Recycled: function () {

    }
}