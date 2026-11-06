if (!SI.Widgets.Accordian) SI.Widgets.Accordian = {};
SI.Widget.Accordian = function (options) {
    if (!(this instanceof SI.Widget.Accordian)) return new SI.Widget.Accordian(options);
    options = options || {}; this.Id = options.Id || SI.Tools.Element.SafeId('Accordian'); this.Input = {...options};
    this.Defaults = {Parent: null, Sections: null, Duration: 160, Width: '100%', HeaderBackgroundColor: 'var(--si-widget-raised)', HeaderBorder: '1px solid var(--si-widget-line)', ContentBackgroundColor: 'var(--si-widget-surface)', ContentTextColor: 'var(--si-widget-text)'};
    this.Options = SI.Tools.Object.SetDefaults(options,this.Defaults); this.Groups = [];
    this.Container = Ele('div',{id:this.Id,class:'si-widget si-widget-accordion',style:{width:this.Options.Width}});
    const self = this;
    this.ClickBar = function () {
        const body = this.nextElementSibling; const opened = this.getAttribute('aria-expanded') !== 'true';
        this.setAttribute('aria-expanded',String(opened)); body.hidden = !opened;
        if (opened && self.Options.Duration && !matchMedia('(prefers-reduced-motion: reduce)').matches) body.animate({opacity:[0,1]},{duration:self.Options.Duration});
    };
    this.AddSection = function (name, content) {
        const id = this.Id + '_section_' + this.Groups.length;
        const button = Ele('button',{id:id+'_heading',type:'button',class:'si-accordion-heading',innerText:name,onclick:this.ClickBar,style:{backgroundColor:this.Options.HeaderBackgroundColor,border:this.Options.HeaderBorder},appendTo:this.Container});
        button.setAttribute('aria-controls',id); button.setAttribute('aria-expanded','false');
        const body = Ele('div',{id,class:'si-accordion-body',hidden:true,role:'region',style:{backgroundColor:this.Options.ContentBackgroundColor,color:this.Options.ContentTextColor},appendTo:this.Container});
        body.setAttribute('aria-labelledby',button.id); if(content instanceof Node)body.appendChild(content);else body.innerHTML=content==null?'':String(content);
        this.Groups.push(name); return body;
    };
    for(const [name,content] of Object.entries(this.Options.Sections || {}))this.AddSection(name,content);
    if(!this.Groups.length)Ele('p',{class:'si-widget-empty',innerText:'Add a section to this accordion',appendTo:this.Container});
    if(this.Options.Parent)this.Options.Parent.appendChild(this.Container);SI.Widgets.Accordian[this.Id]=this;return this;
};
