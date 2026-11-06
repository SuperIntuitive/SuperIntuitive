(() => {
  'use strict';
  if (window.SIEditorDemo) return;
  const action = async (name, data = {}) => {
    const response = await fetch('/delegate.php', {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json','X-SI-CSRF':SI.CSRF.Token}, body:JSON.stringify({KEY:'PluginAction',plugin:'editor-demo',action:name,...data})});
    const result = await response.json(), value = Array.isArray(result) ? result[0] : result;
    if (!response.ok || value.ERROR) throw Error(value.ERROR || 'The demo is unavailable.');
    return value;
  };
  const init = async () => {
    for (const root of document.querySelectorAll('[data-si-demo]:not([data-demo-bound])')) {
      root.dataset.demoBound = 'true';
      const status=root.querySelector('[data-demo-status]');
      try {
        if (root.dataset.siDemo === 'settings') {
          const form=root.querySelector('form'), result=await action('settings');
          root.querySelector('[data-demo-package]').textContent=result.package;
          form.elements.origin.value=result.config?.origin||'';
          form.elements.parents.value=(result.config?.parents||[]).join('\n');
          form.elements.page.value=result.config?.page||'editor-demo-source';
          form.onsubmit=async event=>{event.preventDefault();try{await action('configure',{config:{origin:form.elements.origin.value,parents:form.elements.parents.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),page:form.elements.page.value}});status.textContent='Settings saved. Restart the plugin demo listener.';}catch(error){status.textContent=error.message;}};
        } else {
          const result=await action('bootstrap'), frame=root.querySelector('iframe');
          if (!result.origin) throw Error('An administrator needs to configure the demo.');
          const canvas=result.origin+'/cms/sample/canvas';
          const policy=document.createElement('meta');
          policy.httpEquiv='Content-Security-Policy';policy.content='frame-src '+result.origin;
          document.head.appendChild(policy);
          frame.src=canvas;
          root.querySelector('[data-demo-reset]').onclick=()=>{status.textContent='Loading the demo…';frame.src=canvas+'?reset='+Date.now();};
          window.addEventListener('message',event=>{
            if(event.source!==frame.contentWindow||event.origin!=='null'||event.data?.source!=='si-sample')return;
            const {type,message}=event.data;
            if(type==='ready')status.textContent='Ready to explore. Right-click inside the canvas to open the editor.';
            if(type==='blocked')status.textContent='Your changes stay in this browser. Saving, uploads and publishing are disabled.';
            if(type==='error'||type==='notice')status.textContent=String(message).slice(0,300);
          });
        }
      } catch (error) { status.textContent=error.message; }
    }
  };
  window.SIEditorDemo={action,init};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
