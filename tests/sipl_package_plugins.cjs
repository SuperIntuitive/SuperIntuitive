const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const {spawn,spawnSync} = require('node:child_process'), {randomBytes,createHash} = require('node:crypto');
if (process.argv.includes('--fixture')) packagedFixture().catch(error=>{console.error(error);process.exitCode=1;});
else (async () => {
  const config = JSON.parse(fs.readFileSync(0, 'utf8')); assert.equal(config.disposable, true);
  let checks = 0;
  const check = (value, message) => { assert(value, message); checks++; console.log('PASS ' + message); };
  function client() { return {cookie: '', csrf: '', async request(route, data, csrf = true) {
    const response = await fetch(config.base + route, {method: data ? 'POST' : 'GET', headers: {Cookie: this.cookie, ...(data ? {'Content-Type': 'application/json', ...(csrf ? {'X-SI-CSRF': this.csrf} : {})} : {})}, body: data ? JSON.stringify(data) : undefined});
    const cookies = response.headers.getSetCookie(); if (cookies.length) this.cookie = cookies[0].split(';')[0];
    const text = await response.text(); let result; try { result = JSON.parse(text); if (Array.isArray(result)) result = result[0]; } catch {}
    return {status: response.status, data: result, text};
  }, async bootstrap() { this.csrf = (await this.request('/__sipl/bootstrap')).data.csrf; }}; }
  const guest = client(), admin = client(); await guest.bootstrap(); await admin.bootstrap();
  let r = await admin.request('/delegate.php', {KEY: 'LoginAttempt', email: 'admin@example.test', password: config.password});
  check(r.status === 200 && r.data.REFRESH, 'packaged SIPL administrator login'); await admin.bootstrap();
  r = await admin.request('/delegate.php', {KEY: 'ChangeDeployment', Deployment: 'dev'}); check(r.status === 200, 'packaged Admin enters Dev');
  const manage = data => admin.request('/delegate-admin.php', data);
  r = await manage({KEY: 'GetLocalPlugins'}); check(r.status === 200 && !r.data.PLUGINSLIST.downloaded.includes('contact.zip') && !r.data.PLUGINSLIST.installed.contact, 'fresh SIPL package contains no Contact plugin');
  r = await manage({KEY: 'GetMorePlugins'}); const catalog = r.status === 200 && JSON.parse(r.data.MOREPLUGINS);
  check(Array.isArray(catalog), 'packaged SIPL discovers remote plugin catalog');
  const remote = catalog.find(plugin => plugin.download); assert(remote, 'Remote catalog has no downloadable packages');
  r = await manage({KEY: 'DownloadPlugin', appname: remote.download}); check(r.status === 200 && r.data.DOWNLOADEDPLUGIN, 'packaged SIPL downloads a remote plugin');
  const remoteId = r.data.DOWNLOADEDPLUGIN.replace(/\.zip$/i, '');
  r = await manage({KEY: 'InstallPlugin', plugin: remoteId}); check(r.status === 200 && r.data.INSTALLPLUGIN === remoteId, 'packaged SIPL installs the remotely downloaded plugin');
  r = await guest.request('/delegate-admin.php', {KEY: 'InstallPlugin', plugin: 'contact'}); check(r.status === 403, 'guest cannot install');
  r = await admin.request('/delegate-admin.php', {KEY: 'InstallPlugin', plugin: 'contact'}, false); check(r.status === 403, 'installation requires CSRF');
  r = await admin.request('/editor/objects/plugins.js'); check(r.status === 200 && r.text.includes('Manage: async') && r.text.includes('EnablePlugin'), 'packaged native plugin editor served');

  if (config.browser) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'si-package-plugins-'));
    const executable = process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(file => fs.existsSync(file)); assert(executable);
    const chrome = spawn(executable, ['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir=' + profile,'about:blank'], {stdio:'ignore'});
    let socket, send;
    try {
      const active = path.join(profile, 'DevToolsActivePort'); let deadline = Date.now() + 15000;
      while (!fs.existsSync(active)) { if (Date.now() > deadline) throw Error('Chrome did not start'); await new Promise(resolve => setTimeout(resolve, 50)); }
      const [port, endpoint] = fs.readFileSync(active, 'utf8').trim().split(/\r?\n/);
      socket = new WebSocket('ws://127.0.0.1:' + port + endpoint); await new Promise((resolve, reject) => { socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true}); });
      let id=0;const pending=new Map();
      socket.addEventListener('message', event => { const message=JSON.parse(event.data); if(message.method==='Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog',{accept:true},message.sessionId).catch(()=>{});if(pending.has(message.id)){const p=pending.get(message.id);pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(Error(JSON.stringify(message.error))):p.resolve(message.result);} });
      send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const next=++id,timer=setTimeout(()=>{pending.delete(next);reject(Error('Timeout '+method));},20000);pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params,sessionId}));});
      const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
      const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
      const wait=async(expression,label)=>{const end=Date.now()+25000;while(Date.now()<end){try{if(await evaluate(expression))return;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw Error(label);};
      await send('Page.enable',{},sessionId);await send('Runtime.enable',{},sessionId);await send('Page.navigate',{url:config.base+'/'},sessionId);await wait('document.readyState==="complete" && !!window.SI?.CSRF?.Token','packaged home bootstrap');
      await evaluate('(async()=>{const response=await fetch("/delegate.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify('+JSON.stringify({KEY:'LoginAttempt',email:'admin@example.test',password:config.password})+')});if(!response.ok)throw Error("Login failed");})()');
      await send('Page.navigate',{url:config.base+'/'},sessionId);await wait('!!window.SI?.Editor?.Data?.loaded && !!document.getElementById("si_edit_scripter_trigger")','packaged Admin editor menu');
      await evaluate('document.getElementById("si_edit_scripter_trigger").click()');
      await wait('!!SI.Editor.Objects.Scripter.Parsed','packaged Scripter menu initialization');
      check(await evaluate('SI.Widgets.Window.si_edit_scripter_window.Content.contains(SI.Editor.Objects.Scripter.Container)&&SI.Editor.Objects.Scripter.Parser.version==="8.19.0"'),'packaged Tools menu opens Scripter and loads its bundled parser');
      const scriptSource=await evaluate('SI.Editor.Objects.Scripter.Source');
      await evaluate('document.getElementById("si_scripter_codeorguidcb").click()');
      await wait('SI.Editor.Objects.Scripter.Mode==="blocks"','packaged Scripter Code checkbox');
      check(await evaluate('SI.Editor.Objects.Scripter.Source==='+JSON.stringify(scriptSource)),'packaged Scripter Code/Blocks preserves CMS script source');
      await evaluate('SI.Widgets.Window.si_edit_scripter_window.Hide(0)');
      check(await evaluate('!SI.Editor.Data.Objects.Plugins.Current.contact'),'Chrome starts with no installed Contact');
      await evaluate('document.body.appendChild(SI.Editor.Objects.Plugins.Local.Build())');
      const document = await send('DOM.getDocument', {}, sessionId);
      const input = await send('DOM.querySelector', {nodeId: document.root.nodeId, selector: '#si_edit_plugins_local_menu input[type=file]'}, sessionId);
      await send('DOM.setFileInputFiles', {nodeId: input.nodeId, files: [config.contactPath]}, sessionId);
      await wait('!!document.getElementById("si_edit_plugin_box_contact")', 'Contact ZIP upload through native editor');
      check(true, 'Chrome discovers separately uploaded Contact ZIP');
      check(await evaluate('!!document.querySelector("#si_edit_plugin_box_contact input[type=checkbox]") && !document.querySelector("#si_edit_plugin_box_contact input[type=checkbox]").checked'),'Chrome shows Contact install checkbox');
      await evaluate('window.__installPending=true;document.querySelector("#si_edit_plugin_box_contact input[type=checkbox]").click()');
      await wait('!window.__installPending && !!window.SI?.Editor?.Data?.Objects?.Plugins?.Current?.contact?.enabled','Contact installation through packaged editor');
      check(true,'Chrome installs separate Contact ZIP through packaged SIPL editor');
      check(await evaluate('SI.Editor.Data.Objects.Plugins.Current.contact.pages.some(page=>page.path==="/admin/contact")'),'Chrome receives registered Admin inbox navigation');
    } finally {
      if(send && socket?.readyState===WebSocket.OPEN){try{await send('Browser.close');}catch{}socket.close();}if(chrome.exitCode===null)chrome.kill();await new Promise(resolve=>setTimeout(resolve,500));fs.rmSync(profile,{recursive:true,force:true,maxRetries:6,retryDelay:200});
    }
  } else { r=await manage({KEY:'UploadPluginPackage',plugin:'contact',archive:config.contact});check(r.status===200,'separate Contact package uploaded');r=await manage({KEY:'InstallPlugin',plugin:'contact'});check(r.status===200 && r.data.INSTALLPLUGIN==='contact','Contact installed through packaged SIPL dispatcher'); }

  r=await manage({KEY:'GetLocalPlugins'});check(r.data.PLUGINSLIST.installed.contact.enabled,'installed Contact discovered as enabled');
  r=await guest.request('/contact-form');check(r.status===200 && (r.text.includes('si_contact_form') || r.text.includes('data-si-contact')),'packaged SQL Contact page renders');
  const submission={KEY:'PluginAction',plugin:'contact',action:'submit',name:'Package Sender',email:'packaged@example.test',subject:'Packaged Contact',topic:'SIPL',message:'Installed from the actual native release ZIP.',website:'',submission:randomBytes(16).toString('hex')};
  r=await guest.request('/delegate.php',submission);check(r.status===200 && (r.data.CONTACTSENT || r.data.submitted),'packaged SIPL Contact handler stores submission');const receipt=r.data.CONTACTSENT || {id:r.data.id};
  if (config.contactHasUpdate) {
  r=await guest.request('/delegate.php',submission);check(r.status===200 && r.data.CONTACTSENT.id===receipt.id,'packaged handler deduplicates retries');
  r=await guest.request('/delegate.php',{...submission,message:'Changed message'});check(r.status===409,'packaged conflict status is 409');
  }
  r=await guest.request('/delegate.php',{KEY:'PluginAction',plugin:'contact',action:'inbox'});check(r.status===403,'private inbox action requires Admin');
  r=await guest.request('/admin/contact');check(r.status===403,'private inbox page requires Admin');
  r=await manage({KEY:'PluginAction',plugin:'contact',action:'inbox'});check(r.status===200 && r.data.messages.some(message=>message.id.replace(/^0x/,'')===receipt.id.replace(/^0x/,'')),'packaged Admin reads stored contact');
  if (config.contactHasUpdate) { r=await manage({KEY:'PluginAction',plugin:'contact',action:'update',id:receipt.id,state:'read'});check(r.status===200 && r.data.CONTACTMESSAGEUPDATED.state==='read','packaged Admin marks read'); }
  const api=data=>admin.request('/api.v1.php',data);
  const rows=data=>Object.entries(data).filter(([key])=>/^\d+$/.test(key)).map(([,value])=>value);
  r=await api({Operation:'Retrieve',Entity:{Name:'blocks',Attributes:{name:'contact-form'}},Columns:['id','dev-html','live-style','live-script']});const block=rows(r.data)[0];
  check(block && (block['dev-html'].includes('si_contact_form') || block['dev-html'].includes('data-si-contact')) && block['live-style'].length && block['live-script'].includes('SIContact'),'HTML/style/singular-script SQL columns installed');
  r=await api({Operation:'Update',Entity:{Name:'blocks',Id:block.id,Attributes:{'dev-html':'CMS edit preserved'}}});check(r.status===200,'fixture CMS edit saved');
  r=await manage({KEY:'UpdatePlugin',plugin:'contact'});check(r.status===200 && r.data.PLUGINCONFLICTS.includes('form:dev-html'),'packaged update preserves/reports CMS edit');
  r=await api({Operation:'Retrieve',Entity:{Name:'blocks',Id:block.id},Columns:['dev-html']});check(rows(r.data)[0]['dev-html']==='CMS edit preserved','CMS content survives native plugin update');
  r=await manage({KEY:'DisablePlugin',plugin:'contact'});check(r.status===200,'packaged disable succeeds');
  r=await guest.request('/delegate.php',submission);check(r.status>=400,'disabled native handler blocked');
  r=await manage({KEY:'EnablePlugin',plugin:'contact'});check(r.status===200,'packaged enable succeeds');
  r=await manage({KEY:'UninstallPlugin',plugin:'contact'});check(r.status===200,'packaged uninstall succeeds');
  r=await manage({KEY:'GetLocalPlugins'});check(!r.data.PLUGINSLIST.installed.contact,'uninstalled plugin absent from active discovery');
  r=await manage({KEY:'InstallPlugin',plugin:'contact'});check(r.status===200,'packaged reinstall succeeds');
  r=await manage({KEY:'PluginAction',plugin:'contact',action:'inbox'});check(r.data.messages.some(message=>message.id.replace(/^0x/,'')===receipt.id.replace(/^0x/,'')),'uninstall/reinstall preserved data');
  r=await manage({KEY:'UploadPluginPackage',plugin:'php-only',archive:config.phpOnly});check(r.status===200,'packaged native JSON upload succeeds');
  r=await manage({KEY:'InstallPlugin',plugin:'php-only'});check(r.status===400 && r.data.code==='PLUGIN_REQUIRES_SIPL_HANDLER','PHP-only required package rejected by SIPL');
  r=await manage({KEY:'UploadPluginPackage',plugin:'frontend',archive:config.frontend});check(r.status===200,'frontend package uploaded');
  r=await manage({KEY:'InstallPlugin',plugin:'frontend'});check(r.status===200,'frontend-only package installs natively');
  for(const route of ['/core/plugin-schema.sql','/core_sipl/src/Plugins.sipl','/core/plugin-packages/contact/php/contact.php','/plugins/installed/contact/sipl/contact.sipl']){
    r=await guest.request(route);check(r.status===403,'private source blocked '+route);
  }
  console.log('Packaged SIPL plugin checks passed: '+checks);
})().catch(error=>{console.error(error);process.exitCode=1;});

