<?php // Rendered by Setup::GetBody(); dynamic text is escaped before reaching this template. ?>
<body class='si-setup'>
<a class='setup-skip' href='#si_setup_form'>Skip to setup</a>
<header class='setup-topbar'>
    <a class='setup-brand' href='/' aria-label='Super Intuitive setup'>super<span>intuitive</span><b aria-hidden='true'>.</b><small>Visual website platform</small></a>
    <div class='setup-top-meta'><span class='setup-environment'>FIRST-TIME SETUP</span><span class='setup-host'><?= $host ?></span></div>
</header>
<main id='si_setup_main' class='setup-layout'>
    <aside class='setup-sidebar'>
        <p class='setup-sidebar-label'>GETTING STARTED</p>
        <h2>Install Super Intuitive</h2>
        <p class='setup-sidebar-intro'>Six steps to a website of your own.</p>
        <nav aria-label='Installation steps'>
            <ol class='setup-steps'>
                <li><button class='menuitem is-current' id='mi_sysinfo' type='button' aria-current='step' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>01</span><span>System info<small>Domain &amp; notifications</small></span></button></li>
                <li><button class='menuitem' id='mi_database' type='button' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>02</span><span>Database<small>Connect your database</small></span></button></li>
                <li><button class='menuitem' id='mi_local' type='button' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>03</span><span>Location<small>Language, time &amp; currency</small></span></button></li>
                <li><button class='menuitem' id='mi_admin' type='button' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>04</span><span>Administrator<small>Your first account</small></span></button></li>
                <li><button class='menuitem' id='mi_review' type='button' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>05</span><span>Review<small>Check your settings</small></span></button></li>
                <li><button class='menuitem' id='mi_install' type='button' onclick='SI.Setup.MenuItemClick(this.id)'><span class='setup-step-number'>06</span><span>Install<small>Bring your site to life</small></span></button></li>
            </ol>
        </nav>
        <p class='setup-sidebar-note'>A visual way to build.<br>A website that belongs to you.</p>
    </aside>
    <div class='setup-content'>
        <p class='setup-eyebrow'>INSTALLATION <span aria-hidden='true'>/</span> <span id='si_setup_step_label'>STEP 01 OF 06</span></p>
        <form id='si_setup_form' onsubmit='return false;' aria-label='Website installation' data-setup-authorized='<?= $setupAuthorized ? 'true' : 'false' ?>'>
            <input type='hidden' id='si_setup_csrf' name='SI_CSRF' value='<?= $csrf ?>' />
            <article class='article' id='sysinfo' aria-labelledby='si_setup_sysinfo_title'>
                <h1 id='si_setup_sysinfo_title' tabindex='-1'>Set up your website.</h1>
                <p class='setup-lead'>Start with the basics. Tell Super Intuitive where your new site will live.</p>
                <div class='setup-fields'>
                    <div class='setup-field' id='si_setup_key_field' <?= $setupAuthorized ? 'hidden' : '' ?>>
                        <label for='si_setup_key'>Installation key</label>
                        <p class='setup-help' id='si_setup_key_help'>Enter the installation key configured for this server.</p>
                        <input id='si_setup_key' type='password' autocomplete='off' data-group='sysinfo' <?= $setupAuthorized ? 'disabled' : 'required' ?> minlength='32' maxlength='256' placeholder='Paste your installation key' aria-describedby='si_setup_key_help' />
                    </div>
                    <p id='si_setup_authorization_status' class='setup-result' role='status' <?= $setupAuthorized ? "data-state='success'" : 'hidden' ?>><?= $setupAuthorized ? 'Installation authorized for this session.' : '' ?></p>
                    <div class='setup-field'>
                        <label for='si_setup_host'>Domain name</label>
                        <p class='setup-help' id='si_setup_host_help'>Use the hostname only, without a protocol or port.</p>
                        <div class='setup-input-status'><input id='si_setup_host' name='domain' value='<?= $host ?>' data-group='sysinfo' onchange='this.value = this.value.trim(); SI.Setup.TestDomain();' required aria-describedby='si_setup_host_help' /><span id='si_setup_domainsuccess' class='setup-result' role='status'></span></div>
                    </div>
                    <div class='setup-field'>
                        <label for='si_setup_hostemail'>Notifications email <span class='setup-optional'>Optional</span></label>
                        <p class='setup-help' id='si_setup_email_help'>An email address for site notifications.</p>
                        <input id='si_setup_hostemail' type='email' name='noteemail' value='<?= $notificationEmail ?>' placeholder='you@example.com' data-group='sysinfo' aria-describedby='si_setup_email_help' />
                    </div>
                </div>
                <aside class='setup-note'><span class='setup-note-symbol' aria-hidden='true'>i</span><p>Your settings stay in this form as you move between steps. You can go back to make changes before installing.</p></aside>
            </article>
            <article class='article' id='database' aria-labelledby='si_setup_database_title' style='display:none'>
                <h1 id='si_setup_database_title' tabindex='-1'>Connect your database.</h1>
                <p class='setup-lead'>Choose where your pages, content, and settings will be stored.</p>
                <div class='setup-fields'>
                    <div class='setup-field'><label for='si_setup_dbtype'>Database type</label><select name='dbtype' id='si_setup_dbtype' required><?= $dboptions ?></select></div>
                    <div class='setup-field-row'>
                        <div class='setup-field'><label for='si_setup_dbserver'>Server</label><input name='dbserver' id='si_setup_dbserver' value='localhost' data-group='database' required /></div>
                        <div class='setup-field setup-port'><label for='si_setup_dbport'>Port</label><input type='number' id='si_setup_dbport' name='dbport' min='1' max='65535' step='1' value='3306' data-group='database' required /></div>
                    </div>
                    <fieldset class='setup-login-mode'>
                        <legend>Database login</legend>
                        <label class='setup-radio'><input type='radio' value='privuser' checked name='dbuserradio' onchange='SI.Setup.ChangeDbLoginType(this)' data-group='database' id='si_setup_privuser' /><span>Create a database and user<small>Use an account with permission to create both.</small></span></label>
                        <label class='setup-radio'><input type='radio' value='existuser' name='dbuserradio' onchange='SI.Setup.ChangeDbLoginType(this)' data-group='database' id='si_setup_existuser' /><span>Use an existing database and user<small>Connect with database credentials you already have.</small></span></label>
                    </fieldset>
                    <div id='si_prevuserbox' class='setup-credential-fields'>
                        <div class='setup-field'><label for='si_setup_pruser'>Privileged user</label><input name='privuser' id='si_setup_pruser' value='root' required data-group='database' autocomplete='username' /></div>
                        <div class='setup-field'><label for='si_setup_prpw'>Privileged password</label><input name='privpass' type='password' value='x' id='si_setup_prpw' required data-group='database' autocomplete='current-password' /></div>
                        <div class='setup-field'><label for='si_setup_newun'>New database user</label><input name='newuser' value='super_intuitive' id='si_setup_newun' data-group='database' /></div>
                        <div class='setup-field'><label for='si_setup_newdb'>New database</label><input name='newdbname' value='super_intuitive' id='si_setup_newdb' data-group='database' /></div>
                    </div>
                    <div id='si_existuserbox' class='setup-credential-fields' style='display:none'>
                        <div class='setup-field'><label for='si_setup_exdb'>Existing database</label><input name='existdb' value='database' id='si_setup_exdb' data-group='database' /></div>
                        <div class='setup-field'><label for='si_setup_exun'>Existing database user</label><input name='existuser' value='username' id='si_setup_exun' data-group='database' autocomplete='username' /></div>
                        <div class='setup-field'><label for='si_setup_expw'>Existing database password</label><input name='existpass' value='x' type='password' id='si_setup_expw' data-group='database' autocomplete='current-password' /></div>
                    </div>
                    <div class='setup-test-connection'><button type='button' class='setup-secondary' onclick='SI.Setup.TestDatabase()'>Test connection</button><span id='si_setup_dbsuccess' class='setup-result' role='status'></span></div>
                </div>
            </article>
            <article class='article' id='local' aria-labelledby='si_setup_local_title' style='display:none'>
                <h1 id='si_setup_local_title' tabindex='-1'>Make yourself at home.</h1>
                <p class='setup-lead'>Set the language, timezone, and currency your site will use.</p>
                <div class='setup-fields'>
                    <div class='setup-field'><label for='si_setup_lang'>Primary language</label><select name='language' id='si_setup_lang' required data-group='local'><?= $langoptions ?></select></div>
                    <div class='setup-field'><label for='si_setup_timezone'>Primary timezone</label><select name='timezone' id='si_setup_timezone' required data-group='local'><?= $timezonesoptions ?></select></div>
                    <div class='setup-field'><label for='si_setup_currency'>Primary currency</label><select name='currency' id='si_setup_currency' required data-group='local'><?= $currenciesoptions ?></select></div>
                </div>
            </article>
            <article class='article' id='admin' aria-labelledby='si_setup_admin_title' style='display:none'>
                <h1 id='si_setup_admin_title' tabindex='-1'>Create your first account.</h1>
                <p class='setup-lead'>This administrator account gives you access to your site and its editing tools.</p>
                <div class='setup-fields'>
                    <div class='setup-field'><label for='si_setup_adminuser'>Username</label><input name='adminuser' id='si_setup_adminuser' value='admin' required data-group='admin' autocomplete='username' /></div>
                    <div class='setup-field'><label for='si_setup_adminpassword'>Password</label><p class='setup-help' id='si_setup_password_help'>Use at least 10 characters.</p><div class='setup-password-row'><input name='adminpw' type='password' value='' required minlength='10' id='si_setup_adminpassword' data-group='admin' autocomplete='new-password' aria-describedby='si_setup_password_help' /><button type='button' class='setup-secondary' onclick='SI.Setup.SetRandomPassword("si_setup_adminpassword")'>Generate password</button></div></div>
                    <div class='setup-field'><label for='si_setup_adminemail'>Email address</label><input name='adminemail' type='email' value='' required id='si_setup_adminemail' data-group='admin' autocomplete='email' placeholder='you@example.com' /></div>
                </div>
            </article>
            <article class='article' id='review' aria-labelledby='si_setup_review_title' style='display:none'>
                <h1 id='si_setup_review_title' tabindex='-1'>Ready when you are.</h1>
                <p class='setup-lead'>Check your settings below. Go back to any step to make a change, or install your new site.</p>
                <div class='setup-review-table'><table id='reviewtable'>
                    <caption class='setup-sr-only'>Installation settings</caption>
                    <tbody>
                        <tr><th colspan='2' scope='colgroup'>Site info</th></tr>
                        <tr><td>Domain name</td><td id='si_setup_host_rv'></td></tr>
                        <tr><td>Notifications email</td><td id='si_setup_hostemail_rv'></td></tr>
                        <tr><th colspan='2' scope='colgroup'>Database</th></tr>
                        <tr><td>Type</td><td id='si_setup_dbtype_rv'></td></tr>
                        <tr data-db-mode='privuser'><td>Privileged user</td><td id='si_setup_pruser_rv'></td></tr>
                        <tr data-db-mode='privuser'><td>Privileged password</td><td id='si_setup_prpw_rv'></td></tr>
                        <tr data-db-mode='privuser'><td>New database</td><td id='si_setup_newdb_rv'></td></tr>
                        <tr data-db-mode='privuser'><td>New database user</td><td id='si_setup_newun_rv'></td></tr>
                        <tr data-db-mode='existuser'><td>Existing database</td><td id='si_setup_exdb_rv'></td></tr>
                        <tr data-db-mode='existuser'><td>Existing database user</td><td id='si_setup_exun_rv'></td></tr>
                        <tr data-db-mode='existuser'><td>Existing database password</td><td id='si_setup_expw_rv'></td></tr>
                        <tr><th colspan='2' scope='colgroup'>Location</th></tr>
                        <tr><td>Language</td><td id='si_setup_lang_rv'></td></tr>
                        <tr><td>Timezone</td><td id='si_setup_timezone_rv'></td></tr>
                        <tr><td>Currency</td><td id='si_setup_currency_rv'></td></tr>
                        <tr><th colspan='2' scope='colgroup'>Administrator</th></tr>
                        <tr><td>Username</td><td id='si_setup_adminuser_rv'></td></tr>
                        <tr><td>Password</td><td id='si_setup_adminpassword_rv'></td></tr>
                        <tr><td>Email address</td><td id='si_setup_adminemail_rv'></td></tr>
                    </tbody>
                </table></div>
            </article>
            <article class='article' id='install' aria-labelledby='si_setup_install_title' style='display:none'>
                <h1 id='si_setup_install_title' tabindex='-1'>Bringing your site to life.</h1>
                <p class='setup-lead'>Super Intuitive is preparing your database and default pages.</p>
                <div class='setup-install-status'><progress max='100' id='progressmeter' aria-label='Installation progress'></progress><p id='progressupdate' role='status'>Creating your website…</p></div>
            </article>
            <div class='setup-actions'>
                <span id='si_setup_action_hint'>Your website starts here.</span>
                <div><button id='btnback' type='button' class='setup-secondary' style='display:none' onclick='SI.Setup.ButtonClick(this)'>Back</button><button id='btnnext' type='button' class='setup-primary' onclick='SI.Setup.ButtonClick(this)'>Next</button></div>
            </div>
        </form>
        <footer class='setup-footer'><span>© <?= $year ?> Super Intuitive</span><span>A website of your own.</span></footer>
    </div>
</main>
<script>SI.Setup.Init();</script>
</body>
