
Login = {
    Init: function () {
        if (typeof LoggedInUser != "undefined") {
            document.getElementById('si_loggedinname').innerHTML = "Logged In: " + LoggedInUser.name;
            document.getElementById('si_loginbox').style.display = 'none';
            document.getElementById('si_loggedinbox').style.display = 'block';

        } else {
            document.getElementById('si_loggedinbox').style.display = 'none';
            document.getElementById('si_loginbox').style.display = 'block';
        }
    },
    Attempt: function () {
        let email = document.getElementById('si_login_email').value;
        let password = document.getElementById('si_login_password').value;
        let rememberme = document.getElementById('si_login_remember_me').checked;
        SI.Tools.Ajax({ Data: { KEY: 'LoginAttempt', email: email, password: password, rememberme: rememberme } });
    },
    RememberMe: function (self) {
        if (self.checked === true) {
            //let expire = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            //document.cookie = "rememberme=true; expires="+expire+";path=/";
        }
        else {
            let expire = new Date(new Date().setFullYear(new Date().getFullYear() + -1))
            document.cookie = "rememberme=true; expires=" + expire + ";path=/";
        }
    },
    Logout: function () {

        SI.Tools.Ajax({ Data: { KEY: 'Logout' } });
    }
}
Login.Init();























