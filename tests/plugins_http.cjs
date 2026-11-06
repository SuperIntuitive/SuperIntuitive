const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
    const config = JSON.parse(fs.readFileSync(0, 'utf8'));
    assert.equal(config.disposable, true);
    let checks = 0;
    const check = (value, message) => { assert(value, message); checks++; console.log('PASS sipl ' + message); };
    function client() {
        return {cookie: '', csrf: '', async request(path, post, csrf = true) {
            const response = await fetch(config.base + path, {method: post ? 'POST' : 'GET',
                headers: {Cookie: this.cookie, ...(post ? {'Content-Type': 'application/json', ...(csrf ? {'X-SI-CSRF': this.csrf} : {})} : {})}, body: post ? JSON.stringify(post) : undefined});
            const cookies = response.headers.getSetCookie(); if (cookies.length) this.cookie = cookies[0].split(';')[0];
            const text = await response.text(); let data;
            try { data = JSON.parse(text); if (Array.isArray(data)) data = data[0]; } catch {}
            return {status: response.status, text, data};
        }, async bootstrap() { this.csrf = (await this.request('/__sipl/bootstrap')).data.csrf; }};
    }
    const guest = client(); await guest.bootstrap();
    let r = await guest.request('/plugin-asset.php?plugin=legacy&file=image.png'); check(r.status === 200 && r.text === 'PNG fixture', 'confined legacy image asset loads');
    r = await guest.request('/contact-form'); check(r.status === 200 && r.text.includes('Let&rsquo;s talk.'), 'public form renders from SQL');
    const post = {KEY: 'PluginAction', plugin: 'contact', action: 'submit', name: 'Native HTTP', email: 'native-http@example.test', subject: 'HTTP native', message: 'Native HTTP submission'};
    r = await guest.request('/delegate.php', post, false); check(r.status === 403, 'missing CSRF rejected');
    r = await guest.request('/delegate.php', post); check(r.status === 200 && r.data.submitted, 'native plugin dispatch executes');
    const canonical = {...post, topic: 'SIPL', submission: require('node:crypto').randomBytes(16).toString('hex'), email: 'status-sipl@example.test'}; delete canonical.subject;
    r = await guest.request('/delegate.php', canonical); check(r.status === 200 && r.data.CONTACTSENT, 'topic/token submission succeeds'); const receipt = r.data.CONTACTSENT;
    r = await guest.request('/delegate.php', canonical); check(r.status === 200 && r.data.CONTACTSENT.id === receipt.id, 'retry returns identical receipt');
    r = await guest.request('/delegate.php', {...canonical, message: 'Changed body'}); check(r.status === 409 && r.data.code === 'CONTACT_SUBMISSION_CONFLICT' && !('__httpStatus' in r.data), 'conflicting retry returns 409');
    r = await guest.request('/delegate.php', {...canonical, topic: 'unknown'}); check(r.status === 400 && r.data.field === 'topic', 'validation returns 400 and field');
    r = await guest.request('/delegate.php', {KEY: 'PluginAction', plugin: 'contact', action: 'update', id: receipt.id, state: 'read'}); check(r.status === 403, 'guest cannot mark messages read');
    r = await guest.request('/admin/contact'); check(r.status === 403, 'guest inbox page forbidden');
    r = await guest.request('/delegate.php', {KEY: 'PluginAction', plugin: 'contact', action: 'inbox'}); check(r.status === 403, 'guest inbox action forbidden');
    for (const path of ['/plugins/installed/example/php/main.php', '/plugins/installed/example/sipl/main.sipl', '/plugins/installed/example/sql/schema.sql', '/core/plugin-schema.sql', '/core/plugin-packages/contact/install.json', '/plugin-packages/contact/php/contact.php']) {
        r = await guest.request(path); check(r.status === 403 && !r.text.includes('PRIVATE SOURCE SENTINEL'), 'backend source blocked ' + path);
    }
    const admin = client(); await admin.bootstrap();
    r = await admin.request('/delegate.php', {KEY: 'LoginAttempt', email: 'admin@example.test', password: config.password}); check(r.status === 200 && r.data.REFRESH, 'existing Admin login'); await admin.bootstrap();
    r = await admin.request('/admin/contact'); check(r.status === 200 && r.text.includes('Contact messages'), 'Admin inbox renders');
    r = await admin.request('/delegate.php', {KEY: 'PluginAction', plugin: 'contact', action: 'inbox'}); check(r.status === 200 && r.data.messages.length >= 4, 'Admin reads shared inbox');
    r = await admin.request('/delegate-admin.php', {KEY: 'PluginAction', plugin: 'contact', action: 'update', id: receipt.id, state: 'read'}); check(r.status === 200 && r.data.CONTACTMESSAGEUPDATED.state === 'read', 'Admin marks message read');
    r = await admin.request('/delegate.php', {KEY: 'ChangeDeployment', Deployment: 'dev'}); check(r.status === 200, 'Admin enters Dev');
    r = await admin.request('/delegate-admin.php', {KEY: 'DisablePlugin', plugin: 'contact'}); check(r.status === 200 && r.data.PLUGINSTATE, 'Admin disables generically');
    r = await guest.request('/delegate.php', post); check(r.status >= 400, 'disabled action rejected');
    r = await guest.request('/contact-form'); check(r.status === 403, 'disabled page rejected');
    r = await admin.request('/delegate-admin.php', {KEY: 'EnablePlugin', plugin: 'contact'}); check(r.status === 200 && r.data.PLUGINSTATE, 'Admin enables generically');
    r = await guest.request('/scripts/plugins.js'); check(r.status === 200 && r.text.includes('SIContact'), 'js bundle preserved');
    r = await admin.request('/editor/editor.js'); check(r.status === 200 && r.text.includes('admin/contact') && r.text.includes('SI.Editor'), 'Admin editor includes registered navigation');
    console.log('Native HTTP checks passed: ' + checks);
})().catch(error => { console.error(error); process.exitCode = 1; });
