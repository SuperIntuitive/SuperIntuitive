if (!window.SI) window.SI = {};
SI.Login = {
    EditorPreview: false,
    HasEditor: function () {
        return !!(SI.Editor && SI.Editor.Objects && SI.Editor.Objects.Elements);
    },
    Init: function () {
        const root = document.getElementById('si_block_Login');
        const form = document.getElementById('si_loginbox');
        const account = document.getElementById('si_loggedinbox');
        const label = document.getElementById('si_loggedinname');
        if (!root || !form || !account) return;
        const name = SI.User && SI.User.Name;
        const loggedIn = typeof name === 'string' && name !== 'guest';
        const editing = loggedIn && this.HasEditor() && this.EditorPreview;
        if (label) label.textContent = loggedIn ? 'Logged In: ' + name : '';
        form.style.display = !loggedIn || editing ? 'block' : 'none';
        account.style.display = loggedIn && !editing ? 'block' : 'none';
        let preview = document.getElementById('si_edit_login_preview');
        if (loggedIn && this.HasEditor()) {
            if (!preview) {
                preview = document.createElement('button');
                preview.id = 'si_edit_login_preview';
                preview.type = 'button';
                preview.setAttribute('data-si-editor-only', 'true');
                preview.addEventListener('click', function () {
                    SI.Login.EditorPreview = !SI.Login.EditorPreview;
                    SI.Login.Init();
                });
                root.appendChild(preview);
            }
            preview.textContent = editing ? 'Done editing login form' : 'Edit login form';
            preview.setAttribute('aria-pressed', String(editing));
        } else if (preview) {
            preview.remove();
        }
    },
    Attempt: function () {
        // Editing a guest form must not change the administrator's session.
        if (this.HasEditor() && this.EditorPreview) return;
        SI.Tools.Ajax({Data: {
            KEY: 'LoginAttempt',
            email: document.getElementById('si_login_email').value,
            password: document.getElementById('si_login_password').value,
            rememberme: document.getElementById('si_login_remember_me').checked
        }});
    },
    RememberMe: function (self) {
        if (this.HasEditor() && this.EditorPreview) return;
        if (!self.checked) document.cookie = 'rememberme=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    },
    Logout: function () { SI.Tools.Ajax({Data: {KEY: 'Logout'}}); }
};
// Older saved Login markup calls Login.RememberMe rather than SI.Login.RememberMe.
window.Login = SI.Login;
SI.Login.Init();
