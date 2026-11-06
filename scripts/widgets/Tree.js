if (!SI.Widgets.Tree) SI.Widgets.Tree = {};
SI.Widget.Tree = function (options) {
    if (!(this instanceof SI.Widget.Tree)) return new SI.Widget.Tree(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('Tree');this.Input={...options};
    this.Defaults={Parent:null,Leaves:{},OnSelect:null};this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);
    const tree=this.Container=Ele('ul',{id:this.Id,class:'si-widget si-widget-tree',role:'tree'});
    const build=(leaves,parent)=>{
        for(const [key,value] of Object.entries(leaves)){
            const item=Ele('li',{role:'treeitem',appendTo:parent});
            if(value&&typeof value==='object'&&!(value instanceof Node)){
                item.setAttribute('aria-expanded','true');
                const button=Ele('button',{type:'button',class:'si-tree-branch',innerText:key,appendTo:item});
                const group=Ele('ul',{role:'group',appendTo:item});build(value,group);
                button.onclick=()=>{group.hidden=!group.hidden;item.setAttribute('aria-expanded',String(!group.hidden));};
                button.onkeydown=event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();group.hidden=event.key==='ArrowLeft';item.setAttribute('aria-expanded',String(!group.hidden));}};
            }else{
                const button=Ele('button',{type:'button',class:'si-tree-leaf',innerText:key,appendTo:item});
                if(value!=null&&String(value)!=='')Ele('small',{innerText:String(value),appendTo:button});
                button.onclick=event=>{tree.querySelectorAll('[aria-selected]').forEach(node=>node.removeAttribute('aria-selected'));item.setAttribute('aria-selected','true');if(this.Options.OnSelect)this.Options.OnSelect(key,value,event);tree.dispatchEvent(new CustomEvent('treeselect',{bubbles:true,detail:{key,value}}));};
            }
        }
    };
    build(this.Options.Leaves,tree);if(!tree.children.length)Ele('li',{class:'si-widget-empty',innerText:'No items yet',appendTo:tree});
    if(this.Options.Parent)this.Options.Parent.appendChild(tree);SI.Widgets.Tree[this.Id]=this;return tree;
};
