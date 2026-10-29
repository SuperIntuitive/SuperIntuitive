
    "use strict";
    if(!SI){ var SI = {};}

	SI.Setup = {
        SelectedArticle: 'sysinfo',
		Installing : false,
        Authorized: false,
        Authorizing: false,
        Init: function () {
            //to prevent whitescreen if exists
            localStorage.clear();
            var userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            document.getElementById('si_setup_timezone').value = userTimezone;
            //this is too hard to determine now but from what I hear everybody loves USD
            document.getElementById('si_setup_currency').value = "usd";
            SI.Setup.SetAuthorized(document.getElementById('si_setup_form').dataset.setupAuthorized === 'true');
        },
        SetAuthorized: function (authorized) {
            SI.Setup.Authorized = authorized;
            let key = document.getElementById('si_setup_key');
            key.disabled = authorized;
            key.required = !authorized;
            if (authorized) key.value = '';
            document.getElementById('si_setup_key_field').hidden = authorized;
            let status = document.getElementById('si_setup_authorization_status');
            status.hidden = !authorized;
            status.dataset.state = authorized ? 'success' : '';
            status.textContent = authorized ? 'Installation authorized for this session.' : '';
        },
        HandleAuthorizationError: function (response) {
            if (response.code !== 'SETUP_AUTH_REQUIRED' && response.code !== 'CSRF_INVALID') return false;
            SI.Setup.Installing = false;
            SI.Setup.SetAuthorized(false);
            if (typeof response.csrf === 'string') document.getElementById('si_setup_csrf').value = response.csrf;
            SI.Setup.ChangeMenu('mi_sysinfo');
            let status = document.getElementById('si_setup_authorization_status');
            status.hidden = false;
            status.dataset.state = 'error';
            status.textContent = response.message;
            document.getElementById('si_setup_key').focus();
            return true;
        },
        EnsureAuthorized: function (onSuccess) {
            if (SI.Setup.Authorized) {
                onSuccess();
                return;
            }
            if (SI.Setup.Authorizing) return;
            if (SI.Setup.SelectedArticle !== 'sysinfo') {
                SI.Setup.ChangeMenu('mi_sysinfo');
                return;
            }
            SI.Setup.Authorizing = true;
            let controls = document.querySelectorAll('.menuitem, #btnnext, #btnback');
            controls.forEach(function (control) { control.disabled = true; });
            let status = document.getElementById('si_setup_authorization_status');
            status.hidden = false;
            status.dataset.state = '';
            status.textContent = 'Checking the installation key…';
            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState !== 4) return;
                SI.Setup.Authorizing = false;
                controls.forEach(function (control) { control.disabled = false; });
                let response = SI.Setup.ReadResponse(this);
                if (typeof response.csrf === 'string') document.getElementById('si_setup_csrf').value = response.csrf;
                if (response.outcome && response.authorized === true) {
                    SI.Setup.SetAuthorized(true);
                    onSuccess();
                } else {
                    SI.Setup.SetAuthorized(false);
                    status.hidden = false;
                    status.dataset.state = 'error';
                    status.textContent = response.message || 'Unable to authorize installation. Try again.';
                    document.getElementById('si_setup_key').focus();
                }
            };
            ajax.open('POST', 'delegate.php', true);
            ajax.setRequestHeader('Content-type', 'application/json; charset=UTF-8');
            ajax.setRequestHeader('X-SI-CSRF', document.getElementById('si_setup_csrf').value);
            ajax.setRequestHeader('X-SI-Setup', document.getElementById('si_setup_key').value);
            ajax.send(JSON.stringify({KEY: 'AuthorizeSetup'}));
        },
        ChangeMenu: function (menuitem) {
            var id = menuitem.replace('mi_', '');
            var steps = ['sysinfo', 'database', 'local', 'admin', 'review', 'install'];
            var index = steps.indexOf(id);
            var mis = document.querySelectorAll('.menuitem');
            [].forEach.call(mis, function (mi, position) {
                mi.classList.toggle('is-current', mi.id === menuitem);
                mi.classList.toggle('is-previous', position < index);
                if (mi.id === menuitem) mi.setAttribute('aria-current', 'step');
                else mi.removeAttribute('aria-current');
            });
            document.getElementById('si_setup_step_label').textContent = 'STEP 0' + (index + 1) + ' OF 06';
            document.getElementById('si_setup_action_hint').textContent = id === 'review'
                ? 'Everything look right? You are ready to install.' : 'Step ' + (index + 1) + ' of 6';

            var acls = document.querySelectorAll('article');
            [].forEach.call(acls, function (acl) {
                acl.style.display = "none";
            });

            SI.Setup.SelectedArticle = id;
            document.getElementById(id).style.display = 'block';
            document.querySelector('#' + id + ' h1').focus({preventScroll: true});
            if (window.matchMedia('(max-width: 760px)').matches) {
                document.getElementById(id).scrollIntoView({block: 'start'});
            }
            //debugger;
            let backbtn = document.getElementById("btnback");
            let nextbtn = document.getElementById("btnnext");
            nextbtn.innerHTML='Next';
			if(id == 'sysinfo'){
                backbtn.style.display='none';
                nextbtn.style.display='inline-block';
			}else if(id == 'database'){
                backbtn.style.display='inline-block';
                nextbtn.style.display='inline-block';
			}else if(id == 'local'){
                backbtn.style.display='inline-block';
                nextbtn.style.display='inline-block';						
            } else if (id == 'admin') {
                document.getElementById('si_setup_adminpassword').required=true;
                document.getElementById('si_setup_adminemail').required=true;
                backbtn.style.display='inline-block';
                nextbtn.style.display = 'inline-block';
            } else if (id == 'review') {
                SI.Setup.RefreshReview();
                backbtn.style.display='inline-block';
                nextbtn.style.display='inline-block';
                nextbtn.innerHTML='Install';
			}
			else if(id == 'install'){
                SI.Setup.Installing = true;
                backbtn.style.display='none';
                nextbtn.style.display='none';
                document.getElementById('progressmeter').removeAttribute('value');
                document.getElementById('progressupdate').textContent = 'Creating your website…';
			//	$('#progressupdate').html("Setting up Database");
			//	$('#progressmeter').val(2);
                var params = 'Key=SetupDatabase';
                SI.Setup.SetupServer(params);

			}
		},	
        SetupServer: function (dataobj) {

            if (!SI.Setup.Authorized) {
                SI.Setup.HandleAuthorizationError({code: 'SETUP_AUTH_REQUIRED', message: 'Authorize setup in Step 1 to continue.'});
                return;
            }

            if (!SI.Setup.Validate(true)) {
                SI.Setup.Installing = false;
                return;
            }

            let json = { "KEY": "SetupSuperIntuitive" };
            json = SI.Setup.FormatForm(json)
            //debugger;

            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4) {
                    let response = SI.Setup.ReadResponse(this);
                          
                    let check = document.getElementById('si_setup_dbsuccess');
                    if (response.outcome) {
                        //debugger;
                        //delete the php session cookie, we'll get a new one on reload
                        document.cookie.split(";").forEach(function (c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
                        document.getElementById('progressmeter').value = 100;
                        document.getElementById('si_setup_install_title').textContent = 'Your website is ready.';
                        document.getElementById('progressupdate').innerHTML = response.message || 'Installation complete. Opening your website…';
                        setTimeout(function () { location.reload(); }, response.time);
                    } else {
                        SI.Setup.Installing = false;
                        if (SI.Setup.HandleAuthorizationError(response)) return;
                        if (response.code === 'SETUP_VALIDATION_FAILED') {
                            let field = document.getElementById(response.field);
                            if (field && field.closest('article')) {
                                SI.Setup.ChangeMenu('mi_' + field.closest('article').id);
                                field.setCustomValidity(response.message);
                                let clear = function () {
                                    field.setCustomValidity('');
                                    field.removeEventListener('input', clear);
                                    field.removeEventListener('change', clear);
                                };
                                field.addEventListener('input', clear);
                                field.addEventListener('change', clear);
                                field.reportValidity();
                                return;
                            }
                        }
                        alert(response.message || 'Installation failed.');
                        SI.Setup.ChangeMenu('mi_review');
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            ajax.setRequestHeader("X-SI-CSRF", document.getElementById('si_setup_csrf').value);
            //debugger;
            ajax.send(JSON.stringify(json));
                
		},
        MenuItemClick: function (menuitemid) {
            if (SI.Setup.Installing || SI.Setup.Authorizing) {
                return;
            }
            let steps = ['sysinfo', 'database', 'local', 'admin', 'review', 'install'];
            let target = menuitemid.replace('mi_', '');
            let forward = steps.indexOf(target) > steps.indexOf(SI.Setup.SelectedArticle);
            if (forward && !SI.Setup.Validate(target === 'review' || target === 'install')) {
                return;
            }

            if (forward) SI.Setup.EnsureAuthorized(function () { SI.Setup.ChangeMenu(menuitemid); });
            else SI.Setup.ChangeMenu(menuitemid);
		},
        ChangeDbLoginType: function (self) {
            switch (self.id) {
                case "si_setup_privuser":
                    document.getElementById('si_existuserbox').style.display = 'none';
                    document.getElementById('si_prevuserbox').style.display = 'grid';
                    document.getElementById('si_setup_pruser').required = true;
                    document.getElementById('si_setup_prpw').required = true;

                    document.getElementById('si_setup_exdb').required = false;
                    document.getElementById('si_setup_exun').required = false;
                    document.getElementById('si_setup_expw').required = false;
                    break;
                case "si_setup_existuser":
                    document.getElementById('si_prevuserbox').style.display = 'none';
                    document.getElementById('si_existuserbox').style.display = 'grid';
                    document.getElementById('si_setup_pruser').required = false;
                    document.getElementById('si_setup_prpw').required = false;

                    document.getElementById('si_setup_exdb').required = true;
                    document.getElementById('si_setup_exun').required = true;
                    document.getElementById('si_setup_expw').required = true;
                    break;
            }
        },
		DeactivatePages: function(color){
			var eles = document.getElementsByClassName('menuitem');
			for(let i = 0; i < eles.length; i++){
				eles[i].disabled= true;
			}
        },
        ActivatePages: function (color) {
            var eles = document.getElementsByClassName('menuitem');
            for (let i = 0; i < eles.length; i++) {
                eles[i].disabled = false;
            }
        },
        SetRandomPassword: function (pwfield) {
            document.getElementById(pwfield).value = SI.Setup.RandPW();
		},
		RandPW:function(){
			var text = '';
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ~[]{}!#%^&*()-_=+';
            for (let i = 0; i < 24; i++)
			text += possible.charAt(crypto.getRandomValues(new Uint32Array(1))[0] % possible.length);
			return text;
		},
        ButtonClick: function (self) {
            if (SI.Setup.Installing || SI.Setup.Authorizing) {
                return;
            }
            let steps = ['sysinfo', 'database', 'local', 'admin', 'review', 'install'];
            let index = steps.indexOf(SI.Setup.SelectedArticle);
            if (self.innerText === 'Back') {
                if (index > 0) {
                    SI.Setup.ChangeMenu('mi_' + steps[index - 1]);
                }
            } else if (SI.Setup.Validate(SI.Setup.SelectedArticle === 'review')) {
                if (index < steps.length - 1) {
                    SI.Setup.EnsureAuthorized(function () { SI.Setup.ChangeMenu('mi_' + steps[index + 1]); });
                }
            }

		},
        Validate: function (all = false) {
            let scope = document.getElementById(all ? 'si_setup_form' : SI.Setup.SelectedArticle);
            let fields = scope.querySelectorAll('input, select, textarea');
            for (let field of fields) {
                if (!field.checkValidity()) {
                    let article = field.closest('article');
                    if (article && article.id !== SI.Setup.SelectedArticle) {
                        SI.Setup.ChangeMenu('mi_' + article.id);
                    }
                    field.reportValidity();
                    return false;
                }
            }
            return true;
        },
        RefreshReview: function () {
            let mode = document.querySelector('input[name="dbuserradio"]:checked').value;
            document.querySelectorAll('#reviewtable [data-db-mode]').forEach(function (row) {
                row.hidden = row.dataset.dbMode !== mode;
            });
            let tds = document.querySelectorAll("#reviewtable td");
            [].forEach.call(tds, function (td) {
                if (td.hasAttribute('id')) {
                    let input = document.getElementById(td.id.replace("_rv", ""));
                    td.textContent = input.type === 'password' ? '••••••••'
                        : input.tagName === 'SELECT' && input.selectedOptions.length ? input.selectedOptions[0].textContent
                        : input.value || '—';
                }
            });
        },
        ReadResponse: function (ajax) {
            if (ajax.status === 0) {
                return {outcome: false, message: 'Unable to reach the server. Check the connection and try again.'};
            }
            try {
                let response = JSON.parse(ajax.responseText);
                if (response && typeof response.outcome === 'boolean') {
                    return response;
                }
                if (response && response.ERROR) {
                    return Object.assign({}, response, {outcome: false, message: response.ERROR});
                }
                if (Array.isArray(response) && response[0] && response[0].ERROR) {
                    return Object.assign({}, response[0], {outcome: false, message: response[0].ERROR});
                }
            } catch (error) {
                // Show a useful error even if PHP or a proxy returns an HTML error page.
            }
            return {outcome: false, message: 'The server returned an unexpected response. Check the server logs and try again.'};
        },
        TestDatabase: function () {      
            if (!SI.Setup.Authorized) {
                SI.Setup.HandleAuthorizationError({code: 'SETUP_AUTH_REQUIRED', message: 'Authorize setup in Step 1 to continue.'});
                return;
            }
            if (!SI.Setup.Validate()) {
                return;
            }
            //debugger;            
            let json = { "KEY": "TestDatabase" };
            json = SI.Setup.FormatForm(json)
            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4) {
                    //debugger;
                    let response = SI.Setup.ReadResponse(this);
                    if (SI.Setup.HandleAuthorizationError(response)) return;
                    let check = document.getElementById('si_setup_dbsuccess');
                    if (response.outcome) {
                        check.innerHTML = "✔";
                        check.dataset.state = 'success';
                    } else {
                        check.textContent = "✘ " + (response.message || 'Unable to connect. Check the database settings.');
                        check.dataset.state = 'error';
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            ajax.setRequestHeader("X-SI-CSRF", document.getElementById('si_setup_csrf').value);
            ajax.send(JSON.stringify(json));
        },
        TestDomain: function () {
            if (!SI.Setup.Authorized) return;
            //debugger;
            let json = { "KEY": "TestDomain" };
            json = SI.Setup.FormatForm(json)
            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4) {
                    let response = SI.Setup.ReadResponse(this);
                    if (SI.Setup.HandleAuthorizationError(response)) return;
                    let check = document.getElementById('si_setup_domainsuccess');
                    if (response.outcome) {
                        check.innerHTML = "✔";
                        check.dataset.state = 'success';
                    } else {
                        check.textContent = "✘ " + (response.message || 'This domain is unavailable.');
                        check.dataset.state = 'error';
                        //this should never happen. if the thing is setup then there should be no folders in the domain folder
                        check.title = 'This domain has already been setup. You will need to log in as admin and remove it in the editor';
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            ajax.setRequestHeader("X-SI-CSRF", document.getElementById('si_setup_csrf').value);
            ajax.send(JSON.stringify(json));
        },
        FormatForm: function (jsonin = {}) {
            let form = document.getElementById("si_setup_form");
            let json = (jsonin === 'undefined') ? {} : jsonin; //for old browsers that cant take defaults...  ie any
            let done = false;
            let ittr = 0;
            //debugger;
            while (!done) {
                if (typeof form[ittr] !== 'undefined') {
                    let ele = form[ittr];

                    if (!ele.name) {
                        ittr++;
                        continue;
                    }

                    if (ele.type == 'radio') {
                        if (ele.checked) {
                            json[ele.name] = ele.value;
                        }
                    } else {
                        json[ele.name] = ele.value;
                    }
                    ittr++;
                } else {
                    done = true;
                }

            }
            return json;   
        }
	}