// Browser/integration fixture only. The packaged server, installer, ZIP reader,
// handlers and database operations all execute in SIPL, without PHP or Python.
async function packagedFixture() {
  const checkout=path.resolve(__dirname,'..');
  const option=(name,fallback)=>{const index=process.argv.indexOf(name);return index<0?fallback:process.argv[index+1];};
  const runtime=path.resolve(option('--runtime',process.env.SI_SIPL_RUNTIME||path.join(checkout,process.platform==='win32'?'sipl.exe':'sipl')));
  const archive=path.resolve(option('--archive',path.join(checkout,'dist/SuperIntuitive-sipl.zip')));
  const contact=path.resolve(option('--contact',path.join(checkout,'dist/contact.zip')));
  const digest=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const environment=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('SI_SIPL_')&&name!=='SI_SETUP_TOKEN'));
  const execute=(command,input,allowFailure=false)=>{
    const result=spawnSync(command[0],command.slice(1),{cwd:checkout,env:environment,input,encoding:'utf8',maxBuffer:32*1024*1024});
    if (!allowFailure) assert(result.status===0,(result.stdout||'')+(result.stderr||'')+(result.error||''));
    return result;
  };
  const folder=fs.mkdtempSync(path.join(checkout,'core_sipl/runtime/packaged-native-'));
  const site=path.join(folder,'site'),container='si-native-plugins-'+randomBytes(6).toString('hex');
  const report={archive,archiveSha256:digest(archive),runtimeSha256:digest(runtime),contactPackageSha256:digest(contact),backend:'sipl',source:'extracted release ZIP',results:[]};
  let created=false,server;
  try {
    execute([runtime,'run',path.join(checkout,'packaging/Package.sipl'),'extract',archive,'--target',site]);
    const metadata=JSON.parse(fs.readFileSync(path.join(site,'PACKAGE.json'),'utf8'));
    const unchanged=()=>{for(const row of metadata.files)assert.equal(digest(path.join(site,row.path)),row.sha256,row.path);};
    assert.equal(metadata.backend,'sipl');unchanged();
    assert(!metadata.files.some(row=>/\.(php|py|pyc)$/i.test(row.path)||row.path.endsWith('/contact.zip')));
    console.log('PASS packaged SIPL hashes and native-only tooling; no bundled plugins');
    const password=randomBytes(32).toString('base64url'),adminPassword='Packaged-contact-2026!';
    const envfile=path.join(folder,'db.env');
    fs.writeFileSync(envfile,'MARIADB_DATABASE=si_packaged\nMARIADB_USER=si_packaged\nMARIADB_PASSWORD='+password+'\nMARIADB_ROOT_PASSWORD='+randomBytes(32).toString('base64url')+'\n',{mode:0o600});
    execute(['docker','run','-d','--name',container,'--env-file',envfile,'-p','127.0.0.1::3306','mariadb:11.4','--require-secure-transport=ON']);created=true;
    let deadline=Date.now()+60000;
    while(execute(['docker','exec',container,'healthcheck.sh','--connect','--innodb_initialized'],undefined,true).status!==0){assert(Date.now()<deadline,'Disposable database startup timed out');await new Promise(resolve=>setTimeout(resolve,200));}
    const port=execute(['docker','port',container,'3306/tcp']).stdout.trim().split(':').at(-1);
    const config=path.join(folder,'fixture.json');
    fs.writeFileSync(config,JSON.stringify({root:site,dsn:'mysql:host=127.0.0.1;port='+port+';dbname=si_packaged;charset=utf8mb4',dbUser:'si_packaged',dbPassword:password,domain:'localhost',subdomain:'',host:'127.0.0.1',port:0,secureCookies:false,adminPassword,contactZip:contact}),{mode:0o600});
    const seed=path.join(site,'core_sipl/fixture_seed.sipl');
    fs.writeFileSync(seed,String.raw`use src/Config
use src/Database
use src/SetupSchema
use src/Tools
use ../packaging/Package
fn fixtureZip(root: String, id: String, files: Map) {
    let archive = zip.open(path.join(root, id + ".zip"))
    for name, value in files {
        let file = path.join(root, "core/fixture-packages", id, name)
        Package.write(file, value)
        zip.add(archive, file, name)
    }
    zip.close(archive)
}
fn start() {
    let settings = json.parse(fs.readText(system.args[0]))
    Config.setForTests(settings)
    Database.connect()
    if system.args.length > 1 {
        assert(Database.one("SELECT COUNT(*) AS total FROM si_plugin_migrations WHERE plugin='contact' AND status='applied'", {:})["total"] == 1, "Shared Contact migration runs once")
        print("PASS packaged migration tracking preserved")
        return
    }
    SetupSchema.import(Database.connection(), SetupSchema.source(), {"adminuser": "Package Administrator", "adminemail": "admin@example.test", "adminpw": settings["adminPassword"], "domain": "localhost", "language": "en", "currency": "USD", "timezone": "UTC", "noteemail": "info@example.test"}, Tools.newGuid())
    let root = settings["root"]
    fixtureZip(root, "php-only", {"install.json": json.stringify({"id": "php-only", "version": "1.0.0", "backend": {"required": true, "php": "php/main.php"}}), "php/main.php": "<?php return fn()=>[];"})
    fixtureZip(root, "frontend", {"install.json": json.stringify({"id": "frontend", "version": "1.0.0"}), "js/front.js": "window.packagedFrontend=true;"})
    Package.write(path.join(root, "core/install.lock"), "disposable packaged fixture")
    Package.directory(path.join(root, "domains/localhost"))
    let media = zip.open(path.join(root, "core_sipl/generated/installer-media.zip"))
    for entry in zip.list(media) {
        let target = path.join(root, "domains/localhost", Package.relative(entry))
        Package.directory(path.dirname(target))
        zip.extract(media, entry, target)
    }
    zip.close(media)
    let contact = zip.open(settings["contactZip"])
    let manifest = json.parse(zip.read(contact, "install.json").decodeUtf8())
    zip.close(contact)
    print(json.stringify({"contactVersion": manifest["version"], "contactHasUpdate": manifest["actions"].contains("update")}))
}
`);
    const seeded=execute([runtime,'run',seed,config]);
    const details=JSON.parse(seeded.stdout.trim().split(/\r?\n/).at(-1));report.contactVersion=details.contactVersion;
    console.log('PASS disposable database seeded by the packaged native installer');
    server=spawn(runtime,['run',path.join(site,'core_sipl/main.sipl'),config],{cwd:checkout,env:environment,stdio:['ignore','pipe','pipe']});
    let output='';server.stdout.on('data',value=>output+=value);server.stderr.on('data',value=>output+=value);
    deadline=Date.now()+30000;let base;
    while(!base){base=output.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+/)?.[0];if(!base){assert(server.exitCode===null&&Date.now()<deadline,'Packaged native server failed: '+output);await new Promise(resolve=>setTimeout(resolve,50));}}
    const result=execute([process.execPath,__filename],JSON.stringify({disposable:true,base,password:adminPassword,browser:process.argv.includes('--browser'),phpOnly:fs.readFileSync(path.join(site,'php-only.zip')).toString('base64'),frontend:fs.readFileSync(path.join(site,'frontend.zip')).toString('base64'),contact:fs.readFileSync(contact).toString('base64'),contactPath:contact,contactHasUpdate:details.contactHasUpdate}));
    process.stdout.write(result.stdout);
    process.stdout.write(execute([runtime,'run',seed,config,'verify']).stdout);
    unchanged();report.results.push({name:'packaged-native-install-and-browser',status:'passed',checks:(result.stdout.match(/^PASS /gm)||[]).length+3});report.status='passed';
  } catch(error){report.status='failed';report.error=error.message;throw error;}
  finally {
    if(server&&server.exitCode===null){const closed=new Promise(resolve=>server.once('exit',resolve));server.kill();await closed;}
    if(created)execute(['docker','rm','-f','-v',container],undefined,true);
    fs.rmSync(folder,{recursive:true,force:true,maxRetries:5,retryDelay:100});
    fs.writeFileSync(path.join(checkout,'core_sipl/packaged-plugin-validation.json'),JSON.stringify(report,null,2)+'\n');
  }
}
