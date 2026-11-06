// Framework behavior for the public editor, never sample page content.
(() => {
    'use strict';
    const memory = () => {
        const values = new Map();
        return {getItem:key=>values.has(String(key))?values.get(String(key)):null,setItem:(key,value)=>values.set(String(key),String(value)),removeItem:key=>values.delete(String(key)),clear:()=>values.clear(),key:index=>[...values.keys()][index]??null,get length(){return values.size;}};
    };
    // The sandbox has an opaque origin. Legacy editor reference caching is
    // session-local here; no site content is persisted in browser storage.
    Object.defineProperty(window,'localStorage',{value:memory()});
    Object.defineProperty(window,'sessionStorage',{value:memory()});
    const blocked = () => {parent.postMessage({source:'si-sample',type:'blocked'},'*');};
    XMLHttpRequest.prototype.send = function(){blocked();this.abort();};
    window.fetch = () => {blocked();return Promise.reject(new Error('SAMPLE_READ_ONLY'));};
    // Confirmations here only affect the temporary canvas. All network writes
    // remain blocked independently by the document's HTTP security policy.
    window.confirm = () => true;
    window.alert = message => {parent.postMessage({source:'si-sample',type:'notice',message:String(message).slice(0,240)},'*');};
})();
