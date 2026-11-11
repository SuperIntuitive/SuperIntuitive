// Exercise the packaged SIPL session metadata and large static downloads without a database.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const {spawn, spawnSync} = require('node:child_process');
const crypto = require('node:crypto'), net = require('node:net');
const root = path.resolve(__dirname, '..');
const runtime = process.argv[2];
assert(runtime, 'Pass the native SIPL runtime');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'si-client-session-'));
    let child;
    try {
        const archive = path.join(root, 'dist', 'SuperIntuitive-sipl.zip');
        const extract = path.join(temporary, 'extract.ps1');
        fs.writeFileSync(extract, 'param($Archive,$Destination)\n$ErrorActionPreference="Stop"\nExpand-Archive -LiteralPath $Archive -DestinationPath $Destination\n');
        const expanded = spawnSync('powershell.exe', ['-NoProfile','-File',extract,archive,temporary], {encoding:'utf8'});
        assert.equal(expanded.status, 0, expanded.stderr);
        const installed = path.join(temporary, 'SuperIntuitive');
        const publicRoot = path.join(installed, 'domains', 'fixture');
        fs.mkdirSync(path.join(publicRoot, 'media', 'downloads'), {recursive:true});
        const payload = path.join(root, 'dist', 'SuperIntuitive-php.zip');
        assert(fs.statSync(payload).size > 8*1024*1024, 'Test a download larger than the dynamic response budget');
        fs.copyFileSync(payload, path.join(publicRoot, 'media', 'downloads', 'package.zip'));
        const probe = path.join(installed, 'core_sipl', 'runtime', 'client-session.sipl');
        fs.mkdirSync(path.dirname(probe), {recursive:true});
        const port = await new Promise(resolve => {const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
        fs.writeFileSync(probe, `use ../src/Config
use ../src/Sessions
use ../src/Render
use ../src/Assets
fn handle(request: Map) {
    if request["path"].startsWith("/media/") {
        if Assets.safeMedia(request["path"]) { return none }
        return {"status": 403, "body": "private"}
    }
    web.sessionSet(request, Sessions.key("private"), "private-session-value")
    let context = {"user": {"name": "guest", "roles": ["Guest"], "preferences": {:}}}
    return {"body": Render.bootstrap(context, request, {"blocks": []})}
}
fn start() {
    Config.setForTests({"root": ${JSON.stringify(installed.replaceAll('\\','/'))}, "domain": "fixture", "subdomain": ""})
    web.sessions({"cookie": "si_os_fixture"})
    web.serve(${JSON.stringify(publicRoot.replaceAll('\\','/'))}, ${port}, handle, {"host": "127.0.0.1", "maxResponseBody": 8388608})
}
`);
        child = spawn(runtime, ['run',probe], {cwd:installed,stdio:['ignore','pipe','pipe']});
        let log='';child.stdout.on('data',chunk=>log+=chunk);child.stderr.on('data',chunk=>log+=chunk);
        const base='http://127.0.0.1:'+port;
        for(let i=0;;i++){try{await fetch(base);break;}catch{assert(i<100&&child.exitCode===null,'Fixture startup: '+log);await pause(100);}}
        const cases=[['Windows NT 10.0','windows'],['X11; Linux x86_64','linux'],['Linux; Android 15','android'],['Macintosh; Intel Mac OS X 14','macos'],['iPhone; like Mac OS X','ios'],['Macintosh; Intel Mac OS X Mobile/15E148','ios'],['X11; CrOS x86_64','chromeos'],['unrecognized','unknown']];
        let cookie;
        for(const [agent,expected] of cases){
            const response=await fetch(base,{headers:{'user-agent':agent}}),body=await response.text();
            assert.equal(response.status,200);assert(body.includes('SI.Session = {"OS":"'+expected+'"};'),body);
            assert(!body.includes('private-session-value'),'Expose only public session metadata');
            if(expected==='windows')cookie=response.headers.get('set-cookie').split(';')[0];
        }
        const preserved=await (await fetch(base,{headers:{cookie,'user-agent':'Linux'}})).text();
        assert(preserved.includes('SI.Session = {"OS":"windows"};'),'Read the stored session OS on subsequent requests');
        const hints=await (await fetch(base,{headers:{'sec-ch-ua-platform':'"Android"','user-agent':'Linux'}})).text();
        assert(hints.includes('SI.Session = {"OS":"android"};'),'Honor the platform client hint');
        const response=await fetch(base+'/media/downloads/package.zip');assert.equal(response.status,200);
        const body=Buffer.from(await response.arrayBuffer());assert.equal(body.length,fs.statSync(payload).size);
        const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
        assert.equal(hash(body),hash(fs.readFileSync(payload)),'Serve complete release bytes above the dynamic response budget');
        assert.equal((await fetch(base+'/media/downloads/config.json')).status,403);
        console.log('PASS packaged client OS sessions, persistence, public metadata and complete '+body.length+'-byte static download');
    } finally {
        if(child&&child.exitCode===null){child.kill();await new Promise(resolve=>child.once('exit',resolve));}
        fs.rmSync(temporary,{recursive:true,force:true,maxRetries:6,retryDelay:200});
    }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
