// Exercise the shared editor regression against SIPL without changing PHP assets.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
let source=fs.readFileSync(path.join(__dirname,'../../tests/editor_browser.cjs'),'utf8');
const original="throw Error('Timed out: '+label);";
const diagnostic="console.error(JSON.stringify({stage:label,exceptions:exceptions.map(e=>e.exceptionDetails?.exception?.description),diagnostic:await evaluate('JSON.stringify({url:location.href,user:window.SI?.User?.Name,loaded:window.SI?.Editor?.Data?.loaded,error:document.getElementById(\"si-backend-error\")?.textContent,resources:performance.getEntriesByType(\"resource\").filter(r=>r.responseStatus>=400).map(r=>({url:r.name,status:r.responseStatus}))})')}));";
if(!source.includes(original))throw Error('Shared browser test timeout hook changed');
source=source.replace(original,diagnostic+original);
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
