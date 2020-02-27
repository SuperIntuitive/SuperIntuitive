<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>


	var setup = {
        Init: function () {
            //to prevent whitescreen if exists
            localStorage.clear();
            var userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            document.getElementById('si_setup_timezone').value = userTimezone;
            //this is too hard to determine now but from what I hear everybody loves USD
            document.getElementById('si_setup_currency').value = "usd";

        },
        requiredFilled: {
            domain: false,

        },
		selectedArticle: 'sysinfo',
		installing : false,
        ChangeMenu: function (menuitem) {
                 
            //For this choice
            //set the menuitems colors 
            var mis = document.querySelectorAll('.menuitem');
            [].forEach.call(mis, function (mi) {
                mi.style.color = "black";
            });

            document.querySelector('#'+menuitem).style.color = 'aliceblue';
            var id = menuitem.replace('mi_', '');

            var acls = document.querySelectorAll('article');
            [].forEach.call(acls, function (acl) {
                acl.style.display = "none";
            });

            setup.selectedArticle = id;
            document.getElementById(id).style.display = 'block';
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
                setup.RefreshReview();
                backbtn.style.display='inline-block';
                nextbtn.style.display='inline-block';
                nextbtn.innerHTML='Install';
			}
			else if(id == 'install'){
                backbtn.style.display='none';
                nextbtn.style.display='none';
			//	$('#progressupdate').html("Setting up Database");
			//	$('#progressmeter').val(2);
                var params = 'Key=SetupDatabase';
                setup.SetupServer(params);

			}
		},	
        SetupServer: function (dataobj) {

            let json = { "KEY": "SetupDatabase" };
            json = setup.FormatForm(json)
            //debugger;

            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    let response = JSON.parse(this.responseText);
                          
                    let check = document.getElementById('si_setup_dbsuccess');
                    if (response.outcome) {
                        location.reload();
                    } else {
                        alert(response.outcome);
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            //debugger;
            ajax.send(JSON.stringify(json));
                
		},
        MenuItemClick: function (menuitemid) {
            //debugger;
            if (!setup.Validate()) {
                return;
            } 

            if (!setup.installing) {
                setup.ChangeMenu(menuitemid);
            }
		},
        ChangeDbLoginType: function (self) {
            switch (self.id) {
                case "si_setup_privuser":
                    document.getElementById('si_existuserbox').style.display = 'none';
                    document.getElementById('si_prevuserbox').style.display = 'block';
                    document.getElementById('si_setup_pruser').required = true;
                    document.getElementById('si_setup_prpw').required = true;

                    document.getElementById('si_setup_exdb').required = false;
                    document.getElementById('si_setup_exun').required = false;
                    document.getElementById('si_setup_expw').required = false;
                    break;
                case "si_setup_existuser":
                    document.getElementById('si_prevuserbox').style.display = 'none';
                    document.getElementById('si_existuserbox').style.display = 'block';
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
			for(var i = 0; i < eles.length; i++){
				eles[i].disabled= true;
			}
        },
        ActivatePages: function (color) {
            var eles = document.getElementsByClassName('menuitem');
            for (var i = 0; i < eles.length; i++) {
                eles[i].disabled = false;
            }
        },
        SetRandomPassword: function (pwfield) {
            document.getElementById(pwfield).value = setup.RandPW();
		},
		RandPW:function(){
			var text = '';
			var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ~[]{}!#%^&*()-_=+';
			for (var i = 0; i < 24; i++)
			text += possible.charAt(Math.floor(Math.random() * possible.length));
			return text;
		},
        ButtonClick: function (self) {
            dir = self.innerText;
        
            if (!setup.Validate()) {
                return
            } 

            if (self.innerText == 'Next') {

                document.getElementById('btnnext').value = 'next';
                switch (setup.selectedArticle) {
                    case 'sysinfo':
                        setup.ChangeMenu('mi_database');
                        break;
                    case 'database':
                        setup.ChangeMenu('mi_local');
                        break;
                    case 'local':
                        setup.ChangeMenu('mi_admin');
                        break;
                    case 'admin':
                        // setup.RefreshReview();
                        setup.ChangeMenu('mi_review');
                        break;
                    case 'review': setup.ChangeMenu('mi_install');
                        var mis = document.querySelectorAll('.menuitem');
                        [].forEach.call(mis, function (mi) {
                            mi.style.color = "#888";
                            mi.removeAttribute("onclick");
                        });
                        setup.DeactivatePages();
                        break;
                }
            }
            else if (self.innerText == 'Back') {
                switch (setup.selectedArticle) {
                    case 'database': setup.ChangeMenu('mi_sysinfo');
                        break;
                    case 'local': setup.ChangeMenu('mi_database'); break;
                        break;
                    case 'admin': setup.ChangeMenu('mi_local'); break;
                        break;
                    case 'review': setup.ChangeMenu('mi_admin'); break;
                        break;
                }
            }
            else if (self.innerText == 'Install') {
                setup.ChangeMenu('mi_install');
                var mis = document.querySelectorAll('.menuitem');
                [].forEach.call(mis, function (mi) {
                    mi.style.color = "#888";
                    mi.removeAttribute("onclick");
                });
                setup.DeactivatePages();
            }

		},
        Validate: function () {
            let form = document.getElementById("si_setup_form");
            var isValidForm = form.checkValidity();
            if (!isValidForm) {
                //find out the first reason why
                let done = false;
                let ittr = 0;
                let culprit = null;
                while (!done) {
                    if (typeof form[ittr] !== 'undefined') {
                        if (!form[ittr].checkValidity()) {
                            //debugger;
                            culprit = form[ittr].dataset.group;
                            done = true;
                        }
                        ittr++;
                    } else {
                        done = true;
                    }
                }
                if (culprit != null) {
                //change the tab
                    if (culprit !== setup.selectedArticle) {
                        setup.ChangeMenu('mi_' + culprit.id);
                    }
                    document.getElementById('si_setup_hiddenbtn').click();
                }  
                return false;
            }
            //valid form
            return true;
        },
        RefreshReview: function () {
            let tds = document.querySelectorAll("#reviewtable td");
            [].forEach.call(tds, function (td) {
                if (td.hasAttribute('id')) {
                    td.innerHTML = document.getElementById(td.id.replace("_rv", "")).value;
                }
            });
        },

        TestDatabase: function () {                  
            let json = { "KEY": "TestDatabase" };
            json = setup.FormatForm(json)
            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    let response = JSON.parse(this.responseText);
                    let check = document.getElementById('si_setup_dbsuccess');
                    if (response.outcome) {
                        check.innerHTML = "✔";
                        check.style.color = 'green';
                    } else {
                        check.innerHTML = "✘";
                        check.style.color = 'red';
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            ajax.send(JSON.stringify(json));
        },

        TestDomain: function () {
            //debugger;
            let json = { "KEY": "TestDomain" };
            json = setup.FormatForm(json)
            let ajax = new XMLHttpRequest();
            ajax.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    let response = JSON.parse(this.responseText);
                    let check = document.getElementById('si_setup_domainsuccess');
                    if (response.outcome) {
                        check.innerHTML = "✔";
                        check.style.color = 'green';
                    } else {
                        check.innerHTML = "✘";
                        check.style.color = 'red';
                        //this should never happen. if the thing is setup then there should be no folders in the domain folder
                        check.title = 'This domain has already been setup. You will need to log in as admin and remove it in the editor';
                    }
                }
            };
            ajax.open("POST", "delegate.php", true);
            ajax.setRequestHeader("Content-type", 'application/json; charset=UTF-8');
            ajax.send(JSON.stringify(json));
        },

        FormatForm: function (jsonin = {}) {
            let form = document.getElementById("si_setup_form");
            let valid = form.checkValidity();
            let json = (jsonin === 'undefined') ? {} : jsonin; //for old browsers that cant take defaults...  ie any
            if (!valid) {
                return false;
            }
            let done = false;
            let ittr = 0;
            //debugger;
            while (!done) {
                if (typeof form[ittr] !== 'undefined') {
                    let ele = form[ittr];

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