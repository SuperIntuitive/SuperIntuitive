class Widget{
    constructor(options = null) {
        this.RandomId = Tools.String.RandomString(11);
        this.Defaults = {
            "Container": { "value": null, "type": "blocks.elements" },
            "Parent": { "value": document.body, "type": "blocks.elements" },
            "ContainerTag": { "value": "div", "type": "tags" },
            "ContainerClass": { "value": null, "type": "attr.class" },
            "ContainerInitialPosition": { "value": 'absolute', "type": "style.position"},
            "ContainerInitialWidth": { "value": '10px', "type": "style.width" },
            "ContainerInitialHeight": { "value": '10px', "type": "style.height" },
            "ContainerInitialDisplay": { "value": 'block', "type": "style.display"},
            "ContainerInitialTop": { "value": '100px', "type": "style.top"},
            "ContainerInitialLeft": { "value": '100px', "type": "style.left"},
            "ContainerInitialRight": { "value": '', "type": "style.right"},
            "ContainerInitialBottom": { "value": '', "type": "style.bottom"},
            "ContainerBackground": { "value": 'cornflowerblue', "type": "style.background"},
            "ContainerBorder": { "value": 'solid 3px black', "type": "style.border"},
        };
        //Make options available to this.
        options = Tools.Object.SetDefaults(options, this.Defaults);
        for(let name in options){
            if(options.hasOwnProperty(name)){
                let value = options[name];
                this[name] = value; 
            }
        }

      //  if(this.Container === null){
      //      this.Container = this._NewContainer();        
     //   }

        return this;
    }   
    _NewContainer(){
        let widgetType = (this.WidgetType === 'undefined')?"widget":this.WidgetType;
        let base = Ele( this.ContainerTag ,{
            id:"si_"+widgetType+"_"+this.RandomId,
            class:this.ContainerClass,
            style:{
                display:this.ContainerInitialDisplay,
                position:this.ContainerInitialPosition,
                width:this.ContainerInitialWidth,
                height:this.ContainerInitialHeight,
                top:this.ContainerInitialTop,
                left:this.ContainerInitialLeft,
                right:this.ContainerInitialRight,
                bottom:this.ContainerInitialBottom,
                background:this.ContainerBackground,
                border:this.ContainerBorder,
            }
        });

        return base;
    }
 
    AppendTo(id){
        //debugger;
        if(id){
            let parent;
            if(id == document.body){
                parent = document.body;
            }else if(id.charAt(0) === '#'){
                parent = document.querySelector(id);
            }else{
                parent = document.getElementById(id);
            }
            if(parent){
                parent.appendChild(this.Container);
            }
        }else{
            document.body.appendChild(this.Container);
        }

        
    }

    Hide(){
        Tools.Style.FadeOut(this.Container);
    }
    Show(){
        Tools.Style.FadeIn(this.Container);
    }
    Dispose(){
        this.Container.parentNode.removeChild(this.Container);
    }
    GetContainer(){
        return this.Container;
    }
}