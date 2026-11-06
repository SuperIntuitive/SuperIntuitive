if (!SI.Widgets.CodePad) SI.Widgets.CodePad = {};
SI.Widget.CodePad = function (options) {
    if (!(this instanceof SI.Widget.CodePad)) return new SI.Widget.CodePad(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('CodePad');this.Input={...options};
    this.Defaults={Parent:null,Position:'absolute',Display:'grid',Width:'30em',Height:'20em',Top:'0px',Left:'0px',Border:'1px solid var(--si-widget-line)',DarkBackgroundImage:'none',LightBackgroundImage:'none',TabIndex:0,Language:'js',TabSize:4,Value:'',OnChange:null,OnSave:null};
    this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);
    this.Container=Ele('div',{id:this.Id,class:'si-widget si-widget-codepad',style:{position:this.Options.Position,display:this.Options.Display,width:this.Options.Width,height:this.Options.Height,top:this.Options.Top,left:this.Options.Left,border:this.Options.Border}});
    this.LineNumbers=Ele('pre',{id:this.Id+'_linenumbers',class:'si-codepad-lines',appendTo:this.Container});this.LineNumbers.setAttribute('aria-hidden','true');
    this.Codepad=Ele('textarea',{id:this.Id+'_code',class:'si-codepad-input',value:this.Options.Value,spellcheck:false,tabIndex:this.Options.TabIndex,appendTo:this.Container});
    this.Codepad.setAttribute('aria-label',this.Options.Language+' code');this.Codepad.setAttribute('wrap','off');this.Codepad.style.tabSize=this.Options.TabSize;
    this.Codepad.placeholder='// Write your code here';
    this.Container.style.backgroundImage=SI.Theme.UserPreference==='dark'?this.Options.DarkBackgroundImage:this.Options.LightBackgroundImage;
    const highlight = Ele('pre', {class:'si-codepad-highlight', appendTo:this.Container});
    highlight.setAttribute('aria-hidden','true'); highlight.style.tabSize=this.Options.TabSize;
    this.Draw=()=>this.Container;this.GetCode=()=>this.Codepad.value;
    this.ComputeLineNumbers=()=>this.Codepad.value.split('\n').length;
    this.InitLineNumbers=()=>{this.LineNumbers.textContent=Array.from({length:this.ComputeLineNumbers()},(_,index)=>index+1).join('\n');};
    this.AddLineNumbers=this.InitLineNumbers;
    this.HighlightSyntax=()=>{
        const source=this.GetCode();highlight.replaceChildren();
        const pattern=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|class|new|this|async|await|try|catch|throw|import|export|default|switch|case|break|true|false|null|undefined|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE)\b)|(\b(?:0x[\da-f]+|\d+(?:\.\d+)?)\b)/gi;
        let offset=0;for(const match of source.matchAll(pattern)){highlight.appendChild(document.createTextNode(source.slice(offset,match.index)));const span=document.createElement('span');span.className=match[1]?'si-code-comment':match[2]?'si-code-string':match[3]?'si-code-keyword':'si-code-number';span.textContent=match[0];highlight.appendChild(span);offset=match.index+match[0].length;}
        highlight.appendChild(document.createTextNode(source.slice(offset)+'\n'));return source;
    };
    this.LoadScriptCode=source=>{this.Codepad.value=String(source??'');this.Input.Value=this.Codepad.value;this.InitLineNumbers();this.HighlightSyntax();};this.SetCode=this.LoadScriptCode;
    this.GetLanguage=language=>{this.Options.Language=language;this.Codepad.setAttribute('aria-label',language+' code');this.HighlightSyntax();return language;};
    this.DefineLanguage=this.GetLanguage;this.DefineElements=()=>highlight;this.ParseJavascript=syntax=>{this.LanguageSyntax=syntax;return this.HighlightSyntax();};
    this.OpenScript=(name,type,parent)=>{
        const source=type==='Block'?SI.Editor?.Data.Objects.Blocks[name]?.script:SI.Editor?.Data.Objects.Plugins.Current[parent]?.scripts?.[name];
        if(typeof source==='string')this.LoadScriptCode(source);
    };
    this.SaveScript=()=>{if(this.Options.OnSave)this.Options.OnSave(this.GetCode(),this);};
    this.Codepad.addEventListener('input',()=>{this.Input.Value=this.GetCode();this.InitLineNumbers();this.HighlightSyntax();if(this.Options.OnChange)this.Options.OnChange(this.GetCode(),this);});
    this.Codepad.addEventListener('scroll',()=>{this.LineNumbers.scrollTop=this.Codepad.scrollTop;highlight.scrollTop=this.Codepad.scrollTop;highlight.scrollLeft=this.Codepad.scrollLeft;});
    this.Codepad.addEventListener('keydown',event=>{
        if(event.key==='Tab'){
            event.preventDefault();const start=this.Codepad.selectionStart,end=this.Codepad.selectionEnd;
            this.Codepad.setRangeText(' '.repeat(this.Options.TabSize),start,end,'end');this.Codepad.dispatchEvent(new Event('input',{bubbles:true}));
        }else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){event.preventDefault();this.SaveScript();}
    });
    this.InitLineNumbers();this.HighlightSyntax();SI.Widgets.CodePad[this.Id]=this;if(this.Options.Parent)this.Options.Parent.appendChild(this.Container);return this;
};
