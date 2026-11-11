(() => {
    'use strict';
    const send = (type,message='') => parent.postMessage({source:'si-sample',type,message},'*');
    const blocked = () => {
        send('blocked');
        let notice = document.getElementById('si_sample_notice');
        if(!notice){notice=document.createElement('div');notice.id='si_sample_notice';notice.setAttribute('role','status');notice.style.cssText='position:fixed;bottom:18px;left:18px;right:18px;z-index:2147483647;padding:14px 20px;background:#14243d;color:#f3f7ff;border:1px solid #6b9ded;border-radius:6px;font:13px/1.7 Roboto,Arial,sans-serif;pointer-events:none';document.body.appendChild(notice);}
        notice.textContent=SI.Tools.Text.Editor('Sample mode: your changes stay in this browser. Saving, uploads and publishing are disabled.');
        clearTimeout(window.siSampleNoticeTimer);window.siSampleNoticeTimer=setTimeout(()=>notice.remove(),6000);
        return {status:403,code:'SAMPLE_READ_ONLY',abort(){}};
    };
    try {
        const sample = SI.Sample;
        SI.Theme = SI.Theme || {UserPreference:'dark',BackgroundColor:'#263247',TextColor:'#dce4f4'};
        SI.Editor.Data.Init = () => {Object.assign(SI.Editor.Data,sample.lookups);SI.Editor.Data.Tools.SupplementData();SI.Editor.Data.loaded=true;};
        SI.Editor.Ajax.Run = blocked;
        SI.Tools.Ajax = blocked;
        SI.Tools.SuperAlert = message => send('notice',String(message));
        SI.Tools.Api.Send = options => {
            const input=options?.Data||{};
            if (String(input.Operation).toLowerCase()==='lookup') {
                const entity=input.Entity?.Name,source=sample.records[entity]||[];
                const allowed=['id','name','path','status','email'];
                const label=input.DisplayColumn||'name',columns=(input.Columns||[label,'path']).filter(column=>allowed.includes(column));
                const term=String(input.Search||'');
                const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
                const pattern=new RegExp('^'+term.split('*').map(escape).join('.*')+(term.includes('*')?'$':''),'i');
                const normalize=id=>String(id).replace(/^0x/i,'').toLowerCase();
                const rows=source.filter(row=>(!input.Ids||input.Ids.some(id=>normalize(id)===normalize(row.id)))&&Object.entries(input.Filters||{}).every(([key,value])=>row[key]===value)&&(pattern.test(row[label]||'')||pattern.test(row.path||'')));
                const sort=input.SortColumn||label;rows.sort((a,b)=>String(a[sort]||'').localeCompare(String(b[sort]||''))*(input.SortDirection==='desc'?-1:1));
                const size=Math.min(50,input.PageSize||8),page=input.Page||0;
                const result={Records:rows.slice(page*size,(page+1)*size).map(row=>({id:'0x'+normalize(row.id),entityType:entity,name:String(row[label]||row.id),fields:Object.fromEntries(['id',...columns].map(column=>[column,row[column]||'']))})),Columns:columns,Entity:entity,More:rows.length>(page+1)*size,Page:page,CanCreate:false};
                options.Callback?.(result,options);return {status:200,abort(){}};
            }
            if(String(input.Operation).toLowerCase()!=='retrieve')return blocked();
            const rows=JSON.parse(JSON.stringify(sample.records[input.Entity?.Name]||[]));
            if(options.Callback===SI.Editor.Objects.Entity.PopulateEntityGrid){const result={Return:input};rows.forEach((row,index)=>{result[index]=row;});options.Callback(result,options);}
            else options.Callback?.(rows,options);
            return {status:200,abort(){}};
        };
        const menu = () => {
            const element=SI.Editor.UI.MainMenu.Element;
            if(!element)return;
            element.style.display='block';element.style.left=Math.max(12,innerWidth-element.offsetWidth-12)+'px';element.style.top='20px';
        };
        window.addEventListener('message',event=>{
            if(event.source!==parent || event.data?.source!=='si-sample-host')return;
            if(event.data.type==='menu')menu();
            if(event.data.type==='tool' && SI.Editor.UI.ToolsPanel.ToolWindows.includes(event.data.tool)){
                try{SI.Editor.UI.ToolsPanel.OpenToolWindow(event.data.tool);}catch(error){send('error',String(error.message));}
            }
        });
        document.addEventListener('submit',event=>{event.preventDefault();blocked();},true);
        document.addEventListener('click',event=>{if(event.target.closest('a')){event.preventDefault();send('notice',SI.Tools.Text.Editor('Links stay inside the sample. Use the company navigation above to explore the site.'));}},true);
        SI.Editor.Run();
        const timer=setInterval(()=>{
            if(!SI.Editor.UI.MainMenu.Element)return;
            clearInterval(timer);sample.runPage();send('ready');
        },75);
        setTimeout(()=>clearInterval(timer),20000);
    } catch(error) {send('error',String(error.message));console.error(error);}
})();
