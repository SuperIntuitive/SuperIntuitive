const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '../..');

(async function () {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'si-sipl-http-'));
    const fixture = path.join(temporary, 'site');
    fs.mkdirSync(path.join(fixture, 'core'), {recursive:true});
    fs.mkdirSync(path.join(fixture, 'core_sipl'), {recursive:true});
    fs.cpSync(path.join(root, 'core_sipl/public'), path.join(fixture, 'core_sipl/public'), {recursive:true});
    fs.copyFileSync(path.join(root, 'core_sipl/switch.html'), path.join(fixture, 'core_sipl/switch.html'));
    fs.mkdirSync(path.join(fixture, 'core_sipl/generated'), {recursive:true});
    fs.cpSync(path.join(root, 'core_sipl/generated'), path.join(fixture, 'core_sipl/generated'), {recursive:true});
    for(const name of ['scripts','style'])fs.mkdirSync(path.join(fixture,name),{recursive:true});
    fs.copyFileSync(path.join(root,'scripts/setup.js'),path.join(fixture,'scripts/setup.js'));
    fs.copyFileSync(path.join(root,'style/setup.css'),path.join(fixture,'style/setup.css'));
    fs.writeFileSync(path.join(fixture, '.env'), 'PRIVATE SENTINEL');
    const setupToken = 'sipl-fixture-'+'a'.repeat(52);
    const configuration = path.join(temporary, 'config.json');
    fs.writeFileSync(configuration, JSON.stringify({root:fixture.replaceAll('\\','/'),port:0,host:'127.0.0.1',domain:'localhost',setupToken}));
    const environment = {...process.env};
    for (const key of Object.keys(environment)) if (key.startsWith('SI_SIPL_') || key === 'SI_SETUP_TOKEN') delete environment[key];
    const server = spawn(path.join(root, 'sipl.exe'), ['run', 'core_sipl/main.sipl', configuration], {cwd:root,env:environment,stdio:['ignore','pipe','pipe']});
    let output='', port, checks=0;
    const collect = data => {output=(output+data.toString()).slice(-16000);const match=output.match(/https?:\/\/(?:127\.0\.0\.1|localhost):(\d+)/);if(match)port=Number(match[1]);};
    server.stdout.on('data',collect);server.stderr.on('data',collect);
    let browser;
    try {
        const deadline=Date.now()+20000;
        while(!port){if(server.exitCode!==null)throw Error('SIPL failed to start: '+output);if(Date.now()>deadline)throw Error('SIPL startup timed out: '+output);await new Promise(r=>setTimeout(r,50));}
        const base='http://127.0.0.1:'+port;
        let cookie='';
        async function request(url, method='GET', data, headers={}, suppliedCookie=cookie) {
            const result=await fetch(base+url,{method,headers:{...(suppliedCookie?{Cookie:suppliedCookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json'}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
            const text=await result.text();
            const set=result.headers.getSetCookie();
            if(set.length && suppliedCookie===cookie)cookie=set[0].split(';')[0];
            let json;try{json=JSON.parse(text);}catch(_){}
            return {status:result.status,text,json,headers:result.headers,set};
        }
        function check(condition,message){assert(condition,message);checks++;}
        const status=await request('/__sipl/status');
        check(status.status===200 && status.json.backend==='sipl','Native status endpoint');
        check(typeof status.json.capabilities.mysqlDriver==='boolean','MySQL capability is explicit');
        check(status.json.capabilities.phpBcryptVerify===true && status.json.capabilities.phpBcryptHash===true,'PHP-compatible bcrypt capabilities are verified');
        check(status.headers.get('x-superintuitive-backend')==='sipl','Native backend response marker');
        check(status.headers.get('access-control-allow-origin')==='*','Public capability checks work from the PHP launcher');
        const bootstrap=await request('/__sipl/bootstrap');
        const csrf=bootstrap.json.csrf;
        check(bootstrap.status===200 && csrf.length>=32,'Opaque CSRF token');
        check(bootstrap.set.some(value=>value.includes('HttpOnly')&&value.includes('SameSite=Lax')),'Session cookie security');
        check(!bootstrap.text.includes(setupToken),'Installer secret is not exposed');
        const before=cookie;
        let response=await request('/delegate-admin.php','POST',{KEY:'NewUser'});
        check(response.status===403,'CSRF required');
        response=await request('/delegate-admin.php','POST',{KEY:'NewUser'},{'X-SI-CSRF':csrf});
        check(response.status===403,'Guest cannot invoke admin mutations');
        response=await request('/api.v1.php','POST',{Operation:'Retrieve',Entity:{Name:'users'}},{'X-SI-CSRF':csrf});
        check(response.status===403,'Guest cannot retrieve entity data');
        response=await request('/editor/editor.js');
        check(response.status===403,'Generated editor data is private');
        for(const url of ['/.env','/core/DbCreds.php','/core_sipl/src/Accounts.sipl','/core_sipl/php-baseline.json','/core_sipl/generated/editor.js.tmpl','/tests/security.php','/domains/localhost/media/private.txt','/core_sipl/config.local.json','/style/NUL.css','/core_sipl/src%2fAccounts.sipl']){
            response=await request(url);
            check(response.status===403 && !response.text.includes('PRIVATE SENTINEL'),'Private path is blocked: '+url);
        }
        response=await request('/', 'GET', undefined, {Accept:'text/html'});
        check(response.status===200 && response.text.includes("id='si_setup_form'") && !response.text.includes('<?php'), 'Unconfigured backend serves the native first-time wizard');
        response=await request('/media/documents/unsafe.svg');
        check(response.status===501 && response.json.capability==='SANDBOXED_MEDIA_RESPONSE_HEADERS','Active uploaded content requires sandbox headers');
        response=await request('/delegate.php');
        check(response.status===405,'GET cannot mutate');
        response=await request('/delegate.php','POST',{KEY:'LoginAttempt',email:'someone@example.test',password:'Ten-chars!'},{'X-SI-CSRF':csrf});
        check(response.status===(status.json.capabilities.phpBcryptVerify?503:501),'Missing authentication capability is explicit');
        response=await request('/delegate.php','POST',{KEY:'TestDatabase',dbserver:'10.0.0.51'},{'X-SI-CSRF':csrf,'X-SI-Setup':setupToken});
        check(response.status===403 && response.json.code==='SETUP_AUTH_REQUIRED','A key header cannot bypass Step 1 authorization');
        response=await request('/delegate.php','POST',{KEY:'AuthorizeSetup'},{'X-SI-CSRF':csrf,'X-SI-Setup':setupToken});
        check(response.status===200 && response.json.authorized===true,'Setup ownership authorization');
        const authorizedCsrf=response.json.csrf, authorizedCookie=cookie;
        if(!status.json.capabilities.mysqlDriver){
            response=await request('/delegate.php','POST',{KEY:'TestDatabase',dbtype:'mysql',dbserver:'10.0.0.51',dbport:3306,dbuserradio:'existuser',existuser:'fixture',existpass:'fixture',existdb:'fixture'},{'X-SI-CSRF':authorizedCsrf});
            check(response.status===501 && response.json.capability==='MYSQL_CONNECTOR_BUILD','Database test identifies a missing driver instead of blaming credentials');
        }
        check(authorizedCookie!==before && authorizedCsrf!==csrf,'Privilege boundary rotates session and CSRF');
        response=await request('/delegate.php','POST',{KEY:'TestDomain',domain:'localhost'},{'X-SI-CSRF':authorizedCsrf});
        check(response.status===200 && response.json.outcome===true,'Subsequent setup step retains authorization without the key');
        response=await request('/delegate.php','POST',{KEY:'TestDomain',domain:'localhost'},{'X-SI-CSRF':csrf},before);
        check(response.status===403,'Preauthorization session cannot be replayed');
        response=await request('/delegate.php','POST',{KEY:'TestDomain',domain:'../outside'},{'X-SI-CSRF':authorizedCsrf},authorizedCookie);
        check(response.status===200 && response.json.outcome===false,'Domain traversal is rejected');
        cookie=authorizedCookie;
        fs.writeFileSync(path.join(fixture,'core/install.lock'),'installed');
        response=await request('/delegate.php','POST',{KEY:'AuthorizeSetup'},{'X-SI-CSRF':authorizedCsrf,'X-SI-Setup':setupToken});
        check(response.status===409,'Installation lock cannot be reopened');
        response=await request('/core_sipl/switch.html');
        check(response.status===200 && response.text.includes('Choose the backend.'),'Switch launcher is served');
        for(const file of ['backend-switch.js','switch.css']){
            response=await request('/core_sipl/public/'+file);
            check(response.status===200,'Switch launcher asset: '+file);
        }
        response=await request('/delegate.php','POST',{KEY:'Logout'},{'X-SI-CSRF':authorizedCsrf});
        check(response.status===200 && response.json[0].REFRESH,'Logout succeeds');
        response=await request('/delegate.php','POST',{KEY:'TestDomain',domain:'localhost'},{'X-SI-CSRF':authorizedCsrf},authorizedCookie);
        check(response.status===403,'Destroyed session cannot be replayed');
        if(process.argv.includes('--browser')) {
            const executable=process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
            const profile=path.join(temporary,'chrome');
            browser=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
            const active=path.join(profile,'DevToolsActivePort');
            const until=Date.now()+15000;
            while(!fs.existsSync(active)){if(Date.now()>until)throw Error('Chrome did not start');await new Promise(r=>setTimeout(r,50));}
            const [debugPort,endpoint]=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);
            const socket=new WebSocket('ws://127.0.0.1:'+debugPort+endpoint);
            await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
            let next=0;const pending=new Map(),exceptions=[];
            socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')exceptions.push(message.params);if(pending.has(message.id)){const job=pending.get(message.id);pending.delete(message.id);clearTimeout(job.timer);message.error?job.reject(Error(JSON.stringify(message.error))):job.resolve(message.result);}});
            const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId}));});
            const target=await send('Target.createTarget',{url:'about:blank'});
            const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
            const evaluate=async expression=>{const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);assert(!data.exceptionDetails,JSON.stringify(data.exceptionDetails));return data.result.value;};
            await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);
            await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
            await send('Page.navigate',{url:base+'/core_sipl/switch.html'},sessionId);
            for(let i=0;i<100;i++){if(await evaluate('document.readyState')==='complete')break;await new Promise(r=>setTimeout(r,50));}
            check(await evaluate("!!window.SI.Backend && document.querySelectorAll('[data-open-backend]').length===2"),'Browser switching controls initialize');
            await evaluate("document.getElementById('si-sipl-origin').value=location.origin;document.getElementById('si-check-backend').click()");
            for(let i=0;i<100;i++){if((await evaluate("document.getElementById('si-backend-status').textContent")).startsWith('SIPL is running.'))break;await new Promise(r=>setTimeout(r,50));}
            check((await evaluate("document.getElementById('si-backend-status').textContent")).startsWith('SIPL is running.'),'Browser runtime check displays truthful capability status');
            await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);
            check(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Switch launcher fits a narrow screen');
            check(exceptions.length===0,'Switch launcher has no JavaScript exceptions');
            await send('Browser.close');socket.close();
        }
        console.log('SIPL native HTTP/session/browser checks passed: '+checks);
    } finally {
        for(const process of [browser,server])if(process&&process.exitCode===null){process.kill();await new Promise(resolve=>{process.once('exit',resolve);setTimeout(resolve,3000);});}
        await fs.promises.rm(temporary,{recursive:true,force:true,maxRetries:10,retryDelay:200});
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
