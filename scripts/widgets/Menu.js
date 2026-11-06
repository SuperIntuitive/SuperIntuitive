if (!SI.Widgets.Menu) SI.Widgets.Menu = {};
SI.Widget.Menu = function (options) {
    if (!(this instanceof SI.Widget.Menu)) return new SI.Widget.Menu(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('Menu');this.Input={...options};
    this.Defaults={Parent:null,ContainerClass:'',Direction:'h',ContainerPosition:'relative',ContainerTop:'0px',ContainerLeft:'0px',TextColor:'var(--si-widget-text)',Items:{},OnSelect:null};
    this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);
    this.Container=Ele('nav',{id:this.Id,class:'si-widget si-widget-menu '+this.Options.ContainerClass,style:{position:this.Options.ContainerPosition,top:this.Options.ContainerTop,left:this.Options.ContainerLeft,color:this.Options.TextColor}});
    this.Container.setAttribute('aria-label',options.Label||'Menu');
    this.CreateMenu=(items,parent,level=0)=>{
        const list=Ele('ul',{class:level?'si-menu-submenu':this.Options.Direction==='v'?'si-menu-vertical':'si-menu-horizontal',appendTo:parent});
        for(const [key,config] of Object.entries(items)){
            const item=typeof config==='string'?{Text:config}:config;
            const row=Ele('li',{appendTo:list});const children=item.Items&&Object.keys(item.Items).length;
            const href=item.Link||item.Url||item.Href;
            const button=Ele(href&&!children?'a':'button',{id:this.Id+'_menuitem_'+level+'_'+key,innerText:item.Text||item.Label||key,appendTo:row});
            if(button.tagName==='BUTTON')button.type='button';else button.href=href;
            if(item.TextColor)button.style.color=item.TextColor;
            if(children){
                button.setAttribute('aria-expanded','false');const nested=this.CreateMenu(item.Items,row,level+1);nested.hidden=true;
                button.onclick=()=>{nested.hidden=!nested.hidden;button.setAttribute('aria-expanded',String(!nested.hidden));};
                row.addEventListener('keydown',event=>{if(event.key==='Escape'){nested.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}});
            }else button.addEventListener('click',event=>{if(item.OnClick)item.OnClick(event,item);if(this.Options.OnSelect)this.Options.OnSelect(key,item,event);});
        }
        return list;
    };
    if(Object.keys(this.Options.Items).length)this.CreateMenu(this.Options.Items,this.Container);else Ele('p',{class:'si-widget-empty',innerText:'Add a menu item',appendTo:this.Container});
    if(this.Options.Parent)this.Options.Parent.appendChild(this.Container);SI.Widgets.Menu[this.Id]=this;return this.Container;
};
