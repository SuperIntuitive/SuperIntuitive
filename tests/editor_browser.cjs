const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn} = require('node:child_process');
// Run only against a disposable installed fixture; configuration arrives on stdin.
(async () => {
  const stylerOnly=process.argv.includes('--styler');
  const scripterOnly=process.argv.includes('--scripter');
  const contextMenuOnly=process.argv.includes('--context-menu');
  const isolated=stylerOnly||scripterOnly||contextMenuOnly;
  const config=isolated ? {disposable:true} : JSON.parse(fs.readFileSync(0, 'utf8'));
  assert.equal(config.disposable, true, 'This test edits and saves content; use a disposable fixture');
  if(!isolated)assert(config.base && config.email && config.password, 'Fixture URL and credentials are required');
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'si-theme-review-'));
  const executable=process.env.CHROME || ['C:/Program Files/Google/Chrome/Application/chrome.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(file=>fs.existsSync(file));
  assert(executable, 'Set CHROME to a Chrome executable');
  const chrome=spawn(executable,['--headless=new','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  let socket,send,assetServer;
  try {
    const active=path.join(profile,'DevToolsActivePort');
    const deadline=Date.now()+15000;
    while(!fs.existsSync(active)){if(Date.now()>deadline)throw Error('Chrome failed to start');await new Promise(r=>setTimeout(r,50));}
    const [port,endpoint]=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);
    socket=new WebSocket('ws://127.0.0.1:'+port+endpoint);
    await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
    let id=0;const pending=new Map();const exceptions=[]; const replies=[]; const finished=new Set();
    socket.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.method==='Runtime.exceptionThrown')exceptions.push(msg.params);if(msg.method==='Network.responseReceived' && msg.params.response.url.includes('/delegate-admin.php'))replies.push(msg.params);if(msg.method==='Network.loadingFinished')finished.add(msg.params.requestId);if(msg.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:msg.params.type==='beforeunload'},msg.sessionId).catch(()=>{});if(pending.has(msg.id)){const p=pending.get(msg.id);clearTimeout(p.timer);pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}});
    send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const next=++id;const timer=setTimeout(()=>{pending.delete(next);reject(Error('Timeout: '+method));},15000);pending.set(next,{resolve,reject,timer});socket.send(JSON.stringify({id:next,method,params,sessionId}));});
    const {targetId}=await send('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
    const click=id=>evaluate(`document.getElementById(${JSON.stringify(id)}).click()`);
    const resize=async width=>{await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},sessionId);await new Promise(r=>setTimeout(r,100));};
    await send('Runtime.enable',{},sessionId);
    await send('Page.enable',{},sessionId);
    await send('Network.enable',{},sessionId);
    await resize(1440);
    if(contextMenuOnly){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS Context menu '+message);};
      const source=fs.readFileSync(path.join(__dirname,'../editor/editor.js'),'utf8');
      const start=source.indexOf('SetDocumentEvents: function () {'),end=source.indexOf('DrawAppContainer: function () {',start);
      assert(start>=0&&end>start,'Editor document event handlers are available');
      await evaluate(`document.body.innerHTML='<main class="si-block"><h1 id="first" class="si-editable-element">First</h1><p id="second" class="si-editable-element">Second</p><input id="text"></main><div id="si_edit_container"><div id="menu" style="position:fixed;display:none;width:75px;height:110px"><input id="editor_text"></div></div><div class="si-editor-tool-window"><div data-fixture-canvas><p id="widget" class="si-editable-element">Widget</p></div></div>';
        window.SI={Editor:{Data:{Objects:{Blocks:{}}},Objects:{Blocks:{},Widgets:{CanvasDirty:false,CanvasFor:element=>element.closest('[data-fixture-canvas]')},Placement:{Init:()=>{},Cancel:()=>{}},Elements:{Selected:null,Select:(_,id)=>{SI.Editor.Objects.Elements.Selected=document.getElementById(id)},SelectNone:()=>{SI.Editor.Objects.Elements.Selected=null}}}}};`);
      await evaluate('SI.Editor.UI={'+source.slice(start,end)+'};SI.Editor.UI.MainMenu={Element:document.getElementById("menu")};SI.Editor.UI.SetDocumentEvents();');
      const rightClick=(id,x=30,y=60)=>evaluate(`(()=>{const event=new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:${x},clientY:${y}});document.getElementById(${JSON.stringify(id)}).dispatchEvent(event);const menu=SI.Editor.UI.MainMenu.Element;return {prevented:event.defaultPrevented,selected:SI.Editor.Objects.Elements.Selected?.id,left:menu.style.left,top:menu.style.top,visible:getComputedStyle(menu).display!=='none'};})()`);
      let result=await rightClick('first');
      check(result.prevented&&result.visible&&result.selected==='first','first right-click opens the editor and selects the target');
      result=await rightClick('second',240,180);
      check(result.prevented&&result.selected==='second'&&result.left==='240px'&&result.top==='180px','right-clicking another element repositions an already-open menu without opening the browser menu');
      await evaluate('Object.assign(SI.Editor.UI.MainMenu.Element.style,{left:"2400px",top:"1800px"})');
      result=await rightClick('first',100,120);
      check(result.prevented&&result.selected==='first'&&result.left==='100px'&&result.top==='120px','an off-screen menu can be recovered with a right-click');
      result=await rightClick('first');
      check(result.prevented&&!result.selected,'right-clicking the selected element clears its selection');
      result=await rightClick('text');
      check(!result.prevented,'ordinary text fields retain their native context menu');
      result=await rightClick('editor_text');
      check(!result.prevented,'editor controls retain their native context menu');
      result=await rightClick('widget');
      check(result.prevented&&result.selected==='widget','widget preview content retains editor selection');
      result=await rightClick('second',1439,999);
      check(result.prevented&&parseFloat(result.left)<=1360&&parseFloat(result.top)<=880,'repositioned menus stay inside the viewport');
      check(exceptions.length===0,'document context handling produces no browser exceptions');
      console.log('Context-menu browser checks passed: '+checks);return;
    }
    if(process.argv.includes('--demo-plugin')){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+config.backend+' demo plugin '+message);};
      const pause=()=>new Promise(resolve=>setTimeout(resolve,60));
      const wait=async(test,label)=>{const until=Date.now()+20000;while(Date.now()<until){if(await test())return;await pause();}throw Error(label+'; browser errors: '+JSON.stringify(exceptions));};
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait(()=>evaluate('!!window.SI?.CSRF?.Token'),'Parent guest bootstrap');
      check(await evaluate('(async()=>{const r=await fetch("/delegate.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify('+JSON.stringify({KEY:'LoginAttempt',email:config.email,password:config.password})+')});return r.ok&&(await r.json())[0]?.REFRESH})()'),'privileged parent session is present');
      await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.demoMessages=[];window.addEventListener("message",e=>{if(e.data?.source==="si-sample")demoMessages.push({origin:e.origin,...e.data})});'},sessionId);
      await send('Page.navigate',{url:config.base+'/editor-demo'},sessionId);
      try{await wait(()=>evaluate('window.demoMessages?.some(m=>m.type==="ready")'),'Demo ready');}catch(error){throw Error(error.message+'; parent '+await evaluate('JSON.stringify({url:location.href,frame:document.querySelector("[data-demo-frame]")?.src,status:document.querySelector("[data-demo-status]")?.textContent,messages:window.demoMessages})'));}
      check(await evaluate('document.querySelector("[data-demo-frame]").src.startsWith("http://demo.localhost:")'),'normal plugin page embeds the separate origin');
      let childSession;
      const attach=async()=>{
        let target;
        await wait(async()=>{target=(await send('Target.getTargets')).targetInfos.find(t=>t.type==='iframe'&&t.url.includes('demo.localhost:')&&t.url.includes('/cms/sample/canvas'));return !!target;},'Isolated iframe target');
        childSession=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true})).sessionId;
        await send('Runtime.enable',{},childSession);await send('Page.enable',{},childSession);
      };
      await attach();
      const child=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},childSession);assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
      if(config.expectCustom)check(await child('document.getElementById("cms_custom_demo_note")?.textContent==="Kept after CMS update"'),'CMS-edited published Blocks survive the CMS update');
      check(await evaluate('demoMessages.filter(m=>m.type==="ready").every(m=>m.origin==="null")'),'demo has an opaque browser origin');
      check(await child('SI.User.Name==="guest"&&SI.User.Roles.join()==="Guest"&&!SI.CSRF.Token'),'demo has no administrator identity or CSRF token');
      check(await child('!document.body.textContent.includes("ADMIN_ONLY_DEMO_DRAFT")'),'demo does not expose unpublished administrator edits');
      check(await child('(()=>{try{return !parent.document}catch(e){return e.name==="SecurityError"}})()'),'demo cannot read the parent document');
      check(await child('(()=>{try{return document.cookie===""}catch(e){return e.name==="SecurityError"}})()'),'demo cannot read site cookies');
      check(await child('Object.keys(SI.Editor.Data.Objects.Plugins.Current).length===0&&SI.Sample.records.media.length===0&&SI.Sample.records.pages.length===1&&SI.Editor.Data.Objects.Security.Roles.length===0'),'public model excludes private plugins, media, pages and account roles');
      for(const tool of ['Page','Media','Site','Styler','Scripter','Widgets','Language','Entities','Plugins','Security','Users','Settings']){
        await evaluate('document.querySelector("[data-demo-frame]").contentWindow.postMessage({source:"si-sample-host",type:"tool",tool:'+JSON.stringify(tool)+'},"*")');
        const key=JSON.stringify('si_edit_'+tool.toLowerCase()+'_window');
        await wait(()=>child('!!SI.Widgets.Window['+key+']?.Content?.childNodes.length&&SI.Widgets.Window['+key+'].IsVisible()'),'Demo tool '+tool);
        check(true,'tool available: '+tool);await child('SI.Widgets.Window['+key+'].Hide(0)');
      }
      await child('SI.Editor.UI.ToolsPanel.OpenToolWindow("Styler")');
      check(await child('!document.getElementById("si_styler_codeorguidcb").checked&&getComputedStyle(document.getElementById("si_styler_workspace")).display!=="none"'),'Styler opens in its visual workspace by default');
      check(await child('!!Array.from(document.querySelectorAll(".si-edit-style-propertyvalue")).find(e=>e.dataset.siStyleProp==="--demo-accent")'),'modern/custom Styler controls remain available');
      await child('(()=>{const e=Array.from(document.querySelectorAll(".si-edit-style-propertyvalue")).find(e=>e.dataset.siStyleProp==="--demo-accent");e.value="#102030";e.dispatchEvent(new Event("input",{bubbles:true}));SI.Editor.Objects.Styler.BuildStyle()})()');
      check(await child('document.getElementById("si_styler_codepad").textContent.includes("#102030")'),'temporary CSS edits round trip through the GUI');
      await child('document.getElementById("si_demo_sample_title").textContent="Temporary demo edit";localStorage.setItem("demo-only","temporary");SI.Editor.Objects.Blocks.Save(Object.keys(SI.Editor.Data.Objects.Blocks)[0],"html");SI.Tools.Api.Send({Data:{Operation:"Update",Entity:{Name:"pages",Attributes:{name:"must not persist"}}}})');
      check(await child('document.getElementById("si_demo_sample_title").textContent==="Temporary demo edit"&&localStorage.getItem("demo-only")==="temporary"'),'temporary HTML editing and reference storage work');
      await wait(()=>evaluate('demoMessages.some(m=>m.type==="blocked")'),'Save blocked');check(true,'Save and API mutations are blocked locally');
      check(await child('new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(false);img.onerror=()=>resolve(true);img.src="https://example.com/forbidden-image.png";document.body.appendChild(img)})'),'browser policy blocks external assets');
      check(await child('new Promise(resolve=>{try{const socket=new WebSocket("wss://example.com/forbidden");socket.onopen=()=>{socket.close();resolve(false)};socket.onerror=()=>resolve(true)}catch(e){resolve(e.name==="SecurityError")}})'),'browser policy blocks external connections');
      await child('(()=>{const form=document.createElement("form");form.action="https://example.com/forbidden-form";form.method="POST";document.body.appendChild(form);HTMLFormElement.prototype.submit.call(form)})()');
      check(await child('location.pathname==="/cms/sample/canvas"'),'browser policy blocks form submission');
      check(await evaluate('!demoMessages.some(m=>m.type==="error"||(m.type==="notice"&&m.message.includes("Error loading")))'),'all twelve tools load without reported errors');
      const ready=await evaluate('demoMessages.filter(m=>m.type==="ready").length');
      await evaluate('document.querySelector("[data-demo-reset]").click()');
      await wait(()=>evaluate('demoMessages.filter(m=>m.type==="ready").length>'+ready),'Reset');
      await attach();
      check(await child('document.getElementById("si_demo_sample_title").textContent==="Make something yours."&&localStorage.getItem("demo-only")===null'),'reset restores published HTML and clears temporary storage');
      check(await child('SI.Editor.Data.Objects.Blocks[Object.keys(SI.Editor.Data.Objects.Blocks)[0]].style.includes("#83acd4")'),'reset restores published CSS');
      console.log('Demo plugin browser checks passed: '+checks);return;
    }
    if(process.argv.includes('--widgets')){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+config.backend+' widgets '+message);};
      const wait=async(expression,label)=>{const until=Date.now()+20000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,60));}throw Error(label+'; '+JSON.stringify(exceptions)+'; '+await evaluate('JSON.stringify({url:location.href,title:document.title,user:window.SI?.User,editor:!!window.SI?.Editor,scripts:Array.from(document.scripts,s=>s.src)})'));};
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait('document.readyState==="complete"&&!!window.SI?.CSRF?.Token','Guest bootstrap');
      const login=await evaluate('(async()=>{const r=await fetch("/delegate.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify('+JSON.stringify({KEY:'LoginAttempt',email:config.email,password:config.password})+')});return {status:r.status,body:await r.text()}})()');
      check(login.status===200&&login.body.includes('REFRESH'),'administrator login '+JSON.stringify(login));
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait('!!document.getElementById("si_edit_widgets_trigger")','Administrator editor');
      await click('si_edit_widgets_trigger');
      await wait('!!SI.Editor.Objects.Widgets.Preview','Widget preview');
      check(await evaluate('SI.Editor.Objects.Widgets.Preview.dataset.siWidget==="Template"&&SI.Editor.Objects.Widgets.Canvas.contains(SI.Editor.Objects.Widgets.Preview)'),'selection renders a real Template instance in the canvas');
      const previews=await evaluate('(()=>{const w=SI.Editor.Objects.Widgets,results=[];for(const type of Array.from(w.WidgetSelector.options,option=>option.value)){w.SelectWidget(type,true);results.push({type,ok:!!w.Preview&&w.Preview.dataset.siWidget===type&&w.Canvas.contains(w.Preview),status:document.getElementById("si_edit_widget_status").textContent});}w.SelectWidget("Template",true);return results})()');
      check(previews.length>=14&&previews.every(result=>result.ok),'every selectable widget renders an instance: '+JSON.stringify(previews.filter(result=>!result.ok)));
      check(await evaluate('(()=>{const w=SI.Editor.Objects.Widgets,base=document.createElement("div");base.innerHTML="<button>Action</button><div></div>";w.CaptureBase(base);base.lastChild.appendChild(base.firstChild);const design=w.Design(base),copy=document.createElement("div");copy.innerHTML="<button>Action</button><div></div>";const button=copy.firstChild;let clicks=0;button.addEventListener("click",()=>clicks++);SI.Tools.Widget.ApplyDesign(copy,design);button.click();return copy.lastChild.firstChild===button&&clicks===1})()'),'moving existing controls into containers retains their original event handlers');
      const pageBefore=await evaluate('Array.from(document.querySelectorAll(".si-block"),block=>block.innerHTML).join("|")');
      await evaluate('(()=>{const e=SI.Editor.Objects.Widgets.Preview;SI.Editor.Objects.Elements.Select(null,e.id);SI.Editor.UI.MainMenu.Element.style.display="block";document.getElementById("si_edit_edit_menuitem").style.display="none";SI.Editor.UI.MainMenu.SelectMenu("si_edit_edit_menuitem");})()');
      check(await evaluate('SI.Editor.Objects.Elements.Selected===SI.Editor.Objects.Widgets.Preview'),'preview selection uses the existing Edit menu');
      await evaluate('(()=>{SI.Editor.Objects.Placement.Begin({clientX:0,clientY:0,stopPropagation(){}},{kind:"tag",name:"div",defaults:{}});const p=SI.Editor.Objects.Placement,w=SI.Editor.Objects.Widgets;p.State.parent=w.Preview;p.State.x=100;p.State.y=200;p.Commit();window.widgetAdded=SI.Editor.Objects.Elements.Selected;widgetAdded.textContent="Widget canvas content";widgetAdded.style.color="rgb(120, 160, 200)";SI.Editor.Objects.Elements.MarkDirty(widgetAdded);})()');
      check(await evaluate('SI.Editor.Objects.Widgets.Preview.contains(widgetAdded)&&SI.Editor.Objects.Widgets.CanvasDirty'),'Add placement accepts a canvas destination and marks only the design dirty');
      check(await evaluate('Array.from(document.querySelectorAll(".si-block"),block=>block.innerHTML).join("|")')===pageBefore,'canvas editing leaves all page blocks unchanged');
      await evaluate('SI.Editor.Objects.Widgets.SaveDesign()');
      check(await evaluate('!SI.Editor.Objects.Widgets.CanvasDirty&&SI.Editor.Objects.Widgets.Sources.Template.design.length>0'),'Save design persists the canvas through the protected widget API');
      await evaluate('SI.Editor.Objects.Widgets.SelectWidget("CodePad",true);SI.Editor.Objects.Widgets.SelectWidget("Template",true)');
      check(await evaluate('SI.Editor.Objects.Widgets.Preview.textContent.includes("Widget canvas content")'),'reselecting the widget restores the saved design');
      await evaluate('SI.Editor.Objects.Widgets.OpenSource("Template","script")');
      await wait('SI.Editor.Objects.Scripter.LoadedType==="Widget"&&!!SI.Editor.Objects.Scripter.Parsed','Widget JavaScript');
      check(await evaluate('SI.Editor.Objects.Scripter.Source.includes("SI.Widget.Template")'),'Scripter opens the constructor with Code and Blocks views');
      await evaluate('SI.Editor.Objects.Scripter.Accept(SI.Editor.Objects.Scripter.Source+"\\n/* browser-widget-saved */");SI.Editor.Objects.Scripter.SaveScript()');
      check(await evaluate('!SI.Editor.Objects.Scripter.Dirty&&SI.Editor.Objects.Widgets.Sources.Template.script.includes("browser-widget-saved")'),'Scripter saves widget JavaScript to SQL');
      await evaluate('SI.Widgets.Window.si_edit_scripter_window.Hide(0);SI.Editor.Objects.Widgets.OpenSource("Template","style")');
      await wait('SI.Editor.Objects.Styler.LoadedType==="Widget"','Widget CSS');
      check(await evaluate('SI.Editor.Objects.Styler.Codepad.textContent.includes("data-si-widget")'),'Styler opens the selected widget CSS');
      await evaluate('if(!document.getElementById("si_styler_codeorguidcb").checked)document.getElementById("si_styler_codeorguidcb").click();SI.Editor.Objects.Styler.Codepad.textContent="[data-si-widget=\\"Template\\"] { --widget-browser: 42; border: 3px solid #7088a0 !important; }";SI.Editor.Objects.Styler.SaveStyle()');
      await wait('SI.Editor.Objects.Widgets.Sources.Template.style.includes("--widget-browser")','Widget CSS save');
      check(true,'Styler saves widget CSS through the same protected API');
      await send('Page.reload',{},sessionId);
      await wait('!!document.getElementById("si_edit_widgets_trigger")','Reloaded editor');
      await click('si_edit_widgets_trigger');await wait('!!SI.Editor.Objects.Widgets.Preview','Reloaded widget preview');
      check(await evaluate('SI.Editor.Objects.Widgets.Preview.textContent.includes("Widget canvas content")&&getComputedStyle(SI.Editor.Objects.Widgets.Preview).getPropertyValue("--widget-browser").trim()==="42"'),'design and styles survive reload from SQL');
      const createdName='BrowserWidget'+(config.backend==='php'?'Php':'Sipl');
      await evaluate('document.getElementById("si_edit_widget_new_name").value='+JSON.stringify(createdName));await click('si_edit_widget_create');
      await wait('SI.Editor.Objects.Widgets.SelectedWidget==='+JSON.stringify(createdName),'Create named widget');
      check(await evaluate('SI.Editor.Objects.Widgets.Preview.dataset.siWidget==='+JSON.stringify(createdName)),'New widget creates a named editable definition and its preview');
      await evaluate('(()=>{const w=SI.Widgets.Window.si_edit_widgets_window;Object.assign(w.Container.style,{left:"420px",top:"24px",width:"980px",height:"900px"});w.Container.querySelector("[data-tabname=\\"Widget Editor\\"]").click();const menu=SI.Editor.UI.MainMenu.Element;Object.assign(menu.style,{display:"block",left:"8px",top:"100px"});document.getElementById("si_edit_add_menuitem").style.display="none";SI.Editor.UI.MainMenu.SelectMenu("si_edit_add_menuitem");SI.Editor.UI.AddPanel.Show("tag");})()');
      let intercepted;
      socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Input.dragIntercepted')intercepted=message.params.data;});
      await send('Input.setInterceptDrags',{enabled:true},sessionId);
      const point=await evaluate('(()=>{const r=SI.Editor.Objects.Widgets.Preview.getBoundingClientRect();return {x:r.x+140,y:r.y+60}})()');
      const start=await evaluate('(()=>{const item=document.getElementById("dragger_div");item.scrollIntoView({block:"nearest"});const r=item.getBoundingClientRect();return {x:r.x+25,y:r.y+r.height/2}})()');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...start},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:start.x+25,y:start.y+8,button:'left',buttons:1},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,button:'left',buttons:1},sessionId);
      for(let attempts=0;!intercepted&&attempts<100;attempts++)await new Promise(r=>setTimeout(r,30));
      check(!!intercepted,'browser starts a native drag from the existing Add palette');
      await send('Input.dispatchDragEvent',{type:'dragEnter',...point,data:intercepted},sessionId);
      await send('Input.dispatchDragEvent',{type:'dragOver',...point,data:intercepted},sessionId);
      check(await evaluate('SI.Editor.Objects.Placement.State.parent===SI.Editor.Objects.Widgets.Preview'),'native drag targets the visible widget inside the tool window');
      await send('Input.dispatchDragEvent',{type:'drop',...point,data:intercepted},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},sessionId);
      await evaluate('window.widgetDraftBox=SI.Editor.Objects.Elements.Selected;Object.assign(widgetDraftBox.style,{width:"260px",height:"140px"});widgetDraftBox.dataset.widgetTest="nested";SI.Editor.Objects.Placement.Begin({clientX:0,clientY:0,stopPropagation(){}},{kind:"widget",name:"Field"});const p=SI.Editor.Objects.Placement;p.State.parent=widgetDraftBox;p.State.x=600;p.State.y=400;p.Commit()');
      await evaluate('SI.Editor.Objects.Widgets.SaveDesign();');
      await evaluate('SI.Editor.Objects.Widgets.SelectWidget('+JSON.stringify(createdName)+',true)');
      check(await evaluate('(()=>{const e=SI.Editor.Objects.Widgets.Preview.querySelector("[data-widget-test=nested] [data-si-widget=Field]");return !!e&&!!SI.Widgets.Field[e.id]})()'),'saved nested widgets are reconstructed as live controls');
      await evaluate('(()=>{const w=SI.Editor.Objects.Widgets,block=document.querySelector(".si-block");SI.Editor.Objects.Placement.Begin({clientX:0,clientY:0,stopPropagation(){}},{kind:"widget",name:w.SelectedWidget,design:w.Design(w.Preview)});const p=SI.Editor.Objects.Placement;p.State.parent=block;p.State.x=100;p.State.y=200;p.Commit();window.placedWidgetId=SI.Editor.Objects.Elements.Selected.id;SI.Editor.Objects.Elements.Selected.dataset.instanceEdit="preserved";SI.Editor.Objects.Elements.MarkDirty(SI.Editor.Objects.Elements.Selected);window.widgetBlock=block.id.replace("si_block_","");SI.Editor.Objects.Blocks.Save(widgetBlock,"html");})()');
      await wait('!SI.Editor.Data.Objects.Blocks[widgetBlock].IsDirty','Save widget on page');
      const placedId=await evaluate('placedWidgetId');
      await send('Page.reload',{},sessionId);await wait('!!window.SI?.Editor?.Objects?.Widgets','Reload placed widget');
      const restored=await evaluate('(()=>{const e=document.getElementById('+JSON.stringify(placedId)+');return {found:!!e,edit:e?.dataset.instanceEdit,registered:!!SI.Widgets['+JSON.stringify(createdName)+']?.[e?.id],nested:!!e?.querySelector("[data-si-widget=Field]"),blocks:SI.Page.Blocks}})()');
      check(restored.found&&restored.edit==='preserved'&&restored.registered&&restored.nested,'placed widgets reload with live instances, nested controls, and saved instance edits'+(restored.found&&restored.edit==='preserved'&&restored.registered&&restored.nested?'':': '+JSON.stringify(restored)));
      check(exceptions.length===0,'no uncaught browser errors');
      console.log('Widget browser checks passed: '+checks);return;
    }
    if(process.argv.includes('--framework')){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+config.backend+' framework '+message);};
      const pause=()=>new Promise(resolve=>setTimeout(resolve,60));
      const wait=async(test,label)=>{const until=Date.now()+20000;while(Date.now()<until){if(await test())return;await pause();}throw Error(label+'; browser errors: '+JSON.stringify(exceptions));};
      await send('Page.navigate',{url:config.base+'/asset-a'},sessionId);
      await wait(()=>evaluate('window.frameworkAsset==="A"'),'Page A assets');
      const {targetId:tabB}=await send('Target.createTarget',{url:config.base+'/asset-b'});
      const {sessionId:sessionB}=await send('Target.attachToTarget',{targetId:tabB,flatten:true});
      await wait(async()=>{const r=await send('Runtime.evaluate',{expression:'window.frameworkAsset',returnByValue:true},sessionB);return r.result.value==='B';},'Page B assets');
      await send('Page.reload',{},sessionId);
      await wait(()=>evaluate('window.frameworkAsset==="A"'),'Reloaded page A assets');
      check(await evaluate('getComputedStyle(document.documentElement).getPropertyValue("--fixture-tone").trim()==="#25384c"'),'two open tabs retain their own script and CSS');
      await send('Target.closeTarget',{targetId:tabB});
      check(await evaluate('(async()=>{const r=await fetch("/delegate.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify('+JSON.stringify({KEY:'LoginAttempt',email:config.email,password:config.password})+')});return r.ok&&(await r.json())[0]?.REFRESH})()'),'normal administrator signs in');
      await send('Page.navigate',{url:config.base+'/asset-a'},sessionId);
      await wait(()=>evaluate('!!document.getElementById("si_edit_styler_trigger")'),'Administrator editor');
      await click('si_edit_page_trigger');
      await wait(()=>evaluate('!!document.getElementById("si_bid_name_FrameworkA")'),'Administrator block controls');
      await evaluate('SI.Widgets.Window.si_edit_page_window.Hide(0)');
      await click('si_edit_styler_trigger');
      await wait(()=>evaluate('!!document.getElementById("si_styler_codeorguidcb")'),'Administrator Styler');
      check(await evaluate('!document.getElementById("si_styler_codeorguidcb").checked&&getComputedStyle(document.getElementById("si_styler_workspace")).display!=="none"'),'Administrator Styler opens in its visual workspace by default');
      check(await evaluate('!!Array.from(document.querySelectorAll(".si-edit-style-propertyvalue")).find(e=>e.dataset.siStyleProp==="--fixture-tone")'),'packaged Styler exposes custom CSS in the normal editor');
      await evaluate('SI.Widgets.Window.si_edit_styler_window.Hide(0);SI.Editor.Objects.Blocks.Save("FrameworkA","html")');
      await wait(async()=>replies.length>0&&finished.has(replies.at(-1).requestId),'Normal editor save');
      check(replies.at(-1).response.status===200,'normal administrator block save reaches the protected backend');
      console.log('Framework browser checks passed: '+checks);
      return;
    }
    if(process.argv.includes('--admin')){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS '+config.backend+' admin '+message);};
      const wait=async(expression,label)=>{const deadline=Date.now()+20000;while(Date.now()<deadline){if(await evaluate(expression))return;await new Promise(resolve=>setTimeout(resolve,50));}throw Error(label);};
      const api=(data,csrf=true)=>evaluate('(async()=>{const response=await fetch("/delegate-admin.php",{method:"POST",headers:{"Content-Type":"application/json"'+(csrf?',"X-SI-CSRF":SI.CSRF.Token':'')+'},body:JSON.stringify('+JSON.stringify(data)+')});return {status:response.status,value:await response.json()};})()');
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait('document.readyState==="complete"&&!!window.SI?.CSRF?.Token','Guest bootstrap');
      const fixtureEmail='admin-ui-'+config.backend+'@example.test',initialPassword='Initial-admin-ui-2026!',newPassword='Changed-admin-ui-2026!';
      check((await api({KEY:'ChangePassword',userid:'0x'+'1'.repeat(32),newpassword:newPassword})).status===403,'guest cannot reset a password');
      check(await evaluate('(async()=>{const response=await fetch("/delegate.php",{method:"POST",headers:{"Content-Type":"application/json","X-SI-CSRF":SI.CSRF.Token},body:JSON.stringify('+JSON.stringify({KEY:'LoginAttempt',email:config.email,password:config.password})+')});const value=await response.json();return response.ok&&value[0]?.REFRESH;})()'),'administrator login');
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait('!!document.getElementById("si_edit_users_trigger")','Admin Tools menu ready');
      const created=await api({KEY:'NewUser',name:'Admin UI Fixture',email:fixtureEmail,newpassword:initialPassword});
      check(created.status===200&&created.value.CREATEUSER?.UserId,'disposable password-test account created');
      const userId=created.value.CREATEUSER.UserId;
      check((await api({KEY:'ChangePassword',userid:userId,newpassword:newPassword},false)).status===403,'password reset requires CSRF');
      check((await api({KEY:'ChangePassword',userid:'0x'+'0'.repeat(32),newpassword:newPassword})).value.PASSWORDCHANGED===false,'missing user is not reported as a successful reset');
      await send('Page.navigate',{url:config.base+'/'},sessionId);
      await wait('!!document.getElementById("si_edit_users_trigger")','Users data refreshed');
      const rightClick=()=>evaluate('(()=>{const event=new MouseEvent("contextmenu",{bubbles:true,cancelable:true,clientX:140,clientY:140});document.body.dispatchEvent(event);return event.defaultPrevented})()');
      check(await rightClick(),'first right-click opens Add/Edit/Tools');
      const menuPosition=await evaluate('({left:SI.Editor.UI.MainMenu.Element.style.left,top:SI.Editor.UI.MainMenu.Element.style.top})');
      check(!await rightClick(),'open editor leaves the browser context menu available');
      assert.deepEqual(await evaluate('({left:SI.Editor.UI.MainMenu.Element.style.left,top:SI.Editor.UI.MainMenu.Element.style.top})'),menuPosition);
      check(true,'native right-click preserves editor position');
      await click('si_edit_users_trigger');
      await wait('!!document.getElementById("si_editor_users_table")','Users window opens');
      await evaluate('window.rolesResult=null;const setRoles=SI.Editor.Objects.User.SetRoles;SI.Editor.Objects.User.SetRoles=function(value){rolesResult=value;return setRoles.call(this,value)};window.adminRolesButton=Array.from(document.querySelectorAll("#si_editor_users_table tr")).find(row=>row.textContent.includes('+JSON.stringify(config.email)+')).querySelectorAll("button")[1];adminRolesButton.click()');
      await wait('rolesResult!==null','Assigned roles response');
      check(await evaluate('Array.from(document.querySelectorAll("#si_edit_users_rolewindow input:checked")).some(input=>input.parentElement.textContent.trim()==="Admin")'),'Admin assignment populates the account checkbox; response '+await evaluate('JSON.stringify(rolesResult)'));
      check(await evaluate('(()=>{const event=new MouseEvent("contextmenu",{bubbles:true,cancelable:true});document.getElementById("si_editor_users_table").dispatchEvent(event);return !event.defaultPrevented})()'),'Users window retains the browser context menu');
      await evaluate('SI.Editor.UI.MainMenu.Element.style.display="none"');
      check(await evaluate('(()=>{const event=new MouseEvent("contextmenu",{bubbles:true,cancelable:true});document.getElementById("si_editor_users_table").dispatchEvent(event);return !event.defaultPrevented&&SI.Editor.UI.MainMenu.Element.style.display==="none"})()'),'tool-window right-click does not reopen a closed editor menu');
      await evaluate('window.adminAlerts=[];const alert=SI.Tools.SuperAlert;SI.Tools.SuperAlert=(message,...args)=>{adminAlerts.push(message);return alert(message,...args)};window.passwordButton=Array.from(document.querySelectorAll("#si_editor_users_table tr")).find(row=>row.textContent.includes('+JSON.stringify(fixtureEmail)+')).querySelector("button")');
      let requests=replies.length;
      await evaluate('window.prompt=()=>{throw Error("prompt() is not supported.")}');
      await evaluate('passwordButton.click()');
      await wait('SI.Editor.Objects.User.PasswordWindow?.IsVisible()','Existing Window widget opens');
      check(await evaluate('SI.Editor.Objects.User.PasswordWindow instanceof SI.Widget.Window&&document.getElementById("si_edit_users_password_input").type==="password"'),'existing Window and Field widgets open a masked password input with prompt disabled');
      await evaluate('document.getElementById("si_edit_users_password_input").value="cancelled-password";document.querySelector("#si_edit_users_password_form button[type=button]").click()');
      await wait('!SI.Editor.Objects.User.PasswordWindow.IsVisible()','Password window cancelled');
      check(replies.length===requests&&await evaluate('document.getElementById("si_edit_users_password_input").value===""'),'Cancel clears the password without sending a request');
      await evaluate('passwordButton.click()');
      await wait('SI.Editor.Objects.User.PasswordWindow.IsVisible()','Password window reopens');
      await evaluate('document.getElementById("si_edit_users_password_input").value="escaped-password";document.getElementById("si_edit_users_password_input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}))');
      await wait('!SI.Editor.Objects.User.PasswordWindow.IsVisible()','Password window Escape');
      check(replies.length===requests&&await evaluate('document.getElementById("si_edit_users_password_input").value===""'),'Escape cancels and clears the password');
      await evaluate('passwordButton.click()');
      for(const password of ['short','é'.repeat(37)]){
        await evaluate('document.getElementById("si_edit_users_password_input").value='+JSON.stringify(password)+';document.getElementById("si_edit_users_password_form").requestSubmit()');
        check(replies.length===requests&&await evaluate('document.getElementById("si_edit_users_password_status").textContent.includes("10 to 72 bytes")'),'invalid password gets inline feedback without an update');
      }
      await evaluate('adminAlerts.length=0;document.getElementById("si_edit_users_password_input").value='+JSON.stringify(newPassword)+';document.getElementById("si_edit_users_password_form").requestSubmit()');
      await wait('adminAlerts.includes("Password changed.")','Password button save confirmation');
      check(true,'Password button saves through the existing authenticated Admin endpoint');
      check(await evaluate('document.getElementById("si_edit_users_password_input").value===""&&document.querySelectorAll("#si_edit_users_password_window").length===1'),'saving clears the password and reuses one Window widget');
      const login=async password=>{
        const native=config.backend==='sipl',home=await fetch(config.base+(native?'/__sipl/bootstrap':'/'));
        const cookie=home.headers.getSetCookie()[0].split(';')[0];
        let csrf;
        if(native)csrf=(await home.json()).csrf;
        else{const match=(await home.text()).match(/SI\.CSRF\.Token\s*=\s*("[^"]+")/);assert(match,'Fresh login token');csrf=JSON.parse(match[1]);}
        const response=await fetch(config.base+'/delegate.php',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-SI-CSRF':csrf},body:JSON.stringify({KEY:'LoginAttempt',email:fixtureEmail,password})});
        let value=await response.json();if(Array.isArray(value))value=value[0];
        return response.ok&&!!value.REFRESH;
      };
      check(!await login(initialPassword),'previous password no longer authenticates');
      check(await login(newPassword),'new password authenticates through normal login');
      await evaluate('adminAlerts.length=0;SI.Editor.Objects.User.PasswordChanged(false)');
      check(await evaluate('adminAlerts[0].includes("could not be changed")'),'unsuccessful resets get visible failure feedback');
      check(exceptions.length===0,'no browser exceptions during user management or right-click');
      console.log('Admin browser checks passed: '+checks);return;
    }
    if(stylerOnly){
      let checks=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS Styler '+message);};
      const original=String.raw`/* Theme comment */
:root {
  color-scheme: dark;
  /* value comment ; : */ --si-bg: #0b1525;
  --si-accent: var(--fallback, #80b3ff);
  --label: "A; B: <tag> {literal}";
  scroll-padding-top: 4rem;
  experimental-property: paint(custom-effect) !important;
}
:is(.si-topbar a, .si-sidebar a):focus-visible { text-underline-offset: .2em; outline: 2px solid var(--si-accent); }
html { scroll-behavior: smooth; }
body { margin: 0 !important; background-image: url("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4="); width: calc(100% - var(--space, 2rem)); }
#hero[data-mode]:hover::before { color: var(--si-accent); }
@media (min-width: 40rem) { .card { display: grid; --space: 2rem; } }
@supports (display: grid) { .card { gap: 1rem; } }`;
      const html='<!doctype html><html><head><title>Styler review</title><link id=si_page_style rel=stylesheet href="http://127.0.0.1:1/style/page.css?page=styler-fixture"></head><body><div class=si-editor-tool-window style="width:1100px;height:900px"><div class=si-window-content id=review_window></div></div><div id=inline_target style="width:12px;color:red"></div><table id=inline_controls></table></body></html>';
      await evaluate('document.open();document.write('+JSON.stringify(html)+');document.close()');
      await evaluate('window.SI={Widgets:{},Widget:{},Editor:{Style:{TextColor:"#304763"},UI:{EditPanel:{SelectionSummary:()=>{}}},Objects:{Widgets:{UpdatePlacement:()=>{},CanvasFor:()=>null},Blocks:{Save:(name,kind)=>{window.stylerSaved={name,kind,style:SI.Editor.Data.Objects.Blocks[name].style}}}},Data:{User:{HelpLinks:[]},DataLists:{AnimationNames:[]},Objects:{Blocks:{StylerFixture:{style:'+JSON.stringify(original)+'}},Plugins:{Current:{}}},Tools:{}}}}');
      for(const name of ['css_properties','html_elements','html_attributes'])await evaluate('SI.Editor.Data['+JSON.stringify(name)+']='+fs.readFileSync(path.join(__dirname,'../editor/media/data',name+'.json'),'utf8'));
      await evaluate('SI.Editor.Data.OptionSets={CSS:{Colors:"<option>red</option>"}}');
      const editorSource=fs.readFileSync(path.join(__dirname,'../editor/editor.js'),'utf8');
      await evaluate('SI.Editor.Data.Tools={'+editorSource.slice(editorSource.indexOf('GetStyleByName: function (name)'),editorSource.indexOf('//GetAttributesByName'))+'}');
      for(const file of ['scripts/tools.js','editor/objects/elements.js','editor/objects/settings.js','editor/objects/styler.js'])await evaluate(fs.readFileSync(path.join(__dirname,'..',file),'utf8'));
      await evaluate('document.head.appendChild(Object.assign(document.createElement("style"),{textContent:'+JSON.stringify(fs.readFileSync(path.join(__dirname,'../editor/editor.css'),'utf8'))+'}));document.getElementById("review_window").appendChild(SI.Editor.Objects.Styler.Draw())');
      const value=property=>evaluate('Array.from(document.querySelectorAll("#si_styler_workspace .si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==='+JSON.stringify(property)+')?.value');
      const edit=(property,text)=>evaluate('(()=>{const input=Array.from(document.querySelectorAll("#si_styler_workspace .si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==='+JSON.stringify(property)+');input.value='+JSON.stringify(text)+';input.dispatchEvent(new Event("input",{bubbles:true}));return input.validationMessage;})()');
      const build=()=>evaluate('SI.Editor.Objects.Styler.BuildStyle();document.getElementById("si_styler_codepad").textContent');
      check(await evaluate('!document.getElementById("si_styler_codeorguidcb").checked&&getComputedStyle(document.getElementById("si_styler_workspace")).display!=="none"&&getComputedStyle(document.getElementById("si_styler_codeview")).display==="none"'),'visual controls are the default and Code is hidden');
      check(exceptions.length===0,'stylesheet loads without browser errors: '+exceptions.map(error=>error.exceptionDetails?.exception?.description||error.exceptionDetails?.text).join('; '));
      check(!await evaluate('document.getElementById("si_styler_workspace").textContent.includes("not supported yet")'),'modern and custom CSS properties have value controls');
      for(const [property,text] of Object.entries({'color-scheme':'dark','--si-bg':'#0b1525','--label':'"A; B: <tag> {literal}"','scroll-padding-top':'4rem','text-underline-offset':'.2em','experimental-property':'paint(custom-effect) !important'})){const actual=await value(property);check(actual===text,'loads '+property+' without losing its value (received '+JSON.stringify(actual)+')');}
      const before=await build();
      check(await evaluate('(()=>{const original=new CSSStyleSheet(),rebuilt=new CSSStyleSheet();original.replaceSync('+JSON.stringify(original)+');rebuilt.replaceSync('+JSON.stringify(before)+');return JSON.stringify(Array.from(original.cssRules).filter(rule=>rule.type===1).map(rule=>rule.selectorText))===JSON.stringify(Array.from(rebuilt.cssRules).filter(rule=>rule.type===1).map(rule=>rule.selectorText))})()'),'compound selector meaning survives rebuilding');
      check(before.includes('/* Theme comment */')&&before.includes('/* value comment ; : */'),'comments survive the GUI round trip');
      check(before.includes('url("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")'),'data URLs retain colons and semicolons');
      check(before.includes('@media (min-width: 40rem) { .card { display: grid; --space: 2rem; } }')&&before.includes('@supports (display: grid) { .card { gap: 1rem; } }'),'nested rules remain intact in editable CSS fields');
      check(await evaluate('document.getElementById("si_styler_codepad").childElementCount===0'),'CSS containing markup stays plain text');
      await evaluate('SI.Editor.Objects.Elements.Selected=document.getElementById("inline_target")');
      check(await edit('--si-bg','#172236')===''&&await edit('text-underline-offset','.3em')==='','custom and modern values can be edited');
      check(await evaluate('document.getElementById("inline_target").style.cssText')==='width: 12px; color: red;','stylesheet edits do not alter the selected page element');
      check(await edit('margin','2px !important')==='','known properties accept important values');
      const add=async property=>{await evaluate('(()=>{const box=Array.from(document.querySelectorAll(".si-styler-stylebox")).find(box=>box.querySelector(".si-styler-selector")?.textContent===":root");const select=box.querySelector("select[id^=si_styler_propertiesselect_]");select.value="__custom__";select.dispatchEvent(new Event("change"));box.querySelector(".si-styler-custom-property").value='+JSON.stringify(property)+';box.querySelector("input[id^=si_styler_propertiesbutton_]").click();})()');};
      await add('--AccentNew');check(await edit('--AccentNew','var(--si-accent) !important')==='','Other CSS property adds a case-sensitive custom property');
      await add('scroll-margin-top');check(await edit('scroll-margin-top','calc(2rem + 3px)')==='','Other CSS property adds a standard property outside the catalog');
      await evaluate('Array.from(document.querySelectorAll("#si_styler_workspace .si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==="scroll-padding-top").closest("tr").querySelector("button.si-edit-clear-style").click()');
      check(!((await build()).includes('scroll-padding-top:')),'clear removes one property while retaining the others');
      await edit('--si-bg','#1a2b3c');await evaluate('SI.Editor.Objects.Styler.SaveStyle()');
      check(await evaluate('stylerSaved.name==="StylerFixture"&&stylerSaved.kind==="style"&&stylerSaved.style.includes("--si-bg:#1a2b3c;")&&stylerSaved.style.includes("--AccentNew:var(--si-accent) !important;")'),'Save includes the latest GUI edits and priority without requiring Update first');
      check(await evaluate('new URL(document.querySelectorAll("#si_page_style")[1].href).searchParams.get("page")==="styler-fixture"'),'Save retains the explicit page identity when refreshing CSS');
      await evaluate('SI.Editor.Objects.Styler.LoadStyleCode(stylerSaved.style)');
      check(await value('--si-bg')==='#1a2b3c'&&await value('margin')==='2px !important'&&await value('experimental-property')==='paint(custom-effect) !important'&&await value('scroll-padding-top')===undefined,'saved CSS reloads without losing unknown declarations, priorities or removals');
      await evaluate('document.getElementById("inline_controls").appendChild(SI.Editor.Objects.Elements.Styles.Widget({Property:"--Tone",Affected:"#inline_target"}));const input=document.getElementById("inline_controls").querySelector("input.si-edit-style-propertyvalue");input.value="#abc !important";input.dispatchEvent(new Event("input"))');
      check(await evaluate('document.getElementById("inline_target").style.getPropertyValue("--Tone")==="#abc"&&document.getElementById("inline_target").style.getPropertyPriority("--Tone")==="important"'),'shared style controls apply custom properties and CSS priority correctly');
      await evaluate('document.getElementById("inline_controls").querySelector("button.si-edit-clear-style").click()');
      check(await evaluate('document.getElementById("inline_target").style.getPropertyValue("--Tone")===""'),'shared clear control removes custom properties');
      await evaluate('(()=>{document.getElementById("inline_controls").appendChild(SI.Editor.Objects.Elements.Styles.Widget({Property:"width",Affected:"#inline_target"}));const input=Array.from(document.querySelectorAll("#inline_controls input.si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==="width");input.value="invalid-width";input.dispatchEvent(new Event("input"));})()');
      check(await evaluate('document.getElementById("inline_target").style.width==="12px"&&!Array.from(document.querySelectorAll("#inline_controls input.si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==="width").validity.valid'),'existing inline property validation remains active');
      await evaluate('const widthInput=Array.from(document.querySelectorAll("#inline_controls input.si-edit-style-propertyvalue")).find(input=>input.dataset.siStyleProp==="width");widthInput.value="20px !important";widthInput.dispatchEvent(new Event("input"))');
      check(await evaluate('document.getElementById("inline_target").style.width==="20px"&&document.getElementById("inline_target").style.getPropertyPriority("width")==="important"'),'existing inline properties apply priority correctly');
      const colors=await evaluate('Array.from(document.querySelectorAll(".si-styler-selector")).map(token=>{const style=getComputedStyle(token);return {background:style.backgroundColor,color:style.color}})');
      const luminance=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(v=>{const c=Number(v)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}).reduce((sum,c,i)=>sum+c*[.2126,.7152,.0722][i],0);
      check(new Set(colors.map(color=>color.background)).size>=6&&colors.every(color=>luminance(color.background)<.1&&(luminance(color.color)+.05)/(luminance(color.background)+.05)>=4.5),'selector types keep distinct muted colors with readable text contrast');
      const screenshot=path.join(__dirname,'../core_sipl/runtime/styler-preview.png');fs.writeFileSync(screenshot,Buffer.from((await send('Page.captureScreenshot',{format:'png'},sessionId)).data,'base64'));
      await evaluate('document.getElementById("si_styler_codeorguidcb").click();document.getElementById("si_styler_codepad").textContent=".code-edit { --CaseSensitive: untouched; }";SI.Editor.Objects.Styler.SaveStyle()');
      check(await evaluate('stylerSaved.style===".code-edit { --CaseSensitive: untouched; }"'),'saving in Code view preserves the user’s source text');
      await evaluate('document.getElementById("si_styler_codepad").innerHTML=".code-edit {<div>  --CaseSensitive: untouched;</div><div>}</div>"');
      const enteredCode=await evaluate('document.getElementById("si_styler_codepad").innerText');
      await evaluate('SI.Editor.Objects.Styler.SaveStyle()');
      check(enteredCode.includes('\n')&&await evaluate('stylerSaved.style')===enteredCode,'Code view retains line breaks from contenteditable input');
      await evaluate('document.getElementById("si_styler_codeorguidcb").click()');
      check(await value('--CaseSensitive')==='untouched','switching from Code to GUI loads the latest CSS');
      check(exceptions.length===0,'no browser errors during load, editing, clearing or saving');
      console.log('Styler browser checks passed: '+checks);return;
    }
    if(scripterOnly){
      let checks=0,parserRequests=0;
      const check=(value,message)=>{assert(value,message);checks++;console.log('PASS Scripter '+message);};
      const root=path.resolve(__dirname,'..');
      const example=[
        '/* Homepage interaction */',
        'const threshold = 3;',
        'let total = 0;',
        'function accumulate(limit) {',
        '    for (let index = 0; index < limit; index++) {',
        '        total += index;',
        '    }',
        '    return total;',
        '}',
        'document.addEventListener("click", event => {',
        '    if (!event.target.closest("button")) return;',
        '    console.log(accumulate(threshold));',
        '});',
        'class Counter { #value = 0; static { this.ready = true; } next() { return ++this.#value; } }',
        'globalThis.scripterMustNotRun = true;'
      ].join('\n');
      assetServer=require('node:http').createServer((request,response)=>{
        if(request.url.split('?')[0]==='/editor/vendor/acorn.js'){
          parserRequests++;response.writeHead(200,{'Content-Type':'application/javascript'});response.end(fs.readFileSync(path.join(root,'editor/vendor/acorn.js')));
        }else if(request.url.startsWith('/editor/media/fonts/')&&!request.url.includes('..')){
          const file=path.join(root,request.url.split('?')[0]);if(fs.existsSync(file)){response.writeHead(200,{'Content-Type':'font/ttf'});response.end(fs.readFileSync(file));}else{response.writeHead(404);response.end();}
        }else{response.writeHead(200,{'Content-Type':'text/html'});response.end('<!doctype html><html><head><title>Scripter review</title></head><body style="margin:0;background:#091321"><div id="review_menu"></div></body></html>');}
      });
      await new Promise(resolve=>assetServer.listen(0,'127.0.0.1',resolve));
      await send('Page.navigate',{url:'http://127.0.0.1:'+assetServer.address().port},sessionId);
      for(let index=0;index<100;index++){if(await evaluate('document.readyState')==='complete'&&await evaluate('!!document.getElementById("review_window")'))break;await new Promise(resolve=>setTimeout(resolve,20));}
      await evaluate('window.SI='+JSON.stringify({Widget:{},Widgets:{},Editor:{Style:{FontFace:'Roboto'},UI:{MainMenu:{}},Objects:{Blocks:{}},Data:{Objects:{Blocks:{CMSOverview:{script:example}},Plugins:{Current:{}}}}}})+';SI.Editor.Objects.Blocks.Save=(name,part)=>{window.scriptSaved={name,part,source:SI.Editor.Data.Objects.Blocks[name].script}}');
      await evaluate('document.head.appendChild(Object.assign(document.createElement("style"),{textContent:'+JSON.stringify(fs.readFileSync(path.join(root,'editor/editor.css'),'utf8'))+'}))');
      for(const file of ['scripts/tools.js','scripts/widgets/Window.js'])await evaluate(fs.readFileSync(path.join(root,file),'utf8'));
      await evaluate(fs.readFileSync(path.join(root,'editor/objects/scripter.js'),'utf8'));
      const editorSource=fs.readFileSync(path.join(root,'editor/editor.js'),'utf8');
      const parser=require(path.join(root,'editor/vendor/acorn.js'));
      const panelStart=editorSource.indexOf('{',editorSource.indexOf('ToolsPanel: {'));
      const panelTokens=parser.tokenizer(editorSource.slice(panelStart),{ecmaVersion:'latest'});
      let depth=0,token;
      do{token=panelTokens.getToken();assert.notEqual(token.type.label,'eof');if(token.type.label==='{')depth++;if(token.type.label==='}')depth--;}while(depth);
      await evaluate('SI.Editor.UI.ToolsPanel='+editorSource.slice(panelStart,panelStart+token.end)+';SI.Editor.UI.MainMenu.Element=document.getElementById("review_menu");SI.Editor.UI.ToolsPanel.Init();window.scripterAlerts=[];const originalAlert=SI.Tools.SuperAlert;SI.Tools.SuperAlert=(message,...args)=>{scripterAlerts.push(message);return originalAlert(message,...args)}');
      await evaluate('window.acorn={legacyPlugin:true}');
      await click('si_edit_scripter_trigger');
      check(await evaluate('scripterAlerts.length===0&&SI.Widgets.Window.si_edit_scripter_window.Content.contains(SI.Editor.Objects.Scripter.Container)'),'Tools menu opens Scripter through the real Window Populate callback without alerts');
      await evaluate('Object.assign(SI.Widgets.Window.si_edit_scripter_window.Container.style,{width:"1380px",height:"940px",left:"12px",top:"12px"})');
      for(let index=0;index<100;index++){if(await evaluate('!!SI.Editor.Objects.Scripter.Parsed'))break;await new Promise(resolve=>setTimeout(resolve,20));}
      check(parserRequests===1&&await evaluate('SI.Editor.Objects.Scripter.Parser.version==="8.19.0"'),'bundled parser loads locally once without npm or a CDN');
      check(await evaluate('window.acorn.legacyPlugin===true'),'the parser does not replace an existing plugin global');
      check(JSON.parse(fs.readFileSync(path.join(root,'packaging/files.json'),'utf8')).shared.some(file=>file.source==='editor/vendor/acorn.js'),'both release editions include the parser asset');
      const call=expression=>evaluate('(()=>{const s=SI.Editor.Objects.Scripter;return '+expression+'})()');
      const load=source=>evaluate('SI.Editor.Objects.Scripter.LoadScriptCode('+JSON.stringify(source)+')');
      await click('si_edit_scripter_trigger');await click('si_edit_scripter_trigger');
      check(await evaluate('document.querySelectorAll("#si_scripter_container").length===1&&SI.Widgets.Window.si_edit_scripter_window.IsVisible()&&SI.Editor.Objects.Scripter.Source==='+JSON.stringify(example)),'closing and reopening from Tools retains one populated Scripter and its source');
      check(await call('s.Mode==="blocks"&&!s.CodeSwitch.checked&&!s.Workspace.hidden&&s.Codeview.hidden'),'structured Blocks are the default and Code is hidden');
      await click('si_scripter_codeorguidcb');
      for(let index=0;index<100;index++){if(await call('s.Mode==="code"'))break;await new Promise(resolve=>setTimeout(resolve,20));}
      check(await call('s.Mode==="code"&&s.CodeSwitch.checked&&s.Workspace.hidden&&!s.Codeview.hidden'),'Code checkbox explicitly opens the source editor');
      await click('si_scripter_codeorguidcb');
      for(let index=0;index<100;index++){if(await call('s.Mode==="blocks"'))break;await new Promise(resolve=>setTimeout(resolve,20));}
      check(await call('s.Mode==="blocks"&&!s.Workspace.hidden'),'clearing Code returns to structured blocks');
      check(await call('s.Source')===example&&await call('s.Codepad.textContent')===example,'unmodified source round-trips exactly');
      check(await evaluate('document.querySelectorAll(".si-script-block").length>10&&document.querySelectorAll(".si-script-lane").length>4'),'functions, callbacks, branches, classes and loop bodies have nested blocks');
      check(await evaluate('!globalThis.scripterMustNotRun'),'parsing and rendering never execute edited JavaScript');
      await call('s.Select(s.Parsed.ast.body[0].start)');
      await evaluate('const valueField=document.querySelector(".si-script-fields [aria-label=Value]");valueField.value="8";document.querySelector(".si-script-fields").requestSubmit()');
      check(await call('s.Source')===example.replace('const threshold = 3;','const threshold = 8;'),'inspector edits only the selected expression');
      check(await call('s.Undo()')&&await call('s.Source')===example&&await call('s.Redo()')&&await call('s.Source')===example.replace('const threshold = 3;','const threshold = 8;'),'block edits support undo and redo');
      const valid=await call('s.Source');
      check(!await call('s.ApplyPatches([{start:0,end:0,text:"const = ;"}],null)')&&await call('s.Source')===valid,'syntax errors leave the last valid program intact');
      check(await evaluate('document.querySelector(".si-script-status").getAttribute("role")==="alert"'),'syntax errors show an accessible line and column message');
      await load('let value=1;\nconsole.log(value);');
      await call('s.Select(s.Parsed.ast.body[0].start)');
      await evaluate('document.querySelector(".si-script-source").open=true;document.querySelector("[aria-label=\\"Full block JavaScript\\"]").value="let { value = 1, ...rest } = input;";Array.from(document.querySelectorAll(".si-script-source button")).find(button=>button.textContent==="Apply JavaScript").click()');
      check((await call('s.Source')).startsWith('let { value = 1, ...rest } = input;'),'full JavaScript editing handles constructs outside the simplified controls');
      await load('// first block\nalpha();\n// second block\nbeta();');
      await call('s.MoveRelative(s.Parsed.ast.body[1].start,-1)');
      check((await call('s.Source')).indexOf('beta();')<(await call('s.Source')).indexOf('alpha();')&&(await call('s.Source')).indexOf('// second block')<(await call('s.Source')).indexOf('beta();'),'reordering carries leading comments with their block');
      await load('alpha(); // stays with alpha\nbeta();');
      await call('s.MoveRelative(s.Parsed.ast.body[0].start,1)');
      check((await call('s.Source')).indexOf('beta();')<(await call('s.Source')).indexOf('alpha();')&&(await call('s.Source')).includes('alpha(); // stays with alpha'),'same-line comments remain attached when moving blocks');
      await load('function choose(flag) { if(flag) return 1; return 2; }');
      const lane=await call('Array.from(s.Lanes.values()).find(value=>value.region.single)?.region.id');
      check(!!lane,'single-statement branches have editable body lanes');
      await call('s.InsertInto(s.Lanes.get('+JSON.stringify(lane)+').region,0,"console.log(flag);")');
      check((await call('s.Source')).includes('if(flag) {')&&await call('s.Parse(s.Source).ast.body[0].type')==='FunctionDeclaration','adding to an unbraced branch creates a valid block body');
      await load('function choose(flag) { if(flag) return 1; return 2; }');
      check(!await call('s.MoveNode(Array.from(s.Nodes.values()).find(value=>value.node.type==="ReturnStatement").node.start,s.Lanes.get("program").region,0)'),'context-invalid moves are rejected');
      await load('function work() { alpha(); }\nbeta();');
      check(await call('(()=>{const node=s.Parsed.ast.body[0];const lane=s.Regions(node)[0];return s.MoveNode(s.Parsed.ast.body[1].start,lane,1)})()')&&await call('s.Parsed.ast.body.length')===1,'blocks move between scopes while preserving valid JavaScript');
      await load('alpha();\nbeta();');
      await evaluate('(()=>{const s=SI.Editor.Objects.Scripter,handle=s.Tree.querySelector(".si-script-drag"),lane=s.Tree.querySelector(".si-script-lane"),data=new DataTransfer();handle.dispatchEvent(new DragEvent("dragstart",{bubbles:true,dataTransfer:data}));lane.dispatchEvent(new DragEvent("drop",{bubbles:true,dataTransfer:data,clientY:10000}));})()');
      check((await call('s.Source')).indexOf('beta();')<(await call('s.Source')).indexOf('alpha();'),'drag/drop uses the same validated move operation');
      await load('const fixed=1;');
      check(!await call('s.Duplicate(s.Parsed.ast.body[0].start)')&&await call('s.Source')==='const fixed=1;','invalid duplicate bindings are not committed');
      await load('');await call('s.SwitchMode("blocks")');
      await call('s.InsertTemplate("Variable")');await call('s.InsertTemplate("Variable")');
      check((await call('s.Source')).includes('let value2 = 0;'),'new binding templates choose unused names');
      await load('function work() {}');await call('(()=>{s.ActiveLane=s.Regions(s.Parsed.ast.body[0])[0].id;return s.InsertTemplate("Return")})()');
      check((await call('s.Source')).includes('return value;'),'return templates validate inside the target function context');
      await load('#!/usr/bin/env node\nalpha();\nbeta();');await call('s.MoveRelative(s.Parsed.ast.body[0].start,1)');
      check((await call('s.Source')).startsWith('#!/usr/bin/env node\n')&&(await call('s.Source')).indexOf('beta();')<(await call('s.Source')).indexOf('alpha();'),'reordering leaves the hashbang at the start of the file');
      await load('function work() {\r\n    return 1;\r\n}');await call('s.Select(s.Parsed.ast.body[0].start)');
      check(!await call('s.HasInspectorDraft()')&&await call('s.SwitchMode("code")')&&await call('s.Source')==='function work() {\r\n    return 1;\r\n}','opening an inspector preserves CRLF formatting without inventing a draft');
      await load('alpha();');
      check(await call('s.Duplicate(s.Parsed.ast.body[0].start)')&&await call('s.Parsed.ast.body.length')===2,'statements can be duplicated');
      check(await call('s.DeleteNode(s.Parsed.ast.body[0].start)')&&await call('s.Parsed.ast.body.length')===1,'deleting a block updates the program');
      const corpus=[
        '/* comments */\r\nconst café = "🚀 &gt; <script>";\r\n',
        '#!/usr/bin/env node\n// shebang\nvoid 0;',
        'function factorial(n){return n < 2 ? 1 : n * factorial(n-1);}',
        'let n=0; while(n<3){n++;} do{n--;}while(n>0);',
        'for(;;){break;} for(const key in object){continue;} for(const value of values){}',
        'async function* sequence(){for await(const item of source){yield await item;}}',
        'class Example extends Base { #value=1; static ready=true; static {this.count=0;} get value(){return this.#value;} set value(v){this.#value=v;} }',
        'const {a: renamed=1,...rest}=input; const [head,...tail]=items;',
        'const get=({a=1}={})=>a; const text=' + String.fromCharCode(96) + 'hello $'+'{get({a: 2})}' + String.fromCharCode(96) + ';',
        'const match=/[{}]/giu; const division=12/3/2; const large=1_000n;',
        'const value=source?.items?.[0] ?? fallback; object.value ??= 3;',
        'try{work();}catch({message}){throw new Error(message);}finally{cleanup();}',
        'switch(value){case 0: case 1: work();break;default: other();}',
        'outer: for(;;){for(;;){break outer;}}',
        'with (object) { value = 3; }',
        'export default async function run(){return await import("./feature.js");}',
        'import data from "./data.json" with {type:"json"}; export {data};',
        'const response=await fetch("/"); export const body=await response.text();',
        'function* iterate(){yield* [1,2,3];}',
        'const raw="&amp; &gt; <img onerror=alert(1)>";',
        'using resource=acquire(); async function use(){ await using item=acquireAsync(); }',
        fs.readFileSync(path.join(root,'editor/objects/scripter.js'),'utf8'),
        fs.readFileSync(path.join(root,'editor/objects/styler.js'),'utf8')
      ];
      for(const [index,source]of corpus.entries()){
        check(await load(source),'ECMAScript corpus parses '+(index+1));
        await call('s.SwitchMode("blocks")');await call('s.SwitchMode("code")');
        check(await call('s.Source')===source&&await call('s.Codepad.textContent')===source,'ECMAScript corpus preserves every character '+(index+1));
      }
      await load('');await call('s.SwitchMode("blocks")');
      await call('s.InsertTemplate("Variable")');await call('s.Select(s.Parsed.ast.body[0].start)');
      await evaluate('document.querySelector(".si-script-fields [aria-label=Binding]").value="total";document.querySelector(".si-script-fields").requestSubmit()');
      await call('s.InsertTemplate("For loop",s.Lanes.get("program").region)');
      await call('(()=>{const loop=s.Parsed.ast.body[1];s.InsertInto(s.Regions(loop)[0],0,"total += index;");return true})()');
      await call('s.Select(s.Parsed.ast.body[1].start)');
      await evaluate('document.querySelector(".si-script-fields [aria-label=Condition]").value="index < 5";document.querySelector(".si-script-fields").requestSubmit()');
      await call('s.InsertInto(s.Lanes.get("program").region,s.Parsed.ast.body.length,"total;")');
      const built=await call('s.Source');
      check(require('node:vm').runInNewContext(built,{}, {timeout:1000})===10,'a program built from blocks runs as ordinary JavaScript with correct loop behavior');
      const blockSource=await call('s.Source');await call('s.SaveScript()');
      check(await evaluate('scriptSaved.name==="CMSOverview"&&scriptSaved.part==="script"')&&await evaluate('scriptSaved.source')===blockSource,'saving uses the existing CMS script-save path');
      await load('let value=1;');await call('s.Select(s.Parsed.ast.body[0].start)');
      await evaluate('document.querySelector(".si-script-fields [aria-label=Value]").value="7"');
      check(await call('s.SaveScript()')&&await evaluate('scriptSaved.source')==='let value=7;','Save includes pending inspector edits');
      await evaluate('document.querySelector(".si-script-fields [aria-label=Value]").value="("');
      check(!await call('s.SaveScript()')&&await evaluate('scriptSaved.source')==='let value=7;','invalid pending inspector edits prevent saving');
      await load(blockSource);
      await call('s.SwitchMode("code")');
      await evaluate('SI.Editor.Objects.Scripter.Codepad.textContent="let broken = ;";SI.Editor.Objects.Scripter.Codepad.dispatchEvent(new Event("input"))');
      check(!await call('s.SwitchMode("blocks")')&&await call('s.Mode')==='code'&&await call('s.Source')===blockSource,'invalid Code drafts remain editable without overwriting valid blocks');
      await load(example);await call('s.SwitchMode("blocks")');await call('s.Select(s.Parsed.ast.body[2].start)');
      for(const width of [1440,1000,560]){
        await resize(width);await evaluate('document.querySelector(".si-editor-tool-window").style.width=Math.min(innerWidth-24,1380)+"px"');
        check(await evaluate('document.getElementById("si_scripter_container").scrollWidth<=document.getElementById("si_scripter_container").clientWidth+1'),'workspace fits '+width+'px without horizontal page overflow');
      }
      await resize(1440);await evaluate('document.querySelector(".si-editor-tool-window").style.width="1380px"');
      fs.writeFileSync(path.join(root,'core_sipl/runtime/scripter-preview.png'),Buffer.from((await send('Page.captureScreenshot',{format:'png'},sessionId)).data,'base64'));
      check(!await evaluate('globalThis.scripterMustNotRun'),'editing operations do not execute the opened program');
      check(exceptions.length===0,'no browser exceptions: '+exceptions.map(error=>error.exceptionDetails?.exception?.description||error.exceptionDetails?.text).join('; '));
      console.log('Scripter browser checks passed: '+checks);return;
    }

    await send('Page.navigate',{url:config.base},sessionId);
    for(let i=0;i<100;i++){if(await evaluate('document.readyState')==='complete')break;await new Promise(r=>setTimeout(r,50));}
    const waitFor=async (predicate,label)=>{const deadline=Date.now()+20000;while(Date.now()<deadline){if(await predicate())return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+label);};
    const reload=async()=>{await evaluate('window.__siBrowserReload=true');await send('Page.reload',{},sessionId);await waitFor(async()=>await evaluate("!window.__siBrowserReload && document.readyState==='complete' && !!document.getElementById('si_edit_main_menu')"),'new document and editor after reload');};
    assert.equal(await evaluate('!!document.getElementById("si_edit_main_menu")'),false);
    assert.equal(await evaluate('!!document.getElementById("si_deployment_controls")'),false);
    console.log('PASS Guests receive no editor or deployment controls');
    await click('si_account_toggle');
    const loginFits=()=>evaluate('(()=>{const box=document.getElementById("si_block_Login"),r=box.getBoundingClientRect(),s=getComputedStyle(box),right=r.right-parseFloat(s.paddingRight)-parseFloat(s.borderRightWidth);return r.left>=0&&r.right<=innerWidth+1&&box.scrollWidth<=box.clientWidth+1&&Array.from(box.querySelectorAll("input[type=email],input[type=password]")).every(input=>{const f=input.getBoundingClientRect();return f.width>0&&f.right<=right+1&&f.left>=r.left})})()');
    for(const width of [1440,390,320]){await resize(width);assert.equal(await loginFits(),true,'Login fields stay inside the popup at '+width+'px');}
    await resize(1440);
    console.log('PASS Guest login fields fit the popup on desktop and narrow screens');
    await evaluate('document.getElementById("si_login_email").value='+JSON.stringify(config.email)+';document.getElementById("si_login_password").value='+JSON.stringify(config.password)+';document.querySelector("#form_login button").click()');
    await waitFor(async()=>await evaluate('!!document.getElementById("si_edit_main_menu")'),'editor startup after administrator login');
    assert.equal(await evaluate('SI.Editor.Data.loaded'),true);
    assert.equal(await evaluate('typeof document.oncontextmenu'),'function');
    const headerVisible=()=>evaluate('(()=>{const h=document.querySelector(".si-topbar");if(!h)return false;const r=h.getBoundingClientRect(),s=getComputedStyle(h);return s.display!=="none"&&s.visibility!=="hidden"&&r.height>0&&r.top>=0&&r.bottom<=innerHeight})()');
    assert.equal(await headerVisible(),true,'Login preserves the top bar');
    console.log('PASS Editor starts after login and preserves the visible top bar');
    await click('si_account_toggle');
    assert.equal(await evaluate('document.getElementById("si_loginbox").style.display'),'none');
    await click('si_edit_login_preview');
    assert.equal(await loginFits(),true,'The guest form fits while editing as an administrator');
    assert.equal(await evaluate('SI.Login.EditorPreview && document.getElementById("si_loginbox").offsetHeight>0'),true);
    assert.equal(await evaluate('(()=>{const send=SI.Tools.Ajax;let requests=0;SI.Tools.Ajax=()=>{requests++};try{SI.Login.Attempt();return requests===0;}finally{SI.Tools.Ajax=send;}})()'),true,'Editing the guest form cannot send a new login request');
    await evaluate('SI.Editor.Objects.Elements.Select(null,"si_login_email")');
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.id'),'si_login_email');
    await click('si_edit_login_preview');
    assert.equal(await evaluate('!SI.Login.EditorPreview && document.getElementById("si_loggedinbox").offsetHeight>0'),true);
    await evaluate('SI.Editor.Objects.Elements.SelectNone()');
    await click('si_account_toggle');
    console.log('PASS Administrators can edit the login form without signing out or submitting it');

    for(const phase of ['live','test','dev']){
      assert.equal(await evaluate('(()=>{const button=document.getElementById('+JSON.stringify('si_deployment_control_'+phase)+');const r=button.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===button})()'),true);
    }
    console.log('PASS Deployment controls are visible above the site layout');
    const titleBaseline=await evaluate('(()=>{const element=document.getElementById("si_home_title");return {shadow:element.style.boxShadow,draggable:element.getAttribute("draggable")}})()');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:500,y:300,button:'right',clickCount:1},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:500,y:300,button:'right',clickCount:1},sessionId);
    assert.equal(await evaluate('getComputedStyle(document.getElementById("si_edit_main_menu")).display'),'block');
    for(const item of ['add','edit','tools'])assert.equal(await evaluate('!!document.getElementById('+JSON.stringify('si_'+item+'_menu_item')+')'),true);
    console.log('PASS A real right-click opens the Add / Edit / Tools popup');
    const position=await evaluate('(()=>{const r=document.getElementById("si_home_title").getBoundingClientRect();return {x:r.x+20,y:r.y+15}})()');
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...position,button:'left',clickCount:2},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...position,button:'left',clickCount:2},sessionId);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.id'),'si_home_title');
    const noSelection=async()=>{
      assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected'),null);
      assert.equal(await evaluate('SI.Editor.Objects.Blocks.Selected'),null);
      assert.equal(await evaluate('document.querySelectorAll(".si-editor-selected").length'),0);
      assert.equal(await evaluate('document.getElementById("si_edit_save_selected").disabled'),true);
      assert.equal(await evaluate('getComputedStyle(document.getElementById("si_edit_edit_menuitem")).display'),'none');
      assert.equal(await evaluate('Array.from(document.querySelectorAll(".si-block,.si-bids")).every(block=>!block.style.boxShadow || block.style.boxShadow==="none")'),true);
    };
    const clickClose=async()=>{
      const point=await evaluate('(()=>{const r=document.getElementById("close-editor").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()');
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1},sessionId);
    };
    const menuPosition=await evaluate('({left:SI.Editor.UI.MainMenu.Element.style.left,top:SI.Editor.UI.MainMenu.Element.style.top})');
    assert.equal(await evaluate('(()=>{const event=new MouseEvent("contextmenu",{bubbles:true,cancelable:true,clientX:100,clientY:100});document.getElementById("si_home_title").dispatchEvent(event);return event.defaultPrevented})()'),false);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.id'),'si_home_title');
    assert.deepEqual(await evaluate('({left:SI.Editor.UI.MainMenu.Element.style.left,top:SI.Editor.UI.MainMenu.Element.style.top})'),menuPosition);
    console.log('PASS An open editor preserves the browser context menu, selection and editor position');
    await clickClose();
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...position,button:'left',clickCount:2},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...position,button:'left',clickCount:2},sessionId);
    await evaluate('SI.Editor.UI.MainMenu.Element.style.display="block"');
    await click('si_edit_menu_item');
    await clickClose();
    await noSelection();
    assert.equal(await evaluate('getComputedStyle(SI.Editor.UI.MainMenu.Element).display'),'none');
    assert.deepEqual(await evaluate('(()=>{const element=document.getElementById("si_home_title");return {shadow:element.style.boxShadow,draggable:element.getAttribute("draggable")}})()'),titleBaseline);
    assert.equal(await evaluate('document.querySelector("#si_edit_edit_menuitem .si-edit-attribute-GLOBAL-id").value'),'');
    console.log('PASS X closes the menu, restores element styling, and clears element/block selection and properties');
    // The close control must remain clickable while click-to-place is armed.
    await evaluate('SI.Editor.Objects.Elements.Select(null,"si_home_title");SI.Editor.UI.MainMenu.Element.style.display="block"');
    await click('si_add_menu_item');
    await click('dragger_div');
    assert.equal(await evaluate('!!SI.Editor.Objects.Placement.State'),true);
    await clickClose();
    await noSelection();
    assert.equal(await evaluate('SI.Editor.Objects.Placement.State'),null);
    assert.equal(await evaluate('!!document.getElementById("si_edit_placement")'),false);
    assert.equal(await evaluate('getComputedStyle(SI.Editor.UI.MainMenu.Element).display'),'none');
    console.log('PASS X also cancels an armed placement preview');
    // Reopen properties for the existing editing and persistence checks.
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...position,button:'left',clickCount:2},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',...position,button:'left',clickCount:2},sessionId);
    await evaluate('SI.Editor.UI.MainMenu.Element.style.display="block"');
    await click('si_edit_menu_item');
    await waitFor(async()=>await evaluate('getComputedStyle(document.getElementById("si_edit_edit_menuitem")).display') !== 'none','Edit properties animation');
    console.log('PASS Double-click selects an element and Edit opens its properties');
    const replacement='Edited through the right-click popup';
    await evaluate('(()=>{const field=document.querySelector(".si-edit-attribute-GLOBAL-innerHTML:not(:disabled)");if(!field)throw Error("Missing HTML property input");field.value='+JSON.stringify(replacement)+';field.dispatchEvent(new KeyboardEvent("keyup",{key:"a",bubbles:true}));})()');
    assert.equal(await evaluate('document.getElementById("si_home_title").textContent'),replacement);
    console.log('PASS Editing the HTML property updates the selected element');
    await click('si_tools_menu_item');
    await click('si_edit_page_trigger');
    await waitFor(async()=>await evaluate(`!!document.querySelector('#si_bid_Menu button[title="Save the Block"]')`),'block save control');
    const ranks=await evaluate('Array.from(document.querySelectorAll("#si_editor_page_block_container .si-bids")).map(b=>({id:b.id,order:b.querySelector("[id^=si_bid_order_]").value}))');
    await evaluate('document.getElementById("si_editor_page_block_container").dispatchEvent(new MouseEvent("mouseenter"))');
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("#si_editor_page_block_container .si-bids")).map(b=>({id:b.id,order:b.querySelector("[id^=si_bid_order_]").value}))'),ranks,'Hovering the Page tool must preserve stored block ranks');
    await evaluate(`document.querySelector('#si_bid_Menu button[title="Save the Block"]').click()`);
    await waitFor(()=>replies.some(reply=>finished.has(reply.requestId)),'block save response');
    const reply=replies.find(reply=>finished.has(reply.requestId));
    const result=await send('Network.getResponseBody',{requestId:reply.requestId},sessionId);
    assert(result.body.includes('BLOCKSAVED'), 'Block save did not succeed');
    await reload();
    await waitFor(async()=>await evaluate('!!document.getElementById("si_edit_main_menu") && document.getElementById("si_home_title").textContent === '+JSON.stringify(replacement)),'saved content after reload');
    assert.equal(await headerVisible(),true,'Saving another block keeps the header above page content');
    console.log('PASS Saving the block preserves its stored rank, the edit, and the top bar after reload');
    await click('si_account_toggle');
    await click('si_edit_login_preview');
    for(const width of [1440,390,320]){await resize(width);assert.equal(await loginFits(),true,'The administrator login-form preview fits at '+width+'px');}
    await resize(1440);
    await evaluate('document.getElementById("si_login_email").placeholder="Your email address"');
    const loginSaveStart=replies.length;
    await evaluate('SI.Editor.Objects.Blocks.Save("Login","html")');
    await waitFor(()=>replies.slice(loginSaveStart).some(reply=>finished.has(reply.requestId)),'Login block save response');
    const loginReply=replies.slice(loginSaveStart).find(reply=>finished.has(reply.requestId));
    const loginBody=await send('Network.getResponseBody',{requestId:loginReply.requestId},sessionId);
    assert(loginBody.body.includes('BLOCKSAVED'),loginBody.body);
    await reload();
    assert.equal(await evaluate('document.getElementById("si_login_email").placeholder'),'Your email address');
    assert.equal(await evaluate('SI.Editor.Data.Objects.Blocks.Login.html.includes("data-si-editor-only") || SI.Editor.Data.Objects.Blocks.Login.html.includes("si_edit_login_preview")'),false,'Saved page content excludes editor-only controls');
    assert.equal(await evaluate('SI.Login.EditorPreview'),false,'Reload exits login-form editing');
    assert.equal(await evaluate('document.getElementById("si_loginbox").style.display'),'none');
    await click('si_account_toggle');
    await click('si_edit_login_preview');
    assert.equal(await loginFits(),true,'The saved form still fits when reopened for editing');
    assert.equal(await evaluate('document.querySelectorAll("#si_edit_login_preview").length'),1);
    await click('si_edit_login_preview');
    await click('si_account_toggle');
    console.log('PASS Login edits survive saving and reload without persisting editor controls or changing the administrator session');
    // Exercise real HTML drag-and-drop through Chrome's input pipeline.
    await evaluate(`(()=>{
      document.querySelectorAll('#si_drag_test').forEach(zone=>zone.remove());
      SI.Page.Blocks.Menu.Widgets={};
      const widgetTable=document.getElementById('si_block_widgets_table_Menu');if(widgetTable)widgetTable.innerHTML='';
      const zone=document.createElement('div');zone.id='si_drag_test';
      zone.style.cssText='position:fixed;left:520px;top:620px;width:440px;height:240px;overflow:scroll;border:12px solid #567;padding:15px;background:#152239;z-index:100';
      const inner=document.createElement('div');inner.id='si_drag_inner';inner.style.cssText='position:relative;width:800px;height:700px;background:#19314e';
      zone.appendChild(inner);document.getElementById('si_block_Menu').appendChild(zone);zone.scrollTop=110;zone.scrollLeft=65;
      SI.Editor.Objects.Elements.Editable(zone);SI.Editor.Objects.Elements.Editable(inner);
    })()`);
    const point={x:740,y:745};
    const openAdd=async()=>{
      await evaluate(`(()=>{const menu=SI.Editor.UI.MainMenu.Element;menu.style.display='block';menu.style.left='20px';menu.style.top='150px';document.getElementById('si_edit_add_menuitem').style.display='none';})()`);
      await click('si_add_menu_item');
      await waitFor(async()=>await evaluate(`getComputedStyle(document.getElementById('si_edit_add_menuitem')).display!=='none'`),'Add palette');
    };
    await openAdd();
    await click('si_edit_add_tag_tab');
    await evaluate(`(()=>{const input=document.getElementById('si_edit_add_search');input.value='image';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(`!document.getElementById('dragger_img').hidden && document.getElementById('dragger_div').hidden`),true);
    await evaluate(`(()=>{const input=document.getElementById('si_edit_add_search');input.value='does-not-exist';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(`getComputedStyle(document.getElementById('si_edit_add_empty')).display!=='none'`),true);
    await evaluate(`(()=>{const input=document.getElementById('si_edit_add_search');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    console.log('PASS Add search filters tags and reports empty results');
    let intercepted;
    socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Input.dragIntercepted')intercepted=message.params.data;});
    await send('Input.setInterceptDrags',{enabled:true},sessionId);
    const beginDrag=async id=>{
      intercepted=null;
      const start=await evaluate(`(()=>{const item=document.getElementById(${JSON.stringify(id)});item.scrollIntoView({block:'nearest'});const r=item.getBoundingClientRect();return {x:r.x+25,y:r.y+r.height/2}})()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...start},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:start.x+25,y:start.y+8,button:'left',buttons:1},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,button:'left',buttons:1},sessionId);
      await waitFor(()=>!!intercepted,'native drag start');
      await send('Input.dispatchDragEvent',{type:'dragEnter',...point,data:intercepted},sessionId);
      await send('Input.dispatchDragEvent',{type:'dragOver',...point,data:intercepted},sessionId);
    };
    const endDrag=async(type='drop',at=point)=>{
      await send('Input.dispatchDragEvent',{type,...at,data:intercepted},sessionId);
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',...at,button:'left',clickCount:1},sessionId);
    };
    const before=await evaluate(`({count:document.getElementById('si_drag_inner').children.length,dirty:!!SI.Editor.Data.Objects.Blocks.Menu.IsDirty})`);
    await beginDrag('dragger_div');
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement') && SI.Editor.Objects.Placement.State.parent.id==='si_drag_inner'`),true);
    assert.equal(await evaluate(`document.getElementById('si_drag_inner').children.length`),before.count);
    assert.equal(await evaluate(`!!SI.Editor.Data.Objects.Blocks.Menu.IsDirty`),before.dirty);
    assert.equal(await evaluate(`getComputedStyle(document.querySelector('.si-placement-ghost')).opacity`),'0.48');
    assert.equal(await evaluate(`document.querySelector('.si-block #si_edit_placement')===null`),true);
    if(config.screenshot){const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(config.screenshot,Buffer.from(shot.data,'base64'));}
    await endDrag();
    const tagId=await evaluate('SI.Editor.Objects.Elements.Selected.id');
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).tagName`),'DIV');
    assert.equal(await evaluate(`document.getElementById('si_drag_inner').children.length`),before.count+1);
    const actual=await evaluate(`(()=>{const r=document.getElementById(${JSON.stringify(tagId)}).getBoundingClientRect();return {x:r.x,y:r.y}})()`);
    assert(Math.abs(actual.x-point.x)<2 && Math.abs(actual.y-point.y)<2,JSON.stringify({actual,point}));
    assert.equal(await evaluate(`SI.Editor.Data.Objects.Blocks.Menu.IsDirty`),true);
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement')`),false);
    console.log('PASS Native tag drag shows an unsaved ghost, then drops once at the preview position inside a bordered, scrolled parent');
    await openAdd();
    const cancelled=await evaluate(`document.getElementById('si_drag_inner').children.length`);
    await beginDrag('dragger_span');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
    await endDrag('dragCancel');
    assert.equal(await evaluate(`document.getElementById('si_drag_inner').children.length`),cancelled);
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement')`),false);
    await openAdd();
    await beginDrag('dragger_span');
    const outside={x:5,y:500};
    await send('Input.dispatchDragEvent',{type:'dragOver',...outside,data:intercepted},sessionId);
    await endDrag('drop',outside);
    assert.equal(await evaluate(`document.getElementById('si_drag_inner').children.length`),cancelled);
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement')`),false);
    console.log('PASS Escape and dropping outside a block cancel without adding content');
    await openAdd();
    await click('si_edit_add_widget_tab');
    point.x=910;
    const widgetCount=await evaluate('Object.keys(SI.Widgets.Template).length');
    const widgetsBefore=await evaluate(`Object.keys(SI.Page.Blocks.Menu.Widgets||{}).length`);
    await beginDrag('si_edit_widgetdraggerTemplate');
    assert.equal(await evaluate('Object.keys(SI.Widgets.Template).length'),widgetCount);
    assert.equal(await evaluate(`Object.keys(SI.Page.Blocks.Menu.Widgets||{}).length`),widgetsBefore);
    assert.equal(await evaluate(`document.querySelector('.si-placement-widget').textContent`),'Template');
    await endDrag();
    const widgetId=await evaluate('SI.Editor.Objects.Elements.Selected.id');
    assert.equal(await evaluate('Object.keys(SI.Widgets.Template).length'),widgetCount+1);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(widgetId)}).parentElement.id`),'si_drag_inner');
    assert.equal(await evaluate(`JSON.parse(SI.Page.Blocks.Menu.Widgets.Template[0]).Parent`),'si_drag_inner');
    console.log('PASS Widgets are constructed only on drop and retain their parent reference');
    // Point-and-place is usable with a click or with keyboard activation of the palette button.
    await openAdd();
    await click('si_edit_add_tag_tab');
    await click('dragger_span');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:700},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:1100,y:700,button:'left',clickCount:1},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1100,y:700,button:'left',clickCount:1},sessionId);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.tagName'),'SPAN');
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement')`),false);
    console.log('PASS Click-to-place adds an item at the chosen page position');
    await evaluate(`SI.Editor.Objects.Elements.SelectNone();SI.Editor.Objects.Elements.Select(null,${JSON.stringify(tagId)});SI.Editor.UI.MainMenu.Element.style.display='none';`);
    point.x=680;point.y=710;
    const moveBefore=await evaluate(`({parent:document.getElementById(${JSON.stringify(tagId)}).parentElement.id,left:document.getElementById(${JSON.stringify(tagId)}).style.left,top:document.getElementById(${JSON.stringify(tagId)}).style.top,revision:SI.Editor.Data.Objects.Blocks.Menu.EditRevision})`);
    await beginDrag(tagId);
    assert.equal(await evaluate(`SI.Editor.Objects.Placement.State.kind`),'move');
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).style.left`),moveBefore.left);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
    await endDrag('dragCancel');
    assert.deepEqual(await evaluate(`({parent:document.getElementById(${JSON.stringify(tagId)}).parentElement.id,left:document.getElementById(${JSON.stringify(tagId)}).style.left,top:document.getElementById(${JSON.stringify(tagId)}).style.top,revision:SI.Editor.Data.Objects.Blocks.Menu.EditRevision})`),moveBefore);
    await beginDrag(tagId);
    const grab=await evaluate(`({x:SI.Editor.Objects.Placement.State.grabX,y:SI.Editor.Objects.Placement.State.grabY})`);
    await endDrag();
    const moved=await evaluate(`(()=>{const r=document.getElementById(${JSON.stringify(tagId)}).getBoundingClientRect();return {x:r.x,y:r.y,id:document.getElementById(${JSON.stringify(tagId)}).id}})()`);
    assert.equal(moved.id,tagId);
    assert(Math.abs(moved.x-(point.x-grab.x))<2 && Math.abs(moved.y-(point.y-grab.y))<2,JSON.stringify({moved,point,grab}));
    console.log('PASS Moving an element previews its placement, preserves IDs, and leaves its position unchanged on cancellation');
    // Editing keyboard shortcuts must never delete or move the selection while typing.
    await evaluate(`SI.Editor.Objects.Elements.SelectNone();SI.Editor.Objects.Elements.Select(null,${JSON.stringify(tagId)});`);
    await evaluate(`SI.Editor.UI.MainMenu.Element.style.display='block';document.getElementById('si_edit_edit_menuitem').style.display='none';`);
    await click('si_edit_menu_item');
    await waitFor(async()=>await evaluate(`getComputedStyle(document.getElementById('si_edit_edit_menuitem')).display!=='none'`),'Edit panel');
    const leftBefore=await evaluate('SI.Editor.Objects.Elements.Selected.style.left');
    await evaluate(`document.querySelector('.si-edit-attribute-GLOBAL-innerHTML:not(:disabled)').focus()`);
    for(const [key,code,num] of [['ArrowRight','ArrowRight',39],['Delete','Delete',46]]){
      await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:num},sessionId);
      await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:num},sessionId);
    }
    assert.equal(await evaluate(`!!document.getElementById(${JSON.stringify(tagId)})`),true);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.style.left'),leftBefore);
    await evaluate(`(()=>{const field=document.querySelector('.si-edit-attribute-GLOBAL-innerHTML:not(:disabled)');field.value='Pasted content';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).textContent`),'Pasted content');
    assert.equal(await evaluate(`document.getElementById('si_edit_selection_summary').textContent.includes('Unsaved changes')`),true);
    console.log('PASS Text editing handles paste and leaves page elements intact during Delete and arrow key input');
    await evaluate(`(()=>{const field=document.querySelector('.si-edit-style-width');if(!field)throw Error('Width style field not registered');field.value='140px';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).style.width`),'140px');
    await evaluate(`(()=>{const field=document.querySelector('.si-edit-style-width');field.value='not-a-width';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).style.width`),'140px');
    assert.equal(await evaluate(`document.querySelector('.si-edit-style-width').validity.valid`),false);
    await evaluate(`(()=>{const field=document.querySelector('.si-edit-style-width');field.value='140px';field.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    console.log('PASS Style fields reflect the selection, accept typed CSS, and reject invalid CSS values');
    // Saving an ignored dynamic section must preserve its live nodes and listeners.
    await evaluate(`(()=>{const section=document.createElement('div');section.id='si_dynamic_test';section.className='si-editable-ignoreinner';window.__siDynamicButton=document.createElement('button');window.__siDynamicButton.textContent='Dynamic child';window.__siDynamicButton.onclick=()=>window.__siDynamicClicked=true;section.appendChild(window.__siDynamicButton);document.getElementById('si_drag_inner').appendChild(section);})()`);
    await openAdd();await click('si_edit_add_tag_tab');await click('dragger_script');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1100,y:650},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',x:1100,y:650,button:'left',clickCount:1},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:1100,y:650,button:'left',clickCount:1},sessionId);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.tagName'),'SCRIPT');
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.id.length>0'),true);
    await evaluate(`SI.Editor.Objects.Elements.SelectNone();SI.Editor.Objects.Elements.Select(null,${JSON.stringify(tagId)});`);
    console.log('PASS Nonvisual tags remain selected and editable after placement');
    const responseStart=replies.length;
    await click('si_edit_save_selected');
    await waitFor(()=>replies.slice(responseStart).some(reply=>finished.has(reply.requestId)),'Save block response');
    const savedReply=replies.slice(responseStart).find(reply=>finished.has(reply.requestId));
    const savedBody=await send('Network.getResponseBody',{requestId:savedReply.requestId},sessionId);
    assert(savedBody.body.includes('BLOCKSAVED'),savedBody.body);
    assert.equal(await evaluate(`SI.Editor.Data.Objects.Blocks.Menu.IsDirty`),false);
    assert.equal(await evaluate(`document.getElementById('si_dynamic_test').firstChild===window.__siDynamicButton`),true);
    await evaluate(`window.__siDynamicButton.click()`);
    assert.equal(await evaluate(`window.__siDynamicClicked`),true);
    assert.equal(await evaluate(`JSON.parse(document.querySelector('#si_block_widgets_table_Menu textarea').value).Id`),widgetId);
    await reload();
    await waitFor(async()=>await evaluate(`!!document.getElementById('si_edit_main_menu') && !!document.getElementById(${JSON.stringify(tagId)})`),'placed content after reload');
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(tagId)}).textContent`),'Pasted content');
    assert.equal(await evaluate(`JSON.parse(SI.Page.Blocks.Menu.Widgets.Template[0]).Id`),widgetId);
    assert.equal(await evaluate(`!!document.getElementById(${JSON.stringify(widgetId)})`),true);
    assert.equal(await evaluate(`!!document.getElementById('si_edit_placement')`),false);
    console.log('PASS Save block persists added content and valid widget settings without any ghost markup');
    await evaluate(`SI.Editor.UI.Container.appendChild(SI.Editor.Objects.Widgets.Instances());`);
    assert.equal(await evaluate(`Array.from(document.getElementById('si_edit_widget_instance_selector').options).some(option=>option.value===${JSON.stringify(widgetId)})`),true);
    await evaluate(`(()=>{const picker=document.getElementById('si_edit_widget_instance_selector');picker.value=${JSON.stringify(widgetId)};picker.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    assert.equal(await evaluate('SI.Editor.Objects.Elements.Selected.id'),widgetId);
    await click('si_edit_widget_instance_edit');
    await waitFor(async()=>await evaluate(`getComputedStyle(document.getElementById('si_edit_edit_menuitem')).display!=='none'`),'widget Edit properties');
    console.log('PASS The widget instance picker lists saved widgets and opens their editing controls');
    const widgetChecks=await evaluate(`(()=>{
      const host=document.createElement('div');host.id='si_widget_smoke';document.getElementById('si_block_Menu').appendChild(host);
      const results=[];
      for(const name of Object.keys(SI.Widget).filter(name=>typeof SI.Widget[name]==='function' && name!=='Lookup')) {
        try {
          const element=SI.Editor.Objects.Widgets.AddInstance('Menu',name,{Parent:host,Width:'320px',Height:'240px',GoogleLink:'about:blank'});
          if(!(element instanceof HTMLElement) || element.parentElement!==host || getComputedStyle(element).display==='none') throw Error('No visible page element');
          if(name==='Field')element.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));
          SI.Editor.Objects.Widgets.Forget('Menu',element.id);element.remove();
          results.push({name,ok:true});
        }catch(error){results.push({name,error:String(error)});}
      }
      host.remove();return results;
    })()`);
    assert(widgetChecks.length>10);
    assert.deepEqual(widgetChecks.filter(result=>!result.ok),[],'All offered widgets must produce visible page elements');
    console.log('PASS All '+widgetChecks.length+' standalone widgets mount a visible page element');
    await evaluate(`SI.Editor.UI.ToolsPanel.OpenToolWindow('Security')`);
    await waitFor(async()=>await evaluate(`!!document.getElementById('si_edit_security_role_tab_Tester')`),'Security role tabs');
    assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('#si_edit_security_role_tabs [role="tab"]')).map(tab=>tab.textContent).sort()`),['Admin','Guest','Tester']);
    await click('si_edit_security_role_tab_Tester');
    const roleDraft=await evaluate(`(()=>{const checkbox=document.querySelector('#si_edit_security_rulefs_Tester input[type="checkbox"]');const original=checkbox.checked;checkbox.click();return {id:checkbox.id,original};})()`);
    await click('si_edit_security_role_tab_Guest');
    assert.equal(await evaluate(`document.querySelectorAll('#si_edit_security_rolesfs > [role="tabpanel"]:not([hidden])').length`),1);
    assert.equal(await evaluate(`document.getElementById('si_edit_security_role_panel_Tester').hidden`),true);
    await click('si_edit_security_role_tab_Tester');
    assert.equal(await evaluate(`document.getElementById(${JSON.stringify(roleDraft.id)}).checked`),!roleDraft.original);
    await evaluate(`document.getElementById(${JSON.stringify(roleDraft.id)}).checked=${JSON.stringify(roleDraft.original)}`);
    console.log('PASS Security role tabs isolate their forms and preserve unsaved checkbox changes');
    const draftRole=await evaluate(`(()=>{
      const originalPrompt=window.prompt,originalSend=SI.Tools.Api.Send;
      let request;
      try {
        window.prompt=()=> 'Role Tabs Regression';
        SI.Editor.Objects.Security.New();SI.Editor.Objects.Security.New();
        SI.Tools.Api.Send=options=>{request=JSON.parse(JSON.stringify(options.Data));};
        document.getElementById('si_edit_security_rule_update_Role_Tabs_Regression').click();
        SI.Editor.Objects.Security.Updated({CreatedId:'0x00000000000000000000000000000001',Return:{Query:request.ReturnQuery},Input:{RoleName:request.RoleName}});
        return {request,tabs:document.querySelectorAll('#si_edit_security_role_tabs [role="tab"]').length,active:document.querySelector('#si_edit_security_role_tabs [aria-selected="true"]').textContent,name:document.getElementById('si_edit_security_rule_update_Role_Tabs_Regression').dataset.rolename,entities:Object.values(SI.Editor.Data.Objects.Entities.Definitions).filter(entity=>entity.instanceguid).length};
      } finally {window.prompt=originalPrompt;SI.Tools.Api.Send=originalSend;}
    })()`);
    assert.equal(draftRole.tabs,4);
    assert.equal(draftRole.active,'Role Tabs Regression');
    assert.equal(draftRole.name,'Role Tabs Regression');
    assert.equal(draftRole.request.Operation,'Create');
    assert.equal(Object.hasOwn(draftRole.request.Entity,'Id'),false);
    assert.equal(draftRole.request.Entity.Attributes.name,'Role Tabs Regression');
    assert.equal(Object.keys(draftRole.request.Entity.Attributes.rules).length,draftRole.entities);
    await evaluate(`SI.Editor.Objects.Security.Deleted('Role_Tabs_Regression')`);
    assert.equal(await evaluate(`document.querySelectorAll('#si_edit_security_role_tabs [role="tab"]').length`),3);
    assert.equal(await evaluate(`document.querySelectorAll('#si_edit_security_rolesfs > [role="tabpanel"]:not([hidden])').length`),1);
    assert.equal(await evaluate(`!!document.getElementById('si_edit_security_rule_delete_Guest') || !!document.getElementById('si_edit_security_rule_update_Admin')`),false);
    console.log('PASS New and deleted role tabs preserve display names, role protections, and valid API create requests');
    await evaluate(`SI.Editor.UI.ToolsPanel.OpenToolWindow('Page')`);
    await evaluate(`SI.Widgets.Window.si_edit_page_window.Show(0)`);
    await waitFor(async()=>await evaluate(`document.querySelector('#si_bid_Menu .si-tool-icon-button[title="Save the Block"]').getBoundingClientRect().width>0`),'visible Page action buttons');
    const pageIcons=await evaluate(`Array.from(document.querySelectorAll('#si_bid_Menu .si-tool-icon-button')).filter(button=>button.getBoundingClientRect().width>0).map(button=>({label:button.getAttribute('aria-label'),width:button.getBoundingClientRect().width,mask:getComputedStyle(button,'::before').maskImage}))`);
    assert.equal(pageIcons.length,7);
    assert(pageIcons.every(icon=>icon.label && icon.width>=32 && icon.mask.includes('data:image/svg+xml')));
    console.log('PASS Page actions have larger labelled buttons and crisp vector icons');
    await click('si_edit_importblock_trigger');
    await waitFor(async()=>await evaluate(`document.getElementById('si_edit_importblock_form')?.dataset.loadstate==='ready'`),'available blocks for import');
    const importOptions=await evaluate(`Array.from(document.getElementById('si_edit_importblock_select').options).map(option=>({name:option.textContent,value:option.value}))`);
    assert(!importOptions.some(option=>['undefined','Header','Menu'].includes(option.name)),'Exclude API metadata and blocks already on this page');
    assert(importOptions.some(option=>option.name==='About'));
    assert.equal(await evaluate(`document.getElementById('si_edit_importblock_button').disabled`),true);
    const importSize=await evaluate(`(()=>{const form=document.getElementById('si_edit_importblock_form');return {height:form.clientHeight,width:form.clientWidth,scroll:form.scrollWidth};})()`);
    assert(importSize.height>=240 && importSize.width>=480 && importSize.scroll<=importSize.width+1);
    await evaluate(`(()=>{const select=document.getElementById('si_edit_importblock_select');select.value=Array.from(select.options).find(option=>option.textContent==='About').value;select.dispatchEvent(new Event('change'));})()`);
    await click('si_edit_importblock_button');
    await waitFor(async()=>await evaluate(`document.getElementById('si_edit_importblock_form').dataset.importing==='false'`),'import completed');
    assert.equal(await evaluate(`document.getElementById('si_edit_importblock_status').textContent`),'About was added to this page.');
    assert.equal(await evaluate(`!!document.querySelector('#si_block_About p') && !!document.querySelector('#si_bid_About[data-relationsid]')`),true);
    await reload();
    assert.equal(await evaluate(`!!document.querySelector('#si_block_About p')`),true,'Imported content persists across a reload');
    await evaluate(`SI.Editor.UI.ToolsPanel.OpenToolWindow('Page')`);
    await click('si_edit_importblock_trigger');
    await waitFor(async()=>await evaluate(`document.getElementById('si_edit_importblock_form')?.dataset.loadstate==='ready'`),'refreshed import list');
    assert.equal(await evaluate(`Array.from(document.getElementById('si_edit_importblock_select').options).some(option=>option.textContent==='About')`),false,'Prevent importing the same block twice');
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false},sessionId);
    await evaluate(`SI.Widgets.Window.si_edit_importblocks_window.Show(0)`);
    await new Promise(resolve=>setTimeout(resolve,300));
    const narrowImport=await evaluate(`(()=>{const form=document.getElementById('si_edit_importblock_form'),rect=SI.Widgets.Window.si_edit_importblocks_window.Container.getBoundingClientRect(),button=document.getElementById('si_edit_importblock_button').getBoundingClientRect();return {left:rect.left,right:rect.right,button:button.right,width:form.clientWidth,scroll:form.scrollWidth};})()`);
    assert(narrowImport.left>=0 && narrowImport.right<=390 && narrowImport.button<=390 && narrowImport.scroll<=narrowImport.width+1);
    console.log('PASS Import Block fits desktop and narrow windows, excludes duplicates, and imports content that survives reload');
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
    await evaluate(`SI.Widgets.Window.si_edit_importblocks_window.Hide(0);SI.Widgets.Window.si_edit_page_window.Show(0);document.getElementById('si_block_deployment_window_Menu').style.display='block'`);
    const lights=await evaluate(`Array.from(document.querySelectorAll('#si_block_deployment_window_Menu .si-deployment-promote')).map(button=>({attribute:button.dataset.attribute,level:button.dataset.deployment,disabled:button.disabled,width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height,radius:getComputedStyle(button).borderRadius}))`);
    assert.equal(lights.length,15);
    assert(lights.every(button=>button.width===18 && button.height===18 && button.radius==='50%'));
    assert(lights.filter(button=>button.level==='rollback' && ['options','order'].includes(button.attribute)).every(button=>button.disabled));
    assert(lights.filter(button=>button.level!=='rollback' || !['options','order'].includes(button.attribute)).every(button=>!button.disabled));
    console.log('PASS Circular deployment actions reflect the actual SQL columns; unsupported rollback actions are disabled');
    await evaluate(`window.__originalConfirm=window.confirm;window.__deploymentConfirmCount=0;window.confirm=()=>{window.__deploymentConfirmCount++;return false;};SI.Editor.Data.Objects.Blocks.Menu.IsDirty=true;document.getElementById('si_deployment_control_test').click()`);
    assert.equal(await evaluate(`window.__deploymentConfirmCount`),1);
    assert.equal(await evaluate(`document.getElementById('si_deployment_control_dev').disabled && !SI.Editor.DeploymentSwitchAccepted`),true);
    await evaluate(`window.confirm=()=>true;window.__deploymentReload=true;document.getElementById('si_deployment_control_test').click()`);
    await waitFor(async()=>await evaluate(`!window.__deploymentReload && document.readyState==='complete' && document.getElementById('si_deployment_control_test')?.disabled`),'Test preview after accepting unsaved-change discard');
    assert.equal(await evaluate(`!!document.getElementById('si_edit_main_menu')`),false);
    assert.equal(await headerVisible(),true,'Test preview keeps the header visible');
    await evaluate(`window.__deploymentReload=true;document.getElementById('si_deployment_control_live').click()`);
    await waitFor(async()=>await evaluate(`!window.__deploymentReload && document.readyState==='complete' && document.getElementById('si_deployment_control_live')?.disabled`),'Live preview');
    assert.equal(await headerVisible(),true,'Live preview keeps the header visible');
    await evaluate(`window.__deploymentReload=true;document.getElementById('si_deployment_control_dev').click()`);
    await waitFor(async()=>await evaluate(`!window.__deploymentReload && document.readyState==='complete' && !!document.getElementById('si_edit_main_menu')`),'return to Dev editor');
    assert.equal(await headerVisible(),true,'Returning to Dev keeps the header visible');
    console.log('PASS Preview switching respects unsaved changes and preserves the top bar in Test, Live, and Dev');
    await evaluate('SI.Login.Logout()');
    await waitFor(async()=>await evaluate('document.readyState === "complete" && window.SI?.User?.Name === "guest" && !document.getElementById("si_edit_main_menu")'),'logout');
    assert.equal(await headerVisible(),true,'Logout preserves the top bar');
    console.log('PASS Signing out preserves the top bar');
    assert.deepEqual(exceptions,[],'No browser JavaScript errors');
    console.log('PASS No editor startup or interaction exceptions');
  } finally {
    if(assetServer)await new Promise(resolve=>assetServer.close(resolve));
    if(send&&socket.readyState===WebSocket.OPEN)await send('Browser.close').catch(()=>{});
    if(socket)socket.close();
    if(chrome.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{chrome.kill();resolve();},5000);chrome.once('exit',()=>{clearTimeout(timer);resolve();});});
    await fs.promises.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
