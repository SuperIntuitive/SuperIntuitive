

SI.Editor.Objects.Blocks = {
    //Creates a Block UI Element as seen in Tools/Page/Blocks
    UI: function (name, options) {

        this.Defaults = {
            "BlockName": name,
            "Guid": null,
            "RelationsId": null,
            "New": false,
            "Data": null,
            "Order": null,
            "Itter": null,
            "Html": null,
            "Script": null,
            "Style": null,
        };
        options = SI.Tools.Object.SetDefaults(options, this.Defaults);
        //housekeeping
        //debugger;
        if (typeof SI.Editor.Data.Objects.Blocks === 'undefined' || SI.Editor.Data.Objects.Blocks === null) {
            SI.Editor.Data.Objects.Blocks = [];
        }
        if (!options.BlockName || !options.BlockName.length > 0) {
            console.log("BlockName invalid in Block.UI");
            return false;
        }
        //run through options
        //1-NotNew OnLoad is first run. All the blocks exist on the page and no UIs are yet setup. 
        //2-New The user relates a block to the page. The block should not yet exist. The blocks name could be duplicate and if is is will need to increment the block. the indexes may not be consistant

        this.Container = null;
        var randId = SI.Tools.String.RandomString(11);
        //debugger;
        //The safe id will be a unique incremented blockname
        let safeid = SI.Tools.Element.SafeId("si_bid_" + options.BlockName);
        let fixedkey = SI.Tools.RegEx.Fix("OkId", safeid).replace("si_bid_", '');

        //If this is new we will need to make the block and put it in the current lists. if old those two will be done, just make the ui.
        if (options.New) {
            //debugger;
            //put the block and data on the current list
            //SI.Editor.Objects.Blocks.Current[fixedkey] = options;
            if (typeof SI.Editor.Data.Objects.Blocks[options.BlockName] === 'undefined') {
                SI.Editor.Data.Objects.Blocks[options.BlockName] = {};
            }

            //make the block and put it at the order it should be. 
            SI.Editor.Objects.Blocks.BabyBlock(fixedkey);
            SI.Editor.Objects.Blocks.Names.push(fixedkey);
        }
        else {
            //debugger;
            if (options.Data === null) {
                options.Data = SI.Editor.Data.Objects.Blocks[options.BlockName];
            }
            if (options.Order === null) {
                options.Order = options.Data.order;
            }
            if (options.Guid === null) {
                options.Guid = options.Data.id;
            }
            if (options.Itter === null) {
                options.Itter = options.Data.itter;
            }

            options.BlockName = options.Data.name;

            let oldblock = document.getElementById('si_block_' + fixedkey);
            if (oldblock) {
                oldblock.addEventListener('dragenter', SI.Editor.Objects.Blocks.DragEnter);
                //set the guids if we have them
                if (SI.Tools.RegEx.Match("guid", options.Data.id)) {
                    options.Guid = options.Data.id;
                }
                if (options.RelationsId === null && typeof options.Data.relationsId !== 'undefined' && SI.Tools.RegEx.Match("guid", options.Data.relationsId))
                    options.RelationsId = options.Data.relationsId;
            }
        }


        //BEGIN Block UI
        let blockui = Ele('div', {
            id: 'si_bid_' + fixedkey,
            draggable: true,
            class: 'si-bids',
            style: {
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
                margin: '7px',
                padding: '7px',
                display: "table",
                cursor: 'ns-resize',
                borderRadius: '10px',
                width: '96%',
                border: '1px solid silver',
                //   userSelect : 'none',
            },
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                relationsId: options.RelationsId,
                name: options.BlockName,
                htmlclean: true,
                jsclean: true,
                cssclean: true,
            },
            onclick: function (ev) {
                ev.stopPropagation();
                let blockid = this.id.replace('si_bid', 'si_block');
                SI.Editor.Objects.Blocks.Select(blockid);
            },

            //Reorder the Blocks
            ondragstart: function (ev) {
                ev.dataTransfer.setData("Text", ev.target.id);
            },
            ondragover: function (ev) {
                ev.preventDefault();
            },
            ondrop: function (ev) {
                ev.preventDefault();
                let droppedId = ev.dataTransfer.getData("Text");
                let myId = this.id;
                let actualBlock1Id = droppedId.replace("si_bid_", "si_block_");
                let actualBlock1 = document.getElementById(actualBlock1Id);

                let actualBlock2id = myId.replace("si_bid_", "si_block_");
                let actualBlock2 = document.getElementById(actualBlock2id);
                if (actualBlock1 !== null && actualBlock2 !== null) {
                    //debugger;
                    let orderField1id = droppedId.replace("si_bid_", "si_bid_order_");
                    let orderField2id = this.id.replace("si_bid_", "si_bid_order_");
                    if (orderField1id !== orderField2id) {

                        let orderField1 = document.getElementById(orderField1id);
                        let orderField2 = document.getElementById(orderField2id);

                        let bOrder1 = actualBlock1.getAttribute("data-order");
                        let bOrder2 = actualBlock2.getAttribute("data-order");
                        let tmp = orderField1.value
                        orderField1.value = orderField2.value;
                        orderField2.value = tmp;

                        actualBlock1.setAttribute("data-order", orderField1.value);
                        actualBlock2.setAttribute("data-order", orderField2.value);

                        var dropped = document.getElementById(droppedId);

                        SI.Tools.Element.SwapNodes(dropped, this);
                        SI.Tools.Element.SwapNodes(actualBlock1, actualBlock2);

                        console.log(actualBlock1);
                        console.log(actualBlock2);
                        SI.Editor.Objects.Blocks.Save(this);
                        SI.Editor.Objects.Blocks.Save(dropped);
                    }
                }
            },

        });
        if(SI.Editor.Objects.Blocks.Selected){
            if(SI.Editor.Objects.Blocks.Selected.id === 'si_block_' + fixedkey){
                blockui.style.boxShadow = "0px 0px 20px 1px rgba(0, 255, 255, 0.3), inset 0px 0px 20px 1px rgba(0, 255, 255, 0.3)";
            }
        }


        //draw the block controls
        let blockData = "";
        if (!options.New && typeof options.Data.options !== 'undefined') {
            blockData = JSON.parse(options.Data.options, true);
        }
        else {
            blockData = { "tag": "div", "style": { "position": "relative", "left": "0px", "top": "0px", "width": "100%", "height": "500px" } };

        }
        //debugger;
        if (options.Order !== null) {
            blockData.order = options.Order;
        }
        if (options.BlockName) {
            blockData.name = options.BlockName;
        }
        //first get the non attrs or styles
        let blockControls = {};
        let blockStyles = {};
        let blockSettings = {};

        if (blockData.style) {
            blockStyles = blockData.style;
            delete blockData.style;
        }
        if (blockData.settings) {
            blockSettings = blockData.settings;
            delete blockData.settings;
        }

        blockControls = blockData;


        let ordered = {};
        Object.keys(blockControls).sort().forEach(function (key) {
            ordered[key] = blockControls[key];
        });
        blockControls = ordered;
        //The dynamic properties field.
        for (let control in blockControls) {
            if (control === "widgets") {
                continue;
            }
            let val = blockControls[control];
            //Make a div for the field 
            let fieldbox = Ele('div', {
                style: {
                    display: "inline-block",
                    margin: '4px',
                },
                draggable: false,
                appendTo: blockui,
            });
            //add a label to it
            Ele('span', {
                innerHTML: control,
                style: {
                    margin: "4px",
                    userSelect: 'none',
                },
                appendTo: fieldbox,
            });
            //make a way to input data to it
            let input;
            if (control === 'tag') {
                //allowed block element types
                input = document.createElement('select');
                input.append(new Option("div", "div"));
                input.append(new Option("span", "span"));
                input.append(new Option("header", "header"));
                input.append(new Option("nav", "nav"));
                input.append(new Option("main", "main"));
                input.append(new Option("article", "article"));
                input.append(new Option("aside", "aside"));
                input.append(new Option("section", "section"));
                input.append(new Option("footer", "footer"));
                input.style.width = "75px";
                input.value = val;
                input.id = "si_bid_" + control + "_" + fixedkey;
            }
            else if (control === 'order') {
                input = document.createElement('input');
                input.style.width = "23px";
                input.style.cursor = 'ns-resize';
                input.style.backgroundColor = "silver";
                input.style.border = "silver";
                input.readOnly = true;
                input.value = options.Order;
            }
            else if (control === 'name') {
                //debugger;
                input = Ele('input', {
                    value: options.BlockName,
                    style: {
                        width: '58px',
                    },
                });
            }
            else {
                input = document.createElement('input');
                input.value = val;
                input.style.width = "50px";
            }

            input.setAttribute('data-block', 'si_block_' + fixedkey);
            input.setAttribute('data-property', control);
            input.id = "si_bid_" + control + "_" + fixedkey;
            input.onclick = function (e) {
                e.stopPropagation();
            }
            input.onchange = function () {
                //debugger;
                let block = document.getElementById(this.dataset.block);
                let prop = this.dataset.property;
                block.style[prop] = this.value;
                autosave = true;
                if (autosave) {

                    SI.Editor.Objects.Blocks.Save(this.parentElement.parentElement);
                }
            }
            fieldbox.appendChild(input);
        }

        //Right floating buttons on the block
        //this does not work yet.
        let saveAll = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/saveall.png')",
            },
            title: "Save ALL Html, Style, Script, and Options",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },

            onclick: function (e) {
                //debugger;
                e.stopPropagation(); //keep from clicking through
                //  SI.Editor.Objects.Blocks.Save(this.parentElement, 'html'); //save the block div, which is this save buttons parent
            },
            appendTo: blockui,
        });
        //if we bring this back well fix this
        saveAll.style.display = 'none';

        //Top Right Buttons

        let HidePanels = function (disregard) {
            let panels = ['deployment', 'settings', 'widgets'];

            for (panel of panels) {
                if (panel !== disregard) {
                    document.getElementById('si_block_' + panel + '_window_' + fixedkey).style.display = 'none';
                }
            } 
        };
        let ShowPanel = function (panel, event) {
            HidePanels(panel);
            var win = document.getElementById('si_block_' + panel + '_window_' + fixedkey);
            if (win !== null && win.style.display === "none") {
                win.style.display = "block";
            } else {
                win.style.display = "none";
            }
            event.stopPropagation();
        };
        let deleteBlock = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/deleteButton.png')",
            },
            title: "Remove Block",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },
            onclick: function (e) {
                var retVal = confirm("This block will be removed from the page and all custom block data will be lost. This will not affect the block itself. Proceed?");
                if (retVal === true) {
                    //SI.Editor.Objects.Blocks.SelectNone();
                    //debugger;
                    //remove all the html
                    let me = document.getElementById('si_bid_' + fixedkey);
                    let relayid = me.dataset.relationsid;
                    me.parentElement.removeChild(me);
                    let bl = document.getElementById('si_block_' + fixedkey);
                    bl.parentElement.removeChild(bl);
                    if (SI.Editor.Data.Objects.Blocks[fixedkey]) {
                        delete SI.Editor.Data.Objects.Blocks[fixedkey];
                    }

                    SI.Editor.Objects.Blocks.Remove(relayid);

                    //send Ajax to remove this block from the database.
                }
                e.stopPropagation();
            },
            appendTo: blockui,
        });
        let openScripter = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/scripter-code.png')",
            },
            title: "Open Scripter",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey
            },

            onclick: function (e) {
                let blockname = this.dataset.fkey;
                SI.Editor.UI.ToolsPanel.OpenToolWindow("Scripter");
                SI.Editor.Objects.Scripter.OpenScript(blockname, "Block");
                e.stopPropagation(); //keep from clicking through
            },
            appendTo: blockui,
        });
        let openStyler = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/stylebutton.png')",
            },
            title: "Open Styler",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },

            onclick: function (e) {
                //debugger;
                let blockname = this.dataset.fkey;
                SI.Editor.UI.ToolsPanel.OpenToolWindow("Styler");
                SI.Editor.Objects.Styler.LoadStyleByBlock(blockname);
                e.stopPropagation(); //keep from clicking through
            },
            appendTo: blockui,
        });
        let openDeployment = Ele("button", {
            id: 'si_block_deployment_button_' + fixedkey,
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/deployment.png')",
            },
            title: "Open Deployments",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },
            onclick: function (e) {
                ShowPanel('deployment', e);
            },
            appendTo: blockui,
        });
        let openSettings = Ele("button", {
            id: 'si_block_settings_button_' + fixedkey,
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/options.png')"
            },
            title: "Manage custom block settings",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey
            },
            onclick: function (e) {
                ShowPanel('settings', e);
            },
            appendTo: blockui
        });
        let openWidgets = Ele("button", {
            id: 'si_block_widgets_button_' + fixedkey,
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/widgets.png')"
            },
            title: "Manage block widgets",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey
            },
            onclick: function (e) {
                ShowPanel('widgets', e);
            },
            appendTo: blockui
        });
        let saveHtml = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/save.png')"
            },
            title: "Save the Block",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey
            },
            onclick: function (e) {
                //debugger;
                e.stopPropagation(); //keep from clicking through
                SI.Editor.Objects.Blocks.Save(this.parentElement, 'html'); //save the block div, which is this save buttons parent
            },
            appendTo: blockui
        });
        Ele("br", { appendTo: blockui});

        //WIDGETS CONTROLS
        let widgetsContainer = Ele('div', {
            id: 'si_block_widgets_window_' + fixedkey,
            style: {
                display: 'none',
                float: 'right',
                width: '38%',
                height: '150px',
                overflowY: 'auto',
                overflowX: 'hidden',
                border: '1px solid black'
            },
            appendTo: blockui
        });
        let widgetsTable = Ele('table', {
            id: 'si_block_widgets_table_' + fixedkey,
            style: {
                width: '100%',
                borderCollapse: 'collapse'
            },
            appendTo: widgetsContainer
        });
        let blockwidgets = SI.Tools.Object.GetIfExists("SI.Page.Blocks." + fixedkey + ".Widgets");
        if (blockwidgets) {
          
            //SI.Editor.Objects.Blocks.AddWidget(fixedkey, , ,widgetsTable);
        }

        //SETTING CONTROLS
        let settingsContainer = Ele('div', {
            id: 'si_block_settings_window_' + fixedkey,
            style: {
                display: 'none',
                float: 'right',
                width: '38%',
                overflowY: 'auto',
                overflowX: 'hidden'
            },
            appendTo: blockui
        });
        let AddSetting = function (key, value, table = null) {
            if (table === null) {
                table = document.getElementById('si_block_settings_table_' + fixedkey);
            }

            let tr = Ele('tr', { appendTo: table });
            let tdname = Ele('td', { style: { width: "43%" }, appendTo: tr });
            let inname = Ele('input', {
                style: { width: '94%' },
                value: key,
                ondragstart: function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;  
                },
                onchange: function () {
                    let oldval = this.value;
                    if (this.value.length === 0) {
                        if (confirm("Do you want to delete this block setting?")) {
                            //input  -> td      ->   tr
                            let tr = this.parentElement.parentElement;
                            tr.parentElement.removeChild(tr);
                        }
                        else {
                            this.value = oldval;
                        }
                    }
                    else {
                        this.style.backgroundColor = "lightyellow";
                    }
                },
                appendTo: tdname
            });
            let tdval = Ele('td', { appendTo: tr });
            let inval = Ele('input', {
                style: { width: '92%' },
                ondragstart: function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    return false;
                },
                value: value,
                onchange: function () {
                    this.style.backgroundColor = "lightyellow";
                },
                appendTo: tdval
            });
        };
        Ele("input", {
            placeholder: 'Name',
            appendTo: settingsContainer,
            style: {
                display: "inline",
                width: '40%'
            }
        });
        Ele("input", {
            placeholder: 'Value',
            appendTo: settingsContainer,
            style: {
                display: "inline",
                width: '40%'
            }
        });
        Ele("button", {
            innerHTML: '+',
            appendTo: settingsContainer,
            style: {
                display: "inline",
                width: '12%'
            },
            onclick: function (e) {
                let setting = this.previousSibling.previousSibling.value;
                let val = this.previousSibling.value;
                let table = this.nextSibling;
                AddSetting(setting, val, table);
                this.previousSibling.previousSibling.value = "";
                this.previousSibling.value = "";
            }

        });
        let settingsTable = Ele('table', {
            id: 'si_block_settings_table_' + fixedkey,
            style: {
                width: '100%',
                borderCollapse: 'collapse'
            },
            appendTo: settingsContainer
        });
        for (let setting in blockSettings) {
            if (blockSettings.hasOwnProperty(setting)) {
                AddSetting(setting, blockSettings[setting], settingsTable);
            }
        }

        //DEPLOYMENT CONTROLS
        let deploymentsContainer = Ele('div', {
            id: 'si_block_deployment_window_' + fixedkey,
            style: {
                display: 'none',
                float: 'right',
                height: '125px',
            },
            appendTo: blockui,
        });
        let dFields = {
            "html": {
                saveto: "blocks",
                labelmargin: '22px',
            },
            "options": {
                saveto: "relations",
            },
            "script": {
                saveto: "blocks",
                labelmargin: '14px',
            },
            "style": {
                saveto: "blocks",
                labelmargin: '21px',
            },
            "order": {
                saveto: "relations",
                labelmargin: '17px',
            },
        };
        //debugger;
        for (let df in dFields) {
            //debugger;
            if (dFields.hasOwnProperty(df)) {
                let dField = df;
                let dEnt = dFields[df];
                let saveto = dEnt.saveto;
                let labelMar = null;
                if (typeof dEnt.labelmargin !== 'undefined') {
                    labelMar = dEnt.labelmargin;
                }
                let deployId = null;
                if (saveto === "blocks") {
                    deployId = options.Guid;
                } else if (saveto === "relations") {
                    //need to figure out this malarchy
                    if (options.RelationsId) {
                        deployId = options.RelationsId;
                    } else if (options.relationsId) {
                        deployId = options.relationsId;
                    }

                }
                let deployoptions = { EntityName: saveto, EntityId: deployId, Attribute: dField, LabelMargin: labelMar };
                deploymentsContainer.appendChild(SI.Editor.Data.Objects.Deployment.UI(deployoptions));
            }
        }

        //STYLE CONTROLS
        let styletable = Ele('table', {
            id: "si_edit_page_blocks_styles_" + fixedkey,
            style: {
                width: '60%',
            },
            draggable: false,
            appendTo: blockui,
        });
        for (let style in blockStyles) {
            let val = blockStyles[style];
            //debugger;
            let styleobj = {
                "Property": style,
                "Affected": '#si_block_' + fixedkey,
                "InitialValue": val,
                "AccessClass": "si-editor-page-blockstyle-" + fixedkey,
                "Removable": true,
            };

            let stylebox = SI.Editor.Objects.Elements.Styles.Widget(styleobj);// "Group": style.group, "Index": style.index, "Effect": 'body' });
            styletable.appendChild(stylebox);
        }
        let addBlockStyle = Ele("button", {
            innerHTML: 'Add Style',
            style: {
                height: '20px',
                marginLeft: '12px',
            },
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },
            onclick: function (e) {
                //debugger;
                let style = this.nextSibling.value;
                if (style.length) {
                    let block = '#' + this.dataset.block;
                    let styleobj = {
                        "Property": style,
                        "Affected": block,
                        "AccessClass": "si-editor-page-blockstyle-" + fixedkey,
                        "Removable": true,
                    };
                    let stylebox = SI.Editor.Objects.Elements.Styles.Widget(styleobj);// "Group": style.group, "Index": style.index, "Effect": 'body' });
                    document.getElementById("si_edit_page_blocks_styles_" + fixedkey).appendChild(stylebox);
                } else {
                    alert('Select a style to add it to the block');
                }
                this.nextSibling.selectedIndex = 0;
            },
            appendTo: blockui,
        });
        let addStyleSelect = Ele('select', {
            style: {
                width: '25%',
                margin: '10px',
            },
            draggable: false,
            appendTo: blockui,
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
        return blockui;
    },
    BabyBlock: function (blockname) {
        //debugger;
        let blk = SI.Editor.Data.Objects.Blocks[blockname];
        let html = '';
        let style = {
            position: 'relative',
            left: '0px',
            top: '0px',
            width: '100%',
            height: '500px',
        }

        if (blk) {
            if (blk.html && blk.html.length > 0) {
                html = blk.html;
            }
            if (blk.options && blk.options.length > 0) {
                //debugger;?
            }

        }


        fixedkey = SI.Tools.RegEx.Fix("OkId", blockname);
        fixedkey = (typeof fixedkey === "undefined") ? SI.Tools.String.RandomString(10) : fixedkey;
        //debugger;
        var blockCount = document.getElementsByClassName('si-block').length;
        var babyBlock = Ele('div', {
            id: 'si_block_' + fixedkey,
            class: "si-block",
            innerHTML: html,
            style: {
                position: 'relative',
                left: '0px',
                top: '0px',
                width: '100%',
                height: '500px',
            },
            data: {
                order: blockCount,
            },
        });

        babyBlock.addEventListener('mouseover', function () { }, false);
        babyBlock.addEventListener('dragenter', SI.Editor.Objects.Blocks.DragEnter);
        //Insert the block
        SI.Editor.UI.Container.parentNode.insertBefore(babyBlock, SI.Editor.UI.Container);
    },
    New: function (blockname) {
        if (document.body.dataset.guid !== null && document.body.dataset.guid.length === 34) {
            //debugger;
            let data = {};
            data.KEY = 'BlockNew';
            data.name = blockname;
            data.order = document.querySelectorAll('.si-block').length + 1;
            data.pageid = document.body.dataset.guid;
            let ajax = { Data: data, };
            SI.Editor.Ajax.Run(ajax);
        }
    },
    Relate: function (blockid) {
        if (document.body.dataset.guid !== null && document.body.dataset.guid.length === 34) {
            //debugger;
            let data = {};
            data.KEY = 'BlockRelate';
            data.blockid = blockid;
            data.order = document.querySelectorAll('.si-block').length;
            data.pageid = document.body.dataset.guid;
            let ajax = { Data: data, };
            SI.Editor.Ajax.Run(ajax);
        }
    },
    Remove: function (relid) {
        let data = {};
        data.KEY = 'BlockRemove';
        data.linkid = relid;
        let ajax = { Data: data, };
        SI.Editor.Ajax.Run(ajax);

    },
    Created: function (newblock) {
        //we related a new block. now we need to put it in the Block data object by name
        if (typeof SI.Editor.Data.Objects.Blocks[newblock.NAME] === 'undefined') {
            //debugger;
            SI.Editor.Data.Objects.Blocks[newblock.NAME] = {};
            SI.Editor.Data.Objects.Blocks[newblock.NAME].id = newblock.ID;
            SI.Editor.Data.Objects.Blocks[newblock.NAME].html = newblock.HTML;
            SI.Editor.Data.Objects.Blocks[newblock.NAME].relationsId = newblock.RELID;
            SI.Editor.Data.Objects.Blocks[newblock.NAME].order = newblock.ORDER;
            SI.Editor.Data.Objects.Blocks[newblock.NAME].name = newblock.NAME;

        } else {
            alert("ERROR: That block already exists.");
            return false;
        }

        let blockid = newblock.ID;
        let blockname = newblock.NAME;
        let relid = newblock.RELID;
        let html = ('HTML' in newblock) ? newblock['HTML'] : "<!-- " + blockname + " block -->";
        let style = ('STYLE' in newblock) ? newblock['STYLE'] : "/* " + blockname + " block ";
        let script = ('SCRIPT' in newblock) ? newblock['SCRIPT'] : "/* " + blockname + " block */";
        let order = document.getElementsByClassName("si-bids").length + 1;
        let options = { "BlockName": blockname, "Guid": blockid, "Order": order, "RelationsId": relid, "New": true, "Html": html, "Script": script, "Style": style };

        let blockui = SI.Editor.Objects.Blocks.UI(blockname, options);
        //add the guid to where it is needed. 
        let blocklib = document.getElementById('si_editor_page_block_container');
        blocklib.appendChild(blockui);
        SI.Tools.Text.ClearSelection();
        console.log(blockname + ' has been created');
    },
    Save: function (blockui, flag = 'flag') {

        //if not yet opened, the tool window is needed for some elements below.  
        if(document.getElementById("si_edit_page_window") === null){
            SI.Editor.UI.ToolsPanel.OpenToolWindow("Page", false);
        }
        

        if (typeof blockui === 'string') {
            blockui = document.getElementById('si_bid_' + blockui);
            if (!blockui) {
                alert('cant find block ' + blockui + " to save");
                return;
            }
        }
        let selected = null;
        if (SI.Editor.Objects.Elements.Selected !== null) {
            selected = SI.Editor.Objects.Elements.Selected;
            SI.Editor.Objects.Elements.SelectNone();
        }
        //debugger;
        let bname = blockui.getAttribute('data-name');
        let tmp, tguid;

        if (typeof SI.Editor.Data.Objects.Blocks[bname] !== 'undefined') {
            tmp = SI.Editor.Data.Objects.Blocks[bname];
            tguid = tmp.id;
        }

        let block = document.getElementById(blockui.id.replace("si_bid_", "si_block_"))
        let guid = blockui.getAttribute('data-guid');
        let relationsId = blockui.getAttribute('data-relationsId');

        let htmlclean = blockui.getAttribute('data-htmlclean');
        let jsclean = blockui.getAttribute('data-jsclean');
        let cssclean = blockui.getAttribute('data-cssclean');

        let data = { guid: guid, relationsId: relationsId };

        let attrfields = ['tag'];
        let safeid = SI.Tools.Element.SafeId(bname);
        let stylefields = document.getElementsByClassName("si-editor-page-blockstyle-" + safeid);// ['position', 'left', 'top', 'width', 'height']; //?
        let tag = document.getElementById('si_bid_tag_' + safeid).value;
        let options = { 'tag': tag };
        let empty = true;

        if (flag === 'html') {
            //filter the element
            let replacements = {};
            let ignores = block.querySelectorAll('.si-editable-ignoreinner');

            for (let ignore of ignores) {
                //put all the inner texts into an object so we can put them back after the data is sent
                replacements[ignore.id] = ignore.innerHTML;
                ignore.innerHTML = "";
            }

            //debugger;
            let multilinguals = block.querySelectorAll('.si-multilingual');
            for (let mtext of multilinguals) {
                //put all the inner texts into an object so we can put them back after the data is sent

                replacements[mtext.id] = mtext.innerHTML;

                mtext.innerHTML = "SI_MULTILANG_" + mtext.dataset.si_ml_token;
            }

            data.html = block.innerHTML;
            empty = false;

            //the block(string) has been sent to data, now put the replaces back
            for (let replacement in replacements) {
                document.getElementById(replacement).innerHTML = replacements[replacement];
            }
        }
        if (flag === 'script') {
            data.script = SI.Editor.Data.Objects.Blocks[bname].script;
            empty = false;
        }
        if (flag === 'style') {
            data.style = SI.Editor.Data.Objects.Blocks[bname].style;
            empty = false;
        }

        data['order'] = document.getElementById('si_bid_order_' + safeid).value;
        data['name'] = document.getElementById('si_bid_name_' + safeid).value;

        for (let i in attrfields) {
            let field = attrfields[i];
            let input = document.getElementById('si_bid_' + field + '_' + safeid);
            options[field] = input.value;
        }

        options['style'] = {};

        for (let i in stylefields) {
            if (stylefields.hasOwnProperty(i)) {
                let stylebox = stylefields[i];
                let prop = stylebox.dataset.siStyleProp;
                let val = stylebox.value;
                options['style'][prop] = val;
            }
        }
        //debugger;
        let blockSettings = document.querySelectorAll('#si_block_settings_table_' + safeid + " tr");
        if (blockSettings) {
            options['settings'] = {};
            for (let i in blockSettings) {
                if (blockSettings.hasOwnProperty(i)) {
                    let row = blockSettings[i];
                    let name = row.children[0].firstChild.value;
                    let val = row.children[1].firstChild.value;
                    if (name.length && val.length) {
                        options.settings[name] = val;
                    }
                }
            }
        }

        let blockWidgets = document.querySelectorAll('#si_block_widgets_table_' + safeid + " tr");
        if (blockWidgets) {
            options['widgets'] = {};
            //debugger;
            for (let i in blockWidgets) {
                if (blockWidgets.hasOwnProperty(i)) {
                    let row = blockWidgets[i];
                    let widgettype = row.children[0].firstChild.value;
                    let widgetoptions = row.children[1].firstChild.value;
                    //allow multiple widgets of same type without overwriting. put in a array and let the key be the order
                    if (typeof options.widgets[widgettype] === 'undefined') {
                        options.widgets[widgettype] = [];
                    }
                    options.widgets[widgettype].push(widgetoptions);
                }
            }
        }
        //debugger;
        data['options'] = options;

        //bodydata = document.body.dataset;
        //for (let datum in bodydata) {
        //    data.body.data[datum] = bodydata[datum];
        //}

        data.KEY = 'BlockSave';
        let ajax = { Data: data, };
        console.log(ajax);
        SI.Editor.Ajax.Run(ajax);

        //If we had a selected, reselect it
        //  if (selected) {
        //     SI.Editor.Objects.Elements.Select(selected);
        // }
        //when we save we unselect to not save the shadows. now reselect so the user does not see the change
        if (selected) {
            var event = new MouseEvent('dblclick', {
                'view': window,
                'bubbles': false,
                'cancelable': true
            });
            selected.dispatchEvent(event);
        }

    },
    Saved: function (data) {
        SI.Tools.SuperAlert(data + " Saved!", 1000);
        console.log('Block has been saved');
    },
    Promote: function (data) {
        data.KEY = 'BlockPromote';
        let ajax = { Url: SI.Editor.Ajax.Url, Data: data, };
        console.log(ajax);
        SI.Editor.Ajax.Run(ajax);
    },
    Names: [],
    Blocks: [],
    Select: function (blockid = '') {
        //make sure it is the block
        //ezhack- if blockid is undefined or null select no blocks.
        let block = document.getElementById(blockid);
        //debugger;
        //Light up the block
        SI.Tools.Class.Loop("si-block", function (ele) {
            ele.style.boxShadow = "none";
        });
        SI.Tools.Class.Loop("si-bids", function (ele) {
            ele.style.boxShadow = "none";
        });
        if (block) {
            block.style.boxShadow = "0px 0px 20px 1px rgba(0, 255, 255, 0.3), inset 0px 0px 20px 1px rgba(0, 255, 255, 0.3)";
           
            let bid =  document.getElementById(block.id.replace("si_block_", "si_bid_"))
            if(bid){
                bid.style.boxShadow = "0px 0px 20px 1px rgba(0, 255, 255, 0.3), inset 0px 0px 20px 1px rgba(0, 255, 255, 0.3)";
            }

            SI.Editor.Objects.Blocks.Selected = block;
        } else {
            SI.Editor.Objects.Blocks.Selected = null;
        }
    },
    Selected: null,
    DropBlock: null,
    DragEnter: function (e) {
        //debugger;
        if (!SI.Editor.UI.MainMenu.IsDragging) {
            var data = e.dataTransfer.getData("Text");
            //let self = this;
            SI.Editor.Objects.Elements.MakeDropParent(e, this);
            SI.Editor.Objects.Blocks.Select(this.id);
        }

    },
    Reorder: function () {
        let bids = document.getElementsByClassName('si-bids');
        let order = 0;
        for (let bid of bids) {
            let orderid = bid.id.replace("si_bid_", "si_bid_order_");
            document.getElementById(orderid).value = order;
            order++;
        }
    },
    AddWidget: function (block, widgettype, options, table = null) {
        //debugger;
        if (table === null) {
            table = document.getElementById('si_block_widgets_table_' + block);
        }
        let tr = Ele('tr', {
            style: {
                backgroundColor:"rgba(0,0,0,.3)"
            },
            appendTo: table
        });
        let tdtype = Ele('td', { appendTo: tr });

        let indelete = Ele('button', {
            style: {
                width: '24px',
                height: '24px',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/eraser.png')"
            },
            title:"Delete",
            onclick: function () {
                if (confirm("Do you want to delete this widget?")) {
                    let wig = document.getElementById(options.Id);
                    if (wig) {
                        wig.remove();
                    }
                    let tr = this.parentElement.parentElement;
                    tr.parentElement.removeChild(tr);
                    //delete all the widget related stuff.
                }
            },
            appendTo: tdtype
        });
        let inedit = Ele('button', {
            style: {
                width: '24px',
                height: '24px',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/widgets.png')",

            },
            title: "Open in Widget Editor",
            onclick: function () {
                // Open the widget editor to this widget.


            },
            appendTo: tdtype
        });

        Ele('br', {
            appendTo: tdtype
        });

        let intype = Ele('input', {
            style: { width: '75px'},
            value: widgettype,
            disabled: true,
            appendTo: tdtype
        });
        let tdoptions = Ele('td', { appendTo: tr });
        let stroptions = JSON.stringify(options);

        let lineoptions = stroptions.trimChar('{').trimChar('}').replaceAll(',', ',\n');
        
        let inoptions = Ele('textarea', {
            style: {
                width: '204px',
                height: "45px",
                overflow: 'auto',
            },
            innerHTML: lineoptions,
            title: stroptions,
            disabled: true,

            appendTo: tdoptions
        });


    }

}