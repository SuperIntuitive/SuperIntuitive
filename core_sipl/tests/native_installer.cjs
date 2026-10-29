// Mutating installer checks run only against a generated database and extracted ZIP.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
(async()=>{
 const config=JSON.parse(fs.readFileSync(0,'utf8'));
 assert.equal(config.disposable,true,'Installer checks require a disposable fixture');
 const token=fs.readFileSync(path.join(config.root,'core/setup.token'),'utf8').trim();
 let cookie='',csrf='',checks=0;
 const check=(ok,message)=>{assert(ok,message);checks++;console.log('PASS '+message);};
 const request=async(url,data,headers={})=>{
  const response=await fetch(config.base+url,{method:data===undefined?'GET':'POST',headers:{...(cookie?{Cookie:cookie}:{}),...(data===undefined?{}:{'Content-Type':'application/json','X-SI-CSRF':csrf}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
  const set=response.headers.getSetCookie();if(set.length)cookie=set[0].split(';')[0];
  const text=await response.text();let value;try{value=JSON.parse(text);}catch{}
  return {status:response.status,text,value,headers:response.headers};
 };
 const bootstrap=async()=>{const r=await request('/__sipl/bootstrap');assert.equal(r.status,200);csrf=r.value.csrf;};
 const post={KEY:'SetupSuperIntuitive',domain:'native-install.example.test',noteemail:'',dbtype:'mysql',dbserver:'127.0.0.1',dbport:config.dbPort,dbuserradio:config.mode==='privileged'?'privuser':'existuser',existdb:config.dbName,existuser:config.dbUser,existpass:config.dbPassword,privuser:config.dbUser,privpass:config.dbPassword,newdbname:'si_native_created',newuser:'si_native_user',language:'en',timezone:'UTC',currency:'usd',adminuser:"Native O'Reilly 日本語; --",adminemail:'installer@example.test',adminpw:'Tenchars!1'};
 const authenticate=async()=>{await bootstrap();const before=cookie,old=csrf;const r=await request('/delegate.php',{KEY:'AuthorizeSetup'},{'X-SI-Setup':token});assert.equal(r.status,200);assert.equal(r.value.authorized,true);csrf=r.value.csrf;check(cookie!==before&&csrf!==old,'Setup authorization rotates the session and CSRF');};
 if(config.phase==='partial-restart'){
  let r=await request('/');check(r.status===409&&r.text.includes('Installation is incomplete'),'Incomplete or mismatched installation stays locked after restart');
  check(!fs.existsSync(path.join(config.root,'core/install.lock')),'Recovery never marks an unverified database as installed');
  await bootstrap();r=await request('/delegate.php',{KEY:'AuthorizeSetup'},{'X-SI-Setup':token});check(r.status===409&&r.value.code==='INSTALLATION_INCOMPLETE','Setup key cannot bypass a partial-install journal');
  console.log('SIPL installer partial-restart checks passed: '+checks);return;
 }
 if(config.phase==='recovered'){
  let r=await request('/');check(r.status===200&&r.text.includes('Build the site you want.'),'Committed installation recovers on restart without reimporting');
  check(fs.existsSync(path.join(config.root,'core/install.lock')),'Recovery restores the permanent installer lock');
  await bootstrap();r=await request('/delegate.php',{KEY:'AuthorizeSetup'},{'X-SI-Setup':token});check(r.status===409,'Recovered installer cannot be reopened with the old key');
  console.log('SIPL installer recovery checks passed: '+checks);return;
 }
 let r=await request('/');check(r.status===200&&r.text.includes("id='si_setup_form'")&&!r.text.includes('<?php')&&!r.text.includes(token),'Fresh packaged SIPL serves its native six-step wizard without exposing the key');
 for(const url of ['/scripts/setup.js','/style/setup.css']){r=await request(url);check(r.status===200,'Packaged installer asset '+url);}
 r=await request('/core/setup.token');check(r.status===403&&!r.text.includes(token),'Setup key file is private');
 await bootstrap();r=await request('/delegate.php',{...post,KEY:'TestDatabase'},{'X-SI-Setup':token});check(r.status===403&&r.value.code==='SETUP_AUTH_REQUIRED','Key header cannot bypass Step 1 authorization');
 r=await request('/delegate.php',{KEY:'AuthorizeSetup'},{'X-SI-Setup':'wrong-key-'.repeat(8)});check(r.status===403,'Incorrect setup key is rejected');
 await authenticate();
 r=await request('/delegate.php',{...post,KEY:'TestDatabase'});
 if(config.phase==='nonempty'){
  check(r.value.outcome===false,'Connection test refuses a populated database');
  r=await request('/delegate.php',post);check(r.value.code==='SETUP_VALIDATION_FAILED','Installation refuses existing tables before writing any files');
  check(!fs.existsSync(path.join(config.root,'core/setup.lock')),'Rejected settings leave no partial-install journal');
  console.log('SIPL installer nonempty-database checks passed: '+checks);return;
 }
 check(r.status===200&&r.value.outcome===true,'Database connection test works without resending the installation key');
 r=await request('/');check(r.text.includes("data-setup-authorized='true'"),'Reload preserves first-step setup authorization');
 r=await request('/delegate.php',{...post,adminpw:'short'});check(r.value.field==='si_setup_adminpassword'&&!fs.existsSync(path.join(config.root,'core/setup.lock')),'Short password is rejected before schema or filesystem changes');
 fs.mkdirSync(path.join(config.root,'domains/occupied'));
 fs.writeFileSync(path.join(config.root,'domains/occupied/keep.txt'),'existing site');
 r=await request('/delegate.php',{...post,domain:'occupied'});check(r.value.field==='si_setup_host'&&fs.readFileSync(path.join(config.root,'domains/occupied/keep.txt'),'utf8')==='existing site','Existing domain content is preserved');
 r=await request('/delegate.php',{KEY:'TestDomain',domain:'../outside'});check(r.value.outcome===false,'Domain traversal is rejected');
 r=await request('/delegate.php',{KEY:'TestDomain',domain:'CON.example.test'});check(r.value.outcome===false,'Windows device names are rejected before directory creation');
 if(config.phase==='partial'){
  r=await request('/delegate.php',post);check(r.value.outcome===false&&r.value.code==='INSTALLATION_INCOMPLETE','Injected schema failure leaves an explicit partial installation');
  check(fs.existsSync(path.join(config.root,'core/setup.lock'))&&!fs.existsSync(path.join(config.root,'core/install.lock')),'Failed import preserves its journal without claiming successful installation');
  r=await request('/');check(r.status===409,'Partial schema is not served as a working site');
  r=await request('/delegate.php',post);check(r.status===409&&r.value.code==='INSTALLATION_INCOMPLETE','Retry cannot rerun DDL against a partial schema');
  console.log('SIPL installer partial-import checks passed: '+checks);return;
 }
 if(config.browser)await installInBrowser(config,token,post,check);
 else {r=await request('/delegate.php',post);check(r.status===200&&r.value.outcome===true,'Privileged account creates and installs a new database and application user ('+r.status+': '+(r.value?.code||'success')+' '+(r.value?.field||'')+' '+(r.value?.detail||r.value?.message||'')+')');}
 check(fs.existsSync(path.join(config.root,'core/install.lock')),'Successful setup persists its permanent lock');
 const settings=JSON.parse(fs.readFileSync(path.join(config.root,'core_sipl/config.local.json'),'utf8'));
 check(settings.domain===post.domain&&settings.dsn.includes('dbname=')&&settings.setupToken===''&&settings.allowNativePasswords===false,'Native configuration is persisted without the installation key or administrator password');
 check(!JSON.stringify(settings).includes(post.adminpw),'Administrator plaintext password is never saved in configuration');
 r=await request('/');check(r.status===200&&r.text.includes('Build the site you want.')&&!r.text.includes('si_setup_form'),'Freshly installed site renders immediately');
 r=await request('/media/images/logo.png');check(r.status===200&&r.headers.get('content-type').startsWith('image/'),'Starter media is available immediately after native installation');
 await bootstrap();r=await request('/delegate.php',{KEY:'AuthorizeSetup'},{'X-SI-Setup':token});check(r.status===409,'Installation key cannot reopen a completed installer');
 r=await request('/delegate.php',{KEY:'LoginAttempt',email:post.adminemail,password:post.adminpw,rememberme:false});check(r.status===200&&r.value[0].REFRESH,'New administrator signs in with a 10-character native bcrypt password');
 r=await request('/editor/editor.js');check(r.status===200&&r.text.includes('SI.Editor')&&!r.text.includes('<?php'),'Fresh administrator receives the working native editor');
 console.log('SIPL native fresh-installer checks passed: '+checks);
})().catch(error=>{console.error(error);process.exitCode=1;});

async function installInBrowser(config,token,post,check){
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'si-native-installer-'));
 const chrome=process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe';
 const browser=spawn(chrome,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
 let socket,send;
 try{
  const wait=async(test,label)=>{const until=Date.now()+30000;while(Date.now()<until){if(await test())return;await new Promise(r=>setTimeout(r,80));}throw Error('Timed out: '+label);};
  const active=path.join(profile,'DevToolsActivePort');await wait(()=>fs.existsSync(active),'Chrome startup');
  const [port,endpoint]=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let next=0;const pending=new Map(),exceptions=[],requests=[];
  socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params);if(msg.method==='Network.requestWillBeSent'&&msg.params.request.url.includes('/delegate.php'))requests.push(msg.params.request);if(msg.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:false},msg.sessionId).catch(()=>{});if(pending.has(msg.id)){const job=pending.get(msg.id);pending.delete(msg.id);clearTimeout(job.timer);msg.error?job.reject(Error(JSON.stringify(msg.error))):job.resolve(msg.result);}});
  send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome timeout '+method));},15000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,sessionId}));});
  const target=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  const fill=(id,value)=>evaluate(`(()=>{const field=document.getElementById(${JSON.stringify(id)});field.value=${JSON.stringify(String(value))};field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
  const step=name=>wait(async()=>await evaluate('window.SI?.Setup?.SelectedArticle')===name,'wizard '+name);
  await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);await send('Network.enable',{},sessionId);
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
  await send('Page.navigate',{url:config.base},sessionId);await step('sysinfo');
  await fill('si_setup_key',token);await fill('si_setup_host',post.domain);await click('btnnext');await step('database');
  check(await evaluate('SI.Setup.Authorized&&document.getElementById("si_setup_key").value===""'),'Real wizard validates and clears the installation key once');
  for(const [id,value] of Object.entries({si_setup_dbserver:post.dbserver,si_setup_dbport:post.dbport,si_setup_exdb:post.existdb,si_setup_exun:post.existuser,si_setup_expw:post.existpass}))await fill(id,value);
  await evaluate('SI.Setup.TestDatabase()');await wait(async()=>await evaluate('document.getElementById("si_setup_dbsuccess").textContent')==='✔','native connection test');
  await click('btnnext');await step('local');await fill('si_setup_timezone','UTC');await fill('si_setup_currency','usd');await fill('si_setup_lang','en');await click('btnnext');await step('admin');
  for(const [id,value] of Object.entries({si_setup_adminuser:post.adminuser,si_setup_adminemail:post.adminemail,si_setup_adminpassword:post.adminpw}))await fill(id,value);
  await click('btnnext');await step('review');await click('btnnext');
  await wait(async()=>await evaluate('!document.getElementById("si_setup_form")&&!!document.querySelector(".si-topbar")'),'installed site after completing all six steps');
  const actions=requests.map(r=>({body:JSON.parse(r.postData||'{}'),headers:r.headers}));
  check(actions.filter(r=>r.body.KEY==='AuthorizeSetup').length===1&&actions.filter(r=>r.body.KEY!=='AuthorizeSetup').every(r=>!Object.keys(r.headers).some(key=>key.toLowerCase()==='x-si-setup')),'All six browser steps use one authorization without resending the installation key');
  check(exceptions.length===0,'Native installer and first site load have no JavaScript exceptions');
 }finally{
  if(send&&socket?.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});
  socket?.close();if(browser.exitCode===null)browser.kill();
  await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:250});
 }
}
