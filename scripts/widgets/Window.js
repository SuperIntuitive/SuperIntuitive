<?php 
header("Content-Type: application/javascript; charset: UTF-8");
$widgetType = "Window";
?>



SI.Widget.<?= $widgetType ?> = function (options) {
    if (!(this instanceof SI.Widget.<?= $widgetType ?>)) { return new SI.Widget.<?= $widgetType ?>(); }
    this.Input = options;
    if ("Id" in options) {
        this.Id = options.Id;
    } else {
        this.Id = SI.Tools.Element.SafeId("<?= $widgetType ?>");
    }

    this.Defaults = {
        "Id": {"value":this.Id, "type":"TEXT"},
        "Title": { "value": "Title", "type": "TEXT" },
        "StartWidth": { "value": "800px", "type": "LEN" },
        "StartHeight": { "value": "600px", "type": "LEN" },
        "StartTop": { "value": "0px", "type": "LEN" },
        "StartLeft": { "value": "0px", "type": "LEN" },
        "OpenPosition": { "value": "MOUSE4", "type": "ENUM", "choices": ["MOUSE4", "MOUSE8", "CENTER", "START"] },
        "BackgroundColor": { "value": "silver", "type": "COLOR" },
        "BorderColor": { "value": "rgba(96,96,96,.1)", "type": "COLOR" },
        "TitleBarColor": { "value": "#484B57", "type": "COLOR" }, //maybe sub in a variable to a default color pattern
        "TitleBarHeight": { "value": "24px", "type": "LEN" },
        "TitleFontFamily": { "value": "Arial, Helvetica, sans - serif;", "type": "FONT" },
        "TitleColor": { "value": "#EEFFFF", "type": "COLOR" },
        "TitleBarBorder": { "value": '1px inset rgba(0,0,0,.2)', "type": "BORDER" },
        "WindowControls": { "value": "MIN,MAX,CLOSE", "type": "STRING" },
        "Shadow": { "value": "5px 10px 18px #000", "type": "TEXT" },
        "ControlColorClose": { "value": "white", "type": "COLOR" },
        "ControlBackgroundColorClose": { "value": "transparent", "type": "COLOR" },
        "ControlColorMin": { "value": "white", "type": "COLOR" },
        "ControlBackgroundColorMin": { "value": "transparent", "type": "COLOR" },
        "ControlColorMax": { "value": "white", "type": "COLOR" },
        "ControlBackgroundColorMax": { "value": "transparent", "type": "COLOR" },
        "MinimizeChar": { "value": '⊖', "type": "CHAR" },
        "MaximizeChar": { "value": '⊕', "type": "CHAR" },
        "CloseAppChar": { "value": '⊗', "type": "CHAR" },
        "CornerRadius": { "value": "4px", "type": "LEN" },
        "ResizeThickness": { "value": 3, "type": "NUM" },
        "HasIcon": { "value": "IMG", "type": "ENUM", "choices": ["NONE", "IMG", "URL", "CHAR"] },
        "IconImg": { "value": "/scripts/widgets/icons/SpinningGear.gif", "type": "IMG" },
        "IconUrl": { "value": "/scripts/widgets/icons/defaultAppIcon.png", "type": "URL" },
        "IconChar": { "value": "128187", "type": "NUM" },
        "MinMaxSpeed": { "value": 300, "type": "NUM" },
        "PreResize": { "value": function () { console.log("About to resize"); }, "type": "FUNC" },
        "Resize": { "value": function () { console.log("Resizing"); }, "type": "FUNC" },
        "OnLoad": { "value": function () { console.log("OnLoad"); }, "type": "FUNC" },
        "Resizable": { "value": true, "type": "BOOL" },
        "Dockable": { "value": true, "type": "BOOL" },
        "ZLevel": { "value": 980, "type": "NUM" },
        "Overflow": { "value": "auto", "type": "ENUM", "choices": ["auto", "scroll", "hidden","visable"] },
        "Position": { "value": "absolute", "type": "ENUM", "choices": ["absolute", "relative", "fixed"] },
        "OnClose": { "value": function () { console.log("Window Closing"); }, "type": "FUNC" }, //the window is really only hidden if it has been created and closed. 
        "Modal": { "value": false, "type": "BOOL" },
        "FontFace": { "value": "Roboto", "type": "STRING" },
        "Populate": { "value": null, "type": "FUNC" },
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.Options.Id = SI.Tools.Element.SafeId(this.Options.Id);
    options = this.Options;



    //All windows append to window the window frame. 
    let windowpane = document.getElementById('si_widget_windowpane');
    if (!windowpane){
        windowdock =Ele("div", {
            id: 'si_widget_windowpane',
            class:'siwi-window-pane',
            appendTo: "body",
        });
    }

    let dock = document.getElementById('si_window_dock');
    //If this window is Docable
    if (this.Options.Dockable) {
        //Check to see if the Doc exists
        if (!dock) {
            //If not, create it.
            dock = Ele("div", {
                id: 'si_window_dock',
                class: 'siwi-window-dock',
                data: {
                    indock:0
                },
                appendTo: "body"
            });
        }
    }
    if (this.Options.Modal) {
        let modal = document.getElementById('si_window_modal');
        if (!modal) {
            modal = Ele("div", {
                id: 'si_window_modal',
                style: {
                    position: "absolute",
                    top: '0px',
                    left: '0px',
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                    backgroundColor: "rgba(0,0,0,0.9)",
                    display: 'none',
                    zIndex:this.Options.ZLevel+1,
                },
                appendTo: "body",
            });
            window.addEventListener('click', function (event) {
                if (event.target == modal) {
                    self.Hide();
                }
            });
        }
    }

    //locals
    //Window Move /Resize
    let self = this; //allows us to call our own function in events
    let container = null;
    let hWinDrag = null;
    let dragOffset = null;
    let resizeSensor = null;
    let startResize = null;
    let hasIframe = false;

    let windowState = 'normal';
    let width = parseInt(this.Options.StartWidth);
    let height = parseInt(this.Options.StartHeight);
    let loaded = false;

    let barThickness = parseInt(self.Options.ResizeThickness);
    let cornerThickness = barThickness + 1;
    let cornerDblThickness = cornerThickness * 2;


    //Member Functions
    this.Show = function (fadetime) {
        if (loaded === false) {
            self.Options.OnLoad();
            loaded = true;
        }
        if (typeof (fadetime) === 'undefined') {
            fadetime = self.Options.MinMaxSpeed;
        }
        //if theres a modal background show it
        if (self.Options.Modal) {
            SI.Tools.Style.FadeIn('si_window_modal', fadetime);
        }
        //Drop all windows to default z index
        var winds = document.getElementsByClassName("si-window-container");
        for (let i = 0; i < winds.length; i++) {
            winds[i].style.zIndex = self.Options.ZLevel;
        }
        self.Container.style.zIndex = self.Options.ZLevel + 2;
        //fade in our window
        SI.Tools.Style.FadeIn(self.Id, 200);
        if (self.Options.Resizable) {
            FixResizers();
        }
    };
    this.Hide = function (fadetime) {
        if (typeof fadetime === 'undefined') {
            fadetime = 250;
        }
        self.Options.OnClose(self);
        SI.Tools.Style.FadeOut(self.Id, fadetime);

        //if theres a modal hide it
        if (self.Options.Modal) {
            SI.Tools.Style.FadeOut('si_window_modal', fadetime);
        }
    };
    this.IsVisible = function () {
        if (self.Container.style.display === "none" || self.Container.style.display === "") {
            return false;
        }
        return true;
    };
    this.Dispose = function () {
        log("disposing window");
        ele = self.Container;
        ele.parentNode.removeChild(ele);
    };
    this.GetHeight = function () {
        return self.Content.offsetHeight;
    };
    this.GetWidth = function () {
        return self.Content.offsetWidth;
    };
    this.Append = function (data) {
        try {
            if (typeof data === "string") {
                self.Content.innerHTML += data;
            }
            else if ( SI.Tools.Is.Element(data) ) {
                self.Content.appendChild(data);
            }
        }
        catch (ex) {
            console.error("Window.Append failed: " + ex);
        }

    };
    this.Prepend = function (data) {
        if (typeof data === "string") {
            let ele = self.Content;
            ele.innerHTML = data + ele.innerHTML;
        } else if (typeof data === "object") {
            self.Content.prepend(data);
        }
    };
    this.GetContentId = function () {
        return self.Content.id;
    };
    this.SetPosition = function (left, top) {
        top = typeof top !== 'undefined' ? top : self.Container.style.top;
        left = typeof left !== 'undefined' ? left : self.Container.style.left;
        self.Container.style.top = parseInt(top) + 'px';
        self.Container.style.left = parseInt(left) + 'px';
    }
    this.Resize = function (callback) {
        //debugger;
        if (typeof callback !== 'undefined') {
            if (typeof callback === "function") {
                callback();
            }
        }
        if (typeof this.Options.Resize === "function") {
            this.Options.Resize(self);
        }
    };

    //debugger;
    //add the class list last as to be the last processed. we want it to override even the defaults
    //at the very end after the element has been created apply the 
    //The container is the outer most edge of the window. It should be invisible
    this.Container = Ele("div", {
        id:this.Id,
        style: {
            zIndex: this.Options.ZLevel + 1,
            position: this.Options.Position,
            width: this.Options.StartWidth,
            height: height + parseInt(this.Options.TitleBarHeight) + "px",
            top: this.Options.StartTop,
            left: this.Options.StartLeft,
            padding: '0px',
            margin: '0px',
            display: 'none',
            boxShadow: this.Options.Shadow,
            pointerEvents: 'auto',
            fontFamily: this.Options.FontFace
        },
        class: "si-window-container"
    });
    container = this.Container;

    //Titlebar
    this.Titlebar = Ele("div", {
        id: this.Id+'_titlebar',
        style: {
            position: 'relative',
            top: '0px',
            left: '0px',
            width: width - 2 + "px",
            height: this.Options.TitleBarHeight,
            cursor: "move",
            border: this.Options.TitleBarBorder,
            borderRadius: this.Options.CornerRadius + " " + this.Options.CornerRadius + ' 0px 0px',
            backgroundColor: this.Options.TitleBarColor,
            borderStyle: 'groove',
        },
        onmousedown: function (e) {
            if (windowState !== "minimized") {
                var winds = document.getElementsByClassName("si-window-container");
                for (let i = 0; i < winds.length; i++) {
                    winds[i].style.zIndex = '980';
                }
                let offY = e.offsetY;
                if (this.parentElement.style.position === 'fixed') {
                    offY += this.scrollHeight;
                }
                dragOffset = [e.offsetX, offY];
                hWinDrag = this.parentElement; //The menubars parent sould always be the container.
                if (hWinDrag) {
                    hWinDrag.style.zIndex = '982';//elevate it to the top most window
                }
            }
            e.preventDefault();
        },
        appendTo: this.Container,
    });

    //Icon
    //on further review there seems to be little difference between IMG and URL
    if (this.Options.HasIcon === "URL") {
        this.Icon = Ele("img", {
            draggable: false,
            src: this.Options.IconUrl,
            style: {
                width: '16px',
                verticalAlign: "middle",
                marginLeft: '7px',
                pointerEvents: 'none',
            },
            appendTo: this.Titlebar,
        });
    }
    else if (this.Options.HasIcon === "IMG") {
        this.Icon = Ele("img", {
            draggable: false,
            src: this.Options.IconImg,
            style: {
                width: '24px',
                verticalAlign: "middle",
                marginLeft: '7px',
                pointerEvents: 'none',
            },
            appendTo: this.Titlebar,
        });
    }
    else if (this.Options.HasIcon === "CHAR") {
        this.Icon = Ele("span", {
            draggable: false,
            innerHTML: "&#" + this.Options.IconChar + ";", //"&#"+this.value+";";
            style: {
                width: '16px',
                verticalAlign: "middle",
                marginLeft: '7px',
                pointerEvents: 'none',
            },
            appendTo: this.Titlebar,
        });
    }

    //Title
    this.Title = Ele("span", {
        id: this.Id + '_titletext',
        innerHTML: this.Options.Title,
        style: {
            color: this.Options.TitleColor,
            fontFamily: this.Options.TitleFontFamily,
            paddingLeft: '10px',
            pointerEvents: 'none',
            userSelect: 'none'
        },
        appendTo: this.Titlebar
    });

    //Statebox for min max close buttons
    this.Statebox = Ele('div', {
        id: this.Id + '_statebox',
        style: {
            float: 'right'
        },
        appendTo: this.Titlebar
    });
    //when the window is minimised and maximized, we need to track what the last windowed dimentions are so that we can return it to its normal state.
    let lastNormalDims = { w: width, h: height, t: this.Container.offsetTop, l: this.Container.offsetLeft };
    //draw the windows controls
    if (this.Options.WindowControls.indexOf("MIN") !== -1 && this.Options.Dockable === true) {
        this.Minimize = Ele("div", {
            id: this.Id + '_minimize',
            innerHTML: this.Options.MinimizeChar,
            style: {
                width: '28px',
                height: '20px',
                color: this.Options.ControlColorMin,
                background: this.Options.ControlBackgroundColorMin,
                display: 'inline-block',
                cursor: 'pointer',
                userSelect: 'none',
                textAlign: 'center',
            },
            onmousedown: function (e) {
                e.stopPropagation();
                if (windowState === 'minimized') {
                    return;
                }
                Minimize();
            },
            appendTo: this.Statebox
        });
    }
    if (this.Options.WindowControls.indexOf("MAX") !== -1) {
        this.Maximize = Ele("div", {
            id: this.Id + '_maximize',
            innerHTML: this.Options.MaximizeChar,
            style: {
                width: '28px',
                height: '20px',
                color: this.Options.ControlColorMax,
                background: this.Options.ControlBackgroundColorMax,
                display: 'inline-block',
                cursor: 'pointer',
                userSelect: 'none',
                textAlign: 'center',
            },
            onmouseup: function (e) {
                e.stopPropagation();
                //debugger
                if (windowState === 'maximized' || windowState === 'minimized') {
                    //if it is already maximized or minimized, change it backto its windowed state
                    windowState = 'normal';
                    Normalize();
                }
                else
                    Maximize();
            },
            appendTo: this.Statebox
        });
    }
    if (this.Options.WindowControls.indexOf("CLOSE") !== -1) {
        this.Close = Ele("div", {
            id: this.Id + '_close',
            innerHTML: this.Options.CloseAppChar,
            style: {
                width: '28px',
                height: '20px',
                color: this.Options.ControlColorClose,
                background: this.Options.ControlBackgroundColorClose,
                display: 'inline-block',
                cursor: 'pointer',
                userSelect: 'none',
                textAlign: 'center',
            },
            onmousedown: function (e) {
                var base = e.target.id.replace('closeApp', 'container');
                self.Hide(options.MinMaxSpeed);
                e.stopPropagation();
            },
            appendTo: this.Statebox
        });
    }
    
    /////////
    //       ONTENT
    /////////
    this.Content = Ele("div", {
        id: this.Id + '_content',
        style: {
            position: 'relative',
            width: 'inherit',
            overflow: 'auto',
            height: height + 'px',
            backgroundColor: this.Options.BackgroundColor,
            borderRadius: ' 0px 0px ' + this.Options.CornerRadius + " " + this.Options.CornerRadius
        },
        appendTo: this.Container
    });
    if (this.Options.Overflow !== "AUTO") {
        switch (this.Options.Overflow.toLowerCase()) {
            case "scroll": this.Content.style.overflow = 'scroll'; break;
            case "hidden": this.Content.style.overflow = 'hidden'; break;
        }
    }

    if (this.Options.Populate) {
        let content = this.Options.Populate();
        this.Content.appendChild(content);
    }


    document.addEventListener('mouseup', function (e) {
        hWinDrag = null;
        dragOffset = null;
        resizeSensor = null;
        startResize = null;
    });
    document.addEventListener('mousemove', function (e) {
        if (hWinDrag) {
            //  let offset = SI.Tools.Positioning.GetDocOffset(hWinDrag);
            if (dragOffset) {
                let X = e.pageX - dragOffset[0];//(e.clientX) - dragOffset[0];
                let Y = e.pageY - dragOffset[1];//(e.clientY) - dragOffset[1];
                if (Y < 0) { Y = 0; } //keep the window from being dragged to high as to not allow recovery of it
                if (X < 0) { X = 0; }
                hWinDrag.style.top = Y + "px";
                hWinDrag.style.left = X + "px";
            }
        }
        if (resizeSensor) {
            let left = parseInt(startResize.left);
            let top = parseInt(startResize.top);
            let width = parseInt(startResize.width);
            let height = parseInt(startResize.height);
            let mouseX = e.pageX;
            let mouseY = e.pageY;
            switch (resizeSensor.id) {
                case  self.Id + "_resizer_topleft":
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    break;
                case self.Id + "_resizer_top":
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    break;
                case self.Id + "_resizer_topright":
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    container.style.width = mouseX - left + "px";
                    break;
                case self.Id + "_resizer_left":
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    break;
                case self.Id + "_resizer_right":
                    container.style.width = mouseX - left + "px";
                    break;
                case self.Id + "_resizer_bottomleft":
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    container.style.height = mouseY - top + "px";
                    break;
                case self.Id + "_resizer_bottom":
                    container.style.height = mouseY - top + "px";
                    break;
                case self.Id + "_resizer_bottomright":
                    container.style.width = mouseX - left + "px";
                    container.style.height = mouseY - top + "px";
                    break;
            }
            //When we resize the window the resizers get all f-ed up. this resets them to the new size of the window
            FixResizers();
            self.Resize();
        }
    });


    let Maximize = function () {
        debugger;
        self.Content.style.display = 'block';
        self.Statebox.style.display = 'inline-block';
        self.Title.style.display = 'inline-block';
        self.Titlebar.title = "";
        let container = self.Container;
        //Record the current demensions for when we normalize
        lastNormalDims.w = container.style.width;
        lastNormalDims.h = container.style.height;
        lastNormalDims.l = container.style.left;
        lastNormalDims.t = container.style.top;
        //Animate the maximize of the window
        container.animate([
            {
                'width': container.style.width,
                'height': container.style.height,
                'top': container.style.top,
                'left': container.style.left,
            }, {
                'width': document.documentElement.clientWidth + 'px',
                'height': document.documentElement.clientHeight + 'px',
                'top': '0px',
                'left': '0px',
            }]
            , options.MinMaxSpeed);
        //then set the actual new demensions
        setTimeout(function () {
            container.style.width = document.documentElement.clientWidth + 'px';
            container.style.height = document.documentElement.clientHeight + 'px';
            container.style.top = '0px';
            container.style.left = '0px';
            FixResizers();
            hWinDrag = null;
            dragOffset = null;
            resizeSensor = null;
            startResize = null;
        }, options.MinMaxSpeed + 5);
        windowState = 'maximized';
    }
    let Normalize = function () {
        self.Content.style.display = 'block';
        self.Statebox.style.display = 'inline-block';
        self.Title.style.display = 'inline-block';
        self.Titlebar.title = "";
        let top = parseInt(self.Container.style.top);
        let left = parseInt(self.Container.style.left);

        if (windowState === 'minimized') {
            //let numDocked = dock.children.length;
            self.Titlebar.style.cursor = "move";
            let numDocked = self.Container.childNumber();
            top = ((parseInt(self.Options.TitleBarHeight) + 4) * numDocked) + dock.offsetTop;
            left = dock.offsetLeft;
            document.getElementById('si_widget_windowpane').appendChild(self.Container);
            self.Titlebar.removeEventListener('click', Normalize);
            if (dock.children.length === 0) {
                SI.Tools.Style.FadeOut(dock);
            }
        }

        self.Container.animate([
            { 
                'width': self.Container.style.width,
                'height': self.Container.style.height,
                'top': top+"px",
                'left': left+"px",
            }, {
                'width': lastNormalDims.w,
                'height': lastNormalDims.h,
                'top': lastNormalDims.t,
                'left': lastNormalDims.l,
            }]
            , options.MinMaxSpeed);
        self.Titlebar.animate([
            {
                'width': "32px",
            }, {
                'width': lastNormalDims.w,
            }]
            , options.MinMaxSpeed);
        setTimeout(function () {
            self.Container.style.position = 'absolute';
            self.Container.style.width = lastNormalDims.w;
            self.Container.style.height = lastNormalDims.h;
            self.Container.style.top = lastNormalDims.t;
            self.Container.style.left = lastNormalDims.l;
            self.Container.style.margin = '';
            FixResizers();
            hWinDrag = null;
            dragOffset = null;
            resizeSensor = null;
            startResize = null;
        }, options.MinMaxSpeed);

        windowState = 'normal';
    }
    let Minimize = function () {
        self.Titlebar.addEventListener('click', Normalize);
        let title = self.Title.innerText;
        self.Titlebar.title = title;

        if (dock.style.display === 'none') {
            SI.Tools.Style.FadeIn(dock);
        }
        dock.style.display = 'block';
        let container = self.Container;
        lastNormalDims.w = container.style.width;
        lastNormalDims.h = container.style.height;
        lastNormalDims.l = container.style.left;
        lastNormalDims.t = container.style.top;


        container.animate([
            { 
                'top': container.style.top,
                'left': container.style.left,
                'width': container.style.width,
                'height': container.style.height
            }, {
                'top': dock.offsetTop+"px",
                'left': dock.offsetLeft + "px",
                'width': "32px",
                'height': self.Options.TitleBarHeight,
            }]
            , options.MinMaxSpeed);

        self.Titlebar.animate([
            {
                'width': self.Titlebar.style.width,
            }, {
                'width': "32px",
            }]
            , options.MinMaxSpeed);
        setTimeout(function () {
            dock.appendChild(container);
            container.style.position = 'relative';
            container.style.top = '0px';
            container.style.left = '0px';
            container.style.width = '32px';
            container.style.margin = '2px';
            container.style.height = self.Options.TitleBarHeight;
            self.Content.style.display = 'none';
            self.Statebox.style.display = 'none';
            self.Title.style.display = 'none';
            FixResizers();
        }, options.MinMaxSpeed +10);
        self.Titlebar.style.cursor = "pointer";
        windowState = 'minimized';
    };

    let FixResizers = function () {
        let tb = document.getElementById(self.Id + "_resizer_top");
        tb.style.width = (parseInt(container.style.width) - cornerDblThickness) + 'px';
        let trb = document.getElementById(self.Id + "_resizer_topright");
        trb.style.left = (parseInt(container.style.width) - cornerThickness) + 'px';
        let lb = document.getElementById(self.Id + "_resizer_left");
        lb.style.height = (parseInt(container.style.height) - cornerDblThickness) + 'px';
        let rb = document.getElementById(self.Id + "_resizer_right");
        rb.style.left = (parseInt(container.style.width) - barThickness) + 'px';
        rb.style.height = (parseInt(container.style.height) - cornerDblThickness) + 'px';
        let blb = document.getElementById(self.Id + "_resizer_bottomleft");
        blb.style.top = (parseInt(container.style.height) - cornerThickness) + 'px';
        let bb = document.getElementById(self.Id + "_resizer_bottom");
        bb.style.width = (parseInt(container.style.width) - cornerDblThickness) + 'px';
        bb.style.top = (parseInt(container.style.height) - barThickness) + 'px';
        let brb = document.getElementById(self.Id + "_resizer_bottomright");
        brb.style.left = (parseInt(container.style.width) - cornerThickness) + 'px';
        brb.style.top = (parseInt(container.style.height) - cornerThickness) + 'px';

        self.Content.style.height = parseInt(container.style.height) - parseInt(options.TitleBarHeight) + 'px';
        self.Titlebar.style.width = parseInt(container.style.width) - 2 + "px";
    };
    let HandleIframes = function () {
        hasIframe = true;
        let blocker = Ele('div', {
            class: "si-window-iframeblocker",
            style: {
                position: 'absolute',
                top: '0px',
                left: '0px',
                height: '100%',
                width: '100%'
            }
        });
        self.Content.parentElement.appendChild(blocker);
    };
    let resizers = {
        topleft: {
            top: '0px',
            left: '0px',
            width: cornerThickness + 'px',
            height: cornerThickness + 'px',
            cursor: "nwse-resize"
        },
        top: {
            top: '0px',
            left: cornerThickness + 'px',
            width: (width - cornerDblThickness) + 'px',
            height: barThickness + 'px',
            cursor: "ns-resize"
        },
        topright: {
            top: '0px',
            left: (width - cornerThickness) + 'px',
            width: cornerThickness + 'px',
            height: cornerThickness + 'px',
            cursor: "nesw-resize"
        },
        left: {
            top: cornerThickness + 'px',
            left: '0px',
            width: barThickness + 'px',
            height: (height - cornerDblThickness) + 'px',
            cursor: "ew-resize"
        },
        right: {
            top: cornerThickness + 'px',
            left: (width - barThickness) + 'px',
            width: barThickness + 'px',
            height: (height - cornerDblThickness) + 'px',
            cursor: "ew-resize"
        },
        bottomleft: {
            top: (height - cornerThickness) + 'px',
            left: '0px',
            width: cornerThickness + 'px',
            height: cornerThickness + 'px',
            cursor: "nesw-resize"
        },
        bottom: {
            top: (height - barThickness) + 'px',
            left: cornerThickness + 'px',
            width: (width - cornerDblThickness) + 'px',
            height: barThickness + 'px',
            cursor: "ns-resize"
        },
        bottomright: {
            top: (height - cornerThickness) + 'px',
            left: (width - cornerThickness) + 'px',
            width: cornerThickness + 'px',
            height: cornerThickness + 'px',
            cursor: "nwse-resize"
        }
    };
    if (this.Options.Resizable) {
        for (let resizer in resizers) {
            let props = resizers[resizer];
            Ele('div', {
                id: this.Id +"_resizer_"+ resizer,
                style: {
                    position: 'absolute',
                    top: props.top,
                    left: props.left,
                    width: props.width,
                    height: props.height,
                    cursor: props.cursor,
                    backgroundColor: this.Options.BorderColor
                },
                onmousedown: function (e) {
                    e.preventDefault();
                    if (hasIframe || document.querySelectorAll('#'+this.Id + ' iframe').length > 0) {
                        HandleIframes();
                    }
                    startResize = { left: container.style.left, top: container.style.top, width: container.style.width, height: container.style.height };
                    resizeSensor = this;
                },
                appendTo: container
            });
        }
    }


    windowdock.appendChild(this.Container);

    //setup trigger
    if (this.Options.Trigger) {
        let triggers = document.querySelectorAll(this.Options.Trigger);
        //debugger;
        if (triggers) {
            for (let trigger of triggers) {
                trigger.addEventListener('click', (e) => {

                    if (self.IsVisible()) {
                        self.Hide();
                        if (windowState = 'minimized') {
                            Normalize();
                        }
                    } else {
                        self.SetPosition(e.x+40, e.y);
                        self.Show();
                    }
                });
            }
        }
    }



    return this;

};

