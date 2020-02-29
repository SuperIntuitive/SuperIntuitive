if (!SI) { var SI = {}; }
if (!SI.Editor) { SI.Editor = {}; }
if (!SI.Editor.Objects) { SI.Editor.Objects = {}; }


SI.Editor.Objects.Security = {
    Draw: function () {
        let base = Ele('div', {
            id: "si_edit_security_base",
            style: {
                width: "100%",
                height: "100%",
                overflow: "scroll",
                backgroundColor: 'teal',
                color: SI.Editor.Style.TextColor,
            },
        });

        let roleFs = Ele('fieldset', {
            id: "si_edit_security_rolesfs",
            style: {
                marginTop: '10px',
                backgroundColor: 'black',
            },
            append: Ele("legend", {
                innerHTML: "Roles",
            }),
            appendTo: base,
        });

        let newRollBtn = Ele('input', {
            type: 'button',
            value: 'New Role',
            onclick: SI.Editor.Objects.Security.New,
            appendTo: roleFs,
        });
        let srdata = SI.Editor.Data.Objects.Security.Roles;
        for (let i in srdata) {
            let roleent = srdata[i];
            roleFs.appendChild(SI.Editor.Objects.Security.DrawRoleControls(roleent));
        }

        SI.Editor.UI.Security.Window.Append(base);
    },
    DrawRoleControls: function (roleent) {
        let rolenameid = SI.Tools.Element.SafeId(roleent.name);
        let roleFs = Ele('fieldset', {
            id: "si_edit_security_rulefs_" + rolenameid,
            style: {
                backgroundColor: SI.Editor.Style.BackgroundColor,
            },
            append: Ele("legend", {
                innerHTML: roleent.name,
                style: {
                    cursor: 'pointer',
                },
                onclick: SI.Editor.Objects.Security.ShowHideRole,
            }),
        });

        roleentid = "NEW";
        if (roleent.id) {
            roleentid = '0x' + roleent.id;
        }

        let controlbox = Ele('section', {
            class: 'si-edit-security-entity-box-' + rolenameid,
            style: {
                display: 'block',
            },
            appendTo: roleFs,
        });

        if (roleent.name != 'Admin') {
            let ruleSave = Ele('input', {
                id: "si_edit_security_rule_update_" + rolenameid,
                value: 'Save',
                type: 'button',
                data: {
                    roleid: roleentid,
                    rolename: roleent.name,
                },
                style: {
                    margin: '3px',
                },
                appendTo: controlbox,
                onclick: SI.Editor.Objects.Security.Update,
            });
        }

        if (roleent.name != 'Admin' && roleent.name != 'Guest') {
            let ruleDelete = Ele('input', {
                id: "si_edit_security_rule_delete_" + rolenameid,
                value: 'Delete',
                type: 'button',
                data: {
                    roleid: roleentid,
                    rolename: roleent.name,
                },
                style: {
                    margin: '3px',
                },
                appendTo: controlbox,
                onclick: SI.Editor.Objects.Security.Delete,
            });
        }

        let rules = roleent.rules;
        for (let rule in rules) {
            let myrule = rules[rule];

            let rulebox = Ele('div', {
                class: "si-edit-security-entity-box-" + rolenameid,
                style: {
                    display: 'inline-block',
                    backgroundColor: "grey",
                    margin: '3px',
                    border: "1px solid lightgrey",
                    padding: '3px',
                },
                appendTo: roleFs,
            });
            let rulename = Ele('span', {
                id: "si_edit_security_rulename_" + myrule.name,
                innerHTML: '<b>' + myrule.name + "</b><br />",
                style: {
                    color: 'black',
                },
                data: {
                    id: rule,
                },
                appendTo: rulebox,
            });
            for (let o in SI.Editor.Data.Objects.Security.Operations) {

                let op = SI.Editor.Data.Objects.Security.Operations[o];

                let rulecb = Ele('input', {
                    id: "si_edit_security_rule_" + rolenameid + "_" + op + "_" + myrule.name,
                    type: 'checkbox',
                    appendTo: rulebox,
                    style: {
                        float: 'right',
                    },
                });

                let rulelabel = Ele('label', {
                    innerHTML: op,
                    for: "si_edit_security_rule_" + rolenameid + "_" + op + "_" + myrule.name,
                    appendTo: rulebox,
                    style: { float: 'right', fontSize: "small", fontWeight: "bold" },
                });


                Ele('br', { appendTo: rulebox, });
                if (myrule[op] == 'true') {
                    rulecb.checked = true;
                }
            }
        }
        return roleFs;
    },
    ShowHideRole: function () {
        let name = SI.Tools.Element.SafeId(this.innerHTML);
        let eles = document.querySelectorAll(".si-edit-security-entity-box-" + name);
        if (eles) {
            if (eles[0].style.display === "block") {
                for (e in eles) {
                    if (typeof eles[e] !== 'undefined' && typeof eles[e].style !== 'undefined') {
                        eles[e].style.display = 'none';
                    }
                }
            } else {
                for (e in eles) {
                    if (typeof eles[e] !== 'undefined' && typeof eles[e].style !== 'undefined') {
                        if (eles[e].tagName === "DIV") {
                            eles[e].style.display = "inline-block";
                        } else {
                            eles[e].style.display = "block";
                        }
                    }
                }
            }
        }
    },
    New: function () {
        var result = window.prompt('Enter a new role name:');
        if (result) {
            console.log("Createing Role: " + result);
            let entities = SI.Editor.Data.Objects.Entities.Definitions;
            let obj = {};
            obj.name = result;
            obj.rules = {};
            for (let e in entities) {
                let entity = entities[e];
                let entityid = entity.instanceguid.toLowerCase();
                obj.rules[entityid] = {};
                obj.rules[entityid].name = e;
                obj.rules[entityid].create = false;
                obj.rules[entityid].read = false;
                obj.rules[entityid].write = false;
                obj.rules[entityid].append = false;
                obj.rules[entityid].appendTo = false;
            }
            let base = document.getElementById('si_edit_security_rolesfs');
            let ui = SI.Editor.Objects.Security.DrawRoleControls(obj);
            base.appendChild(ui);
        }
    },
    Updated: function (value) {
        //debugger;
        if (value !== true) {
            if (value.CreatedId) {
                if (value.Return) {
                    if (value.Return.Query) {
                        if (value.Input) {
                            if (value.Input.RoleName) {
                                for (let i in value.Return.Query) {
                                    let button = document.getElementById(value.Return.Query[i]);
                                    if (button) {
                                        button.dataset.roleid = value.CreatedId;
                                        button.dataset.rolename = value.Input.RoleName.replace('_', " ");
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    Add: function (value) {

    },
    Update: function (ev, self) {
        if (typeof self === 'undefined') {
            self = this;
        }
        //debugger;
        let entity = {};
        entity.Id = self.dataset.roleid;
        entity.Name = "securityroles";
        entity.Attributes = {};
        entity.Attributes.name = self.dataset.rolename;
        let ops = SI.Editor.Data.Objects.Security.Operations;
        let rolename = self.id.replace("si_edit_security_rule_update_", "");
        let rolenameid = SI.Tools.Element.SafeId(rolename);
        let fsid = 'si_edit_security_rulefs_' + rolenameid;
        let entities = document.querySelectorAll("#" + fsid + " span");
        let json = {};
        for (let e in entities) {
            if (entities.hasOwnProperty(e)) {
                let id = entities[e].dataset.id;
                json[id] = {};
                let name = entities[e].id.replace("si_edit_security_rulename_", "");
                json[id]["name"] = name;
                for (let o in ops) {
                    let op = ops[o];
                    let cbid = "si_edit_security_rule_" + rolename + "_" + op + '_' + name;
                    let cb = document.getElementById(cbid);
                    if (!cb) {
                        alert(cbid);
                    }
                    //debugger;
                    if (cb.checked) {
                        json[id][ops[o]] = 'true';
                    } else {
                        json[id][ops[o]] = 'false';
                    }
                }
            }
        }
        entity.Attributes.rules = json;
        let options = {};
        options.Data = {};
        if (entity.Id == "NEW") {
            options.Data.Operation = 'Create';
        } else {
            options.Data.Operation = 'Update';
        }
        options.Data.Entity = entity;
        options.Data.RoleName = rolename;
        options.Callback = SI.Editor.Objects.Security.Updated;
        options.Data.ReturnQuery = ['si_edit_security_rule_update_' + rolename, 'si_edit_security_rule_delete_' + rolename];
        //debugger;
        SI.Tools.Api.Send(options);

    },
    Delete: function (ev) {
        if (confirm("This will delete this role and any references to it. Are you sure?")) {
            //debugger;
            if (this.dataset.roleid == 'NEW') {
                SI.Editor.Objects.Security.Deleted(SI.Tools.Element.SafeId(this.dataset.rolename))
            } else {
                let options = {
                    Data: {
                        KEY: "DeleteRole",
                        roleid: this.dataset.roleid,
                        rolename: SI.Tools.Element.SafeId(this.dataset.rolename),
                    }
                }
                SI.Editor.Ajax.Run(options);
            }
        }
    },
    Deleted: function (value) {
        let id = "si_edit_security_rulefs_" + value;
        let fs = document.getElementById(id);
        if (fs) {
            let par = fs.parentElement;
            if (par) {
                par.removeChild(fs);
            }
        }
    }
}