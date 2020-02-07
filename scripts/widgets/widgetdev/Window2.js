class Window2 extends Widget{

    constructor(options){
       //debugger;
       
        options.WidgetType = "window";
        
        options = super(options);

        this.Defaults = {
            "Name": { "value": "Window", "type": "TEXT" },
            "Parent": { "value": "#si_windows_container", "type": "blocks.elements" },
            "ContainerClass": { "value": "", "type": "CLASS" },
            "Title": { "value": "Title", "type": "TEXT" }, 
            "BorderColor": { "value": "rgba(96,96,96,.1)", "type": "COLOR" },
            "ContainerBorder": { "value": 'solid 3px silver', "type": "style.border"},
            "TitleBarColor": { "value": "#484B57", "type": "COLOR" }, //maybe sub in a variable to a default color pattern
            "TitleBarHeight": {"value": "24px", "type": "LEN"},
            "TitleFontFamily": { "value": "Arial, Helvetica, sans - serif;", "type": "FONT" }, 
            "TitleColor": { "value": "#EEFFFF", "type": "COLOR" },
            "TitleBarBorder": { "value": '1px solid rgba(220,220,220,.2)', "type": "BORDER" }, 
            "WindowControls": { "value": "MIN,MAX,CLOSE", "type": "ENUM" },
            "Shadow": { "value": "5px 10px 18px #000", "type": "TEXT" },
            "ControlColorClose": { "value": "white", "type": "COLOR" },
            "ControlBackgroundColorClose": { "value": "transparent", "type": "COLOR" },
            "ControlColorMin": { "value": "white", "type": "COLOR" },
            "ControlBackgroundColorMin": { "value": "transparent", "type": "COLOR" },
            "ControlColorMax": { "value": "white", "type": "COLOR" },
            "ControlBackgroundColorMax": { "value": "transparent", "type": "COLOR" },
            "MinimizeChar": { "value": '&#8854;', "type": "CHAR" },
            "MaximizeChar": { "value": '&#8853;', "type": "CHAR" },
            "CloseAppChar": { "value": '&#8855;', "type": "CHAR" },
            "CornerRadius": { "value": "4px", "type": "LEN" },
            "ResizeThickness": { "value": 3, "type": "NUM" },
            "HasIcon": { "value": "IMG", "type": "ENUM", "choices":["NONE","IMG","URL","CHAR"] },
            "IconImg": { "value": "/scripts/widgets/icons/SpinningGear.gif", "type": "IMG" },
            "IconUrl": { "value": "/scripts/widgets/icons/defaultAppIcon.png", "type": "URL" },
            "IconChar": { "value": "128187", "type": "NUM" },
            "MinMaxSpeed": { "value": 300, "type": "NUM" },
            "Resize": { "value": function () { console.log("Resizing") } , "type": "FUNC" },
            "Resizable": { "value":true , "type": "BOOL" },
            "Dockable": { "value": true, "type": "BOOL" },
            "DockSize": { "value": "32px", "type": "LEN" },
            "ZLevel": { "value": 980, "type": "NUM" },
            "Overflow":{"value": "AUTO", "type":"ENUM", "choices":["AUTO","SCROLL"]}
        };    

        //Make options available to this.
        options = Tools.Object.SetDefaults(options, this.Defaults);
        //once set, put them into this
        for(name in options){
            if(options.hasOwnProperty(name)){
                let value = options[name];
                this[name] = value; 
            }
        }
        //Verify that we have a home to put this window in.
        this._VerifyHome();

        this.Container = this._NewContainer();

        //These will not be modified for min and max. Those values are already known and not needed.
        this.ContainerWidth = this.ContainerInitialWidth;
        this.ContainerHeight = this.ContainerInitialHeight;
        this.ContainerTop = this.ContainerInitialTop;
        this.ContainerLeft = this.ContainerInitialLeft;
        //debugger;

        this.AppendTo(this.Parent);
    }
    
    
    _VerifyHome(){
        let winds;
        //if this is a docable window, then 
        if (this.Parent === "#si_windows_container") {
            winds = document.getElementById('si_windows_container');
            if (!winds) {
                winds = Ele("div", {
                    id: 'si_windows_container',
                    style: {
                        position: "absolute",
                        top: '0',
                        left: '0',
                        width: '100%',
                        height: '100%',
                        backgroundColor: "rgba(255,128,128,0.1)",
                    },
                    appendTo: "body",
                });
            }
        }

        if(this.Dockable){
            let dock = document.getElementById('si_windows_dock');

            if(!winds){
                winds = document.body;
            }

            if (!dock) {
                dock = Ele("div", {
                    id: 'si_windows_dock',
                    style: {
                        position: "fixed",
                        top: '20%',
                        left: '12px',
                        width: this.DockSize,
                        height: '60%',
                        border: "1px dotted black",
                        backgroundColor: "rgba(255,255,255,0.1)",
                        display: 'block', //only display if there is at least one window minimized
                    },
                    appendTo: winds,
                });
            }
        }
    }


    _FixResizers(){
      //debugger;
    }




    Minimize(){
        //debugger;
        var w2self = this;
        let c = w2self.Container;
        let size = parseInt(w2self.DockSize) - parseInt(window.getComputedStyle(c).getPropertyValue("border-width", null)) +'px';
        let dock = document.getElementById("si_windows_dock");

        c.animate([
            {
                width: c.style.width,
                height: c.style.height,
                top:c.style.top,
                left:c.style.left
            },
            {
                width:size,
                height:size,
                top:dock.style.top,
                left:dock.style.left,
            }
        ],500)
        setTimeout(function(){
            c.style.width = size;
            c.style.height = size;
            c.style.top = '0px';
            c.style.left = '0px';
            c.style.position = 'relative';  
            dock.appendChild(c);
            c.onclick = w2self.Normalize;
        },500);

    }
    Normalize(){
        //debugger;
        var w2self = this;
        let c = w2self.Container;
        let size = parseInt(w2self.DockSize) - parseInt(window.getComputedStyle(c).getPropertyValue("border-width", null)) +'px';
        c.style.width = w2self.ContainerWidth;
        c.style.height = w2self.ContainerHeight;
        c.style.top = w2self.ContainerTop;
        c.style.left = w2self.ContainerLeft;
        c.style.position = 'absolute';      
        document.getElementById("si_windows_container").appendChild(c);
    }
    Maximize(){
        //debugger;
        var w2self = this;
        let c = w2self.Container;
        let size = parseInt(self.DockSize) - parseInt(window.getComputedStyle(c).getPropertyValue("border-width", null)) +'px';
        c.style.width = document.documentElement.scrollWidth -6+'px';
        c.style.height = document.documentElement.scrollHeight+'px';
        c.style.top = '0px';
        c.style.left = '0px';
        c.style.position = 'absolute';    
        document.getElementById("si_windows_container").appendChild(c);
    }

}