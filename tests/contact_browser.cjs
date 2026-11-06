const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawn} = require('node:child_process');
(async () => {
    const categoriesOnly = process.argv.includes('--plugin-categories');
    const config = categoriesOnly ? {disposable: true, backend: 'CMS'} : JSON.parse(fs.readFileSync(0, 'utf8')); assert.equal(config.disposable, true);
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'si-contact-'));
    const executable = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(file => fs.existsSync(file));
    assert(executable, 'Chrome is required for contact browser checks');
    const chrome = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], {stdio: 'ignore'});
    let socket, send, checks = 0;
    const check = (value, message) => { assert(value, message); checks++; console.log('PASS ' + config.backend + ' browser ' + message); };
    try {
        const active = path.join(profile, 'DevToolsActivePort');
        let deadline = Date.now() + 15000;
        while (!fs.existsSync(active)) { if (Date.now() > deadline) throw Error('Chrome did not start'); await new Promise(resolve => setTimeout(resolve, 50)); }
        const [port, endpoint] = fs.readFileSync(active, 'utf8').trim().split(/\r?\n/);
        socket = new WebSocket('ws://127.0.0.1:' + port + endpoint);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, {once: true}); socket.addEventListener('error', reject, {once: true}); });
        let id = 0; const pending = new Map(), exceptions = [];
        socket.addEventListener('message', event => {
            const message = JSON.parse(event.data);
            if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params);
            if (pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(Error(JSON.stringify(message.error))) : item.resolve(message.result); }
        });
        send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
            const next = ++id, timer = setTimeout(() => { pending.delete(next); reject(Error('Timed out: ' + method)); }, 20000);
            pending.set(next, {resolve, reject, timer}); socket.send(JSON.stringify({id: next, method, params, sessionId}));
        });
        const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
        const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
        const evaluate = async expression => { const result = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, sessionId); assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value; };
        const waitFor = async (expression, message) => { const end = Date.now() + 20000; while (Date.now() < end) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(message + ' ' + await evaluate('document.body.innerText.slice(0,1000)')); };
        const navigate = async (route, ready) => { await send('Page.navigate', {url: config.base + route}, sessionId); await waitFor('location.pathname === ' + JSON.stringify(route) + ' && document.readyState === "complete" && (' + ready + ')', 'Page failed to load ' + route); };
        const resize = async width => { await send('Emulation.setDeviceMetricsOverride', {width, height: 1000, deviceScaleFactor: 1, mobile: false}, sessionId); };
        await send('Runtime.enable', {}, sessionId); await send('Page.enable', {}, sessionId); await resize(1440);
        if (categoriesOnly) {
            await evaluate('document.open();document.write("<!doctype html><html><head><title>CMS plugin categories</title></head><body></body></html>");document.close()');
            await evaluate('window.SI={Widgets:{},Widget:{},Editor:{Objects:{},Ajax:{Run:()=>{}},Data:{Objects:{Plugins:{Current:{},Downloaded:[]}}}}}');
            for (const file of ['scripts/tools.js', 'scripts/widgets/Tabs.js', 'editor/objects/plugins.js']) await evaluate(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
            await evaluate('document.body.appendChild(SI.Editor.Objects.Plugins.Draw());Array.from(document.querySelectorAll("[role=tab]")).find(tab=>tab.dataset.tabname==="Plugins Repo").click()');
            const catalog = [{name: 'Swiper', type: 'UI', download: 'swiper.zip'}, {name: 'Contact', type: 'Communication', download: 'contact.zip'}, {name: 'Forms', type: 'Data & Forms', download: 'forms.zip'}];
            await evaluate('SI.Editor.Objects.Plugins.Repo.StockFetchedPlugins(' + JSON.stringify(JSON.stringify(catalog)) + ')');
            const visible = () => evaluate('Array.from(document.querySelectorAll(".si-edit-plugins-plugin")).filter(card=>card.offsetParent!==null).map(card=>card.querySelector("span").textContent).join("|")');
            const select = category => evaluate('Array.from(document.querySelectorAll("#si_edit_plugins_repo_menu > div")).find(tab=>tab.textContent===' + JSON.stringify(category) + ').click()');
            check(await visible() === 'Name: Swiper|Name: Contact|Name: Forms', 'plugin repository initially shows every card');
            await select('UI'); check(await visible() === 'Name: Swiper', 'UI tab shows Swiper and hides other categories');
            await select('Communication'); check(await visible() === 'Name: Contact', 'Communication tab shows Contact');
            await select('Data & Forms'); check(await visible() === 'Name: Forms', 'category names containing spaces and punctuation filter correctly');
            await select('All'); check(await visible() === 'Name: Swiper|Name: Contact|Name: Forms', 'All tab exists after mounting and restores every card');
            for (let index = 0; index < 3; index++) { await select('UI'); await select('Communication'); await select('All'); }
            check(await visible() === 'Name: Swiper|Name: Contact|Name: Forms', 'repeated category switching preserves the plugin cards');
            check(exceptions.length === 0, 'category switching raises no browser exceptions');
            console.log('Plugin category browser checks passed: ' + checks);
            return;
        }
        await navigate('/contact-form', 'document.getElementById("si_contact_submit") && !document.getElementById("si_contact_submit").disabled');
        check(await evaluate('Array.from(document.querySelector("#si_contact_topic").options).map(option=>option.textContent).join("|") === "General|SuperIntuitive CMS|Gameatude|SIPL"'), 'source product topics and form initialize');
        for (const width of [1440, 390, 320]) {
            await resize(width);
            check(await evaluate('Array.from(document.querySelectorAll("#si_contact_form input:not([tabindex]),#si_contact_form select,#si_contact_form textarea")).every(input=>{const r=input.getBoundingClientRect();return r.width>0 && r.left>=0 && r.right<=innerWidth+1})'), 'form fits ' + width + 'px viewport');
        }
        await resize(1440);
        const email = 'browser-' + config.backend + '@example.test';
        const body = '<img src=x onerror="window.contactXss=1"> Hello from ' + config.backend;
        await evaluate('(()=>{const form=document.getElementById("si_contact_form");Object.entries(' + JSON.stringify({name: 'Browser Sender', email, topic: 'SIPL', message: body, website: 'spam'}) + ').forEach(([key,value])=>{form.elements.namedItem(key).value=value;});form.querySelector("button").click();})()');
        await waitFor('document.getElementById("si_contact_status").getAttribute("role")==="alert" && !document.getElementById("si_contact_submit").disabled', 'Validation response missing');
        check(await evaluate('document.getElementById("si_contact_message").value === ' + JSON.stringify(body)), 'failed submission retains user text');
        await evaluate('document.getElementById("si_contact_website").value="";document.getElementById("si_contact_submit").click()');
        await waitFor('document.getElementById("si_contact_status").textContent.includes("received by our team") && !document.getElementById("si_contact_submit").disabled', 'Form submission failed');
        check(await evaluate('document.getElementById("si_contact_message").value===""'), 'successful submission clears form and confirms receipt');
        if (config.screenshotDir) { const image = await send('Page.captureScreenshot', {format: 'png'}, sessionId); fs.writeFileSync(path.join(config.screenshotDir, config.backend + '-contact.png'), Buffer.from(image.data, 'base64')); }
        const denied = await evaluate('(async()=>{const response=await fetch("/delegate-admin.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify({KEY:"PluginAction",plugin:"contact",action:"inbox"})});return response.status;})()');
        check(denied === 403, 'guest cannot load private inbox data');
        const login = await evaluate('(async()=>{const response=await fetch("/delegate.php",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify(' + JSON.stringify({KEY: 'LoginAttempt', email: config.email, password: config.password}) + ')});return response.status===200;})()');
        check(login, 'administrator authenticates through existing login');
        await navigate('/admin/contact', 'document.getElementById("si_inbox_counts") && document.getElementById("si_inbox_counts").textContent.includes(" unread")');
        check(await evaluate('document.querySelectorAll("#si_inbox_messages details").length===20 && !document.getElementById("si_inbox_more").hidden'), 'inbox shows twenty messages and Load more');
        check(await evaluate('Array.from(document.querySelectorAll(".si-inbox-body")).some(node=>node.textContent===' + JSON.stringify(body) + ') && !window.contactXss && document.querySelectorAll("#si_inbox_messages img,#si_inbox_messages script").length===0'), 'stored HTML-looking message displays as plain text');
        await evaluate('(()=>{const row=Array.from(document.querySelectorAll(".si-inbox-message")).find(node=>node.querySelector(".si-inbox-body").textContent===' + JSON.stringify(body) + ');row.open=true;window.contactTestId=row.dataset.id;window.contactTestRow=row;row.querySelector("button").click();})()');
        await waitFor('window.contactTestRow.querySelector(".si-inbox-state").textContent==="Read"', 'Mark read failed');
        check(await evaluate('window.contactTestRow.querySelector("button").textContent==="Mark as unread"'), 'read-state control updates badge and button');
        await evaluate('window.contactTestRow.querySelector("button").click()');
        await waitFor('window.contactTestRow.querySelector(".si-inbox-state").textContent==="Unread"', 'Mark unread failed');
        check(true, 'mark unread persists');
        await evaluate('document.getElementById("si_inbox_more").click()');
        await waitFor('document.querySelectorAll("#si_inbox_messages details").length>20', 'Load more failed');
        check(await evaluate('new Set(Array.from(document.querySelectorAll("#si_inbox_messages details")).map(node=>node.dataset.id)).size===document.querySelectorAll("#si_inbox_messages details").length'), 'Load more appends distinct messages');
        await evaluate('document.getElementById("si_inbox_refresh").click()');
        await waitFor('document.querySelectorAll("#si_inbox_messages details").length===20 && !document.getElementById("si_inbox_refresh").disabled', 'Refresh failed');
        check(true, 'Refresh resets pagination');
        for (const width of [390, 320]) { await resize(width); check(await evaluate('document.querySelector(".si-contact").scrollWidth<=document.querySelector(".si-contact").clientWidth+1'), 'inbox fits ' + width + 'px viewport'); }
        await resize(1440);
        if (config.screenshotDir) { const image = await send('Page.captureScreenshot', {format: 'png'}, sessionId); fs.writeFileSync(path.join(config.screenshotDir, config.backend + '-inbox.png'), Buffer.from(image.data, 'base64')); }
        check(exceptions.length === 0, 'no uncaught browser exceptions: ' + exceptions.slice(0,10).map(item=>(item.exceptionDetails?.exception?.description||item.exceptionDetails?.text||JSON.stringify(item)).slice(0,1500)).join('; '));
        console.log('Contact browser checks passed: ' + checks);
    } finally {
        if (send && socket?.readyState === WebSocket.OPEN) { try { await send('Browser.close'); } catch {} socket.close(); }
        if (chrome.exitCode === null) chrome.kill();
        await new Promise(resolve => setTimeout(resolve, 500)); fs.rmSync(profile, {recursive: true, force: true, maxRetries: 6, retryDelay: 200});
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
