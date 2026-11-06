if (!SI.Widgets.Tab) SI.Widgets.Tab = {};
SI.Widget.Tab = function (options) {
    if (!(this instanceof SI.Widget.Tab)) return new SI.Widget.Tab(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('Tab');this.Input={...options};
    this.Defaults={ContainerClass:'',Position:'absolute',Parent:null,ParentIndex:null,Width:'100%',Height:'100%',Top:'',Bottom:'',Left:'',Right:'',FontSize:'1em',FontColor:'var(--si-widget-text)',TextAlign:'center',Border:'1px solid var(--si-widget-line)',BackgroundColor:'var(--si-widget-surface)',TabTextColor:'var(--si-widget-text)',TabBackgroundColor:'var(--si-widget-raised)',SelectedTabBackgroundColor:'#29496b',TabFilter:'brightness(100%)',HoverTabFilter:'brightness(110%)',SelectedTabFilter:'brightness(100%)',TabHeight:'32px',TabPadding:'6px',LeftOfTabsSpace:'8px',Overflow:'hidden',OnChange:null,Selected:null,Items:null};
    this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);this.Container=null;this.BaseClass=this.Id.replaceAll('_','-');
    const self=this;let selected=null;
    this.Items={Count:0,
        Add(name,content){this[this.Count++]={[name]:content};if(!self.Input.Items)self.Input.Items={};self.Input.Items[name]=content instanceof Element?content.outerHTML:content;if(self.Container)self.Draw();},
        Index(name){for(let index=0;index<this.Count;index++)if(Object.prototype.hasOwnProperty.call(this[index],name))return index;return -1;},
        Remove(tab){
            const index=typeof tab==='number'?tab:this.Index(tab);if(index<0||index>=this.Count)return false;
            const removed=Object.keys(this[index])[0];for(let next=index;next<this.Count-1;next++)this[next]=this[next+1];delete this[--this.Count];
            if(self.Input.Items)delete self.Input.Items[removed];
            if(selected===removed){selected=null;self.Options.Selected=null;}if(self.Container)self.Draw();return true;
        },
        Contents(tab,content){const index=typeof tab==='number'?tab:this.Index(tab);if(index<0||index>=this.Count)return;const name=Object.keys(this[index])[0];if(content===undefined)return this[index][name];this[index][name]=content;self.Input.Items[name]=content instanceof Element?content.outerHTML:content;if(self.Container)self.Draw();},
        GetSelected(){return self['tabitem_'+selected]||null;}
    };
    this.SelectTab=function(name,notify=true){
        if(this.Items.Index(name)<0)return false;selected=name;this.Options.Selected=name;this.Input.Selected=name;
        for(let index=0;index<this.Items.Count;index++){
            const key=Object.keys(this.Items[index])[0],active=key===name,tab=this['tabitem_'+key],panel=this['tabcontent_'+key];if(!tab||!panel)continue;
            tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;tab.style.filter=active?this.Options.SelectedTabFilter:this.Options.TabFilter;
            tab.style.backgroundColor=active?this.Options.SelectedTabBackgroundColor:this.Options.TabBackgroundColor;panel.style.display=active?'block':'none';
        }
        if(notify&&this.Options.OnChange&&this['tabitem_'+name])this.Options.OnChange(this['tabitem_'+name]);return true;
    };
    this.Show=()=>{if(this.Container)this.Container.style.display='block';};this.Hide=()=>{if(this.Container)this.Container.style.display='none';};
    this.Draw=function(parentId){
        const container=this.Container||Ele('div',{id:this.Id,class:'si-widget si-widget-tabs si-tabs-container '+this.Options.ContainerClass,style:{position:this.Options.Position,top:this.Options.Top,left:this.Options.Left,right:this.Options.Right,bottom:this.Options.Bottom,height:this.Options.Height,width:this.Options.Width,overflow:this.Options.Overflow}});
        this.Container=container;container.replaceChildren();
        const menu=Ele('ul',{class:this.BaseClass+'-tabmenu si-tab-list',role:'tablist',style:{height:this.Options.TabHeight,margin:'0',paddingLeft:this.Options.LeftOfTabsSpace,backgroundColor:this.Options.BackgroundColor},appendTo:container});
        for(let index=0;index<this.Items.Count;index++){
            const name=Object.keys(this.Items[index])[0],content=this.Items[index][name],suffix=name.replaceAll(' ','_');
            const tab=Ele('li',{id:this.Id+'_tabitem_'+suffix,class:this.BaseClass+'-tabitem si-tab-item',role:'tab',tabIndex:-1,innerText:name,data:{tabname:name,tabnum:index},style:{color:this.Options.TabTextColor,padding:this.Options.TabPadding,border:this.Options.Border,cursor:'pointer',backgroundColor:this.Options.TabBackgroundColor},appendTo:menu});
            const panel=Ele('div',{id:this.Id+'_tabcontent_'+suffix,class:this.BaseClass+'-tabcontent si-tab-panel',role:'tabpanel',style:{position:'absolute',top:this.Options.TabHeight,bottom:'0',width:'100%',overflow:'auto',backgroundColor:this.Options.BackgroundColor,color:this.Options.FontColor},appendTo:container});
            tab.setAttribute('aria-controls',panel.id);panel.setAttribute('aria-labelledby',tab.id);
            if(content instanceof Node)panel.appendChild(content);else panel.innerHTML=content==null?'':String(content);
            this['tabitem_'+name]=tab;this['tabcontent_'+name]=panel;
            tab.onclick=()=>this.SelectTab(name);
            tab.onmouseenter=()=>{if(selected!==name)tab.style.filter=this.Options.HoverTabFilter;};tab.onmouseleave=()=>{if(selected!==name)tab.style.filter=this.Options.TabFilter;};
            tab.onkeydown=event=>{
                const keys=['ArrowRight','ArrowLeft','Home','End','Enter',' '];if(!keys.includes(event.key))return;event.preventDefault();
                let next=index;if(event.key==='ArrowRight')next=(index+1)%this.Items.Count;if(event.key==='ArrowLeft')next=(index-1+this.Items.Count)%this.Items.Count;if(event.key==='Home')next=0;if(event.key==='End')next=this.Items.Count-1;
                const key=Object.keys(this.Items[next])[0];this.SelectTab(key);this['tabitem_'+key].focus();
            };
        }
        if(this.Items.Count)this.SelectTab(this.Options.Selected&&this.Items.Index(this.Options.Selected)>=0?this.Options.Selected:Object.keys(this.Items[0])[0],false);
        else Ele('p',{class:'si-widget-empty',innerText:'Add a tab to get started',appendTo:container});
        const parent=typeof parentId==='string'?document.getElementById(parentId):parentId||this.Options.Parent;
        if(parent&&container.parentNode!==parent)parent.appendChild(container);return container;
    };
    for(const [name,content] of Object.entries(this.Options.Items||{}))this.Items.Add(name,content);
    SI.Widgets.Tab[this.Id]=this;return this;
};
