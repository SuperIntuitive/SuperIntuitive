
SI.Editor.Objects.Elements = {
    PendingContent: new Map(),
    CommitContent: function () {
        for (const [input, draft] of SI.Editor.Objects.Elements.PendingContent) {
            SI.Editor.Objects.Elements.PendingContent.delete(input);
            const {element, property, value} = draft;
            if (element[property] === value) continue;
            element[property] = value;
            element.querySelectorAll('*').forEach(child => SI.Editor.Objects.Elements.Editable(child));
            SI.Editor.Objects.Elements.MarkDirty(element);
        }
    },
    //Loops through all elements and makes them editable 
    EditableNodes: new WeakSet(),
    Init: function () {
        document.querySelectorAll('*').forEach(function (node) {
            let tn = node.tagName;
            let excludedElements = ['HEAD', 'BODY', 'HTML','META','STYLE','SCRIPT'];
            if (excludedElements.indexOf(tn) === -1) {
                if (!node.classList.contains("si-block") && !node.classList.contains("si-deployment-control"))
                    node = SI.Editor.Objects.Elements.Editable(node);
            }
        });
    },
    //Completely removes an element
    Remove: function (element) {
        if (!element) return;
        if (SI.Editor.Objects.Widgets.CanvasFor(element)) {
            if (element === SI.Editor.Objects.Widgets.Preview) return;
            SI.Editor.Objects.Elements.MarkDirty(element);
            SI.Editor.Objects.Elements.SelectNone(); element.remove(); return;
        }
        if (!element.closest('.si-block')) return;
        SI.Editor.Objects.Elements.MarkDirty(element);
        const block = element.closest('.si-block').id.replace('si_block_', '');
        for (const widget of [element, ...element.querySelectorAll('[data-si-widget]')]) {
            if (widget.dataset.siWidget) SI.Editor.Objects.Widgets.Forget(block, widget.id);
        }
        SI.Editor.Objects.Elements.SelectNone();
        element.remove();
        SI.Editor.Objects.Widgets.RefreshInstances();
        SI.Editor.UI.EditPanel.Clear.Attributes();
        SI.Editor.UI.EditPanel.Clear.Styles();
    },
    MarkDirty: function (element) {
        if (SI.Editor.Objects.Widgets.CanvasFor(element)) { SI.Editor.Objects.Widgets.MarkCanvasDirty(); SI.Editor.UI.EditPanel.SelectionSummary(); return; }
        const block = element && element.closest('.si-block');
        const name = block && block.id.replace('si_block_', '');
        const data = name && SI.Editor.Data.Objects.Blocks[name];
        if (data) {
            data.IsDirty = true;
            data.EditRevision = (data.EditRevision || 0) + 1;
            if (!data.DirtyTranslations) data.DirtyTranslations = {};
            for (let text = element.closest('.si-multilingual'); text; text = text.parentElement?.closest('.si-multilingual')) {
                const token = text.dataset.si_ml_token;
                if (!data.DirtyTranslations[token]) data.DirtyTranslations[token] = new Set();
                data.DirtyTranslations[token].add(text.id);
            }
        }
        SI.Editor.UI.EditPanel.SelectionSummary();
    },
    //A list of all of the editable elements ids.
    HeadIds: [],
    Ids: [],
    //A list of all of the unique classes
    Classes: [],
    //Holds the currently selected element type=element
    Selected: null,
    //Removes selection from all elements.
    SelectNone: function (keepEditPanel = false) {
        SI.Editor.Objects.Elements.CommitContent();
        for (const element of document.querySelectorAll('.si-editor-selected')) {
            element.classList.remove('si-editor-selected');
            for (const attribute of Array.from(element.attributes)) {
                if (attribute.name.startsWith('data-sistyle_')) {
                    element.style.setProperty(attribute.name.replace('data-sistyle_', ''), attribute.value === 'null' ? '' : attribute.value);
                    element.removeAttribute(attribute.name);
                } else if (attribute.name.startsWith('data-siattr_')) {
                    const name = attribute.name.replace('data-siattr_', '');
                    if (attribute.value === 'null') element.removeAttribute(name);
                    else element.setAttribute(name, attribute.value);
                    element.removeAttribute(attribute.name);
                }
            }
        }
        SI.Editor.Objects.Elements.Selected = null;
        SI.Editor.Objects.Elements.DropParent = null;
        SI.Editor.Objects.Blocks.Select();
        const hud = document.getElementById('si_edit_hud_selectedelement');
        if (hud) hud.textContent = '';
        if (!keepEditPanel) {
            SI.Editor.UI.EditPanel.Clear.Attributes();
            SI.Editor.UI.EditPanel.Clear.Styles();
            const panel = document.getElementById('si_edit_edit_menuitem');
            if (panel) {
                panel.getAnimations().forEach(animation => animation.cancel());
                panel.style.display = 'none';
            }
            document.getElementById('si_edit_menu_item')?.setAttribute('aria-expanded', 'false');
        }
        SI.Editor.UI.EditPanel.SelectionSummary();
    },
    Select: function (ev, id) {
        //debugger;
        //this can come from an event handeler aka double click on a element OR frm a list. If not from a handeler, we need to supply the element id.
        var self = null;
        if (typeof id !== 'undefined') {
            let ele = document.getElementById(id);
            if (ele !== null) {
                self = ele;
            } else if (this !== null) {
                self = this;
            }
        } else {
            self = this;
        }
        //now were pretty sre self = the element to select. 
        //Qualify / Disqualify self selection
        //If it is a block DQ
        if (!(self instanceof HTMLElement) || !(self.closest('.si-block') || SI.Editor.Objects.Widgets.CanvasFor(self)) || self.classList.contains('si-block') || self.classList.contains('si-deployment-control') || self === SI.Editor.Objects.Widgets.Canvas) {
            return; //we dont select blocks
        }

        // Keep a repeated selection stable; Escape explicitly clears it.
        if (self.classList.contains('si-editor-selected')) {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            return;
        }

        // Replace the selection while keeping an open properties panel in place.
        SI.Editor.Objects.Elements.SelectNone(true);

        //In the edit menu setup all self elements styles and attributes.
        SI.Editor.UI.EditPanel.SetSelectedElementValues(self);

        //Add whatever we need to make self Selected
        //since were comindering the box shadow for selection we should keep a copy of/if there is a set one
        if (self.style.boxShadow.length > 0) {
            self.setAttribute('data-sistyle_box-shadow', self.style.boxShadow);
        } else {
            self.setAttribute('data-sistyle_box-shadow', null);
        }
        self.style.boxShadow = '0px 0px 20px 1px rgba(255, 255, 0, 0.3), inset 0px 0px 20px 1px rgba(255, 255, 0, 0.3)';

        //all selected elements are draggable, and turned off when unselected. But what if it is supposed to be draggable? it should not turn off. store it. 
        self.setAttribute('data-siattr_draggable', self.getAttribute('draggable') === null ? 'null' : self.getAttribute('draggable'));
        self.draggable = true;

        self.addEventListener('dragenter', SI.Editor.Objects.Elements.MakeDropParent);
        self.addEventListener('dragstart', SI.Editor.Objects.Elements.MoveStart);
        self.addEventListener('dragend', SI.Editor.Objects.Elements.MoveEnd);

        //give it the selected class
        self.classList.add('si-editor-selected');

        //show it in the hud
        let hud = document.getElementById("si_edit_hud_selectedelement");
        if(hud){
           hud.innerHTML = self.id;
        }

        //Lastly make the global Selected element be self one.
        SI.Editor.Objects.Elements.Selected = self;
        SI.Editor.UI.EditPanel.SelectionSummary();

        //Select the block that is parent to the element
        let block = SI.Tools.Element.GetBlock(self);
        if (block) {
            SI.Editor.Objects.Blocks.Select(block.id);
        }


        if (ev && ev.stopPropagation) {
            ev.stopPropagation();
        }

    },
    //Makes a simple element into a editable element
    Editable: function (ele) {
        //debugger;
        if (ele instanceof HTMLElement && (ele.closest('.si-block') || SI.Editor.Objects.Widgets.CanvasFor(ele)) && !ele.classList.contains('si-block') && !ele.closest('[data-si-editor-only]')) {
            if (SI.Editor.Objects.Elements.EditableNodes.has(ele)) return ele;
            SI.Editor.Objects.Elements.EditableNodes.add(ele);
            //Enter the unique classes into out data for future use.
            let classlist = ele.className.split(' ');
            let classBlackList = ["si-editable-element"];
            for (let c in classlist) {
                if (classlist[c] !== "si-editable-element" && SI.Editor.Objects.Elements.Classes.indexOf(classlist[c]) === -1) {
                    // if (!classlist[c].startsWith("si-") && classlist[c] !== "")
                    SI.Editor.Objects.Elements.Classes.push(classlist[c]);
                }
            }

            //if there is no ID give it one and log it.
            if (ele.id === "") {
                let makeid = function () {
                    return ele.tagName.toLowerCase() + "_" + SI.Tools.String.RandomString();
                }
                let newid = makeid();
                while (document.getElementById(newid)) { //protect against the chance of a dup ID
                    newid = makeid();
                }
                ele.id = newid;
            }
            let blacklistedIds = ["si_colorscheme"];
            //track the ids
            if (blacklistedIds.indexOf(ele.id) === -1) {
                //put the id in with the head ids or the body ids. 
                if (ele.parentElement && ele.parentElement.tagName === 'HEAD') {
                    if (typeof SI.Editor.Objects.Elements.HeadIds[ele.id] === 'undefined')
                        SI.Editor.Objects.Elements.HeadIds.push(ele.id);
                } else {
                    if (typeof SI.Editor.Objects.Elements.Ids[ele.id] === 'undefined')
                        SI.Editor.Objects.Elements.Ids.push(ele.id);
                }


                //setup datalists
                if (SI.Editor.Data.DataLists.AnimationNames === null) {
                    SI.Editor.Data.DataLists.AnimationNames = [];
                } 
                //fill up our style lists
                var compstyle = window.getComputedStyle(ele);
                if (compstyle.animationName !== 'none' && SI.Editor.Data.DataLists.AnimationNames.indexOf(compstyle.animationName) === -1) {
                    SI.Editor.Data.DataLists.AnimationNames.push(compstyle.animationName);
                }
                

                //Tell the editor this is an editable element
                ele.classList.add("si-editable-element");
                //add event handelers to:
                //select the element
                ele.addEventListener('dblclick', SI.Editor.Objects.Elements.Select);
                ele.addEventListener('mouseover', function (e) {
                    if (e.altKey) {
                        var event = new MouseEvent('dblclick', {
                            'view': window,
                            'bubbles': false,
                            'cancelable': true
                        });
                        this.dispatchEvent(event);
                    }
                    e.stopPropagation();
                }, false); //Alt mouse over a element to select incase it has a click
                //and drag it around
                ele.addEventListener('dragenter', SI.Editor.Objects.Elements.MakeDropParent, false);
                ele.addEventListener('dragstart', SI.Editor.Objects.Elements.MoveStart, false);
                ele.addEventListener('dragend', SI.Editor.Objects.Elements.MoveEnd, false);
                return ele;
            }
        }
        return null;
    },
    //Moves the selected element plus or minus 
    MoveBy: function (x, y) {
        const selected = SI.Editor.Objects.Elements.Selected;
        if (!selected || !/^(absolute|relative|fixed)$/.test(getComputedStyle(selected).position)) return;
        const style = getComputedStyle(selected);
        const left = parseFloat(style.left);
        const top = parseFloat(style.top);
        selected.style.left = ((Number.isFinite(left) ? left : selected.offsetLeft) + x) + 'px';
        selected.style.top = ((Number.isFinite(top) ? top : selected.offsetTop) + y) + 'px';
        SI.Editor.Objects.Elements.MarkDirty(selected);
        SI.Editor.UI.EditPanel.SetSelectedElementValues(selected);
    },
    MoveStart: function (event) {
        if (SI.Editor.Objects.Elements.Selected !== this || !/^(absolute|relative|fixed)$/.test(getComputedStyle(this).position)) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        SI.Editor.Objects.Placement.Begin(event, {kind: 'move', element: this});
    },
    MoveEnd: function (event) {
        event.stopPropagation();
        SI.Editor.Objects.Placement.Cancel();
    },
    //Sets the parent of the element while being moved
    MakeDropParent: function (ev, self) {
        self = (typeof self === 'undefined') ? this : self;
        if (SI.Tools.Is.Element(self)) {
            SI.Editor.Objects.Elements.DropParent = self;

            let hud = document.getElementById("si_edit_hud_dropparent")
            if(hud){
                hud.innerHTML = self.id;
            }
           

        }
        if (ev.stopPropagation) {
            ev.stopPropagation();
        }
    },
    DropParent: null,

    Attributes: {
        Widget: function (options) {
            let RandId = SI.Tools.String.RandomString(11); //where ever there is a id used use a random postfix
            this.Defaults = {
                "Group": null,
                "Index": null,
                "Attribute": null,
                "Affected": null,
                "AccessClass": null,
                "Preserve": false,
                "OnChange": null,
            };
            options = SI.Tools.Object.SetDefaults(options, this.Defaults);

            let data = null; //if an input has data we can add it here
            //we need a group and an index to get the style
            if (options.Index === null && options.Group === null) {
                if (options.Attribute === null) {
                    return null;
                }
                else {
                    let a;
                    if (options.Group === null) {
                        //without a group name we cannot guarrentee the correct attr. ex If its for a video the audio one may be selected? but as long as the choices are the same its fine
                        a = SI.Editor.Data.Tools.GetAttributeByName(options.Property);
                    } else {
                        //if we dont have an index but do have a group name, guarentee the correct attr
                        a = SI.Editor.Data.Tools.GetAttributeByName(options.Property, options.Group);
                    }
                    options.Group = a.group;
                    options.Index = a.index;
                }
            }

            if (typeof options.Group === 'undefined' || typeof options.Index === 'undefined') {
                SI.Tools.Warn(options.Property + " is not found in the Attributes table");
                return false;
            }

            let attrobj = SI.Editor.Data.html_attributes[options.Group][options.Index];

            let attrrow = Ele('tr', {class: 'si-edit-property-row'});

            let getAffected = function () {
                let ele = null;
                if (options.Affected) {
                    if (options.Affected.toLowerCase() === "none") {
                        ele = null;
                    } else {
                        ele = document.querySelector(options.Affected);
                    }
                } else {
                    ele = SI.Editor.Objects.Elements.Selected;
                }
                return ele;
            }
            //The Attribute label
            let attrdata = Ele('td', {
                class: 'si-attribute-selection si-edit-property-label',
                innerHTML: attrobj.n,

                appendTo: attrrow,
            });

            //debugger;
            let attrInput;


            if (attrobj.dt === 'ATTRIBUTE') {
                attrInput = document.createElement('input');
                attrInput.type = 'checkbox';
                // if (effectid) { attrInput.setAttribute("data-effectid", effectid); }
                attrInput.onchange = function (e) {
                    let ele = null;
                    if (options.Affected) {
                        if (options.Affected.toLowerCase() === "none") {
                            ele = null;
                        } else {
                            ele = document.querySelector(options.Affected);
                        }
                    } else {
                        ele = SI.Editor.Objects.Elements.Selected;
                    }
                    if (ele !== null) {
                        if (this.checked) {
                            ele.setAttribute(attrobj.n, "");
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                }
            }
            else if (attrobj.dt === 'SCRIPT') {
                attrInput = document.createElement('textarea');
                attrInput.classList.add('si-edit-code');
                attrInput.placeholder = SI.Tools.Text.Editor('Javascript');
                // if (effectid) { attrInput.setAttribute("data-effectid", effectid); }
                attrInput.onchange = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let script = this.value;
                        if (script.length > 0) {
                            //validate script, escape quotes make it so it works on the other side
                            ele.setAttribute(attrobj.n, script);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                }
            }
            else if (attrobj.dt === 'INNERHTML' || attrobj.dt === 'INNERTEXT') {
                attrInput = Ele('textarea', {class: 'si-edit-code'});
                attrInput.oninput = function () {
                    const element = getAffected();
                    if (!element || SI.Tools.Is.EmptyElement(element.tagName.toLowerCase())) return;
                    const property = attrobj.dt === 'INNERHTML' ? 'innerHTML' : 'innerText';
                    SI.Editor.Objects.Elements.PendingContent.set(this, {element, property, value: this.value});
                };
                attrInput.onchange = SI.Editor.Objects.Elements.CommitContent;
            }
            else if (attrobj.dt === 'TEXT') {
                attrInput = document.createElement('input');
                attrInput.onkeyup = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                        let text = this.value;
                        if (text.length > 0) {
                            ele.setAttribute(attrobj.n, text);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                }
            }
            else if (attrobj.dt === 'CSS') {
                attrInput = document.createElement('textarea');
                attrInput.onkeyup = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let text = this.value;
                        if (text.length > 0) {
                            ele.setAttribute(attrobj.n, text);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                }
            }
            else if (attrobj.dt === 'TAG') {
                attrInput = document.createElement('input');
                attrInput.readOnly = true;
                attrInput.onkeyup = function (e) {
                    /* MAKE THIS READ ONLY UNTIL WE MAKE A LIST
                   let ele = SI.Editor.Objects.Elements.Selected;
                    if (ele !== null) {
                       let text = this.value;
                        if (text.length > 0) {
                            ele.setAttribute(attrobj.n, text);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                    */
                }
            }
            else if (attrobj.dt === 'NAME') {
                attrInput = document.createElement('input');
                attrInput.onkeyup = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let names = document.querySelectorAll(' [name]');
                       let text = this.value;
                        if (text.length > 0) {
                            ele.setAttribute(attrobj.n, text);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }

                }
            }
            else if (attrobj.dt === 'URL') {
                attrInput = document.createElement('input');
                attrInput.style.color = 'darkblue';
                attrInput.setAttribute('data-attr', attrobj.n);
                attrInput.setAttribute('data-type', "media");
                attrInput.setAttribute('type', "lookup");
                attrInput.onchange = function (e) {
                    debugger;
                    let ele = getAffected();
                    if (ele !== null) {
                       let tn = this.getAttribute('data-attr');
                        // let text = this.value;
                        let text = SI.Tools.GetMediaFilePath(this.value);
                        if (text) {
                            if (text.length > 0) {
                                ele.setAttribute(tn, text);
                            } else {
                                ele.removeAttribute(tn);
                            }
                        }
                        else {
                            document.execCommand('undo', true)
                        }
                    }
                }
            }
            else if (attrobj.dt === 'UNIQUE_ID') {
                //debugger;
                attrInput = document.createElement('input');
                attrInput.setAttribute('data-attr', attrobj.n);
                this.firstId = null;
                attrInput.onchange = function (e) {
                    //debugger;
                    let ele = getAffected();
                    if (ele !== null) {
                        if (ele.id !== this.value) { //dont touch if it is already the value
                            //debugger;
                            let dedupe = document.getElementById(this.value);
                            if (dedupe === null) {
                               let tn = this.getAttribute('data-attr');
                                // let text = this.value;
                                if (this.value.length > 0) {
                                    ele.setAttribute(tn, this.value);
                                } else {
                                    ele.removeAttribute(tn);
                                }
                                //debugger;
                                //once we replace the id, we need to go into the Elemet.Ids and update the old value to the new one.
                                SI.Editor.Objects.Elements.Selected = ele; //make sure we dont harm the future of editing this.
                                let index = SI.Editor.Objects.Elements.Ids.indexOf(this.firstId);
                                if (index !== -1) {
                                    SI.Editor.Objects.Elements.Ids[index] = this.value;
                                }
                            } else {
                                alert(SI.Tools.Text.Editor("That id is already in use"));
                                this.value = ele.tagName.toLowerCase() + "_" + SI.Tools.String.RandomString(7);
                            }
                        }
                    }
                };
                attrInput.onmouseover = function () {
                    let ele = null;
                    if (options.Affected) {
                        ele = document.querySelector(options.Affected);
                    } else {
                        ele = SI.Editor.Objects.Elements.Selected;
                    }
                    this.firstId = ele.id;

                };
            }
            else if (attrobj.dt === 'NUMBER') {
                attrInput = Ele('input', {
                    type: 'number',
                    onkeyup: function (e) {
                        let ele = null;
                        if (options.Affected) {
                            if (options.Affected.toLowerCase() === "none") {
                                ele = null;
                            } else {
                                ele = document.querySelector(options.Affected);
                            }
                        } else {
                            ele = SI.Editor.Objects.Elements.Selected;
                        }
                        if (ele !== null) {
                            if (this.value.length > 0) {
                                ele.setAttribute(attrobj.n, this.value);
                            } else {
                                ele.removeAttribute(attrobj.n);
                            }
                        }
                    }
                });
            }
            else if (attrobj.dt === 'PIXELS') {
                attrInput = Ele('input', {
                    type: 'number',
                    onkeyup: function (e) {
                        let ele = getAffected();
                        if (ele !== null) {
                            if (this.value.length > 0) {
                                ele.setAttribute(attrobj.n, this.value);
                            } else {
                                ele.removeAttribute(attrobj.n);
                            }
                        }
                    }
                });
            }
            else if (attrobj.dt === 'KEY_VALUE_PAIR') {
                //debugger;
                //This should be renamed to data. in the event of another KVP is needed copy this and modify
                attrobj.n = attrobj.n.replace('-*', '');
                //Container
                attrInput = Ele("div", {
                    innerText: SI.Tools.Text.Editor("data-"),
                    style: {
                        display: 'inline-block',
                        position: 'relative',
                    },
                    data: { attr: attrobj.n },
                });

               let datalist = Ele('datalist', {
                    id: "si_editor_attributes_" + attrobj.n + "_list_" + RandId,
                    appendTo: attrInput,
                });
                //debugger;
                let name = Ele('input', {
                    list: "si_editor_attributes_" + attrobj.n + "_list_" + RandId,
                    id: "si_editor_attributes_" + attrobj.n + "_name_" + RandId,
                    style: {
                        width: '124px',
                    },
                    appendTo: attrInput,
                });
                attrInput.innerHTML += "<br />&nbsp;&nbsp;&nbsp;&nbsp; = &nbsp;";
                let value = Ele('input', {
                    id: "si_editor_attributes_" + attrobj.n + "_value_" + RandId,
                    style: {
                        width: '100px',
                    },
                    appendTo: attrInput,
                });
                let add = Ele("button", {
                    innerHTML: '+',
                    style: {
                        width: '24px',
                    },
                    onclick: function () {
                        let ele = getAffected();
                        if (ele !== null) {
                           let name = document.getElementById("si_editor_attributes_" + attrobj.n + "_name_" + RandId);
                           let val = document.getElementById("si_editor_attributes_" + attrobj.n + "_value_" + RandId);
                            if (name.value.length > 0) {
                                ele.setAttribute('data-' + name.value, val.value);
                               let dlist = document.getElementById("si_editor_attributes_" + attrobj.n + "-list-" + RandId);
                               let option = Ele("option", {
                                    value: name.value.replace('data-', ''),
                                    innerHTML: name.value.replace('data-', ''),
                                    appendTo: dlist,
                                });
                                name.value = "";
                                val.value = "";
                            }
                        }
                    },
                    appendTo: attrInput,
                });
            }
            else if (attrobj.dt === 'CLASS') {
                let data = SI.Tools.Class.GetAll();
                attrInput = document.createElement('input');
                attrInput.setAttribute('data-attr', attrobj.n);
                attrInput.setAttribute('placeholder', 'Space Separated Classes');
                attrInput.onchange = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let tn = this.getAttribute('data-attr');
                       let text = this.value;
                        //debugger;
                        if (text.indexOf('si-editor-selected') === -1) {
                            text = 'si-editor-selected ' + text;
                        }
                        if (text.indexOf('si-editable-element') === -1) {
                            text = 'si-editable-element ' + text;
                        }

                        if (text.length > 0) {
                            ele.setAttribute(tn, text);
                            if (!SI.Editor.Objects.Elements.Classes.indexOf(text) === -1)
                                SI.Editor.Objects.Elements.Classes.push(text);
                        } else {
                            ele.removeAttribute(tn);
                        }
                    }
                }
            }
            else if (attrobj.dt === 'CHAR') {
                attrInput = Ele('input', {
                    placeholder: SI.Tools.Text.Editor('char'),
                    maxLength: "1",
                    style: {
                        width: '26px',
                    },
                    onkeyup: function (e) {
                        let ele = getAffected();
                        if (ele !== null) {
                            if (this.value.length === 1) {
                                ele.setAttribute(attrobj.n, this.value);
                            } else {
                                ele.removeAttribute(attrobj.n);
                            }
                        }
                    }
                });
            }
            else if (attrobj.dt === 'TRUE|FALSE') {
                attrInput = document.createElement('select');
                attrInput.setAttribute('data-attr', attrobj.n);
                attrInput.placeholder = SI.Tools.Text.Editor('True or False');
                let optN = document.createElement('option');
                optN.innerText = '';
                let optT = document.createElement('option');
                optT.innerText = SI.Tools.Text.Editor('True');
                let optF = document.createElement('option');
                optF.innerText = SI.Tools.Text.Editor('False');

                attrInput.appendChild(optN);
                attrInput.appendChild(optT);
                attrInput.appendChild(optF);

                attrInput.onchange = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let choice = this.options[this.selectedIndex].innerText;
                       let tn = this.getAttribute('data-attr');
                        if (choice.length > 0) {
                            ele.setAttribute(tn, choice);
                        } else {
                            ele.removeAttribute(tn);
                        }
                    }
                };
            }
            else if (attrobj.dt === 'ON|OFF') {

                attrInput = document.createElement('select');
                attrInput.setAttribute('data-attr', attrobj.n);
                attrInput.placeholder = SI.Tools.Text.Editor('On or Off');
               let optN = document.createElement('option');
                optN.innerText = '';
               let optT = document.createElement('option');
                optT.innerText = SI.Tools.Text.Editor('on');
               let optF = document.createElement('option');
                optF.innerText = SI.Tools.Text.Editor('off');

                attrInput.appendChild(optN);
                attrInput.appendChild(optT);
                attrInput.appendChild(optF);

                attrInput.onchange = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let choice = this.options[this.selectedIndex].innerText;
                       let tn = this.getAttribute('data-attr');
                        if (choice.length > 0) {
                            ele.setAttribute(tn, choice);
                        } else {
                            ele.removeAttribute(tn);
                        }
                    }
                };
            }
            else if (attrobj.dt === 'LANGUAGE') {
                attrInput = document.createElement('select');
                attrInput.placeholder = SI.Tools.Text.Editor('Language');
                let blank = document.createElement('option');
                blank.innerText = '';
                attrInput.appendChild(blank);
                attrInput.innerHTML += SI.Editor.Data.OptionSets.Language.All;
                attrInput.onchange = function (e) {
                    let ele = getAffected();
                    if (ele !== null) {
                       let choice = this.options[this.selectedIndex].value;

                        if (choice.length > 0) {
                            ele.setAttribute(attrobj.n, choice);
                        } else {
                            ele.removeAttribute(attrobj.n);
                        }
                    }
                };
            }
            else if (attrobj.dt.startsWith('OPTIONSET')) {
                let optionset = attrobj.dt.split('(')[1].split(')')[0];
                let myoptions = optionset.split('|');
                attrInput = document.createElement('select');
                attrInput.setAttribute('data-attr', attrobj.n);
                let blank = document.createElement('option');
                blank.innerHTML = "";
                attrInput.appendChild(blank);
                for (let i = 0; i < myoptions.length; i++) {
                    let option = document.createElement('option');
                    option.innerHTML = myoptions[i];
                    attrInput.appendChild(option);
                }
                attrInput.onchange = function () {
                    let ele = getAffected();
                    if (ele !== null) {
                        let selEle = this.options[this.selectedIndex]
                        let tn = this.getAttribute('data-attr');
                        let selOpt = selEle.value;
                        //debugger;
                        // let da = "data-attr-" + tn;
                        // let daf = ele.getAttribute(da);
                        if (tn.length && selOpt.length) {
                            ele.setAttribute(tn, selOpt);
                        }

                        //  alert(tn);

                        //console.log(ele);
                        if (selOpt === "") {
                            ele.removeAttribute(tn);
                        } else {
                            ele.setAttribute(tn, selOpt);
                        }
                        //  alert(selOpt);
                    }
                }
            }
            else {
                attrInput = document.createElement('span');
                attrInput.innerHTML = attrobj.dt;
            }

            //we will be able to access the fields from this class.
            if (options.AccessClass) {
                attrInput.classList.add(options.AccessClass);
            }
            //  attrInput.setAttribute('data-attr', attrobj.n);
            attrInput.classList.add("si-edit-attribute", "si-edit-control");
            attrInput.setAttribute("aria-label", attrobj.n);   //to clear all the attrs
            attrInput.classList.add("si-edit-attribute-" + options.Group + "-" + attrobj.n); //to set the field
            attrInput.setAttribute("data-si-preserve", options.Preserve);
            attrInput.id = "si_edit_attribute_" + options.Group + "_" + attrobj.n + "_" + RandId;

            // Text attributes respond to paste and input methods as well as key presses.
            if (attrInput.onkeyup && !attrInput.oninput) attrInput.oninput = attrInput.onkeyup;
            for (const type of ['input', 'change']) attrInput.addEventListener(type, function () {
                const affected = getAffected();
                if (affected && affected.closest('.si-block')) SI.Editor.Objects.Elements.MarkDirty(affected);
            });
            if (options.OnChange) {
                attrInput.addEventListener("change", function (ev) {
                    options.OnChange(ev, this);
                });
            }

           let attroptionbox = Ele('td', {
                class: 'si-edit-property-value',
                append: attrInput,
                appendTo: attrrow,
            });
            //Help text ? hover
           let attrdescriptionbox = Ele('td', {
                innerHTML: "?",
                title: attrobj.d,
                class: 'si-edit-property-help',
                appendTo: attrrow,
            });
            //Help links
            SI.Editor.Objects.Settings.Help.Show("attributes", attrobj, attrrow);

            return attrrow;
        }

    },
    Styles: {
        Widget: function (options) {

            let RandId = SI.Tools.String.RandomString(11);
            this.Defaults = {
                "Group": null,
                "Index": null,
                "Property": null,
                "Affected": null,
                "AssignTo": null,
                "InitialValue": "",
                "Class": "",
                "OnChange": null,
                "Draggable": false,
                "AccessClass": null,
                "Removable": false,
                "ReturnTag": "TR",
                "Preserve": false
            };
            options = SI.Tools.Object.SetDefaults(options, this.Defaults);
            this.Value = options.InitialValue;

            //we need a group and an index to get the style
            if (options.Index === null && options.Group === null) {
                if (options.Property === null) {
                    return null;
                }
                else {
                    let s = SI.Editor.Data.Tools.GetStyleByName(options.Property);
                    if (s) {
                        options.Group = s.group;
                        options.Index = s.index;
                    }
                }
            }
            let styleobj = null;

            if (options.Group === null || options.Index === null) {
                // Properties outside the picker catalog still have editable CSS values.
                styleobj = {n: options.Property, t: 'RAW', v: '', d: 'Enter a CSS value, including var() or calc().', a: false};
            }
            else {
                styleobj = SI.Editor.Data.css_properties[options.Group][options.Index];
            }

            if (typeof styleobj === 'undefined' || styleobj.n.startsWith('@') || styleobj.n.startsWith(':')) {
                //do not process
                if (typeof styleobj === 'undefined') {
                    console.log("StyleObj is undefined for group:" + options.Group + " Index:" + options.Index);
                }
                return null;
            }

            //set the Affected Element 
            //The Row to be returned. 
            let cssrow = Ele('tr', {
                draggable: options.Draggable,
                class: "si-edit-style-propertyrow si-edit-property-row"
            });
            //if (styleobj.a) {
            //    cssrow.classList.add("si-edit-style-animatable");
            //}
            //add the label
            let csslabel = Ele('td', {
                class: "si-edit-style-propertyname si-edit-property-label",
                textContent: styleobj.n,

                appendTo: cssrow,
            });
            var container = Ele('div', {class: 'si-edit-style-control'});
            //add the user interface
            let styleoptionbox = Ele('td', {
                class: 'si-edit-property-value',
                append: container,
                appendTo: cssrow,
            });

            //BUILD THE SELECTOR
            //The first thing is the input that shows the selected value.
            this.css_value = Ele('input', {
                id: "si_edit_style_" + styleobj.n + "_" + RandId,
                class: "si-edit-style-propertyvalue si-edit-control",
                readOnly: false,
                title: styleobj.t === 'RAW' ? styleobj.d : SI.Tools.Text.Editor('Type a CSS value, or click to choose one.'),
                oninput: function () {
                    const value = this.value.replace(/\s*!important\s*$/i, '').trim();
                    if (styleobj.t !== 'RAW' && value && !CSS.supports(styleobj.n, value)) {
                        this.setCustomValidity('Enter a valid value for ' + styleobj.n + '.');
                        return;
                    }
                    this.setCustomValidity('');
                    AssignStyle(this.value);
                },
                value: options.InitialValue,

                data: {
                    "si-animatable": styleobj.a,
                    "si-style-prop": styleobj.n,
                    "si-preserve": options.Preserve
                },
                onclick: function (e) {
                    //debugger;
                    var tableid = this.id.replace("si_edit_style_", "si_edit_style_table_");
                    var display = document.getElementById(tableid);
                    if (display.style.display === 'none') {
                        display.style.display = 'block';
                    } else {
                        display.style.display = 'none';
                    }
                },
                appendTo: container
            });

            this.css_value.setAttribute('aria-label', styleobj.n);
            if (options.Affected === null) {
                this.css_value.classList.add("si-edit-style");
                this.css_value.classList.add("si-edit-style-" + styleobj.n);
            }
            if (options.AccessClass) {
                this.css_value.classList.add(options.AccessClass);
            }

            this.css_value_clear = Ele('button', {
                id: "si_edit_style_clear_" + styleobj.n + "_" + RandId,
                class: 'si-edit-clear-style',
                innerText: '×',
                title: SI.Tools.Text.Editor('Clear ') + styleobj.n,
                onclick: function () {
                    DeleteStyle();
                },
                appendTo: container,
            });
            this.css_value_clear.setAttribute('aria-label', 'Clear ' + styleobj.n);
            this.css_table = Ele('table', {
                id: "si_edit_style_table_" + styleobj.n + "_" + RandId,
                class: 'si-edit-style-options',
                style: {display: 'none'},
                appendTo: container,
            });

            var AssignStyle = function (val,shnum=null) {
                //debugger;
                val = val.trim();
                const priority = /\s*!important\s*$/i.test(val) ? 'important' : '';
                const value = val.replace(/\s*!important\s*$/i, '').trim();
                //sets the values of the read only input
                document.getElementById("si_edit_style_" + styleobj.n + "_" + RandId).value = val;
                let ele = null;
                //if we have a Affected elementis selector
                if(options.Affected) {
                    if (options.Affected.toLowerCase() !== 'none') { //if it is none, than ignore it. it will stay null and do nothing on change. needed for styler 
                        ele = document.querySelector(options.Affected); //if not, use it as a css qurey selector to the the affected
                    }
                }
                else if (SI.Editor.Objects.Elements.Selected !== null) {
                    //for now the only thing that has multiple control locations is the Selected Element. hopefully this does not change.
                    var classes = document.getElementsByClassName("si_edit_style_" + styleobj.n);
                    for (let i = 0; i < classes.length; i++) {
                        classes[i].value = val;
                    }
                    ele = SI.Editor.Objects.Elements.Selected;
                }

                if (ele) {
                    ele.style.setProperty(styleobj.n, value, priority);
                    if (ele.closest('.si-block')) {
                        SI.Editor.Objects.Elements.MarkDirty(ele);
                        SI.Editor.Objects.Widgets.UpdatePlacement(ele);
                    }
                }

                //allow the user to pass in a OnChange function
                if (options.OnChange !== null) {
                    options.OnChange(val, styleobj.n);
                }

                //run the changed function and give it the property and value
                //  "Changed": function (prop, val) { console.log('Changed ' + prop + " to " + val) },
               // options.Changed(styleobj.n, val);
            };

            var DeleteStyle = function () {
                //debugger;
                //remove the value in the input field 
                let topfield = document.getElementById("si_edit_style_" + styleobj.n + "_" + RandId);
                topfield.value = "";
                topfield.setCustomValidity('');


                let inputs = topfield.parentElement.querySelectorAll('input');
                for (let clear of inputs) {
                    if (clear.type) {
                        switch (clear.type) {
                            case "text": clear.value = ""; break;
                            case "range": clear.value = '1'; break;
                            case "color": clear.value = '#000000'; break;
                        }
                    } else {
                        clear.value = '';
                    }

                }

                if (options.Affected && options.Affected.toLowerCase() !== 'none') {
                    let ele = document.querySelector(options.Affected);
                    if (ele) {
                        ele.style.removeProperty(styleobj.n);
                    }
                }
                ///     else if (options.OnChange != null) {
                //        options.OnChange(val);
                //     }
                else if (!options.Affected && SI.Editor.Objects.Elements.Selected !== null) {
                    //for now the only thing that has multiple control locations is the Selected Element. hopefully this does not change.
                    var classes = document.getElementsByClassName("si_edit_style_" + styleobj.n);
                    for (let i = 0; i < classes.length; i++) {
                        classes[i].value = null;
                    }
                    SI.Editor.Objects.Elements.Selected.style.removeProperty(styleobj.n);
                    SI.Editor.Objects.Elements.MarkDirty(SI.Editor.Objects.Elements.Selected);
                }
                if (options.Removable) {
                    cssrow.remove();
                }
                if (options.OnChange !== null) options.OnChange('', styleobj.n);
            }

            //builder functions for creating UIs
            this.TIME = function () {
                var box = Ele('div', {
                    style: {
                        display: 'block',
                        width: '100%',
                        marginBottom: '-21px',
                    }
                });
                let input = Ele('input', {
                    id: "si_edit_style_time_input_" + styleobj.n + "_" + RandId,
                    class: "si-edit-style",
                    type: 'number',
                    min: '0',
                    style: {
                        width: '109px',
                        marginLeft: '-3px',
                        display: 'block',
                    },
                    appendTo: box,
                });
                let select = Ele('select', {
                    id: "si_edit_style_time_select_" + styleobj.n + "_" + RandId,
                    class: "si_edit_style",
                    style: {
                        height: '21px',
                        display: 'block',
                        position: 'relative',
                        top: '-21px',
                        left: '113px',
                        width: '57px',
                    },
                    appendTo: box,
                });
                let s = Ele('option', {
                    innerText: SI.Tools.Text.Editor('s'),
                    value: 's',
                    title: SI.Tools.Text.Editor('seconds'),
                    appendTo: select,
                });
                let ms = Ele('option', {
                    innerText: SI.Tools.Text.Editor('ms'),
                    value: 'ms',
                    title: SI.Tools.Text.Editor('milli seconds'),
                    appendTo: select,
                });
                input.onmouseup = input.onkeyup = select.onchange = function () {
                    let sel = document.getElementById("si_edit_style_time_select_" + styleobj.n + "_" + RandId);
                    let inp = document.getElementById("si_edit_style_time_input_" + styleobj.n + "_" + RandId);
                    let selected = sel.options[sel.selectedIndex].value;
                    let val = inp.value + selected;
                    AssignStyle(val);
                };

                return box;
            }
            this.LEN = function () {
                let box = Ele('div', {
                    style: {
                        width: '200px',
                    },
                });

                let input = Ele('input', {
                    id: "si_edit_style_len_input_" + styleobj.n + "_" + RandId,
                    class: "si-edit-style",
                    type: 'number',
                    style: {
                        float: 'left',
                        width: '100px',
                        marginTop: '1px',
                    },
                    appendTo: box,
                });
                let select = Ele('select', {
                    id: "si_edit_style_len_select_" + styleobj.n + "_" + RandId,
                    style: {
                        height: '21px',
                    },
                    appendTo: box,
                });
                input.onmouseup = input.onkeyup = select.onchange = function () {
                    let sel = document.getElementById("si_edit_style_len_select_" + styleobj.n + "_" + RandId);
                    let inp = document.getElementById("si_edit_style_len_input_" + styleobj.n + "_" + RandId);
                    let selected = sel.options[sel.selectedIndex].value;
                    if (inp.value.length > 0 && selected.length > 0) {
                        let val = inp.value + selected;
                        AssignStyle(val);
                    }
                };

                //Common Group 
                let commonGroup = Ele('optgroup', { label: "Common" });
                //px
                Ele('option', { innerText: SI.Tools.Text.Editor('px'), value: 'px', title: SI.Tools.Text.Editor('pixels'), appendTo: commonGroup });
                //%
                Ele('option', { innerText: '%', value: '%', title: SI.Tools.Text.Editor('percent'), appendTo: commonGroup });
                select.add(commonGroup);
                //Absolute Group
                let absoluteGroup = Ele('optgroup', { label: 'Absolute' });
                //cm
                Ele('option', { innerText: SI.Tools.Text.Editor('cm'), value: 'cm', title: SI.Tools.Text.Editor('centimeters'), appendTo: absoluteGroup });
                //mm
                Ele('option', { innerText: SI.Tools.Text.Editor('mm'), value: 'mm', title: SI.Tools.Text.Editor('millimeters'), appendTo: absoluteGroup });
                //inches
                Ele('option', { innerText: SI.Tools.Text.Editor('in'), value: 'in', title: SI.Tools.Text.Editor('inches'), appendTo: absoluteGroup });
                //pixels
                Ele('option', { innerText: SI.Tools.Text.Editor('px'), value: 'px', title: SI.Tools.Text.Editor('pixels'), appendTo: absoluteGroup });
                //points
                Ele('option', { innerText: SI.Tools.Text.Editor('pt'), value: 'pt', title: SI.Tools.Text.Editor('points'), appendTo: absoluteGroup });
                //picas
                Ele('option', { innerText: SI.Tools.Text.Editor('pc'), value: 'pc', title: SI.Tools.Text.Editor('picas'), appendTo: absoluteGroup });
                select.add(absoluteGroup);
                let relativeGroup = Ele('optgroup', { label: 'Relative' });
                //calculated font size
                Ele('option', { innerText: SI.Tools.Text.Editor('em'), value: 'em', title: SI.Tools.Text.Editor('calculated font size'), appendTo: relativeGroup });
                //x-height of the current font
                Ele('option', { innerText: SI.Tools.Text.Editor('ex'), value: 'ex', title: SI.Tools.Text.Editor('x-height of the current font'), appendTo: relativeGroup });
                //relative to the width of a zero
                Ele('option', { innerText: SI.Tools.Text.Editor('ch'), value: 'ch', title: SI.Tools.Text.Editor('relative to the width of a zero'), appendTo: relativeGroup });
                //oot element calculated font size
                Ele('option', { innerText: SI.Tools.Text.Editor('rem'), value: 'rem', title: SI.Tools.Text.Editor('root element calculated font size'), appendTo: relativeGroup });
                //percentage of viewport width
                Ele('option', { innerText: SI.Tools.Text.Editor('vw'), value: 'vw', title: SI.Tools.Text.Editor('percentage of viewport width'), appendTo: relativeGroup });
                //percentage of viewport height
                Ele('option', { innerText: SI.Tools.Text.Editor('vh'), value: 'vh', title: SI.Tools.Text.Editor('ppercentage of viewport height'), appendTo: relativeGroup });
                //1% ot the viewports small demension
                Ele('option', { innerText: SI.Tools.Text.Editor('vmin'), value: 'vmin', title: SI.Tools.Text.Editor('1% ot the viewports small demension'), appendTo: relativeGroup });
                //1% ot the viewports larger demension
                Ele('option', { innerText: SI.Tools.Text.Editor('vmax'), value: 'vmax', title: SI.Tools.Text.Editor('1% ot the viewports larger demension'), appendTo: relativeGroup, });
                select.add(relativeGroup);
                return box;
            }
            this.NUM = function () {
                var box = Ele('div', {});
                let input = Ele('input', {
                    type: 'number',
                    onclick: function () {
                        AssignStyle(this.value);
                    },
                    onmouseup: function () {
                        AssignStyle(this.value);
                    },
                    appendTo: box
                });
                return box;
            }
            this.COLOR = function () {
                this.css_value.onmouseenter = function () {
                    //debugger;
                    nowVal = this.value.trim();
                    if (nowVal) {
                        if (nowVal.indexOf("rgba(")) {
                            let color = SI.Tools.Color.ParseToHex(this.value);
                            document.getElementById("si_edit_style_color_" + styleobj.n + "_" + RandId).value = color;
                            let opacity = SI.Tools.Color.ParseOpacity(this.value);
                            document.getElementById("si_edit_style_color_range_" + styleobj.n + "_" + RandId).value = opacity;
                        } else if (nowVal.indexOf("rgb(")) {
                            let color = SI.Tools.Color.ParseToHex(this.value);
                            document.getElementById("si_edit_style_color_" + styleobj.n + "_" + RandId).value = color;
                        } else {
                            document.getElementById("si_edit_style_color_name_" + styleobj.n + "_" + RandId).value = color;
                        }
                    }
                };

                var box = document.createElement('div');
                var input = Ele("input", {
                    id: "si_edit_style_color_" + styleobj.n + "_" + RandId,
                    class: "si-edit-style-" + styleobj.n,
                    type: "color",
                    style: {
                        marginRight: "10px",
                    },
                    onchange: function () {
                        //debugger;
                        document.getElementById("si_edit_style_color_name_" + styleobj.n + "_" + RandId).selectedIndex = "0";
                        var rgb = SI.Tools.Color.HexToRgb(this.value);
                        var opacity = document.getElementById("si_edit_style_color_range_" + styleobj.n + "_" + RandId).value;
                        AssignStyle('rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')');
                    },
                    appendTo: box,
                });
                var range = Ele("input", {
                    id: "si_edit_style_color_range_" + styleobj.n + "_" + RandId,
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: .001,
                    value: 1,
                    style: {
                        width: '90px',
                    },
                    onchange: function (e) {
                        var rgb = SI.Tools.Color.HexToRgb(document.getElementById("si_edit_style_color_" + styleobj.n + "_" + RandId).value);
                        var opacity = this.value;
                        AssignStyle('rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + opacity + ')');
                        e.stopPropagation();
                        return;
                    },
                    appendTo: box,
                });
                var colornames = Ele("select", {
                    id: "si_edit_style_color_name_" + styleobj.n + "_" + RandId,
                    style: {
                        width: '120px',
                    },
                    innerHTML: SI.Editor.Data.OptionSets.CSS.Colors,
                    onchange: function () {
                        //debugger;
                        var colorname = document.getElementById("si_edit_style_color_name_" + styleobj.n + "_" + RandId).value;
                        document.getElementById("si_edit_style_color_" + styleobj.n + "_" + RandId).value = '';
                        document.getElementById("si_edit_style_color_range_" + styleobj.n + "_" + RandId).value = 1;
                        AssignStyle(this.value);
                    },
                    appendTo: box,
                });


                return box;
            }
            this.SCALAR = function () {
                var box = Ele('div', {});

                let range = Ele('input', {
                    id: "si_edit_style_scalar_" + styleobj.n + "_" + RandId,
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: .001,
                    value: 1,
                    style: {
                        width: '150px',
                    },
                    oninput: function (e) {
                        AssignStyle(this.value);
                    },
                });

                box.appendChild(range);
                return box;
            }
            this.URL = function () {
                var box = Ele('div', {});
                let url = Ele('input', {
                    id: "si_edit_style_url_" + styleobj.n + "_" + RandId,
                    type: "lookup",
                    data: {
                        type: "media"
                    },
                    placeholder: SI.Tools.Text.Editor('url'),
                    style: {
                        color: 'blue',
                        width: '150px',
                    },
                    oninput: function () {
                        AssignStyle(SI.Tools.GetMediaFilePath(this.value, true));
                    },
                    appendTo: box,
                });
                return box;
            }
            this.FONTFAM = function () {
                //debugger;
                var box = Ele('div', {});

                let fontfamilies = Ele("select", {
                    onchange: function () {
                        //debugger;
                        AssignStyle(this.value);
                    },
                    appendTo: box,
                });
                let serif = Ele("optgroup", { label: "Serif Fonts", appendTo: fontfamilies });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Georgia, serif"), appendTo: serif });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Palatino Linotype, Book Antiqua,Palatino,serif"), appendTo: serif });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Times New Roman, Times, serif"), appendTo: serif });
                let sans = Ele("optgroup", { label: "Sans-Serif Fonts", appendTo: fontfamilies });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Arial, Helvetica, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Arial Black, Gadget, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Comic Sans MS, cursive, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Impact, Charcoal, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Lucida Sans Unicode, Lucida Grande, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Tahoma, Geneva, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Trebuchet MS, Helvetica, sans-serif"), appendTo: sans });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Verdana, Geneva, sans-serif"), appendTo: sans });
                let mono = Ele("optgroup", { label: "Monospace Fonts", appendTo: fontfamilies });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Courier New, Courier, monospace"), appendTo: mono });
                Ele("option", { innerHTML: SI.Tools.Text.Editor("Lucida Console, Monaco, monospace"), appendTo: mono });

                return box;
            }
            this.KEYFRAMENAMES = function () {          
                var box = Ele('div', {});
                let keyframenames = Ele("input", {
                    id: "si_edit_style_keyframename_" + styleobj.n + "_" + RandId,
                    
                    onchange: function () {
                        AssignStyle(this.value);
                    },
                    appendTo: box,
                });
                keyframenames.setAttribute('list', "si_edit_style_keyframenamelist_" + styleobj.n + "_" + RandId);
                let datalist = Ele("datalist", {
                    id: "si_edit_style_keyframenamelist_" + styleobj.n + "_" + RandId,
                    appendTo: box
                });
                function getAllKeyframeNames() {

                    names = SI.Editor.Data.DataLists.AnimationNames;
                    for (let name of names) {
                        Ele("option", {
                            value: name,
                            appendTo: datalist
                        });
                    }

                }
                getAllKeyframeNames();
                return box;
            }
            //function to build the caller for the above builder functions
            this.BuildFunction = function (func, color = null) {

                if (typeof func !== 'undefined') {
                    let val = null;
                    if (typeof this[func] === 'function') {
                        val = this[func]();
                    }
                    let row = document.createElement('tr');
                    //  if (label) {
                    //      Ele('td');
                    //   }
                    let data = document.createElement('td');

                    if (val !== null) {
                        data.appendChild(val);
                    } else {
                        data.innerHTML = func;
                    }
                    if (color) {
                        data.style.backgroundColor = color;
                        row.style.backgroundColor = color;
                    }
                    row.appendChild(data);
                    return row;
                }
            }

            this.BuildOptionset = function (optionset, color=null) {
                let stylize = ['cursor'];

                for (let i in optionset) {
                    let opt = optionset[i];
                    let row = document.createElement('tr');
                    let data = document.createElement('td');
                    if (color) {
                        data.style.backgroundColor = color;
                    }
                    if (SI.Tools.String.IsUpperCase(opt)) {
                        row = this.BuildFunction(opt,color);
                    } else {
                        data.innerHTML = opt;
                        data.onclick = function () {
                            AssignStyle(this.innerHTML);
                        }
                        row.appendChild(data);
                    }
                    if (stylize.indexOf(styleobj.n) !== -1) {
                        row.style[styleobj.n] = opt;

                    }
                    this.css_table.appendChild(row);
                }
            }
            //assign the correct builder function to make the user interface for this control type
            //if a single build function is needed...
            //if (styleobj.t === 'P') {

            // if  (SI.Tools.String.IsUpperCase(styleobj.v) && styleobj.v.indexOf('(') === -1) {

            //Process the normal Properties.
            if (styleobj.t === 'P') {
                //at this point if we have a ( then we have an optionset. if not it is a normal property
                if (styleobj.v.indexOf('(') === -1) {
                    this.css_table.appendChild(this.BuildFunction(styleobj.v));
                } else {
                    let choices = styleobj.v.replace('OS(').replace('undefined', '');
                    choices = SI.Tools.String.TrimR(choices, ')');
                    if (choices !== undefined) {
                        let optionset = choices.split('|');
                        this.BuildOptionset(optionset);
                    }
                }

            }
            else if (styleobj.t === 'SH') { //if we have an optionset full of build options...
                let val = SI.Tools.String.TrimR(styleobj.v.replace('SH(', ''), ")");
                let psv = val.split("|");
                let row = Ele('tr', {});
                let data = Ele('td', {
                    appendTo: row,
                });

                let shorthandBox = Ele('table', {
                    appendTo: data
                });
                for (let i = 0; i < psv.length; i++) {
                    let color = SI.Tools.Color.Random(0.1); 
                    let prop = psv[i];
                    if (prop === 'LEN' || prop === 'NUM') {
                        //debugger;
                    }
                    let s = SI.Editor.Data.Tools.GetStyleByName(prop);
                    if (typeof s !== 'undefined') {
                        let sh;
                        if (s.v.indexOf('OS(') === -1) {
                       
                            sh = this.BuildFunction(s.v, color);
                            this.css_table.appendChild(sh);
                        } else {
                            let os = SI.Tools.String.TrimR(s.v.replace('OS(', ''), ")");
                            let osa = os.split("|");
                     
                            this.BuildOptionset(osa,color);
                        }

                    } else {
                        SI.Tools.Warn("Style: " + prop + " not obtainable from SI.Editor.Data.Tools.GetStyleByName()");
                    }


                    //  let val = SI.Editor.Data.css_properties.
                    //  shorthandBox.appendChild(stylerow);
                }
                //   this.css_table.appendChild(row);

                this.css_value.readOnly = false;
            }


            //Global CSS  aka Initial & Inherit
            var inheritRow = Ele('tr', {
                appendTo: this.css_table,
                append: Ele('td', {
                    innerText: SI.Tools.Text.Editor('inherit'),
                    onclick: function () {
                        AssignStyle('inherit');
                    }
                })
            });
            var initialRow = Ele('tr', {
                appendTo: this.css_table,
                append: Ele('td', {
                    innerText: SI.Tools.Text.Editor('initial'),
                    onclick: function () {
                        AssignStyle('initial');
                    }
                })
            });

            //add the quick help text
            let styledescriptionbox = Ele('td', {
                innerHTML: "?",
                title: styleobj.d,
                class: 'help si-edit-property-help',
                appendTo: cssrow
            });

            //debugger;


            SI.Editor.Objects.Settings.Help.Show("styles", styleobj, cssrow);


            if (options.ReturnTag !== 'TR') {
                var e = document.getElementsByTagName('span')[0];

                var d = document.createElement('div');
                d.innerHTML = e.innerHTML;

                e.parentNode.replaceChild(d, e);


                let csstable = Ele("table", {
                    append: cssrow,
                });

                return Ele(options.ReturnTag, {
                    append: csstable,
                });

            }


            return cssrow;

        },
    },
}
