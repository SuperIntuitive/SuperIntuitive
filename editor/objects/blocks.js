if (!SI) { var SI = {}; }
if (!SI.Editor) { SI.Editor = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }



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
        if (typeof SI.Editor.Code.Objects.Blocks === 'undefined' || SI.Editor.Code.Objects.Blocks === null) {
            SI.Editor.Code.Objects.Blocks = [];
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
        var fixedkey = SI.Tools.RegEx.Fix("OkId", safeid).replace("si_bid_", '');

        //If this is new we will need to make the block and put it in the current lists. if old those two will be done, just make the ui.
        if (options.New) {
            //debugger;
            //put the block and data on the current list
            //SI.Editor.Objects.Blocks.Current[fixedkey] = options;
            if (typeof SI.Editor.Code.Objects.Blocks[options.BlockName] === 'undefined') {
                SI.Editor.Code.Objects.Blocks[options.BlockName] = {};
            }

            //make the block and put it at the order it should be. 
            SI.Editor.Objects.Blocks.BabyBlock(fixedkey);
            SI.Editor.Objects.Blocks.Names.push(fixedkey);
        }
        else {
            //debugger;
            if (options.Data === null) {
                options.Data = SI.Editor.Code.Objects.Blocks[options.BlockName];
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
        let blockOptions = {};

        if (blockData.style) {
            blockStyles = blockData.style;
            delete blockData.style;
        }
        if (blockData.options) {
            blockOptions = blockData.options;
            delete blockData.options;
        }

        blockControls = blockData;


        let ordered = {};
        Object.keys(blockControls).sort().forEach(function (key) {
            ordered[key] = blockControls[key];
        });
        blockControls = ordered;
        //The dynamic properties field.
        for (control in blockControls) {
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
        let saveAll = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                display: 'none',
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
        }); //ToDo

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
                fkey: fixedkey,
            },

            onclick: function (e) {
                //debugger;
                let blockname = this.dataset.fkey;
                SI.Editor.UI.Scripter.Window.Show();
                SI.Editor.UI.Scripter.Scripter.LoadBlockCode(blockname);
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

                SI.Editor.UI.Styler.Window.Show();
                SI.Editor.UI.Styler.LoadStyleByBlock(blockname);
                e.stopPropagation(); //keep from clicking through
            },
            appendTo: blockui,
        });
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
                if (retVal == true) {
                    //SI.Editor.Objects.Blocks.SelectNone();
                    //debugger;
                    //remove all the html
                    let me = document.getElementById('si_bid_' + fixedkey);
                    let relayid = me.dataset.relationsid;
                    me.parentElement.removeChild(me);
                    let bl = document.getElementById('si_block_' + fixedkey);
                    bl.parentElement.removeChild(bl);
                    if (SI.Editor.Code.Objects.Blocks[fixedkey]) {
                        delete SI.Editor.Code.Objects.Blocks[fixedkey];
                    }

                    SI.Editor.Objects.Blocks.Remove(relayid);

                    //send Ajax to remove this block from the database.
                } else {

                }
                e.stopPropagation();
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
                let retId = this.id.replace("_button_", "_window_");
                var win = document.getElementById(retId);
                if (win != null && win.style.display == "none") {
                    win.style.display = "block";
                } else {
                    win.style.display = "none";
                }
                document.getElementById(retId.replace('deployment', 'options')).style.display = 'none';
                e.stopPropagation();
            },
            appendTo: blockui,
        });
        let openOptions = Ele("button", {
            id: 'si_block_options_button_' + fixedkey,
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/options.png')",
            },
            title: "Manage custom block options",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },
            onclick: function (e) {
                let retId = this.id.replace("_button_", "_window_");
                var win = document.getElementById(retId);
                if (win != null && win.style.display == "none") {
                    win.style.display = "block";
                } else {
                    win.style.display = "none";
                }
                document.getElementById(retId.replace('options', 'deployment')).style.display = 'none';
                e.stopPropagation();
            },
            appendTo: blockui,
        });
        let saveHtml = Ele("button", {
            style: {
                display: "inline-block",
                margin: '4px',
                width: '20px',
                height: '20px',
                float: 'right',
                backgroundSize: 'cover',
                backgroundImage: "url('/editor/media/icons/save.png')",
            },
            title: "Save the Block",
            data: {
                block: 'si_block_' + fixedkey,
                guid: options.Guid,
                fkey: fixedkey,
            },

            onclick: function (e) {
                //debugger;
                e.stopPropagation(); //keep from clicking through
                SI.Editor.Objects.Blocks.Save(this.parentElement, 'html'); //save the block div, which is this save buttons parent
            },
            appendTo: blockui,
        });
        Ele("br", { appendTo: blockui, });
        //Blocks Custom Options
        let optionsContainer = Ele('div', {
            id: 'si_block_options_window_' + fixedkey,
            style: {
                display: 'none',
                float: 'right',

                width: '200px',
                overflowY: 'auto',
                overflowX: 'hidden',
            },
            appendTo: blockui,
        });
        //Name Value pairs. 
        Ele("input", {
            placeholder: 'Name',
            appendTo: optionsContainer,
            style: {
                display: "inline-block",
                width: '40%'
            },
        });
        Ele("input", {
            placeholder: 'Value',
            appendTo: optionsContainer,
            style: {
                display: "inline-block",
                width: '40%'
            },
        });
        Ele("button", {
            innerHTML: '+',
            appendTo: optionsContainer,
            style: {
                display: "inline-block",
                width: '12%'
            },
            onclick: function (e) {
                let name = this.previousSibling.previousSibling;
                let val = this.previousSibling;
                if (name.value.length > 0 && val.value.length > 0) {


                    let table = this.nextSibling;
                    let tr = Ele('tr', { appendTo: table });
                    let tdname = Ele('td', { appendTo: tr });
                    let inname = Ele('input', { style: { width: '78px' }, value: name.value, appendTo: tdname });
                    let tdval = Ele('td', { appendTo: tr });
                    let inval = Ele('input', { style: { width: '103px' }, value: val.value, appendTo: tdval });
                    name.value = '';
                    val.value = '';
                    //debugger;
                }
                else {
                    alert("You will need both a name and a value to create an option");
                }
            },
        });
        let optionsTable = Ele('table', {
            id: 'si_block_options_table_' + fixedkey,
            style: {
                width: '100%',
                borderCollapse: 'collapse',
            },
            appendTo: optionsContainer,
        });




        let deploymentsContainer = Ele('div', {
            id: 'si_block_deployment_window_' + fixedkey,
            style: {
                display: 'none',
                float: 'right',
                height: '125px',
            },
            appendTo: blockui,
        });
        //PROMOTE CONTROLS  field:entity
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
        for (df in dFields) {
            //debugger;
            if (dFields.hasOwnProperty(df)) {
                let dField = df;
                let dEnt = dFields[df];
                let saveto = dEnt.saveto;
                let labelMar = null;
                if (typeof dEnt.labelmargin != 'undefined') {
                    labelMar = dEnt.labelmargin;
                }
                let deployId = null;
                if (saveto == "blocks") {
                    deployId = options.Guid;
                } else if (saveto == "relations") {
                    //need to figure out this malarchy
                    if (options.RelationsId) {
                        deployId = options.RelationsId;
                    } else if (options.relationsId) {
                        deployId = options.relationsId;
                    }

                }
                let deployoptions = { EntityName: saveto, EntityId: deployId, Attribute: dField, LabelMargin: labelMar };
                deploymentsContainer.appendChild(SI.Editor.Code.Objects.Deployment.UI(deployoptions));
            }
        }

        for (options in blockOptions) {
            if (blockOptions.hasOwnProperty(options)) {
                //debugger;
                let tr = Ele('tr', { appendTo: optionsTable });
                let tdname = Ele('td', { appendTo: tr });
                let inname = Ele('input', { style: { width: '78px' }, value: options, appendTo: tdname });
                let tdval = Ele('td', { appendTo: tr });
                let inval = Ele('input', { style: { width: '103px' }, value: blockOptions[options], appendTo: tdval });
            }
        }


        //Style Table
        let styletable = Ele('table', {
            id: "si_edit_page_blocks_styles_" + fixedkey,
            style: {
                width: '60%',
            },
            draggable: false,
            appendTo: blockui,
        });

        //Block Styles
        for (style in blockStyles) {
            let val = blockStyles[style];
            //debugger;
            let styleobj = {
                "Property": style,
                "Effected": '#si_block_' + fixedkey,
                "InitialValue": val,
                "AccessClass": "si-editor-page-blockstyle-" + fixedkey,
                "Removable": true,
            };

            let stylebox = SI.Editor.Objects.Elements.Styles.Widget(styleobj);// "Group": style.group, "Index": style.index, "Effect": 'body' });
            styletable.appendChild(stylebox);
        }




        //Add a style
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
                    let block = '#' + this.dataset.block
                    let styleobj = {
                        "Property": style,
                        "Effected": block,
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
        for (let group in SI.Editor.Code.css_properties) {
            if (group !== "Pseudo Class" && group !== "Pseudo Element") {
                let groupset = Ele("optgroup", { label: group, appendTo: addStyleSelect });
                let wholegroup = SI.Editor.Code.css_properties[group];
                for (let s in wholegroup) {
                    let prop = wholegroup[s].n;
                    if (!prop.startsWith("@"))
                        Ele("option", { value: prop, innerHTML: prop, title: wholegroup[s].d, appendTo: groupset });
                }
            }
        }


        //END Block UI
        //    block.innerHTML = key + " left:" + blockLib[key]['left'] + " top:" + blockLib[key]['top'] + " position:" + blockLib[key]['position'];
        //    console.log(key + " -> " + blockLib[key]);
        return blockui;
    },
    BabyBlock: function (blockname) {
        //debugger;
        let blk = SI.Editor.Code.Objects.Blocks[blockname];
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
        debugger;
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
        if (document.body.dataset.guid != null && document.body.dataset.guid.length === 34) {
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
    Relate: function(blockid) {
        if (document.body.dataset.guid != null && document.body.dataset.guid.length === 34) {
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
    Remove: function(relid) {
        let data = {};
        data.KEY = 'BlockRemove';
        data.linkid = relid;
        let ajax = { Data: data, };
        SI.Editor.Ajax.Run(ajax);

    },
    Created: function (newblock) {
        //we related a new block. now we need to put it in the Block data object by name
        if (typeof SI.Editor.Code.Objects.Blocks[newblock.NAME] === 'undefined') {
            //debugger;
            SI.Editor.Code.Objects.Blocks[newblock.NAME] = {};
            SI.Editor.Code.Objects.Blocks[newblock.NAME].id = newblock.ID;
            SI.Editor.Code.Objects.Blocks[newblock.NAME].html = newblock.HTML;
            SI.Editor.Code.Objects.Blocks[newblock.NAME].relationsId = newblock.RELID;
            SI.Editor.Code.Objects.Blocks[newblock.NAME].order = newblock.ORDER;
            SI.Editor.Code.Objects.Blocks[newblock.NAME].name = newblock.NAME;

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
        SI.Editor.Code.Tools.ClearSelection();
        console.log(blockname + ' has been created');
    },
    Save: function (blockui, flag = 'flag') {

        if (typeof blockui === 'string') {
            blockui = document.getElementById('si_bid_' + blockui);
            if (!blockui) {
                alert('cant find block ' + blockui + " to save");
                return;
            }
        }

        let selected = null;
        if (SI.Editor.Objects.Elements.Selected != null) {
            selected = SI.Editor.Objects.Elements.Selected;
            SI.Editor.Objects.Elements.SelectNone();
        }
        //debugger;
        let bname = blockui.getAttribute('data-name');
        let tmp, tguid;

        let t = this;
        if (typeof SI.Editor.Code.Objects.Blocks[bname] !== 'undefined') {
            tmp = SI.Editor.Code.Objects.Blocks[bname];
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

        if (flag == 'html') {
            //filter the element
            let replacements = {};
            let ignores = block.querySelectorAll('.si-editable-ignoreinner');

            for (ignore of ignores) {
                //put all the inner texts into an object so we can put them back after the data is sent
                replacements[ignore.id] = ignore.innerHTML;
                ignore.innerHTML = "";
            }

            //debugger;
            let multilinguals = block.querySelectorAll('.si-multilingual');
            for (mtext of multilinguals) {
                //put all the inner texts into an object so we can put them back after the data is sent

                replacements[mtext.id] = mtext.innerHTML;

                mtext.innerHTML = "SI_MULTILANG_" + mtext.dataset.si_ml_token;
            }

            data.html = block.innerHTML;
            empty = false;

            //the block(string) has been sent to data, now put the replaces back
            for (replacement in replacements) {
                document.getElementById(replacement).innerHTML = replacements[replacement];
            }
        }
        if (flag == 'script') {
            data.script = SI.Editor.Code.Objects.Blocks[bname].script;
            empty = false;
        }
        if (flag == 'style') {
            data.style = SI.Editor.Code.Objects.Blocks[bname].style;
            empty = false;
        }

        data['order'] = document.getElementById('si_bid_order_' + safeid).value;
        data['name'] = document.getElementById('si_bid_name_' + safeid).value;

        for (let i in attrfields) {
            let field = attrfields[i];
            input = document.getElementById('si_bid_' + field + '_' + safeid);
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
        let blockOptions = document.querySelectorAll('#si_block_options_table_' + safeid + " tr");
        if (blockOptions) {
            options['options'] = {};
            for (let i in blockOptions) {
                if (blockOptions.hasOwnProperty(i)) {
                    let row = blockOptions[i];
                    let name = row.children[0].firstChild.value;
                    let val = row.children[1].firstChild.value;
                    if (name.length && val.length) {
                        options.options[name] = val;
                    }
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
    Select: function(blockid = '') {
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
            document.getElementById(block.id.replace("si_block_", "si_bid_")).style.boxShadow = "0px 0px 20px 1px rgba(0, 255, 255, 0.3), inset 0px 0px 20px 1px rgba(0, 255, 255, 0.3)";
            SI.Editor.Objects.Blocks.Selected = block;
        } else {
            SI.Editor.Objects.Blocks.Selected = null;
        }
    },
    Selected: null,
    DropBlock : null,
    DragEnter: function(e) {
        //debugger;
        if (!SI.Editor.UI.MainMenu.IsDragging) {
            var data = e.dataTransfer.getData("Text");
            //let self = this;
            SI.Editor.Objects.Elements.MakeDropParent(e, this);
            SI.Editor.Objects.Blocks.Select(this.id);
        }

    },
    Reorder: function() {
        let bids = document.getElementsByClassName('si-bids');
        let order = 0;
        for (bid of bids) {
            let orderid = bid.id.replace("si_bid_", "si_bid_order_");
            document.getElementById(orderid).value = order;
            order++;
        }
    }
}