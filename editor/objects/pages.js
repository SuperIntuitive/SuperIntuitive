
SI.Editor.Objects.Page = {
    Draw: function () {
        let base = Ele('div', {
            class: 'si-tool-body',

        });
        let sub = SI.Tools.GetSubdomain();
        let dir = SI.Tools.GetPathDirectory();
        //Path Section
        let pageContainer = Ele('section', {
            style: {

                margin: '7px',
                padding: '6px'
            },
            appendTo: base
        });
        //
        //Save Page Button
        //
        let dirSave = SI.Editor.UI.IconButton({
            Icon: 'save',
            appendTo: pageContainer,
            class: 'si-page-action',
            title: "Save the Page",
            onclick: function () {
                SI.Editor.Objects.Page.Save();
            }

        });
        let pathFieldset = Ele("fieldset", {
            style: {
                margin: '6px',

                width: "95%",
                display: 'block',
                borderRadius: '10px'
            },
            appendTo: pageContainer,
            append: Ele("legend", {
                innerHTML: "Path",
                style: {

                    border: "inherit",
                    padding: "2px 4px 2px 4px",
                    borderRadius: "4px",
                    filter: "brightness(1.2)"
                }
            })
        });
        let pathTable = Ele("table", {
            style: {
                margin: '6px',
                padding: '3px',

                width: '99%'
            },
            appendTo: pathFieldset
        });
        let pathHeaderRow = Ele('tr', { appendTo: pathTable, style: { } });
        let subHeader = Ele('th', { innerHTML: "Business Unit", appendTo: pathHeaderRow, userSelect: 'none' });
        let domainHeader = Ele('th', { innerHTML: "Domain", appendTo: pathHeaderRow, userSelect: 'none' });
        let pageHeader = Ele('th', { innerHTML: "Directory", appendTo: pathHeaderRow, userSelect: 'none' });
        let spaceHeader = Ele('th', { appendTo: pathHeaderRow });
        let pathDataRow = Ele('tr', { appendTo: pathTable });
        let subData = Ele('td', { appendTo: pathDataRow });
        let subInput = Ele('input', { readOnly: true, value: sub, appendTo: subData, style: { width: '95%', } });
        let domainData = Ele('td', { innerHTML: '. ', appendTo: pathDataRow });
        let domainInput = Ele('input', { readOnly: true, value: document.domain, appendTo: domainData, style: { width: '90%', } });
        let dirData = Ele('td', { innerHTML: '/ ', appendTo: pathDataRow });
        let dirInput = Ele('input', {
            id: 'si_page_directory_field',
            pattern:"^([A-z0-9\-\/~\._]+)$",
            data: { name: dir },
            style: { width: '90%' }, 
            value: dir,
            onblur: function (evt) {
                if (!evt.target.checkValidity()) {
                    SI.Tools.SuperAlert("The Directory has invalid characters. Only .-_~ and / are allowed", 3000);
                }
            },
            appendTo: dirData
        });
        let saveBtn = Ele('td', { appendTo: pathDataRow });

        //Redirect
        let pageredirectrow = Ele('tr', { appendTo: pathTable });
        let pageredirectto = Ele('td', {
            style: {
                paddingTop: '15px'
            },
            colSpan: 4,
            appendTo: pageredirectrow
        });
        let redirectLuLbl = Ele('label', { for: 'si_edit_page_redirectlu', appendTo: pageredirectto, innerHTML: "Redirect To: " });
        let redirectLu = Ele('input', {
            id: "si_edit_page_redirectlu",
            type: "lookup",
            appendTo: pageredirectto,
            enabled: 'false',
            style: {
                width: '300px'
            },
            data: {
                type: "pages",
                column: 'path'
            }
        });
        redirectLu.addEventListener('change',
            function () {
                if (this.value !== "Database Lookup") {
                    if (!confirm('If you redirect this page, you will only be able to remove the redirect from the Site tool. Are you sure you want to redirect it?')) {
                        this.value = null;
                    }
                }
            },
            false);

        //End Path Section
        //Meta Section
        let metaFieldset = Ele("fieldset", {
            style: {
                margin: '6px',

                width: "95%",
                display: 'block',
                borderRadius: '10px'
            },
            appendTo: pageContainer,
            append: Ele("legend", {
                innerHTML: "Meta Tags",
                style: {

                    border: "inherit",
                    padding: "2px 4px 2px 4px",
                    borderRadius: "4px",
                    filter: "brightness(1.2)"
                }
            })
        });
        let metaTable = Ele("table", {
            style: {
                margin: '6px',

                width: "99%"
            },
            appendTo: metaFieldset
        });
        let metaPageTitleRow = Ele('tr', {
            appendTo: metaTable,
            style: {
                }
        });
        let metaPageTitle = Ele('td', {
            innerHTML: "Title",
            appendTo: metaPageTitleRow,
            style: {
                width: '150px'
            }
        });
        let metaPageTitleCell = Ele('td', {
            appendTo: metaPageTitleRow
        });
        let cleantitle = document.title.replace("dev - ", "");
        let metaPageTitleInput = Ele('input', {
            placeholder: "The Page Title that appears in the tab",
            value: cleantitle,
            appendTo: metaPageTitleCell,
            style: {
                width: '97%'
            },
            onkeyup: function (e) {
                var title = document.getElementById('si_pagetitle');
                title.innerHTML = this.value.replace("dev - ", '');
            }
        });
        //Favicon
        var nodeList = document.getElementsByTagName("link");
        var favicon = null;
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].getAttribute("rel") === "icon" || nodeList[i].getAttribute("rel") === "shortcut icon") {
                favicon = nodeList[i].getAttribute("href");
                break;
            }
        }
        if (favicon) {
            favicon = favicon.replace("media/images/dev_", '');
        }

        let metaPageIconRow = Ele('tr', { appendTo: metaTable, style: { } });
        let metaPageIcon = Ele('td', { innerHTML: "Favicon", appendTo: metaPageIconRow });
        let metaPageIconLookupCell = Ele('td', { appendTo: metaPageIconRow });
        let metaPageIconLookup = Ele('input', {
            type: "lookup",
            data: { type: "media", column: 'path' },
            placeholder: "Temp",
            value: favicon,
            appendTo: metaPageIconLookupCell,
            style: {
                width: '97%'
            },
            onkeyup: function (e) {
                //debugger;
                var icon = document.getElementById('si_favicon');
                pathonly = icon.href.substring(0, icon.href.lastIndexOf("dev_")) + "dev_";
                icon.href = pathonly + this.value;
            }
        });

        nodeList = document.getElementsByTagName("meta");
        var charset;
        for (let i = 0; i < nodeList.length; i++) {
            if (nodeList[i].getAttribute("charset") !== null) {
                charset = nodeList[i].getAttribute("charset");
                break;
            }
        }

        let metaPageCharsetRow = Ele('tr', { appendTo: metaTable, style: { } });
        let metaPageCharset = Ele('td', { innerHTML: "Charset", appendTo: metaPageCharsetRow });
        let metaPageCharsetLookupCell = Ele('td', { appendTo: metaPageCharsetRow });

        let metaPageCharsetLookup = Ele('input', {
            placeholder: "utf-8",
            value: charset,
            list: "si_datalist_charsets",
            appendTo: metaPageCharsetLookupCell,
            style: {
                width: '97%'
            },
            onkeyup: function (e) {
                var meta = document.getElementById('si_meta_charset');
                meta.setAttribute("charset", this.value);
            }
        });

        //More or Less link
        let metaPageMoreRow = Ele('tr', { appendTo: metaTable, style: { } });
        let metaPageMore = Ele('th', {
            innerHTML: "more",
            id: 'si_moremetatoggle',
            appendTo: metaPageMoreRow,
            colspan: '1',
            class: 'si-tool-action',

            onclick: function () {
                metafieldfix = document.getElementsByClassName("si-editor-page-metainput");
                for (let i = 0; i < metafieldfix.length; i++) {
                    if (this.innerHTML === "more") {
                        metafieldfix[i].style.display = 'table-row';
                    } else {
                        metafieldfix[i].style.display = 'none';
                    }
                }
                if (this.innerHTML === "more") {
                    this.innerHTML = 'less';
                } else {
                    this.innerHTML = 'more';
                }
            }
        });
        //loop meta items so that they are all controlable
        //debugger;
        let metaPageMoreMetaRow = Ele('tr', { id: 'si_moremetabox', appendTo: metaTable, colspan: 2, style: { }});

        // let metaitems = { 'description': 'Page Description', 'keywords': 'Website builder cms', 'author': 'You!', 'viewport': 'width=device-width, initial-scale=1' };
        let metaitems = {};
        let metas = document.getElementsByTagName('meta');
        //debugger;
        for (let i = 0; i < metas.length; i++) {
            let name = null;
            if (metas[i].getAttribute('name') !== null && metas[i].getAttribute('name').length > 0) {
                metaitems[metas[i].getAttribute('name')] = metas[i].getAttribute('content');
            }
            else if (metas[i].getAttribute('httpEquiv') !== "undefined") {
                //debugger;
                metaitems[metas[i].getAttribute('http-equiv')] = metas[i].getAttribute('content');
            }
        }
        for (let item in metaitems) {
            if (item !== 'null') {
                let currentMetaValue = '';

                for (let i = 0; i < metas.length; i++) {
                    if (metas[i].getAttribute('name') === item) {
                        currentMetaValue = metas[i].getAttribute('content');
                        break;
                    }
                }

                let metaRow = Ele('tr', { appendTo: metaTable, class: "si-editor-page-metainput", style: {  display: 'none' }});
                let metaName = Ele('td', {
                    innerHTML: item,
                    style: {
                        width: '100px'
                    },
                    appendTo: metaRow
                });
                let metaInput = Ele('input', {
                    placeholder: currentMetaValue,
                    id: "si_meta_" + item.replace(/-/g, '_'),
                    value: currentMetaValue,
                    style: {
                        width: '97%'
                    },
                    onchange: function (e) {
                        let name = this.id.replace('si_meta_', '').replace(/_/g, '-');
                        let metas = document.querySelectorAll('meta');
                        for (let i in metas) {
                            let meta = metas[i];
                            if (meta.name !== null && meta.name === name) {
                                meta.content = this.value;
                                break;
                            } else if (meta.httpEquiv !== null && meta.httpEquiv === name) {
                                meta.content = this.value;
                            }
                        }
                    }
                });
                let metainputCell = Ele('td', {
                    style: {
                    },
                    append: metaInput,
                    appendTo: metaRow
                });
            }

        }

        // let metaPageMoreMetaBox = Ele('td', { append: metaMoreTable, appendTo: metaPageMoreMetaRow, style: {} });

        var bodyStyleEle = document.getElementById("si_bodystyle");
        if (bodyStyleEle) {
            var bodystyle = bodyStyleEle.innerHTML;
            //Body Styles
            let bodyTable = Ele("fieldset", {
                style: {
                    margin: '6px',

                    width: "95%",
                    display: 'block',
                    borderRadius: '10px'
                },
                appendTo: pageContainer,
                append: Ele("legend", {
                    innerHTML: "Body Style",
                    style: {

                        border: "inherit",
                        padding: "2px 4px 2px 4px",
                        borderRadius: "4px",
                        filter: "brightness(1.2)"
                    }
                })
            });

            //Add body style
            let addBodyStyle = Ele("button", {
                innerHTML: 'Add Style',
                style: {
                    height: '20px',
                    marginLeft: '12px'
                },
                onclick: function (e) {
                    //debugger;
                    let style = this.nextSibling.value;
                    if (style.length) {
                        let styleobj = {
                            "Property": style,
                            "Affected": "body",
                            "AccessClass": "si-editor-page-bodystyle",
                            "InputId": 'si_page_body_style_' + SI.Tools.CssProp2JsKey(style),
                            "Removable": true
                        };
                        let stylebox = SI.Editor.Objects.Elements.Styles.Widget(styleobj);
                        let leftbox = document.getElementById("si_edit_page_body_left_table");
                        let rightbox = leftbox.nextElementSibling;
                        if (leftbox.rows.length > rightbox.rows.length) {
                            rightbox.appendChild(stylebox);
                        } else {
                            leftbox.appendChild(stylebox);
                        }
                    } else {
                        alert('Select a style to add it to the block');
                    }
                    this.nextSibling.selectedIndex = 0;
                },
                appendTo: bodyTable
            });
            let addStyleSelect = Ele('select', {
                style: {
                    width: '25%',
                    margin: '10px'
                },
                draggable: false,
                appendTo: bodyTable
            });
            Ele("option", { value: '', innerHTML: '', appendTo: addStyleSelect });
            for (let group in SI.Editor.Data.css_properties) {
                if (group !== "Pseudo Class" && group !== "Pseudo Element") {
                    let groupset = Ele("optgroup", { label: group, appendTo: addStyleSelect });
                    let wholegroup = SI.Editor.Data.css_properties[group];
                    for (let s in wholegroup) {
                        let prop = wholegroup[s].n;
                        if (!prop.startsWith("@"))
                            Ele("option", { value: prop, innerHTML: prop, title: wholegroup[s].d, appendTo: groupset });
                    }
                }
            }

            // Read parsed CSS declarations so quotes, colons and empty styles work.
            // Both PHP and SIPL render this stylesheet through the same DOM hook.
            bodystyle = {};
            const bodyRule = Array.from(bodyStyleEle.sheet?.cssRules || []).find(rule => rule.selectorText === 'body');
            if (bodyRule) {
                for (const property of bodyRule.style) {
                    bodystyle[property] = bodyRule.style.getPropertyValue(property).trim();
                }
            }

            let tablebox = Ele("div", {
                style: {
                    display: 'flex'
                },
                appendTo: bodyTable
            });
            let leftTable = Ele("table", {
                id: "si_edit_page_body_left_table",
                style: {
                    display: 'inline-block'
                },
                appendTo: tablebox
            });
            let rightTable = Ele("table", {
                id: "si_edit_page_body_right_table",
                style: {
                    float: 'right'
                },
                appendTo: tablebox
            });

            let onleft = true;
            //this would be better with a bunch of inline blocks
            for (let item in bodystyle) {
                //debugger;
                //let style = SI.Editor.Data.Tools.GetStyleByName(item);
                let styleobj = {
                    "Property": item,
                    "Affected": 'body',
                    "InitialValue": bodystyle[item],
                    "InputId": 'si_page_body_style_' + SI.Tools.CssProp2JsKey(item),
                    "AccessClass": "si-editor-page-bodystyle",
                    "Removable": true
                };

                let stylerow = SI.Editor.Objects.Elements.Styles.Widget(styleobj);// "Group": style.group, "Index": style.index, "Effect": 'body' });
                if (stylerow !== null) {
                    if (onleft) {
                        leftTable.appendChild(stylerow);
                    } else {
                        rightTable.appendChild(stylerow);
                    }
                    onleft = !onleft;
                }
            }
        }

        //Page Deployment
        if (document.body.dataset.guid !== null && document.body.dataset.guid.length === 34) {
            let pageid = document.body.dataset.guid;
            let deployment = Ele("fieldset", {
                style: {
                    margin: '6px',

                    width: "95%",
                    display: 'block',
                    borderRadius: '10px'
                },
                appendTo: pageContainer,
                append: Ele("legend", {
                    innerHTML: "Deployment",
                    style: {

                        border: "inherit",
                        padding: "2px 4px 2px 4px",
                        borderRadius: "4px",
                        filter: "brightness(1.2)"
                    }
                })
            });

            let dFields = { "options": "pages" };

            for (let df in dFields) {
                if (dFields.hasOwnProperty(df)) {
                    //debugger;
                    let dField = df;
                    let dEnt = dFields[df];
                    let deployoptions = { EntityName: dEnt, EntityId: pageid, Attribute: dField };
                    deployment.appendChild(SI.Editor.Data.Objects.Deployment.UI(deployoptions));
                }
            }
        }

        //Page Settings
        let pageSettings = Ele("fieldset", {
            id:"si_edit_page_settings",
            style: {
                margin: '6px',

                width: "95%",
                display: 'block',
                borderRadius: '10px'
            },
            appendTo: pageContainer,
            append: Ele("legend", {
                innerHTML: "Page Settings",
                style: {

                    border: "inherit",
                    padding: "2px 4px 2px 4px",
                    borderRadius: "4px",
                    filter: "brightness(1.2)"
                }
            })
        });
        for (let s in SI.Editor.Data.Objects.Settings) {
            let setting = SI.Editor.Data.Objects.Settings[s].settingname;
            if (setting !== "AllowedFileTypes") {
                SI.Editor.Objects.Page.AddSetting(setting, pageSettings);
            }

        }

        //BLOCKS Initially created here:
        let blocklib = Ele('section', {
            id: "si_editor_page_block_container",
            style: {

                width: '96.5%',
                padding: '6px',
                margin: '7px'
            },
            onclick: function (e) { SI.Editor.Objects.Blocks.Select(); }
        });
        base.appendChild(blocklib);

        let blocklabel = Ele('span', {
            innerHTML: "Blocks",
            style: {
                },
            appendTo: blocklib
        });
        //New Block Button
        let newblockbutton = SI.Editor.UI.IconButton({
            Icon: 'newBlock',
            appendTo: blocklib,
            class: 'si-page-action',
            title: "New Block",
            onclick: function (ev) {
                let newBlockName = prompt("Please enter a unique name for the Block : ", "");
                if (newBlockName !== null) {
                    var potentialId = SI.Tools.RegEx.Fix("OkId", newBlockName);
                    if (document.getElementById("si_bid_" + potentialId) === null) {
                        SI.Editor.Objects.Blocks.New(newBlockName);
                    } else {
                        alert("That Blockname is already in use on this page.");
                    }

                }
            }

        });
        //Import Block Button
        let blockImportLabel = SI.Editor.UI.IconButton({
            Icon: 'import',
            id:'si_edit_importblock_trigger',
            appendTo: blocklib,
            class: 'si-page-action',
            title: "Import Existing Block",
            onclick: function () {
                let win = SI.Widgets.Window.si_edit_importblocks_window;
                if (!win) {
                    win = new SI.Widget.Window({
                        Id: 'si_edit_importblocks_window',
                        Title: 'Import Block',
                        Width: '520px',
                        Height: '300px',
                        Resizable: true,
                        WindowControls: 'CLOSE',
                        Populate: SI.Editor.Objects.Page.DrawImportBlocks
                    });
                } else if (win.IsVisible()) {
                    win.Hide();
                    return;
                } else {
                    SI.Editor.Objects.Page.LoadImportBlocks();
                }
                win.Show();
            }
        });
        //Block Template Button
        let blockTemplateButton = SI.Editor.UI.IconButton({
            Icon: 'template',
            id:'si_edit_blocktemplates_trigger',
            appendTo: blocklib,
            class: 'si-page-action',
            title: "Block Template Library",
            onclick: function () {
                if(!SI.Widgets.Window.si_edit_blocktemplates_window){
                    var obj = {
                        Id: "si_edit_blocktemplates_window",
                        Trigger: '#si_edit_blocktemplates_trigger',
                        Title: "Block Templates",
                        IconImg: '/editor/media/icons/blocktemplates.png',
                        Populate: SI.Editor.Objects.Page.DrawBlockTemplate
                    };
                    new SI.Widget.Window(obj);
                    SI.Widgets.Window.si_edit_blocktemplates_window.Show();
                }
            }

        });
        let blockstablebox = Ele("div", {
            appendTo: blocklib
        });
        let leftBlockTable = Ele("table", {
            style: {
                display: 'inline-block'
            },
            appendTo: blockstablebox
        });
        let rightBlockTable = Ele("table", {
            style: {
                float: 'right'
            },
            appendTo: blockstablebox

        });
        let onleft = true;
        //Build the block library
        //debugger;
        for (let key in SI.Editor.Data.Objects.Blocks) {
            if (SI.Editor.Data.Objects.Blocks.hasOwnProperty(key)) {
                if (typeof SI.Editor.Objects.Blocks.Names[key] === "undefined") {
                    SI.Editor.Objects.Blocks.Names.push(key);
                    //debugger;
                    blocklib.appendChild(SI.Editor.Objects.Blocks.UI(key, SI.Editor.Data.Objects.Blocks[key]));
                }
            }
        }

        return base;
    },
    New: function (page) {
        let data = { "KEY": "PageNew", "CALLBACK": "SI.Editor.Objects.Page.Created", "page": page };
        //debugger
        SI.Editor.Ajax.Run({ Url: SI.Editor.Ajax.Url, "Data": data });
    },
    Save: function () {
        let guid = "";
        if (document.body.dataset.guid !== null && document.body.dataset.guid.length === 34) {
            //get all of the data needed from the actual page, not the UI. all of the UI will be responsible for changing the page the the page will always be up to date and can be saved. All changes (and non changes) will be saved.
            let data = {};
            data.head = {};
            //debugger;
            let title = document.getElementById('si_pagetitle');
            if (title !== null) {
                let t1 = title.innerHTML;
                if (t1.length > 0) {
                    t1 = t1.replace("dev - ", "");
                    data.head.title = t1;
                }
            }
            let favicon = document.getElementById('si_favicon');
            if (favicon !== null) {

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

            let metadatas = document.getElementsByTagName('meta');
            if (metadatas.length > 0) {
                data.head.meta = {};
            }

            //get the metas from the current meta list
            for (let metaEle in metadatas) {
                if (metadatas.hasOwnProperty(metaEle)) {
                    let ele = metadatas[metaEle];
                    if (ele.content !== null && ele.content.length > 0) {
                        let content = ele.content;

                        if (ele.name !== null && ele.name.length > 0) {
                            if (typeof data.head.meta.name === 'undefined') { //Deal with name metas
                                data.head.meta.name = {};
                            }
                            data.head.meta.name[ele.name] = content;
                        } else if (ele.httpEquiv !== null) { //Deal with http-equiv metas
                            if (typeof data.head.meta.httpEquiv === 'undefined') {
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
            }

            data.body = {};
            data.body.style = {};
            data.body.data = {};

            //get all of the current body styles
            let currentBodyStyles = document.querySelectorAll(".si-editor-page-bodystyle");
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
            if (pathfield.dataset.name !== pathfield.value) {
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
        //If we changed the page, then go to the page we changed it to. this page does not exist anymore
        if (data.hasOwnProperty('CURRENTDBPAGEPATH')) {
            let rp = data.CURRENTDBPAGEPATH;
            let current = SI.Tools.GetPathDirectory();
            if (current.length === 0) {
                current = "_ROOT_";
            }
            if (rp !== current) {
                let newlocal = "/" + rp;
                newlocal = newlocal.replace("/_ROOT_", "/");
                window.location = newlocal;
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
        SI.Tools.SuperAlert(SI.Tools.GetPathDirectory() + " page was saved!", 1500);
    },
    Created: function (data) {
        debugger;
        alert(data[Object.keys(data)[0]]);
        if (window.confirm('Your new page has been created. Click Yes to go to it or No to stay here.')) {
            window.location.href = '/' + data[Object.keys(data)[0]];
        }
    },

    DrawBlockTemplate: function (content) {
        let draw = document.createElement('div');
        let blockTemplateBox = document.createElement('div');
        for (let key in SI.Editor.Data.Objects.Blocks) {
            if (SI.Editor.Data.Objects.Blocks.hasOwnProperty(key)) {
                if (typeof (SI.Editor.Data.Objects.Blocks[key]) != "undefined") {
                    blockTemplateBox.appendChild(SI.Editor.Objects.Page.AddBlockTemplate(SI.Editor.Data.Objects.Blocks[key]));
                }
            }
        }
        draw.appendChild(blockTemplateBox);
        return draw;
    },
    AddBlockTemplate: function (template) {
        //debugger;
        let table = Ele('table', {
            style: {

                margin : '5px',
            },
        });

        let tr = document.createElement('tr');

        let pic = document.createElement('td');
        let data = document.createElement('td');

        let frame = Ele('div',{
            style: {
                position : 'relative',
                height : '150px',
                width : '150px',
            },
            appendTo:pic,
        });
        //                    src: '/editor/media/images/blockthumbs/' + template['thumb'] + '.jpg',
        let thumb = Ele('img', {

            style: {
                position : 'absolute',
                maxWidth : '100%',
                width : '100%',
                maxHeight : 'auto',
                heigth : 'auto',
                margin : 'auto',
                top : "0",
                bottom : "0",
                left : "0",
                right : "0",
            },
            appendTo:frame,
        });

        tr.appendChild(pic);

       // console.log(Template);
        //debugger;
        let options = null;
        try {
            options = JSON.parse(template['options']);
        }
        catch (error) {
            console.log(error);
        }
        if (options) {
            for (let s in options.style) {
                options[s] = options.style[s];
            }

            for (let option in options) {

                if (option != 'order' && option != 'category' && option != 'style') {
                    let box = Ele('div', {
                        style: {
                            display: 'inline-block',
                            margin: '5px',
                        },
                    });
                    let label = Ele('span', {
                        innerHTML: option,
                        style: {
                            margin: '5px',
                        },
                        appendTo: box,
                    });

                    let input = Ele('input', {
                        value: options[option],
                        size: "5",
                        appendTo: box,
                    });

                    data.appendChild(box);

                }
            }

        }
     //   console.log(options);
        let btn = document.createElement('button');
        btn.innerHTML = 'Add Block Template';
        btn.style.float = 'right';
        btn.style.marginTop = '40px';
        btn.style.marginRight = '10px';
        data.appendChild(btn);
        tr.appendChild(data);
        table.appendChild(tr);
        return table;
    },

    DrawImportBlocks: function () {
        const container = Ele('div', {id: 'si_edit_importblock_form', class: 'si-tool-body si-import-block-form'});
        Ele('p', {class: 'si-import-block-help', innerText: 'Add an existing block to this page. Changes to a shared block appear on every page that uses it.', appendTo: container});
        Ele('label', {for: 'si_edit_importblock_select', innerText: 'Block to import', appendTo: container});
        Ele('select', {
            id: 'si_edit_importblock_select',
            disabled: true,
            onchange: function () { document.getElementById('si_edit_importblock_button').disabled = !this.value; },
            appendTo: container
        });
        const status = Ele('p', {id: 'si_edit_importblock_status', class: 'si-import-block-status', appendTo: container});
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        const actions = Ele('div', {class: 'si-import-block-actions', appendTo: container});
        Ele('button', {id: 'si_edit_importblock_refresh', type: 'button', innerText: 'Refresh', onclick: function () { SI.Editor.Objects.Page.LoadImportBlocks(); }, appendTo: actions});
        Ele('button', {type: 'button', innerText: 'Cancel', onclick: function () { SI.Widgets.Window.si_edit_importblocks_window.Hide(); }, appendTo: actions});
        Ele('button', {id: 'si_edit_importblock_button', type: 'button', class: 'si-import-block-submit', innerText: 'Import block', disabled: true, onclick: SI.Editor.Objects.Page.ImportBlock, appendTo: actions});
        SI.Editor.Objects.Page.LoadImportBlocks(container);
        return container;
    },
    LoadImportBlocks: function (container = document.getElementById('si_edit_importblock_form')) {
        if (!container || container.dataset.importing === 'true') return;
        const select = container.querySelector('select');
        const submit = container.querySelector('#si_edit_importblock_button');
        const refresh = container.querySelector('#si_edit_importblock_refresh');
        const status = container.querySelector('[role="status"]');
        select.replaceChildren(new Option('Loading blocks…', ''));
        select.disabled = submit.disabled = refresh.disabled = true;
        status.textContent = 'Loading available blocks…';
        container.dataset.loadstate = 'loading';
        const request = SI.Tools.Api.Send({
            Data: {Operation: 'Retrieve', Entity: {Name: 'blocks'}, Columns: 'id,name'},
            Callback: function (blocks) { SI.Editor.Objects.Page.PopulateImportedBlocks(blocks, container); }
        });
        request.timeout = 20000;
        request.addEventListener('loadend', function () {
            refresh.disabled = false;
            if (container.dataset.loadstate === 'loading') {
                container.dataset.loadstate = 'error';
                select.replaceChildren(new Option('Blocks could not be loaded', ''));
                status.textContent = 'Could not load blocks. Select Refresh to try again.';
            }
        });
    },
    PopulateImportedBlocks: function (blocks, container = document.getElementById('si_edit_importblock_form')) {
        if (!container) return;
        const select = container.querySelector('select');
        const existing = Object.values(SI.Editor.Data.Objects.Blocks);
        const normalize = id => String(id || '').replace(/^0x/i, '').toLowerCase();
        const available = Object.values(blocks || {}).filter(block => block && typeof block.name === 'string' && /^[0-9a-f]{32}$/i.test(normalize(block.id)) && !existing.some(current => normalize(current.id) === normalize(block.id) || current.name === block.name));
        available.sort((a, b) => a.name.localeCompare(b.name));
        select.replaceChildren(new Option(available.length ? 'Choose a block…' : 'No blocks available', ''));
        for (const block of available) select.add(new Option(block.name, '0x' + normalize(block.id)));
        select.disabled = available.length === 0;
        container.querySelector('#si_edit_importblock_button').disabled = true;
        container.querySelector('#si_edit_importblock_refresh').disabled = false;
        container.querySelector('[role="status"]').textContent = available.length ? 'Blocks already on this page are excluded.' : 'No other blocks are available to import.';
        container.dataset.loadstate = 'ready';
    },
    ImportBlock: function () {
        const container = document.getElementById('si_edit_importblock_form');
        const select = container.querySelector('select');
        if (container.dataset.importing === 'true' || !select.value) return;
        const id = select.value;
        const name = select.selectedOptions[0].textContent;
        const status = container.querySelector('[role="status"]');
        container.dataset.importing = 'true';
        select.disabled = true;
        for (const button of container.querySelectorAll('#si_edit_importblock_button, #si_edit_importblock_refresh')) button.disabled = true;
        status.textContent = 'Importing ' + name + '…';
        const finish = function (success) {
            container.dataset.importing = 'false';
            select.disabled = false;
            container.querySelector('#si_edit_importblock_refresh').disabled = false;
            container.querySelector('#si_edit_importblock_button').disabled = success;
            status.textContent = success ? name + ' was added to this page.' : 'Could not import this block. Try again or refresh the page.';
            if (success) SI.Widgets.Window.si_edit_importblocks_window.Hide();
        };
        const request = SI.Editor.Objects.Blocks.Relate(id);
        if (!request) { finish(false); return; }
        request.timeout = 20000;
        request.addEventListener('loadend', function () {
            const added = Array.from(document.querySelectorAll('.si-bids')).some(block => block.dataset.guid?.toLowerCase() === id.toLowerCase());
            finish(request.status === 200 && added);
        });
    },

    AddSetting: function (settingName, pageSettings = null) {
        if (!pageSettings) {
            pageSettings = document.getElementById("si_edit_page_settings");
        }
        if (pageSettings) {
            let settingBox = Ele('div', {
                style: {
                    display: 'inline-block',
                    marginRight: '10px',
                    backgroundColor: "rgb(82, 85, 97)",
                    border: "inherit",
                    padding: "2px 4px 2px 4px",
                    borderRadius: "4px",
                },
                appendTo: pageSettings,
            });
            let settingLabel = Ele('label', {
                for: "si_edit_page_setting_" + settingName,
                innerHTML: settingName,
                appendTo: settingBox
            });
            let settingInput = Ele('input', {
                id: "si_edit_page_setting_" + settingName,
                class:"si-edit-page-setting",
                name: settingName,
                type: 'checkbox',
                onchange: function (ev) {
                    if (this.checked) {
                        value = SI.Editor.Data.Objects.Settings[this.name];
                    }
                },
                appendTo: settingBox
            });
        }
    },
    RemoveSetting: function (settingName) {
        let settingBox = document.getElementById("si_edit_page_setting_" + settingName).parentElement;
        settingBox.parentElement.removeChild(settingBox);
    },

};