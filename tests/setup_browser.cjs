// Node.js 22+ and Chrome. Uses a copy of the rendered installer and mocked setup
// responses; it never submits an installation to the running site's database.
// Run: node tests/setup_browser.cjs [http://localhost:8090]
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');

async function main() {
    const source = process.argv[2] || 'http://localhost:8090';
    const html = await (await fetch(source)).text();
    assert(html.includes("id='si_setup_form'"), 'Source must show a fresh installer');
    const chrome = process.env.CHROME || [
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'
    ].find(file => fs.existsSync(file));
    assert(chrome, 'Set CHROME to a Chrome/Chromium executable');
    const root = path.resolve(__dirname, '..');
    const requests = [];
    let response = {outcome: true};
    let status = 200;
    const server = http.createServer(async (req, res) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/delegate.php') {
            let body = '';
            for await (const chunk of req) body += chunk;
            const payload = JSON.parse(body);
            requests.push({body: payload, headers: req.headers});
            if (payload.KEY === 'AuthorizeSetup') {
                const valid = req.headers['x-si-setup'] === 'k'.repeat(64);
                res.writeHead(valid ? 200 : 403, {'Content-Type': 'application/json'});
                res.end(JSON.stringify(valid ? {outcome: true, authorized: true, csrf: 'c'.repeat(64)}
                    : {outcome: false, code: 'SETUP_KEY_INVALID', message: 'The installation key is incorrect.'}));
            } else {
                res.writeHead(status, {'Content-Type': 'application/json'});
                res.end(typeof response === 'string' ? response : JSON.stringify(response));
            }
        } else if (url.pathname === '/scripts/setup.js') {
            res.setHeader('Content-Type', 'text/javascript');
            res.end(fs.readFileSync(path.join(root, 'scripts/setup.js')));
        } else if (url.pathname === '/style/setup.css') {
            res.setHeader('Content-Type', 'text/css');
            res.end(fs.readFileSync(path.join(root, 'style/setup.css')));
        } else if (url.pathname === '/') {
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
        } else {
            res.writeHead(404).end();
        }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'si-setup-browser-'));
    const browser = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {stdio: 'ignore'});
    let socket;
    let send;
    try {
        const portFile = path.join(profile, 'DevToolsActivePort');
        const waitFor = async (predicate, message) => {
            const deadline = Date.now() + 15000;
            while (Date.now() < deadline) {
                if (await predicate()) return;
                await new Promise(resolve => setTimeout(resolve, 50));
            }
            throw new Error('Timed out: ' + message);
        };
        await waitFor(() => fs.existsSync(portFile), 'Chrome startup');
        const [port, endpoint] = fs.readFileSync(portFile, 'utf8').trim().split(/\r?\n/);
        socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
        await new Promise((resolve, reject) => {
            socket.addEventListener('open', resolve, {once: true});
            socket.addEventListener('error', reject, {once: true});
        });
        let sequence = 0;
        const pending = new Map();
        const exceptions = [];
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params);
            if (pending.has(message.id)) {
                const {resolve, reject, timer} = pending.get(message.id);
                clearTimeout(timer);
                pending.delete(message.id);
                message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
            }
        });
        send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
            const id = ++sequence;
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(new Error('CDP timed out: ' + method));
            }, 15000);
            pending.set(id, {resolve, reject, timer});
            socket.send(JSON.stringify({id, method, params, sessionId}));
        });
        const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
        const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
        const evaluate = async expression => {
            const result = await send('Runtime.evaluate', {expression, returnByValue: true}, sessionId);
            assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
            return result.result.value;
        };
        const click = id => evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
        const fill = (id, value) => evaluate(`document.getElementById(${JSON.stringify(id)}).value = ${JSON.stringify(value)}`);
        const step = async expected => waitFor(async () => await evaluate('SI.Setup.SelectedArticle') === expected, 'step '+expected);
        const type = async (id, value) => {
            await fill(id, '');
            await evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`);
            await send('Input.insertText', {text: value}, sessionId);
        };
        let checks = 0;
        const pass = message => { checks++; console.log('PASS ' + message); };
        await send('Runtime.enable', {}, sessionId);
        await send('Page.navigate', {url: 'http://127.0.0.1:' + server.address().port}, sessionId);
        await waitFor(async () => await evaluate('document.readyState') === 'complete', 'installer page');
        await evaluate('window.alerts = []; window.alert = message => window.alerts.push(message)');
        await click('btnnext');
        await step('sysinfo');
        assert.equal(await evaluate('document.activeElement.id'), 'si_setup_key');
        await type('si_setup_key', 'short');
        await click('btnnext');
        await step('sysinfo');
        assert.equal(await evaluate('document.getElementById("si_setup_key").validity.tooShort'), true);
        pass('Missing and short keys stay on System Info with visible field validation');

        await type('si_setup_key', 'w'.repeat(64));
        await click('btnnext');
        await waitFor(async () => (await evaluate('document.getElementById("si_setup_authorization_status").textContent')).includes('incorrect'), 'incorrect-key rejection');
        await step('sysinfo');
        assert.equal(await evaluate('SI.Setup.Authorized'), false);
        assert.equal(requests.filter(req => req.body.KEY === 'TestDatabase').length, 0);
        pass('Step 1 rejects a well-formed incorrect key before entering Database');
        await type('si_setup_key', 'k'.repeat(64));
        await fill('si_setup_hostemail', '');
        await fill('si_setup_timezone', '');
        await click('btnnext');
        await step('database');
        pass('Next advances despite required fields on hidden steps');
        assert.equal(await evaluate('SI.Setup.Authorized'), true);
        assert.equal(await evaluate('document.getElementById("si_setup_key").value'), '');
        assert.equal(await evaluate('document.getElementById("si_setup_key").disabled'), true);
        assert.equal(await evaluate('document.getElementById("si_setup_csrf").value'), 'c'.repeat(64));
        assert.equal(requests.filter(req => req.body.KEY === 'AuthorizeSetup').length, 2);
        pass('Successful authorization clears and disables the key and updates the CSRF token');
        await click('si_setup_existuser');
        await fill('si_setup_exdb', '');
        await click('btnnext');
        await step('database');
        assert.equal(await evaluate('document.activeElement.id'), 'si_setup_exdb');
        await click('btnback');
        await step('sysinfo');
        pass('Database errors focus the field, and Back works with incomplete fields');
        await click('btnnext');
        await fill('si_setup_exdb', 'super_intuitive');
        await fill('si_setup_exun', 'super_intuitive');
        await fill('si_setup_expw', 'super_intuitive');
        await fill('si_setup_dbserver', 'db');
        response = {outcome: false, message: 'Unable to connect to the database.'}; status = 200;
        await evaluate('SI.Setup.TestDatabase()');
        await waitFor(async () => (await evaluate('document.getElementById("si_setup_dbsuccess").textContent')).includes('Unable to connect'), 'database error');
        const testRequest = requests.at(-1);
        assert.equal(testRequest.body.KEY, 'TestDatabase');
        assert.equal(testRequest.body.existdb, 'super_intuitive');
        assert.equal(testRequest.headers['x-si-setup'], undefined);
        assert.equal(testRequest.headers['x-si-csrf'], 'c'.repeat(64));
        pass('Connection testing sends real settings before Admin is filled and displays server errors');
        response = {outcome: true}; status = 200;
        await evaluate('SI.Setup.TestDatabase()');
        await waitFor(async () => await evaluate('document.getElementById("si_setup_dbsuccess").textContent') === '✔', 'successful connection');
        await evaluate('SI.Setup.TestDomain()');
        await waitFor(async () => await evaluate('document.getElementById("si_setup_domainsuccess").textContent') === '✔', 'domain test');
        assert.equal(requests.at(-1).body.KEY, 'TestDomain');
        pass('Connection and domain checks work with the remaining wizard incomplete');
        await click('btnnext');
        await step('local');
        await click('btnnext');
        await step('local');
        assert.equal(await evaluate('document.activeElement.id'), 'si_setup_timezone');
        await fill('si_setup_timezone', 'America/New_York');
        await fill('si_setup_currency', 'usd');
        await fill('si_setup_lang', 'en');
        await click('btnnext');
        await step('admin');
        await click('btnnext');
        await step('admin');
        await type('si_setup_adminpassword', 'short');
        await click('btnnext');
        await step('admin');
        await type('si_setup_adminpassword', '123456789');
        await click('btnnext');
        await step('admin');
        await type('si_setup_adminpassword', 'Ten-chars!');
        await fill('si_setup_adminemail', 'admin@example.test');
        await click('btnnext');
        await step('review');
        assert.equal(await evaluate('document.getElementById("si_setup_adminpassword_rv").textContent'), '••••••••');
        pass('Location and Admin validate when reached, then Review masks passwords');
        await fill('si_setup_host', '');
        await click('btnnext');
        await step('sysinfo');
        assert.equal(requests.filter(req => req.body.KEY === 'SetupSuperIntuitive').length, 0);
        await click('mi_install');
        await step('sysinfo');
        await fill('si_setup_host', 'localhost');
        await fill('si_setup_adminpassword', '');
        await click('mi_install');
        await step('admin');
        pass('Install and sidebar shortcuts validate all steps and open the first invalid field');
        await type('si_setup_adminpassword', 'Ten-chars!');
        await click('btnnext');
        await step('review');
        response = {outcome: false, code: 'SETUP_VALIDATION_FAILED', field: 'si_setup_hostemail', message: 'Enter a complete email address or leave it blank.'}; status = 400;
        await click('btnnext');
        await step('sysinfo');
        assert.equal(await evaluate('document.activeElement.id'), 'si_setup_hostemail');
        assert.equal(await evaluate('document.getElementById("si_setup_exdb").value'), 'super_intuitive');
        await fill('si_setup_hostemail', 'info@example.test');
        await evaluate('document.getElementById("si_setup_hostemail").dispatchEvent(new Event("input"))');
        await click('mi_review');
        await step('review');
        pass('Final validation opens the rejected field and preserves all other settings');
        response = '<html>Proxy error</html>'; status = 502;
        await click('btnnext');
        await waitFor(async () => await evaluate('SI.Setup.SelectedArticle') === 'review', 'installation error recovery');
        assert.equal(await evaluate('SI.Setup.Installing'), false);
        assert((await evaluate('window.alerts.at(-1)')).includes('unexpected response'));
        assert.equal(requests.at(-1).body.KEY, 'SetupSuperIntuitive');
        assert.equal(requests.at(-1).body.adminemail, 'admin@example.test');
        await click('btnback');
        await step('admin');
        await click('mi_sysinfo');
        await step('sysinfo');
        pass('Non-JSON server failures display an error and allow correction or retry');
        assert.equal(requests.filter(req => req.body.KEY === 'AuthorizeSetup').length, 2);
        assert(requests.filter(req => req.body.KEY !== 'AuthorizeSetup').every(req => req.headers['x-si-setup'] === undefined));
        pass('All later steps, including Install, use one authorization and never resend the key');
        await click('btnnext');
        await step('database');
        response = {outcome: false, code: 'SETUP_AUTH_REQUIRED', message: 'Authorize setup again in Step 1.'}; status = 403;
        await evaluate('SI.Setup.TestDatabase()');
        await waitFor(async () => await evaluate('SI.Setup.Authorized') === false, 'expired authorization');
        await step('sysinfo');
        assert.equal(await evaluate('document.getElementById("si_setup_exdb").value'), 'super_intuitive');
        await type('si_setup_key', 'k'.repeat(64));
        await click('btnnext');
        await step('database');
        assert.equal(await evaluate('document.getElementById("si_setup_exdb").value'), 'super_intuitive');
        assert.equal(requests.filter(req => req.body.KEY === 'AuthorizeSetup').length, 3);
        pass('Expired authorization returns to Step 1 and preserves database settings on reauthorization');
        response = {outcome: false, code: 'CSRF_INVALID', csrf: 'd'.repeat(64), message: 'Your session has expired. Authorize again in Step 1.'};
        await evaluate('SI.Setup.TestDatabase()');
        await waitFor(async () => await evaluate('SI.Setup.Authorized') === false, 'lost PHP session');
        await step('sysinfo');
        assert.equal(await evaluate('document.getElementById("si_setup_csrf").value'), 'd'.repeat(64));
        await type('si_setup_key', 'k'.repeat(64));
        await click('btnnext');
        await step('database');
        assert.equal(requests.at(-1).headers['x-si-csrf'], 'd'.repeat(64));
        assert.equal(await evaluate('document.getElementById("si_setup_exdb").value'), 'super_intuitive');
        pass('A lost PHP session refreshes CSRF and allows secure reauthorization without clearing settings');
        assert.deepEqual(exceptions, [], 'No browser JavaScript exceptions');
        console.log(`${checks} browser regression checks passed; no live installation submitted.`);
    } finally {
        if (send && socket.readyState === WebSocket.OPEN) {
            await send('Browser.close').catch(() => {});
        }
        if (socket) socket.close();
        if (browser.exitCode === null) {
            await new Promise(resolve => {
                const timer = setTimeout(() => { browser.kill(); resolve(); }, 5000);
                browser.once('exit', () => { clearTimeout(timer); resolve(); });
            });
        }
        await new Promise(resolve => server.close(resolve));
        await fs.promises.rm(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
