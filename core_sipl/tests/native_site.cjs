const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const config=JSON.parse(fs.readFileSync(0,'utf8'));
 assert.equal(config.disposable,true);
 let checks=0;
 const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+message);};
 function client(){
  return {cookie:'',csrf:'',async request(path,body){
   const r=await fetch(config.base+path,{method:body===undefined?'GET':'POST',headers:{Cookie:this.cookie,...(body===undefined?{}:{'Content-Type':'application/json','X-SI-CSRF':this.csrf})},body:body===undefined?undefined:JSON.stringify(body)});
   const cookies=r.headers.getSetCookie();if(cookies.length)this.cookie=cookies[0].split(';')[0];
   const text=await r.text();let data;try{data=JSON.parse(text);}catch{}
   return {status:r.status,data,text};
  },async bootstrap(){const r=await this.request('/__sipl/bootstrap');this.csrf=r.data.csrf;return r;},async login(email,password){await this.bootstrap();return this.request('/delegate.php',{KEY:'LoginAttempt',email,password});}};
 }
 const admin=client();
 let r=await admin.request('/');check(r.status===200&&r.text.includes('Build the site you want.'),'Native MySQL-backed default page renders');
 await admin.bootstrap();const before={cookie:admin.cookie,csrf:admin.csrf};
 r=await admin.login(config.email,'incorrect');check(r.data[0].LOGINFAIL,'Wrong password cannot sign in');
 r=await admin.request('/delegate.php',{KEY:'LoginAttempt',email:config.email,password:config.password});
 check(r.status===200&&r.data[0].REFRESH,'PHP bcrypt administrator signs in through SIPL');
 await admin.bootstrap();check(admin.cookie!==before.cookie&&admin.csrf!==before.csrf,'Login rotates session and CSRF');
 r=await admin.request('/');check(r.status===200&&r.text.includes('/editor/editor.js'),'Administrator receives native editor assets');
 r=await admin.request('/editor/editor.js');check(r.status===200&&!r.text.includes('<?php')&&r.text.includes('SI.Editor'),'Native editor model materializes against MySQL');
 const api=async(Operation,Name,Id,Attributes={},Columns)=>admin.request('/api.v1.php',{Operation,Entity:{Name,...(Id?{Id}:{}),Attributes},...(Columns?{Columns}:{})});
 const rows=data=>Object.keys(data).filter(key=>/^\d+$/.test(key)).map(key=>data[key]);
 const action=body=>admin.request('/delegate-admin.php',body);
 r=await api('Retrieve','securityroles',null,{},['id','name']);const roles=rows(r.data);
 const tester=roles.find(role=>role.name==='Tester');const administrator=roles.find(role=>role.name==='Admin');
 check(!!tester&&!!administrator,'Existing scoped roles load');
 r=await action({KEY:'NewUser',name:'Native Fixture User',email:'native.fixture@example.test',newpassword:'Ten-chars!'});
 check(r.status===200&&r.data.USERCREATED,'Native bcrypt user creation succeeds');const userId=r.data.USERCREATED.UserId;
 r=await api('Retrieve','users',userId,{},['password']);const generated=rows(r.data)[0].password;
 check(generated.startsWith('$2b$12$'),'Created user keeps PHP-compatible bcrypt at cost 12');
 fs.writeFileSync(config.hashResult,JSON.stringify([{password:'Ten-chars!',hash:generated}]));
 r=await action({KEY:'AddUserRole',userid:userId,roleid:tester.id});check(r.status===200&&r.data.UPDATEDROLES,'Tester role assignment succeeds');
 r=await action({KEY:'GetUserRoles',userid:userId});const relation=r.data.RETRIEVEDROLES[tester.id];check(!!relation,'Role response preserves relation ID');
 const member=client();r=await member.login('native.fixture@example.test','Ten-chars!');check(r.status===200&&r.data[0].REFRESH,'SIPL-created bcrypt user can sign in');await member.bootstrap();
 r=await member.request('/delegate.php',{KEY:'ChangeDeployment',Deployment:'test'});check(r.status===200,'Tester can enter Test');
 r=await member.request('/delegate.php',{KEY:'ChangeDeployment',Deployment:'dev'});check(r.status===403,'Tester cannot enter Dev');
 r=await member.request('/editor/editor.js');check(r.status===403,'Tester cannot retrieve editor data');
 r=await action({KEY:'RemoveUserRole',relid:relation});check(r.status===200,'Role revocation succeeds');
 r=await member.request('/delegate.php',{KEY:'ChangeDeployment',Deployment:'test'});check(r.status===403,'Role revocation applies to an existing session');
 r=await action({KEY:'ChangePassword',userid:userId,newpassword:'Changed-ten!'});check(r.status===200&&r.data.PASSWORDCHANGED,'Administrator password reset uses native bcrypt');
 r=await member.request('/__sipl/bootstrap');
 r=await member.request('/delegate.php',{KEY:'ChangeDeployment',Deployment:'test'});check(r.status===403,'Password reset invalidates old privileged session state');
 const replacement=client();r=await replacement.login('native.fixture@example.test','Changed-ten!');check(r.status===200&&r.data[0].REFRESH,'Reset password signs in');
 r=await action({KEY:'PageNew',page:'native-fixture'});check(r.status===200&&r.data.PAGECREATED,'Native page creation succeeds');const pageId=Object.keys(r.data.PAGECREATED)[0];
 r=await action({KEY:'BlockNew',name:'Native Fixture',pageid:pageId,order:0});check(r.status===200&&r.data.BLOCKRELATED,'Native block and relation creation succeeds');const block=r.data.BLOCKRELATED;
 const options={tag:'section',style:{},settings:{quote:"O'Reilly \\ 日本語 🚀",emptyObject:{},emptyArray:[],enabled:false,missing:null},widgets:{}};
 r=await action({KEY:'BlockSave',guid:block.ID,relationsId:block.RELID,options,html:'<h2>Native fixture</h2>'});check(r.status===200&&r.data.BLOCKSAVED,'Block content and JSON save together');
 r=await api('Retrieve','relations',block.RELID,{},['dev-options']);assert.deepEqual(JSON.parse(rows(r.data)[0]['dev-options']),options);checks++;console.log('PASS Live SQL preserves JSON types and Unicode');
 r=await action({KEY:'BlockSave',guid:block.ID,relationsId:block.RELID,options:[],html:'SHOULD NOT SAVE'});check(r.status===400,'Invalid options reject the complete save');
 r=await api('Retrieve','blocks',block.ID,{},['dev-html']);check(rows(r.data)[0]['dev-html']==='<h2>Native fixture</h2>','Rejected options cannot partially write content');
 for(const deployment of ['test','live']){r=await action({KEY:'Promote',entityname:'relations',entityid:block.RELID,attribute:'options',deployment});check(r.status===200&&r.data.PROMOTED,'JSON promotes to '+deployment);}
 r=await api('Retrieve','relations',block.RELID,{},['dev-options','test-options','live-options']);const stages=rows(r.data)[0];check(stages['dev-options']===stages['test-options']&&stages['test-options']===stages['live-options'],'Promotion preserves SQL JSON bytes');
 r=await action({KEY:'DeleteRole',roleid:administrator.id});check(r.status===400,'Built-in administrator role cannot be deleted');
 r=await admin.request('/delegate.php',{KEY:'Logout'});check(r.status===200,'Native administrator logout succeeds');
 r=await admin.request('/editor/editor.js');check(r.status===403,'Logged-out sessions lose editor access');
 console.log('SIPL native installed-site HTTP checks passed: '+checks);
})().catch(error=>{console.error(error);process.exitCode=1;});
