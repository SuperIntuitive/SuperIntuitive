if (!SI.Widgets.Uploader) SI.Widgets.Uploader = {};
SI.Widget.Uploader = function (options) {
    if (!(this instanceof SI.Widget.Uploader)) return new SI.Widget.Uploader(options);
    options=options||{};this.Id=options.Id||SI.Tools.Element.SafeId('Uploader');this.Input={...options};
    this.Defaults={Name:'Upload',Parent:null,ParentIndex:null,ContainerClass:'',Position:'absolute',Width:'280px',Height:'200px',Top:'',Left:'',Right:'',Bottom:'',Border:'1px dashed var(--si-widget-line)',OverBorder:'1px dashed var(--si-widget-focus)',FontSize:'14px',FontColor:'var(--si-widget-text)',Text:'Drop files here',TextAlign:'center',AllowedFileTypes:'jpg,jpeg,png,gif,webp,mp3,mp4,pdf',ServerScript:'/filehandeler.php',MaxSize:10485760,OnComplete:null,OnError:null,Multiple:true};
    this.Options=SI.Tools.Object.SetDefaults(options,this.Defaults);this.Files=[];this.ObjectUrls=[];
    this.Container=Ele('div',{id:this.Id,class:'si-widget si-widget-uploader '+this.Options.ContainerClass,style:{position:this.Options.Position,width:this.Options.Width,height:this.Options.Height,top:this.Options.Top,left:this.Options.Left,right:this.Options.Right,bottom:this.Options.Bottom,border:this.Options.Border,color:this.Options.FontColor,textAlign:this.Options.TextAlign}});
    Ele('span',{class:'si-upload-icon',innerText:'↑',appendTo:this.Container});Ele('div',{innerHTML:this.Options.Text,appendTo:this.Container});
    this.FileInput=Ele('input',{type:'file',multiple:this.Options.Multiple,hidden:true,appendTo:this.Container});
    this.FileInput.accept=this.Options.AllowedFileTypes.split(',').map(value=>'.'+value.trim().replace(/^\./,'')).join(',');
    const choose=Ele('button',{type:'button',innerText:'Choose files',onclick:()=>this.FileInput.click(),appendTo:this.Container});
    this.ProgressBar=Ele('progress',{id:this.Id+'_progressbar',max:100,value:0,hidden:true,appendTo:this.Container});this.ProgressBar.setAttribute('aria-label','Upload progress');
    this.Status=Ele('div',{class:'si-upload-status',role:'status',appendTo:this.Container});
    this.Error=message=>{this.Status.textContent=message;this.Status.classList.add('si-widget-error');this.ProgressBar.hidden=true;choose.disabled=false;if(this.Options.OnError)this.Options.OnError(message);};
    this.PreviewFile=file=>{this.Status.textContent=file.name+' · '+Math.ceil(file.size/1024)+' KB';};
    this.UploadFiles=files=>{
        const chosen=Array.from(files);if(!chosen.length)return;
        const allowed=this.Options.AllowedFileTypes.split(',').map(value=>value.trim().replace(/^\./,'').toLowerCase());
        for(const file of chosen){if(!allowed.includes(file.name.split('.').pop().toLowerCase())){this.Error('File type not allowed: '+file.name);return;}if(file.size>this.Options.MaxSize){this.Error('File is too large: '+file.name);return;}}
        this.Files=chosen;this.Status.classList.remove('si-widget-error');this.Status.textContent='Uploading '+chosen.length+' file'+(chosen.length===1?'':'s')+'…';this.ProgressBar.hidden=false;this.ProgressBar.value=0;choose.disabled=true;
        const data=new FormData();for(const file of chosen)data.append('files[]',file);
        const xhr=this.Request=new XMLHttpRequest();xhr.open('POST',this.Options.ServerScript);xhr.timeout=60000;
        if(SI.CSRF?.Token)xhr.setRequestHeader('X-SI-CSRF',SI.CSRF.Token);
        xhr.upload.onprogress=event=>{if(event.lengthComputable)this.ProgressBar.value=event.loaded/event.total*100;};
        xhr.onload=()=>{
            if(xhr.status<200||xhr.status>=300){this.Error(xhr.status===403?'Uploads are not permitted in this session.':xhr.status===501?'File uploads are unavailable on this installation.':'Upload failed. Please try again.');return;}
            let response;try{response=JSON.parse(xhr.responseText);}catch(error){this.Error('The server did not confirm the upload.');return;}
            if(!Array.isArray(response)||!response.length){this.Error(response.ERROR||'No files were uploaded.');return;}
            this.ProgressBar.value=100;this.Status.textContent='Uploaded '+chosen.map(file=>file.name).join(', ');choose.disabled=false;
            if(this.Options.OnComplete)this.Options.OnComplete(chosen,xhr.responseText);
        };
        xhr.onerror=xhr.ontimeout=()=>this.Error('Upload failed. Check the connection and try again.');xhr.onabort=()=>{choose.disabled=false;this.ProgressBar.hidden=true;};xhr.send(data);
    };
    this.FileInput.onchange=()=>{this.UploadFiles(this.FileInput.files);this.FileInput.value='';};
    this.Container.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files')){event.preventDefault();event.stopPropagation();this.Container.classList.add('si-upload-over');}});
    this.Container.addEventListener('dragleave',()=>this.Container.classList.remove('si-upload-over'));
    this.Container.addEventListener('drop',event=>{if(event.dataTransfer.files.length){event.preventDefault();event.stopPropagation();this.Container.classList.remove('si-upload-over');this.UploadFiles(event.dataTransfer.files);}});
    this.Tests={progress:true,filereader:typeof FileReader!=='undefined'};
    this.Destroy=()=>{this.Request?.abort();this.ObjectUrls.forEach(url=>URL.revokeObjectURL(url));if(this.Container.parentNode)this.Container.remove();delete SI.Widgets.Uploader[this.Id];};
    SI.Widgets.Uploader[this.Id]=this;if(this.Options.Parent)this.Options.Parent.appendChild(this.Container);return this;
};
