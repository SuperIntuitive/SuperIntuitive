
SI.Editor.Objects.User = {
    Draw: function () {
        let base = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                overflow: "scroll",
                backgroundColor: SI.Editor.Style.BackgroundColor,
                color: SI.Editor.Style.TextColor,
            },
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
                backgroundColor: SI.Editor.Style.MenuColor,
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
        let pw = prompt("Enter the new password", "password");
        if (pw !== null) {
            let cells = self.parentElement.parentElement.children;
            let id = '0x' + cells[1].innerHTML;
            let options = {};
            options.Data = { "KEY": "ChangePassword", "newpassword": pw, "userid": id };
            SI.Editor.Ajax.Run(options);
        }
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