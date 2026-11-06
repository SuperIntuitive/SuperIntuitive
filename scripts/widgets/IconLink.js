if (!SI.Widgets.IconLink) SI.Widgets.IconLink = {};
SI.Widget.IconLink = function (options) {
    if (!(this instanceof SI.Widget.IconLink)) return new SI.Widget.IconLink(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('IconLink');this.Input={...options};
    this.Defaults={Parent:null,ParentIndex:null,IconUrl:'/scripts/widgets/icons/defaultAppIcon.png',Link:'#',Type:'div',Size:24,Title:'Open link'};
    this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);
    this.Container=Ele(this.Options.Type,{id:this.Id,class:'si-widget si-widget-iconlink'});
    const link=Ele('a',{href:this.Options.Link,appendTo:this.Container});
    link.title=this.Options.Title;const img=Ele('img',{width:this.Options.Size,height:this.Options.Size,src:this.Options.IconUrl,alt:'',appendTo:link});
    img.addEventListener('error',()=>{img.hidden=true;});Ele('span',{innerText:this.Options.Title,appendTo:link});
    if(SI.Tools.Object.GetIfExists('SI.User.Preferences.open_links_in')!=='window'){link.target='_blank';link.rel='noopener noreferrer';}
    else link.onclick=event=>{event.preventDefault();window.open(this.Options.Link,'_blank','noopener,noreferrer,width=1280,height=720,scrollbars=yes');};
    SI.Widgets.IconLink[this.Id]=this;if(this.Options.Parent)this.Options.Parent.appendChild(this.Container);return this;
};
