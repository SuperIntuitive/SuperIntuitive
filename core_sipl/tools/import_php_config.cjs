/* Import literal PHP database settings without executing PHP or printing secrets. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const destination=path.join(root,'core_sipl/config.local.json');
if(fs.existsSync(destination)){console.log('Existing private SIPL configuration preserved.');process.exit(0);}
const source=fs.readFileSync(path.join(root,'core/DbCreds.php'),'utf8');
const values={};
const pattern=/(?:\b(?:public|private|protected|var)\s+)?\$(servername|username|password|database|dbtype|port)\s*=\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|[0-9]+)\s*;/g;
for(const match of source.matchAll(pattern)){
 const literal=match[2];
 if(/^\d+$/.test(literal)){values[match[1]]=Number(literal);continue;}
 let value=literal.slice(1,-1);
 if(literal[0]==="'")value=value.replace(/\\(['\\])/g,'$1');
 else {
  if(/(^|[^\\])\$/.test(value))throw Error('Dynamic PHP credentials require manual configuration.');
  value=value.replace(/\\([\\"$nrt])/g,(_,code)=>({n:'\n',r:'\r',t:'\t'}[code]??code));
 }
 values[match[1]]=value;
}
for(const field of ['servername','username','password','database'])if(typeof values[field]!=='string')throw Error('Unsupported PHP credentials format; no configuration written.');
if(values.dbtype&&values.dbtype!=='mysql')throw Error('Native backend requires MySQL.');
if(/[;\0]/.test(values.servername+values.database))throw Error('Unsupported DSN field; no configuration written.');
const port=values.port??3306;if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid database port.');
const config={host:'127.0.0.1',port:8092,domain:'localhost',subdomain:'',dsn:`mysql:host=${values.servername};port=${port};dbname=${values.database};charset=utf8mb4`,dbUser:values.username,dbPassword:values.password,secureCookies:false,allowNativePasswords:false,phpOrigin:'http://localhost:8090'};
fs.writeFileSync(destination,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
console.log('Created private core_sipl/config.local.json from the existing PHP database settings.');
