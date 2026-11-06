
SI.Editor.Objects.User = {
    Draw: function () {
        let base = Ele('div', {
            class: 'si-tool-body',

        });

        let newuser = Ele('button', {
            innerHTML: "New",
            style: {
            },
            onclick: function () {

                SI.Editor.Objects.User.New();
            },
            appendTo: base,
        });

        let rolewindow = Ele('div', {
            id: 'si_edit_users_rolewindow',
            innerHTML: "",
            style: {

                top: '0px',
                left: '0px',
                position: 'relative',
                padding: '5px',
                display:'none',
            },
            appendTo: base,
        })
        let currentroles = SI.Editor.Data.Objects.Security.Roles;
        //debugger;
        for (let role of currentroles) {

            let rolebox = Ele('div', {

                appendTo: rolewindow,
            })
            let rolename = role.name;
            let label = Ele('label', {
                for: 'si_edit_users_rolecb_' + role.id,
                innerHTML:role.name,
                appendTo: rolebox,
            });

            let cb = Ele('input', {
                id: 'si_edit_users_rolecb_' + role.id,
                class: 'si-edit-users-rolecb-' + role.name,
                type: 'checkbox',
                style: {
                    float:'right',
                },
                onchange: SI.Editor.Objects.User.UpdateRoles,
                appendTo: rolebox,
            });
        }
        let pre = Ele('div', {
            innerHTML: "",
            style: {
                tabSize: '0',
            },
            appendTo: base,
        })
        pre.insertAdjacentHTML('beforeend', SI.Editor.Data.Objects.Users);
        return base;
    },
    ChangePassword: function (self) {
        const user = SI.Editor.Objects.User;
        if (user.PasswordRequest) return;
        const id = (self.dataset.id || self.closest('tr').cells[1].textContent).trim();
        if (!/^(?:0x)?[a-f0-9]{32}$/i.test(id)) {
            SI.Tools.SuperAlert('User not found. Refresh the Users tool and try again.', 4000);
            return;
        }
        if (!user.PasswordWindow) {
            const form = Ele('form', {
                id: 'si_edit_users_password_form', class: 'si-users-password-form', noValidate: true,
                onsubmit: function (event) { event.preventDefault(); user.SavePassword(); },
                onkeydown: function (event) {
                    if (event.key === 'Escape' && !user.PasswordRequest) {
                        event.preventDefault(); event.stopPropagation(); user.PasswordWindow.Hide(0);
                    }
                }
            });
            Ele('p', {textContent: 'Enter a new password of 10 to 72 bytes.', appendTo: form});
            const field = new SI.Widget.Field({
                Id: 'si_edit_users_password', Type: 'password', Label: 'New password',
                Name: 'newpassword', Value: '', Parent: form, BackgroundColor: 'transparent'
            });
            const input = field.querySelector('input');
            input.autocomplete = 'new-password';
            input.setAttribute('aria-describedby', 'si_edit_users_password_status');
            Ele('p', {id: 'si_edit_users_password_status', role: 'status', 'aria-live': 'polite', appendTo: form});
            const actions = Ele('div', {class: 'si-users-password-actions', appendTo: form});
            Ele('button', {type: 'submit', textContent: 'Save password', appendTo: actions});
            Ele('button', {type: 'button', textContent: 'Cancel', onclick: function () { user.PasswordWindow.Hide(0); }, appendTo: actions});
            user.PasswordWindow = new SI.Widget.Window({
                Id: 'si_edit_users_password_window', Title: 'Change password', Width: '420px', Height: '240px',
                WindowControls: 'CLOSE', Dockable: false, Resizable: false, Modal: true,
                Populate: function () { return form; },
                OnClose: function () { form.reset(); if (user.PasswordTrigger?.isConnected) user.PasswordTrigger.focus(); }
            });
        }
        const form = document.getElementById('si_edit_users_password_form');
        form.reset(); form.dataset.userid = id;
        document.getElementById('si_edit_users_password_status').textContent = '';
        user.PasswordTrigger = self;
        user.PasswordWindow.Show(0);
        requestAnimationFrame(function () { form.elements.newpassword.focus(); });
    },
    SavePassword: function () {
        const user = SI.Editor.Objects.User;
        if (user.PasswordRequest) return;
        const form = document.getElementById('si_edit_users_password_form');
        const status = document.getElementById('si_edit_users_password_status');
        const pw = form.elements.newpassword.value;
        const length = new TextEncoder().encode(pw).length;
        if (length < 10 || length > 72 || pw.includes('\0')) {
            status.textContent = 'Use a password of 10 to 72 bytes.';
            status.setAttribute('role', 'alert');
            form.elements.newpassword.focus();
            return;
        }
        status.textContent = 'Saving password…'; status.setAttribute('role', 'status');
        const buttons = form.querySelectorAll('button');
        buttons.forEach(function (button) { button.disabled = true; });
        form.elements.newpassword.disabled = true;
        const request = user.PasswordRequest = SI.Editor.Ajax.Run({Data: {KEY: 'ChangePassword', newpassword: pw, userid: form.dataset.userid}});
        const finished = function () {
            user.PasswordRequest = null;
            buttons.forEach(function (button) { button.disabled = false; });
            form.elements.newpassword.disabled = false;
        };
        request.addEventListener('load', function () {
            finished();
            if (this.status !== 200) {
                status.textContent = 'Password change failed (HTTP ' + this.status + '). Refresh the page and sign in again if needed.';
                status.setAttribute('role', 'alert');
            }
        });
        request.addEventListener('error', function () {
            finished();
            status.textContent = 'Could not reach the server. The password change was not confirmed.';
            status.setAttribute('role', 'alert');
        });
    },
    PasswordChanged: function (changed) {
        const user = SI.Editor.Objects.User;
        const message = changed === true ? 'Password changed.' : 'Password could not be changed. Refresh the Users tool and try again.';
        if (user.PasswordWindow) {
            const status = document.getElementById('si_edit_users_password_status');
            status.textContent = message;
            status.setAttribute('role', changed === true ? 'status' : 'alert');
            if (changed === true) user.PasswordWindow.Hide(0);
        }
        SI.Tools.SuperAlert(message, 4000);
    },
    New: function (self) {
        //debugger;
        var email = prompt("Enter the new user's email", "");
        if (email !== null && email.match(/[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g)) {
            var user = prompt("Enter the new user's username", "");
            if (user !== null && user.match(/[A-Za-z0-9_]{3,16}/)) {
                var password = prompt("Enter the new user's password", "");
                if (password === null || password.match(SI.Editor.Data.User.PasswordStrength)) {
                    //we have what we need
                    let options = {};
                    options.Data = { "KEY": "NewUser", "newpassword": password, "email": email, "name": user };
                    SI.Editor.Ajax.Run(options);
                }
            }
        }
    },
    Created: function (value) {
    },
    GetRoles: function (self) {
        //debugger;
        let confcell = self.parentElement;
        let rolewindow = document.getElementById('si_edit_users_rolewindow');

        //handle if the role is already in the cell and just hidden
        if (confcell.id === rolewindow.parentElement.id) {
            if (rolewindow.style.display === 'none') {
                rolewindow.style.display = 'block';
            } else {
                rolewindow.style.display = 'none';
            }
            return;
        }
        //uncheck all cbs in rolewindow
        let cbs = rolewindow.querySelectorAll('input');
        cbs.forEach(function (ele) {
            ele.checked = false;
        });

        rolewindow.style.display = 'block';
        confcell.appendChild(rolewindow);

        let cells = self.parentElement.parentElement.children;
        let id = '0x' + cells[1].innerHTML;
        rolewindow.dataset.userid = id;
        let options = {};
        options.Data = { "KEY": "GetUserRoles", "userid": id };
        SI.Editor.Ajax.Run(options);
    },
    SetRoles: function (value) {
        for (let guid in value) {

            let cb = document.getElementById('si_edit_users_rolecb_' + guid);
            if (cb) {
                cb.checked = true;
                cb.dataset.relid = value[guid]; //relid if deleting
            }
        }
    },
    UpdateRoles: function (value) {
        let userid = document.getElementById('si_edit_users_rolewindow').dataset.userid;
        let roleguid = '0x' + this.id.replace('si_edit_users_rolecb_', '');
        //debugger;
        let options = {};
        if (this.checked) {
            options.Data = { "KEY": "AddUserRole", "userid": userid, "roleid": roleguid };
        } else {
            options.Data = { "KEY": "RemoveUserRole", "relid": '0x' + this.dataset.relid };
        }



        SI.Editor.Ajax.Run(options);
    },
    Delete: function (id) {
        if (typeof id === 'undefined') {
            let cells = self.parentElement.parentElement.children;
            id = '0x' + cells[1].innerHTML;
        }

        let options = {};
        options.Data = { "KEY": "DeleteUser", 'id': id };
        SI.Editor.Ajax.Run(options);
    }
};
