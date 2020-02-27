<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>

if (!SI) { var SI = {}; }
if (!SI.Editor) { SI.Editor = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }


SI.Editor.Objects.Page = {
    New: function (page) {
        let data = { "KEY": "PageNew", "page": page };
        //debugger
        SI.Editor.Ajax.Run({ Url: SI.Editor.Ajax.Url, "Data": data });
    },
    Save: function () {
        let guid = "";
        if (document.body.dataset.guid != null && document.body.dataset.guid.length === 34) {
            //get all of the data needed from the actual page, not the UI. all of the UI will be responsible for changing the page the the page will always be up to date and can be saved. All changes (and non changes) will be saved.
            let data = {};
            data.head = {};
            //debugger;
            let title = document.getElementById('si_pagetitle');
            if (title != null) {
                let t1 = title.innerHTML;
                if (t1.length > 0) {
                    t1 = t1.replace("dev - ", "");
                    data.head.title = t1;
                }
            }
            let favicon = document.getElementById('si_favicon');
            if (favicon != null) {

                let f1 = favicon.href;
                if (f1.length > 0) {
                    var filename = f1.replace(/^.*[\\\/]/, '');
                    if (filename.startsWith("dev_")) {
                        filename = filename.replace('dev_', '');
                    }
                    if (filename.endsWith('.png') || filename.endsWith('.ico') || filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                        data.head.favicon = filename;
                    }
                }
            }

            let metadatas = Q('meta');
            if (metadatas.length > 0) {
                data.head.meta = {};
            }

            //get the metas from the current meta list
            for (let metaEle in metadatas) {
                let ele = metadatas[metaEle];
                if (ele.content != null && ele.content.length > 0) {
                    let content = ele.content;

                    if (ele.name != null && ele.name.length > 0) {
                        if (data.head.meta.name == null) { //Deal with name metas
                            data.head.meta.name = {};
                        }
                        data.head.meta.name[ele.name] = content;
                    } else if (ele.httpEquiv != null) { //Deal with http-equiv metas
                        if (data.head.meta.httpEquiv == null) {
                            data.head.meta.httpEquiv = {};
                        }
                        data.head.meta.httpEquiv[ele.httpEquiv] = content;
                    } else { //Deal with http-equiv metas
                        //debugger;

                    }

                } else {
                    if (ele.id === 'si_meta_charset') {
                        data.head.meta.charset = ele.getAttribute('charset');
                    }
                }
            }

            data.body = {};
            data.body.style = {};
            data.body.data = {};

            //get all of the current body styles
            let currentBodyStyles = Q(".si-editor-page-bodystyle");
            for (let i in currentBodyStyles) {
                if (currentBodyStyles.hasOwnProperty(i)) {
                    bodystyle = currentBodyStyles[i];
                    let prop = bodystyle.dataset.siStyleProp;
                    let value = bodystyle.value;
                    data.body.style[prop] = value;
                }
            }

            //get all the body data. 
            bodydata = document.body.dataset;
            for (let datum in bodydata) {
                data.body.data[datum] = bodydata[datum];
            }

            //Reditrect to:
            let redirid = document.getElementById('si_edit_page_redirectlu').dataset.guid;
            if (redirid) {
                data.redirect = redirid;
            }


            data.KEY = 'PageSave';
            //debugger;
            let pathfield = document.getElementById('si_page_directory_field');
            if (pathfield.dataset.name != pathfield.value) {
                data.path = pathfield.value;
            }


            let ajax = { Data: data };
            console.log(ajax);

            SI.Editor.Ajax.Run(ajax);
        } else {
            alert("Error: cannot find the page guid");
            return;
        }

    },
    Saved: function (data) {
        //debugger;
        //If we changed the page, then go to the page we changed it to. this page does not exist anymore
        if (data.hasOwnProperty('CURRENTDBPAGEPATH')) {
            let rp = data.CURRENTDBPAGEPATH;
            let current = SI.Tools.GetPathDirectory();
            if (current.length == 0) {
                current = "_ROOT_";
            }
            if (rp != current) {
                let newlocal = "/" + rp;
                newlocal = newlocal.replace("/_ROOT_", "/");
                window.location = newlocal;
            } else {

            }
        }
        if (data.hasOwnProperty('DUPE')) {
            alert("Sorry,that page already exists.\nIf you would like to redirect this page to that one, please do so in the redirect field below.");
            namefield = document.getElementById('si_page_directory_field');
            namefield.value = namefield.dataset.name;
        }
        if (data.hasOwnProperty('PAGEUPDATED')) {
            console.log('The page was saved');
        }
        //Only if the name changed do we need to redirect to the new path.
        console.log(SI.Tools.GetPathDirectory());
        console.log(data);
    },
    Created: function (data) {
        alert(data[Object.keys(data)[0]]);
        if (window.confirm('Your new page has been created. Click Yes to go to it or No to stay here.')) {
            window.location.href = '/' + data[Object.keys(data)[0]];
        };
    }
}