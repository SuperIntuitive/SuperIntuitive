
SI.Editor.Objects.Security = {
    Draw: function () {
        const base = Ele('div', {id: 'si_edit_security_base', class: 'si-tool-body si-tool-tabs-body si-security-roles'});
        const navigation = Ele('div', {class: 'si-security-role-nav', appendTo: base});
        const tabs = Ele('div', {id: 'si_edit_security_role_tabs', class: 'si-tab-list', appendTo: navigation});
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Security roles');
        Ele('button', {
            id: 'si_edit_security_new_role',
            type: 'button',
            class: 'si-tool-action',
            innerText: SI.Tools.Text.Editor('New Role'),
            onclick: SI.Editor.Objects.Security.New,
            appendTo: navigation,
        });
        Ele('div', {id: 'si_edit_security_rolesfs', class: 'si-security-role-panels', appendTo: base});
        for (const role of Object.values(SI.Editor.Data.Objects.Security.Roles)) {
            SI.Editor.Objects.Security.AddRoleTab(role, false, base);
        }
        const first = tabs.firstElementChild;
        if (first) SI.Editor.Objects.Security.SelectRoleTab(first, false, base);
        tabs.addEventListener('keydown', function (event) {
            const items = Array.from(tabs.children);
            const index = items.indexOf(event.target);
            if (index === -1) return;
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % items.length;
            if (event.key === 'ArrowLeft') next = (index + items.length - 1) % items.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = items.length - 1;
            if (next === undefined) return;
            event.preventDefault();
            SI.Editor.Objects.Security.SelectRoleTab(items[next], true, base);
        });
        return base;
    },
    AddRoleTab: function (role, select = true, base = document.getElementById('si_edit_security_base')) {
        const tabs = base.querySelector('#si_edit_security_role_tabs');
        const existing = Array.from(tabs.children).find(tab => tab.dataset.rolename.toLowerCase() === role.name.toLowerCase());
        if (existing) {
            if (select) SI.Editor.Objects.Security.SelectRoleTab(existing, true, base);
            return;
        }
        const controls = SI.Editor.Objects.Security.DrawRoleControls(role);
        const key = controls.id.replace('si_edit_security_rulefs_', '');
        const panel = Ele('div', {
            id: 'si_edit_security_role_panel_' + key,
            class: 'si-tab-panel si-security-role-panel',
            append: controls,
            appendTo: base.querySelector('#si_edit_security_rolesfs'),
        });
        panel.hidden = true;
        panel.setAttribute('role', 'tabpanel');
        const tab = Ele('button', {
            id: 'si_edit_security_role_tab_' + key,
            type: 'button',
            class: 'si-tab-item',
            innerText: role.name,
            data: {rolename: role.name},
            onclick: function () { SI.Editor.Objects.Security.SelectRoleTab(this, false, base); },
            appendTo: tabs,
        });
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', 'false');
        tab.setAttribute('aria-controls', panel.id);
        tab.tabIndex = -1;
        panel.setAttribute('aria-labelledby', tab.id);
        if (select) SI.Editor.Objects.Security.SelectRoleTab(tab, true, base);
    },
    SelectRoleTab: function (tab, focus = false, base = document.getElementById('si_edit_security_base')) {
        for (const item of base.querySelectorAll('[role="tab"]')) {
            item.setAttribute('aria-selected', String(item === tab));
            item.tabIndex = item === tab ? 0 : -1;
        }
        for (const panel of base.querySelectorAll('[role="tabpanel"]')) panel.hidden = panel.id !== tab.getAttribute('aria-controls');
        if (focus) {
            tab.focus();
            tab.scrollIntoView({block: 'nearest', inline: 'nearest'});
        }
    },
    DrawRoleControls: function (roleent) {
        let rolenameid = SI.Tools.Element.SafeId(roleent.name);
        let roleFs = Ele('fieldset', {
            id: "si_edit_security_rulefs_" + rolenameid,
            class: 'si-security-role-controls',
            append: Ele('legend', {innerText: roleent.name}),
        });

        let roleentid = "NEW";
        if (roleent.id) {
            roleentid = '0x' + roleent.id;
        }

        let controlbox = Ele('section', {
            class: 'si-security-role-actions si-edit-security-entity-box-' + rolenameid,
            appendTo: roleFs,
        });

        if (roleent.name != 'Admin') {
            let ruleSave = Ele('input', {
                id: "si_edit_security_rule_update_" + rolenameid,
                value: SI.Tools.Text.Editor('Save'),
                type: 'button',
                data: {
                    roleid: roleentid,
                    rolename: roleent.name,
                },

                appendTo: controlbox,
                onclick: SI.Editor.Objects.Security.Update,
            });
        }

        if (roleent.name != 'Admin' && roleent.name != 'Guest') {
            let ruleDelete = Ele('input', {
                id: "si_edit_security_rule_delete_" + rolenameid,
                value: SI.Tools.Text.Editor('Delete'),
                type: 'button',
                data: {
                    roleid: roleentid,
                    rolename: roleent.name,
                },

                appendTo: controlbox,
                onclick: SI.Editor.Objects.Security.Delete,
            });
        }

        let rules = roleent.rules;
        for (let rule in rules) {
            let myrule = rules[rule];

            let rulebox = Ele('div', {
                class: "si-tool-permission-card si-edit-security-entity-box-" + rolenameid,
                appendTo: roleFs,
            });
            let rulename = Ele('span', {
                id: "si_edit_security_rulename_" + myrule.name,
                innerHTML: '<b>' + myrule.name + "</b><br />",
                style: {

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
                });

                let rulelabel = Ele('label', {
                    innerHTML: op,
                    for: "si_edit_security_rule_" + rolenameid + "_" + op + "_" + myrule.name,
                    appendTo: rulebox,
                    class: 'si-tool-permission-label',
                });


                Ele('br', { appendTo: rulebox, });
                if (myrule[op] == 'true') {
                    rulecb.checked = true;
                }
            }
        }
        return roleFs;
    },
    New: function () {
        var result = window.prompt(SI.Tools.Text.Editor('Enter a new role name:'));
        if (result && result.trim()) {
            result = result.trim();
            let entities = SI.Editor.Data.Objects.Entities.Definitions;
            let obj = {};
            obj.name = result;
            obj.rules = {};
            for (let e in entities) {
                const entity = entities[e];
                // System-only definitions do not have a site entity ID or role permissions.
                if (!entity.instanceguid) continue;
                const entityid = entity.instanceguid.toLowerCase();
                obj.rules[entityid] = {name: e};
                for (const operation of SI.Editor.Data.Objects.Security.Operations) obj.rules[entityid][operation] = false;
            }
            SI.Editor.Objects.Security.AddRoleTab(obj);
        }
    },
    Updated: function (value) {
        if (!value || !value.CreatedId) return;
        for (const id of value.Return?.Query || []) {
            const button = document.getElementById(id);
            if (button) button.dataset.roleid = value.CreatedId;
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
        let entities = self.closest('fieldset').querySelectorAll('span[data-id]');
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
            delete entity.Id; // New records receive a GUID from the API.
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
        if (confirm(SI.Tools.Text.Editor("This will delete this role and any references to it. Are you sure?"))) {
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
        const controls = document.getElementById('si_edit_security_rulefs_' + value);
        if (!controls) return;
        const base = document.getElementById('si_edit_security_base');
        const panel = controls.closest('[role="tabpanel"]');
        const tab = document.getElementById(panel.getAttribute('aria-labelledby'));
        const tabs = Array.from(tab.parentElement.children);
        const index = tabs.indexOf(tab);
        const selected = tab.getAttribute('aria-selected') === 'true';
        tab.remove();
        panel.remove();
        if (selected) {
            const remaining = base.querySelector('#si_edit_security_role_tabs').children;
            const next = remaining[Math.min(index, remaining.length - 1)];
            if (next) SI.Editor.Objects.Security.SelectRoleTab(next, true, base);
        }
    }
}
