if (!SI) { var SI = {}; }
if (!SI.Editor) { SI.Editor = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }

SI.Editor.Objects.Elements = {
    //Loops through all elements and makes them editable 
    Init: function () {
        document.querySelectorAll('*').forEach(function (node) {
            let tn = node.tagName;
            let excludedElements = ['HEAD', 'BODY', 'HTML'];
            if (excludedElements.indexOf(tn) === -1) {
                if (!node.classList.contains("si-block") && !node.classList.contains("si-deployment-control"))
                    node = SI.Editor.Objects.Elements.Editable(node);
            }
        });
    },
    //Completely removes an element
    Remove: function (ele) {
        if (ele !== null) {
            ele.parentElement.removeChild(ele);
            SI.Editor.UI.EditPanel.Clear.Attributes();
            SI.Editor.UI.EditPanel.Clear.Styles();
        } else {
            console.log("Nothing To Delete!");
        }
    },
    //A list of all of the editable elements ids.
    HeadIds: [],
    Ids: [],
    //A list of all of the unique classes
    Classes: [],
    //Holds the currently selected element type=element
    Selected: null,
    //Removes selection from all elements.
    SelectNone: function () {
        //debugger;
        var selecteds = document.getElementsByClassName("si-editor-selected");
        if (selecteds.length > 0) {
            for (node in selecteds) {
                let ele = selecteds[node];
                if (SI.Tools.Is.Element(ele)) {
                    //remove its selected events
                    // ele.removeEventListener('dragenter', SI.Editor.Objects.Elements.MakeDropParent);
                    //  ele.removeEventListener('dragstart', SI.Editor.Objects.Elements.MoveStart);
                    //  ele.removeEventListener('dragend', SI.Editor.Objects.Elements.MoveEnd);
                    //remove/replace any styles or attributes that make this selected
                    if (typeof ele.classList !== 'undefined' && ele.classList.contains("si-editor-selected")) {
                        ele.classList.remove("si-editor-selected");
                        // Cycle over each attribute on the element
                        for (var i = 0; i < ele.attributes.length; i++) {
                            // Store reference to current attr
                            attr = ele.attributes[i];
                            // If attribute nodeName starts with 'data-'
                            if (attr.nodeName.startsWith('data-si')) {
                                // Log its name (minus the 'data-' part), and its value
                                if (attr.nodeName.startsWith('data-sistyle_')) {
                                    let prop = attr.nodeName.replace('data-sistyle_', '');
                                    if (attr.nodeValue === 'null') {
                                        ele.style[prop] = "";
                                    } else {
                                        ele.style[prop] = attr.nodeValue;
                                    }
                                    ele.removeAttribute(attr.nodeName);
                                    //Compinsate for the removed attribute in the for loop to get the next one
                                    i--;
                                }
                                else if (attr.nodeName.startsWith('data-siattr_')) {
                                    let attribute = attr.nodeName.replace('data-siattr_', '');
                                    if (attr.nodeValue !== 'null') {
                                        ele.setAttribute(attribute, attr.nodeValue);
                                    } else {
                                        ele.removeAttribute(attribute);
                                    }
                                    ele.removeAttribute(attr.nodeName);
                                    i--;
                                }
                            }
                        }
                    }
                }
            };
        }
        SI.Editor.Objects.Elements.Selected = null;
    },
    //Selects a single element.
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
        if (self.classList && self.classList.contains('si-block') || self.classList.contains('si-deployment-control')) {
            return; //we dont select blocks
        }

        //if it is already selected, then unselect it and hide the edit window.
        if (self.classList && self.classList.contains('si-editor-selected')) {
            SI.Editor.Objects.Elements.SelectNone();
            document.getElementById('si_edit_edit_menuitem').style.display = 'none'; //hide the edit menu
            return;
        }

        //unselect everything before we select the new element.
        SI.Editor.Objects.Elements.SelectNone();

        //In the edit menu setup all self elements styles and attributes.
        SI.Editor.UI.EditPanel.SetSelectedElementValues(self);

        //Add whatever we need to make self Selected
        //since were comindering the box shadow for selection we should keep a copy of/if there is a set one
        if (typeof self.style.boxShadow.length > 0) {
            self.setAttribute('data-sistyle_box-shadow', self.style.boxShadow);
        } else {
            self.setAttribute('data-sistyle_box-shadow', null);
        }
        self.style.boxShadow = '0px 0px 20px 1px rgba(255, 255, 0, 0.3), inset 0px 0px 20px 1px rgba(255, 255, 0, 0.3)';

        //all selected elements are draggable, and turned off when unselected. But what if it is supposed to be draggable? it should not turn off. store it. 
        if (typeof self.draggable.length > 0) {
            self.setAttribute('data-siattr_draggable', self.draggable);
        } else {
            self.setAttribute('data-siattr_draggable', null);
        }
        self.draggable = true;

        self.addEventListener('dragenter', SI.Editor.Objects.Elements.MakeDropParent);
        self.addEventListener('dragstart', SI.Editor.Objects.Elements.MoveStart);
        self.addEventListener('dragend', SI.Editor.Objects.Elements.MoveEnd);

        //give it the selected class
        self.classList.add('si-editor-selected');

        //show it in the hud
        document.getElementById("si_edit_hud_selectedelement").innerHTML = self.id;

        //Lastly make the global Selected element be self one.
        SI.Editor.Objects.Elements.Selected = self;

        //Select the block that is parent to the element
        let block = SI.Tools.Element.GetBlock(self);
        if (block) {
            SI.Editor.Objects.Blocks.Select(block.id);
        }


        if (typeof ev !== 'undefined') {
            ev.stopPropagation();
        }

    },
    //Makes a simple element into a editable element
    Editable: function (ele) {
        //debugger;
        if (typeof ele !== "undefined") {
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
        //debugger;
        var selected = SI.Editor.Objects.Elements.Selected;
        if (selected) {
            if (typeof selected.style.position === 'undefined' || selected.style.position === 'static') {
                alert(SI.Editor.Objects.Alerts.StaticMove);
            }
            let oldx = parseInt(selected.style.left);
            let oldy = parseInt(selected.style.top);
            selected.style.left = (oldx + x) + 'px';
            selected.style.top = (oldy + y) + 'px';
        }
    },
    //Sets the start info when dragging starts
    MoveStart: function (ev) {
        let style = window.getComputedStyle(this);
        //debugger;
        if (!style.position || style.position === 'static') {
            alert(SI.Editor.Objects.Alert.StaticMove);
        }
        else {
            if (SI.Editor.Objects.Elements.Selected !== null && SI.Editor.Objects.Elements.Selected.id === this.id) {
                //make the drop Parent this parent to avoid ambiguity;
                SI.Editor.Objects.Elements.MakeDropParent(this.parentElement);
                //debugger;
                this.dataset.offsetparent = this.offsetParent;
                this.dataset.parentid = this.parentElement.id;
                this.dataset.mOffX = ev.offsetX;
                this.dataset.mOffY = ev.offsetY;

                document.getElementById("si_edit_hud_draggingelement").innerHTML = this.id;
                if (this.offsetParent === document.body) {
                    document.getElementById("si_edit_hud_offsetparent").innerHTML = 'body';
                } else {
                    document.getElementById("si_edit_hud_offsetparent").innerHTML = this.offsetParent.id;
                }
                document.getElementById("si_edit_hud_parentid").innerHTML = this.parentElement.id;
                document.getElementById("si_edit_hud_offsetx").innerHTML = ev.offsetX;
                document.getElementById("si_edit_hud_offsety").innerHTML = ev.offsetY;
            }
        }
        if (ev.stopPropagation)
            ev.stopPropagation();
    },
    //Sets the position when the move ends. NEEDS WORK
    MoveEnd: function (ev) {
        //this.style.display = 'initial';
        if (SI.Editor.Objects.Elements.Selected !== null && SI.Editor.Objects.Elements.Selected.id === this.id) {
            //debugger;
            let self = this;
            let x = ev.pageX;
            let y = ev.pageY;

            if (SI.Editor.Objects.Elements.DropParent.id === self.id) {
                SI.Editor.Objects.Elements.DropParent.id = self.parentElement.id;
            }

            let dropOffset = SI.Tools.Element.GetTotalOffset(SI.Editor.Objects.Elements.DropParent);

            let ol = dropOffset.left;
            let ot = dropOffset.top;

            if (SI.Editor.Objects.Elements.DropParent.id !== self.parentElement.id) {
                SI.Editor.Objects.Elements.DropParent.appendChild(self);
            }

            self.style.left = x - ol - self.dataset.mOffX + 'px';
            self.style.top = y - ot - self.dataset.mOffY + 'px';

            //clean all this up
            self.removeAttribute('data-offsetParent');
            self.removeAttribute('data-parentid');
            self.removeAttribute('data-mOffX');
            self.removeAttribute('data-mOffY');

            //var x = (evt.pageX - $('#element').offset().left) + self.frame.scrollLeft();
            //var y = (evt.pageY - $('#element').offset().top) + self.frame.scrollTop();
        }
        if (ev.stopPropagation)
            ev.stopPropagation();
    },
    //Sets the parent of the element while being moved
    MakeDropParent: function (ev, self) {
        self = (typeof self === 'undefined') ? this : self;
        if (SI.Tools.Is.Element(self)) {
            SI.Editor.Objects.Elements.DropParent = self;

            document.getElementById("si_edit_hud_dropparent").innerHTML = self.id;

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
                "Effected": null,
                "AccessClass": null,
                "Preserve": false
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
                        //without a group name we cannot guarrentee the correct attr. ex If its for a video the audio one may be selected? 
                        a = SI.Editor.Data.Tools.GetAttributeByName(options.Property);
                    } else {
                        //if we dont have an index but do have a group name, guarentee the correct attr
                        a = SI.Editor.Data.Tools.GetAttributeByName(options.Property, options.Group);
                    }

                    options.Group = a.group;
                    options.Index = a.index;
                }
            }

            let attrobj = SI.Editor.Data.html_attributes[options.Group][options.Index];
            let attrrow = document.createElement('tr');

            let getEffected = function () {
                let ele = null;
                if (options.Effected) {
                    if (options.Effected.toLowerCase() === "none") {
                        ele = null;
                    } else {
                        ele = document.querySelector(options.Effected);
                    }
                } else {
                    ele = SI.Editor.Objects.Elements.Selected;
                }
                return ele;
            }
            //The Attribute label
            let attrdata = Ele('td', {
                class: 'si-attribute-selection',
                innerHTML: attrobj.n,
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    borderBottom: 'solid 1px ' + SI.Editor.Style.TextColor,
                    paddingLeft: '10px',
                },
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
                    if (options.Effected) {
                        if (options.Effected.toLowerCase() === "none") {
                            ele = null;
                        } else {
                            ele = document.querySelector(options.Effected);
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
                attrInput.style.height = '16px';
                attrInput.placeholder = 'Javascript';
                // if (effectid) { attrInput.setAttribute("data-effectid", effectid); }
                attrInput.onchange = function (e) {
                    let ele = getEffected();
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
            else if (attrobj.dt === 'INNERHTML') {
                if (!SI.Tools.Is.EmptyElement(attrobj.n)) {
                    attrInput = Ele('textarea', {
                        style: {
                            width: '229px',
                            height: '57px',
                        },
                        onkeyup: function (e) {
                            let ele = getEffected();
                            let text = this.value;
                            if (text.length > 0) {
                                SI.Editor.Objects.Elements.Selected.innerHTML = text;
                            } else {
                                SI.Editor.Objects.Elements.Selected.innerHTML = "";
                            }
                        }
                    });
                }
            }
            else if (attrobj.dt === 'INNERTEXT') {
                if (!SI.Tools.Is.EmptyElement(attrobj.n)) {
                    attrInput = Ele('textarea', {
                        style: {
                            width: '229px',
                            height: '57px',
                        },
                        onkeyup: function (e) {
                            let ele = getEffected();
                            let text = this.value;
                            if (text.length > 0) {
                                ele.innerText = text;
                            } else {
                                ele.innerText = "";
                            }

                        }
                    });

                }
            }
            else if (attrobj.dt === 'TEXT') {
                attrInput = document.createElement('input');
                attrInput.onkeyup = function (e) {
                    let ele = getEffected();
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
                    let ele = getEffected();
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
                    let ele = getEffected();
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
                    //debugger;
                    let ele = getEffected();
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
                    let ele = getEffected();
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
                                alert("That id is already in use");
                                this.value = ele.tagName.toLowerCase() + "_" + SI.Tools.String.RandomString(7);
                            }
                        }
                    }
                };
                attrInput.onmouseover = function () {
                    let ele = null;
                    if (options.Effected) {
                        ele = document.querySelector(options.Effected);
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
                        if (options.Effected) {
                            if (options.Effected.toLowerCase() === "none") {
                                ele = null;
                            } else {
                                ele = document.querySelector(options.Effected);
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
                        let ele = getEffected();
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
                    innerText: "data-",
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
                        let ele = getEffected();
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
                    let ele = getEffected();
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
                    placeholder: 'char',
                    maxLength: "1",
                    style: {
                        width: '26px',
                    },
                    onkeyup: function (e) {
                        let ele = getEffected();
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
                attrInput.placeholder = 'True or False';
                let optN = document.createElement('option');
                optN.innerText = '';
                let optT = document.createElement('option');
                optT.innerText = 'True';
                let optF = document.createElement('option');
                optF.innerText = 'False';

                attrInput.appendChild(optN);
                attrInput.appendChild(optT);
                attrInput.appendChild(optF);

                attrInput.onchange = function (e) {
                    let ele = getEffected();
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
                attrInput.placeholder = 'On or Off';
               let optN = document.createElement('option');
                optN.innerText = '';
               let optT = document.createElement('option');
                optT.innerText = 'on';
               let optF = document.createElement('option');
                optF.innerText = 'off';

                attrInput.appendChild(optN);
                attrInput.appendChild(optT);
                attrInput.appendChild(optF);

                attrInput.onchange = function (e) {
                    let ele = getEffected();
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
                attrInput.placeholder = 'Language';
                let blank = document.createElement('option');
                blank.innerText = '';
                attrInput.appendChild(blank);
                attrInput.innerHTML += SI.Editor.Data.OptionSets.Language.All;
                attrInput.onchange = function (e) {
                    let ele = getEffected();
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
                for (var i = 0; i < myoptions.length; i++) {
                    let option = document.createElement('option');
                    option.innerHTML = myoptions[i];
                    attrInput.appendChild(option);
                }
                attrInput.onchange = function () {
                    let ele = getEffected();
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
            attrInput.classList.add("si-edit-attribute");   //to clear all the attrs
            attrInput.classList.add("si-edit-attribute-" + options.Group + "-" + attrobj.n); //to set the field
            attrInput.setAttribute("data-si-preserve", options.Preserve);
            attrInput.id = "si_edit_attribute_" + options.Group + "_" + attrobj.n + "_" + RandId;


           let attroptionbox = Ele('td', {
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                },
                append: attrInput,
                appendTo: attrrow,
            });
            //Help text ? hover
           let attrdescriptionbox = Ele('td', {
                innerHTML: "?",
                title: attrobj.d,
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    cursor: 'help',
                },
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
                "Effected": null,
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
                let unsupportedRow = Ele("tr", {});
                let unsupportedstyle = Ele("td", { innerHTML: options.Property, appendTo: unsupportedRow });
                let unsupportedtext = Ele("tr", { innerHTML: "is not supported yet", appendTo: unsupportedRow });
                return unsupportedRow;
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

            //set the Effected Element 
            //The Row to be returned. 
            let cssrow = Ele('tr', {
                draggable: options.Draggable,
                class: "si-edit-style-propertyrow",
                style: {
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    width: '90%'
                }
            });
            //if (styleobj.a) {
            //    cssrow.classList.add("si-edit-style-animatable");
            //}
            //add the label
            let csslabel = Ele('td', {
                class: "si-edit-style-propertyname",
                innerHTML: styleobj.n,
                style: {
                    borderBottom: 'solid 1px gray',
                    paddingLeft: '10px',
                    color: SI.Editor.Style.TextColor,
                    textShadow: "1px 2px #000000",
                },
                appendTo: cssrow,
            });
            var container = document.createElement('div');
            //add the user interface
            let styleoptionbox = Ele('td', {
                append: container,
                appendTo: cssrow,
            });

            //BUILD THE SELECTOR
            //The first thing is the input that shows the selected value.
            this.css_value = Ele('input', {
                id: "si_edit_style_" + styleobj.n + "_" + RandId,
                class: "si-edit-style-propertyvalue",
                readOnly: true,
                value: options.InitialValue,
                style: {
                    width: '80%'
                },
                data: {
                    "si-animatable": styleobj.a,
                    "si-style-prop": styleobj.n,
                    "si-preserve": options.Preserve
                },
                onclick: function (e) {
                    //debugger;
                    if (options.Effected) { };
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

            if (options.Effected === null) {
                this.css_value.classList.add("si-edit-style");
                this.css_value.classList.add("si-edit-style-" + styleobj.n);
            }
            if (options.AccessClass) {
                this.css_value.classList.add(options.AccessClass);
            }

            this.css_value_clear = Ele('button', {
                id: "si_edit_style_clear_" + styleobj.n + "_" + RandId,
                style: {
                    backgroundImage: "url('/editor/media/icons/eraser.png')",
                    backgroundPosition: 'center',
                    width: '21px',
                    height: '21px',
                    position: 'relative',
                    top: '1px',
                    float: 'right',
                    marginLeft: '3px',
                    backgroundSize: 'cover',
                    display: 'inline-block',
                },
                onclick: function () {
                    DeleteStyle();
                },
                appendTo: container,
            });
            this.css_table = Ele('table', {
                id: "si_edit_style_table_" + styleobj.n + "_" + RandId,
                style: {
                    borderCollapse: 'collapse',
                    backgroundColor: SI.Editor.Style.BackgroundColor,
                    width: '160px',
                    display: 'none',
                },
                appendTo: container,
            });

            var AssignStyle = function (val,shnum=null) {
                //debugger;
                val = val.trim();
                //sets the values of the read only input
                document.getElementById("si_edit_style_" + styleobj.n + "_" + RandId).value = val;
                let ele = null;
                //if we have a Effected elementis selector
                if(options.Effected) {
                    if (options.Effected.toLowerCase() !== 'none') { //if it is none, than ignore it. it will stay null and do nothing on change. needed for styler 
                        ele = document.querySelector(options.Effected); //if not, use it as a css qurey selector to the the effected
                        if (ele) {
                            ele.style[SI.Tools.CssProp2JsKey(styleobj.n)] = val;
                        }
                    }
                }
                else if (SI.Editor.Objects.Elements.Selected !== null) {
                    //for now the only thing that has multiple control locations is the Selected Element. hopefully this does not change.
                    var classes = document.getElementsByClassName("si_edit_style_" + styleobj.n);
                    for (var i = 0; i < classes.length; i++) {
                        classes[i].value = val;
                    }
                    ele = SI.Editor.Objects.Elements.Selected;
                }

                if (ele) {
                    ele.style[SI.Tools.CssProp2JsKey(styleobj.n)] = val;
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

                if (options.Effected) {
                    let ele = document.querySelector(options.Effected);
                    if (ele) {
                        ele.style[Tools.CssProp2JsKey(styleobj.n)] = null;
                    }
                }
                ///     else if (options.OnChange != null) {
                //        options.OnChange(val);
                //     }
                else if (SI.Editor.Objects.Elements.Selected != null) {
                    //for now the only thing that has multiple control locations is the Selected Element. hopefully this does not change.
                    var classes = document.getElementsByClassName("si_edit_style_" + styleobj.n);
                    for (var i = 0; i < classes.length; i++) {
                        classes[i].value = null;
                    }
                    SI.Editor.Objects.Elements.Selected.style[SI.Tools.CssProp2JsKey(styleobj.n)] = null;
                }
                if (options.Removable) {
                    //debugger;
                    topfield.parentElement.parentElement.parentElement.parentElement.removeChild(topfield.parentElement.parentElement.parentElement);
                }
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
                    innerText: 's',
                    value: 's',
                    title: 'seconds',
                    appendTo: select,
                });
                let ms = Ele('option', {
                    innerText: 'ms',
                    value: 'ms',
                    title: 'milli seconds',
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
                Ele('option', { innerText: 'px', value: 'px', title: 'pixels', appendTo: commonGroup });
                //%
                Ele('option', { innerText: '%', value: '%', title: 'percent', appendTo: commonGroup });
                select.add(commonGroup);
                //Absolute Group
                let absoluteGroup = Ele('optgroup', { label: 'Absolute' });
                //cm
                Ele('option', { innerText: 'cm', value: 'cm', title: 'centimeters', appendTo: absoluteGroup });
                //mm
                Ele('option', { innerText: 'mm', value: 'mm', title: 'millimeters', appendTo: absoluteGroup });
                //inches
                Ele('option', { innerText: 'in', value: 'in', title: 'inches', appendTo: absoluteGroup });
                //pixels
                Ele('option', { innerText: 'px', value: 'px', title: 'pixels', appendTo: absoluteGroup });
                //points
                Ele('option', { innerText: 'pt', value: 'pt', title: 'points', appendTo: absoluteGroup });
                //picas
                Ele('option', { innerText: 'pc', value: 'pc', title: 'picas', appendTo: absoluteGroup });
                select.add(absoluteGroup);
                let relativeGroup = Ele('optgroup', { label: 'Relative' });
                //calculated font size
                Ele('option', { innerText: 'em', value: 'em', title: 'calculated font size', appendTo: relativeGroup });
                //x-height of the current font
                Ele('option', { innerText: 'ex', value: 'ex', title: 'x-height of the current font', appendTo: relativeGroup });
                //relative to the width of a zero
                Ele('option', { innerText: 'ch', value: 'ch', title: 'relative to the width of a zero', appendTo: relativeGroup });
                //oot element calculated font size
                Ele('option', { innerText: 'rem', value: 'rem', title: 'root element calculated font size', appendTo: relativeGroup });
                //percentage of viewport width
                Ele('option', { innerText: 'vw', value: 'vw', title: 'percentage of viewport width', appendTo: relativeGroup });
                //percentage of viewport height
                Ele('option', { innerText: 'vh', value: 'vh', title: 'ppercentage of viewport height', appendTo: relativeGroup });
                //1% ot the viewports small demension
                Ele('option', { innerText: 'vmin', value: 'vmin', title: '1% ot the viewports small demension', appendTo: relativeGroup });
                //1% ot the viewports larger demension
                Ele('option', { innerText: 'vmax', value: 'vmax', title: '1% ot the viewports larger demension', appendTo: relativeGroup, });
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
                    type: 'url',
                    placeholder: 'url',
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
                Ele("option", { innerHTML: "Georgia, serif", appendTo: serif });
                Ele("option", { innerHTML: "Palatino Linotype, Book Antiqua,Palatino,serif", appendTo: serif });
                Ele("option", { innerHTML: "Times New Roman, Times, serif", appendTo: serif });
                let sans = Ele("optgroup", { label: "Sans-Serif Fonts", appendTo: fontfamilies });
                Ele("option", { innerHTML: "Arial, Helvetica, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Arial Black, Gadget, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Comic Sans MS, cursive, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Impact, Charcoal, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Lucida Sans Unicode, Lucida Grande, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Tahoma, Geneva, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Trebuchet MS, Helvetica, sans-serif", appendTo: sans });
                Ele("option", { innerHTML: "Verdana, Geneva, sans-serif", appendTo: sans });
                let mono = Ele("optgroup", { label: "Monospace Fonts", appendTo: fontfamilies });
                Ele("option", { innerHTML: "Courier New, Courier, monospace", appendTo: mono });
                Ele("option", { innerHTML: "Lucida Console, Monaco, monospace", appendTo: mono });

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
                    for (name of names) {
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
                for (i = 0; i < psv.length; i++) {
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
                        console.warn("Style: " + prop + " not obtainable from SI.Editor.Data.Tools.GetStyleByName()");
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
                    innerText: 'inherit',
                    onclick: function () {
                        AssignStyle('inherit');
                    }
                })
            });
            var initialRow = Ele('tr', {
                appendTo: this.css_table,
                append: Ele('td', {
                    innerText: 'initial',
                    onclick: function () {
                        AssignStyle('initial');
                    }
                })
            });

            //add the quick help text
            let styledescriptionbox = Ele('td', {
                innerHTML: "?",
                title: styleobj.d,
                class: 'help',
                style: {
                    cursor: 'help'
                },
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

        }
    },
}