if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.Window = function (options) {
    if (!(this instanceof SI.Widget.Window)) { return new SI.Widget.Window(); }
    this.Defaults = {
        "Name": { "value": "Window", "type": "TEXT" },
        "Parent": null,
        "ParentIndex": null,
        "ContainerClass": { "value": "", "type": "CLASS" },
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
        "PreResize": { "value": function () { console.log("Resizing") }, "type": "FUNC" },
        "Resize": { "value": function () { console.log("Resizing") }, "type": "FUNC" },
        "OnLoad": { "value": function () { console.log("OnLoad") }, "type": "FUNC" },
        "Resizable": { "value": true, "type": "BOOL" },
        "Dockable": { "value": true, "type": "BOOL" },
        "ZLevel": { "value": 980, "type": "NUM" },
        "Overflow": { "value": "AUTO", "type": "ENUM", "choices": ["AUTO", "SCROLL", "HIDDEN"] },
        "Position": { "value": "absolute", "type": "ENUM", "choices": ["absolute", "relative", "fixed"] },
        "OnClose": { "value": function () { console.log("Window Closing") }, "type": "FUNC" }, //the window is really only hidden if it has been created and closed. 
        "Modal": { "value": false, "type": "BOOL" },
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    options = this.Options;
    //locals
    //Window Move /Resize
    let hWinDrag = null;
    let dragOffset = null;
    let resizeSensor = null;
    let startResize = null;
    let hasIframe = false;
    //debugger;
    //Make the DOCK. check to see if dock exists. if it does not, and we need it, make it.
    let windowpane = document.getElementById('si_widget_windowpane');
    if (!windowpane){
        windowpane =Ele("div", {
            id: 'si_widget_windowpane',
            style: {
                position: "absolute",
                top: '0px',
                left: '0px',
                width: '100%',
                height: '100%',
                display: 'block',
                pointerEvents: 'none',
            },
            appendTo: "body",
        });
    }

    if (this.Options.Dockable) {
        let doc = document.getElementById('si_window_dock');
        if (!doc) {
            doc = Ele("div", {
                id: 'si_window_dock',
                style: {
                    position: "fixed",
                    top: '20%',
                    left: '12px',
                    width: '32px',
                    height: '60%',
                    border: "1px dotted black",
                    backgroundColor: "rgba(255,255,255,0.1)",
                    display: 'none' //only display if there is at least one window minimized
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
                    backgroundColor: "rgba(255,255,255,0.9)",
                },
                appendTo: "body",
            });
        }
        modal.style.display = 'block';
    }
    this.Random = SI.Tools.String.RandomString(11);
    let randId = this.Random;
    let windowState = 'normal';
    //this can be used al init time only, not in 
    let width = parseInt(this.Options.StartWidth);
    let height = parseInt(this.Options.StartHeight);
    let loaded = false;

    //Member Functions
    this.Show = function (fadetime) {
        if (loaded === false) {
            this.Options.OnLoad();
            loaded = true;
        }
        if (typeof (fadetime) === 'undefined') {
            fadetime = this.Options.MinMaxSpeed;
        }
        //if theres a modal close it
        if (this.Options.Modal) {
            SI.Tools.Style.FadeIn('si_window_modal', fadetime);
        }
        //Drop all windows to default z index
        var winds = document.getElementsByClassName("si-window-container");
        for (var i = 0; i < winds.length; i++) {
            winds[i].style.zIndex = this.Options.ZLevel;
        }
        //fade in our window
        SI.Tools.Style.FadeIn('si_window_container_' + this.Random, 200);

        if (this.Options.Resizable) {
            FixResizers();
        }

    };
    this.Hide = function (fadetime) {
        if (typeof fadetime === 'undefined') {
            fadetime = 250;
        }
        this.Options.OnClose();
        SI.Tools.Style.FadeOut('si_window_container_' + randId, fadetime);

        //if theres a modal close it
        if (this.Options.Modal) {
            SI.Tools.Style.FadeOut('si_window_modal', fadetime);
        }
    };
    this.IsVisible = function () {
        container = document.getElementById('si_window_container_' + this.Random);
        if (container.style.display === "none" || container.style.display === "") {
            return false;
        }
        return true;
    };
    this.Dispose = function () {
        log("disposing window");
        ele = document.getElementById('si_window_content_' + randId); //this should be container
        ele.parentNode.removeChild(ele);
    };
    this.GetHeight = function () {
        return document.getElementById('si_window_content_' + randId).offsetHeight;
    };
    this.GetWidth = function () {
        return document.getElementById('si_window_content_' + randId).offsetWidth;
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
            let ele = document.getElementById('si_window_content_' + randId);
            ele.innerHTML = data + ele.innerHTML;
        } else if (typeof data === "object") {
            document.getElementById('si_window_content_' + randId).prepend(data);
        }
    };
    this.GetContentId = function () {
        return document.getElementById('si_window_content_' + randId);
    };
    this.SetPosition = function (left, top) {
        top = typeof top !== 'undefined' ? top : container.style.top;
        left = typeof left !== 'undefined' ? left : container.style.left;
        if (typeof top === 'number') {
            document.getElementById(container.id).style.top = top + 'px';
            document.getElementById(container.id).style.left = left + 'px';
        } else {
            document.getElementById(container.id).style.top = top;
            document.getElementById(container.id).style.left = left;
        }
    }
    //me thinks this will allow the user to add a callback win.Resize(callback) or even assign over this function win.Resize = 
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
    let self = this; //allows us to call our own function in events
    //debugger;
    //add the class list last as to be the last processed. we want it to override even the defaults
    //at the very end after the element has been created apply the 
    //The container is the outer most edge of the window. It should be invisible
    this.Container = Ele("div", {
        name: this.Options.Name,
        id: 'si_window_container_' + randId,
        data: {
            name: this.Options.Name,
        },
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
            pointerEvents: 'auto'
        },
        class: "si-window-container"
    });
    let container = this.Container;
    //add a class if desired
    if (this.Options.ContainerClass.length > 0) {
        container.classList.add(this.Options.ContainerClass);
    }
    //Titlebar
    this.Titlebar = Ele("div", {
        id: 'si_window_titlebar_' + randId,
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
            //debugger;
            var winds = document.getElementsByClassName("si-window-container");
            for (var i = 0; i < winds.length; i++) {
                winds[i].style.zIndex = '980';
            }
            let offY = e.offsetY;
            if (this.parentElement.style.position == 'fixed') {
                offY += this.scrollHeight;
            }
            dragOffset = [e.offsetX, offY];
            hWinDrag = this.parentElement; //The menubars parent sould always be the container.
            if (hWinDrag) {
                hWinDrag.style.zIndex = '981';//elevate it to the top most window
            }
            e.preventDefault();
        },
        appendTo: this.Container,
    });

    //Icon
    //on further review there seems to be little difference between IMG and URL
    if (this.Options.HasIcon === "URL") {
        Ele("img", {
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
        Ele("img", {
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
        Ele("span", {
            draggable: false,
            innerHTML: "&#" + this.Options.IconChar + ";", //"&#"+this.value+";";
            style: {
                width: '16px',
                verticalAlign: "middle",
                marginLeft: '7px',
                marginTop: '-1px',
                pointerEvents: 'none',
            },
            appendTo: this.Titlebar,
        });
    }
    //The title of the Window
    this.Title = Ele("span", {
        id: 'si_window_titletext_' + randId,
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
    //a container fot the min/max buttons
    let statebox = Ele('div', {
        id: 'si_window_statebox_' + randId,
        style: {
            float: 'right'
        },
        appendTo: this.Titlebar
    });
    //when the window is minimised and maximised, we need to track where to return it too. Here:
    let lastNormalDims = { w: width, h: height, t: container.top, l: container.left };
    //draw the windows controls
    if (this.Options.WindowControls.indexOf("MIN") !== -1 && this.Options.Dockable === true) {
        let min = Ele("div", {
            id: 'si_window_minimize_' + randId,
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
                    return;//were already minimised. this should never happen anyway.
                }
                Minimize(this);
            },
            appendTo: statebox
        });
    }
    if (this.Options.WindowControls.indexOf("MAX") !== -1) {
        let max = Ele("div", {
            id: 'si_window_maximize_' + randId,
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
                if (windowState === 'maximised' || windowState === 'minimized') {
                    //if it is already maximised or minimized, change it backto its windowed state
                    windowState = 'normal';
                    Normalize(this);
                }
                else
                    Maximize(this);
            },
            appendTo: statebox,
        });
    }
    if (this.Options.WindowControls.indexOf("CLOSE") !== -1) {
        let max = Ele("div", {
            id: 'si_window_closeApp_' + randId,
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
            appendTo: statebox
        });
    }
    
    /////////
    //       ONTENT
    /////////
    this.Content = Ele("div", {
        id: 'si_window_content_' + randId,
        style: {
            position: 'relative',
            width: 'inherit',
            overflow: 'auto',
            height: height + 'px',
            backgroundColor: this.Options.BackgroundColor,
            borderRadius: ' 0px 0px ' + this.Options.CornerRadius + " " + this.Options.CornerRadius
        },
        appendTo: this.Container,
    });
    if (this.Options.Overflow !== "AUTO") {
        switch (this.Options.Overflow) {
            case "scroll":
            case "SCROLL": this.Content.style.overflow = 'scroll'; break;
            case "hidden":
            case "HIDDEN": this.Content.style.overflow = 'hidden'; break;
        }
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
            var left = parseInt(startResize.left);
            var top = parseInt(startResize.top);
            var width = parseInt(startResize.width);
            var height = parseInt(startResize.height);
            var mouseX = e.pageX;
            var mouseY = e.pageY;
            switch (resizeSensor.id) {
                case 'si_window_topLeftResize_' + randId:
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    break;
                case 'si_window_topResize_' + randId:
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    break;
                case 'si_window_topRightResize_' + randId:
                    container.style.top = mouseY + "px";
                    container.style.height = height + top - mouseY + "px";
                    container.style.width = mouseX - left + "px";
                    break;
                case 'si_window_leftResize_' + randId:
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    break;
                case 'si_window_rightResize_' + randId:
                    container.style.width = mouseX - left + "px";
                    break;
                case 'si_window_bottomLeftResize_' + randId:
                    container.style.left = mouseX + "px";
                    container.style.width = width + left - mouseX + "px";
                    container.style.height = mouseY - top + "px";
                    break;
                case 'si_window_bottomResize_' + randId:
                    container.style.height = mouseY - top + "px";
                    break;
                case 'si_window_bottomRightResize_' + randId:
                    container.style.width = mouseX - left + "px";
                    container.style.height = mouseY - top + "px";
                    break;
            }
            //When we resize the window the resizers get all f-ed up. this resets them to the new size of the window
            FixResizers();
            self.Resize();

        }
    });
    //debugger;
    let barThickness = parseInt(self.Options.ResizeThickness);
    let cornerThickness = barThickness + 1;
    let cornerDblThickness = cornerThickness * 2;

    let FixResizers = function () {
        //debugger;
        //Fix top bar
        let tb = document.getElementById('si_window_topResize_' + randId);
        tb.style.width = (parseInt(container.style.width) - cornerDblThickness) + 'px';
        //Fix top right box
        let trb = document.getElementById('si_window_topRightResize_' + randId);
        trb.style.left = (parseInt(container.style.width) - cornerThickness) + 'px';
        //Fix left bar
        let lb = document.getElementById('si_window_leftResize_' + randId);
        lb.style.height = (parseInt(container.style.height) - cornerDblThickness) + 'px';
        //Fix right bar
        let rb = document.getElementById('si_window_rightResize_' + randId);
        rb.style.left = (parseInt(container.style.width) - barThickness) + 'px';
        rb.style.height = (parseInt(container.style.height) - cornerDblThickness) + 'px';
        //Fix bottom left box
        let blb = document.getElementById('si_window_bottomLeftResize_' + randId);
        blb.style.top = (parseInt(container.style.height) - cornerThickness) + 'px';
        //Fix bottom bar
        let bb = document.getElementById('si_window_bottomResize_' + randId);
        bb.style.width = (parseInt(container.style.width) - cornerDblThickness) + 'px';
        bb.style.top = (parseInt(container.style.height) - barThickness) + 'px';
        //Fix bottom right box
        let brb = document.getElementById('si_window_bottomRightResize_' + randId);
        brb.style.left = (parseInt(container.style.width) - cornerThickness) + 'px';
        brb.style.top = (parseInt(container.style.height) - cornerThickness) + 'px';

        //debugger;

        //let content = document.getElementById('si_window_content_' + randId);
        self.Content.style.height = parseInt(container.style.height) - parseInt(options.TitleBarHeight) + 'px';
        //let titlebar = document.getElementById('si_window_titlebar_' + randId);
        self.Titlebar.style.width = parseInt(container.style.width) - 2 + "px";
    };
    let Maximize = function (self) {
        let rand = self.id.replace("si_window_maximize_", "");
        let statebox = document.getElementById('si_window_minimize_' + rand).style.display = 'inline-block';
        let title = document.getElementById('si_window_titletext_' + rand).style.display = 'inline-block';
        let contents = document.getElementById('si_window_content_' + rand).style.display = 'block';

        let container = document.getElementById('si_window_container_' + rand);

        lastNormalDims.w = container.style.width;
        lastNormalDims.h = container.style.height;
        lastNormalDims.l = container.style.left;
        lastNormalDims.t = container.style.top;

        container.animate([
            { //from
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
        windowState = 'maximised';
    }
    let Normalize = function (self) {
        let rand = self.id.replace("si_window_minimize_", "");
        rand = self.id.replace("si_window_maximize_", "");
        let statebox = document.getElementById('si_window_minimize_' + rand).style.display = 'inline-block';
        let title = document.getElementById('si_window_titletext_' + rand).style.display = 'inline-block';
        let contents = document.getElementById('si_window_content_' + rand).style.display = 'block';

        let container = document.getElementById('si_window_container_' + rand);
        /*alert(
            lastNormalDims.w +
            lastNormalDims.h +
            lastNormalDims.t +
            lastNormalDims.l);
        */

        container.animate([
            { //from
                'width': container.style.width,
                'height': container.style.height,
                'top': container.style.top,
                'left': container.style.left,
            }, {
                'width': lastNormalDims.w,
                'height': lastNormalDims.h,
                'top': lastNormalDims.t,
                'left': lastNormalDims.l,
            }]
            , options.MinMaxSpeed);
        setTimeout(function () {
            container.style.width = lastNormalDims.w;
            container.style.height = lastNormalDims.h;
            container.style.top = lastNormalDims.t;
            container.style.left = lastNormalDims.l;
            FixResizers();
            hWinDrag = null;
            dragOffset = null;
            resizeSensor = null;
            startResize = null;
        }, options.MinMaxSpeed + 5);
        windowState = 'normal';
    }
    let Minimize = function (self) {
        //hide elements for minimise
        let rand = self.id.replace("si_window_minimize_", "");
        let statebox = document.getElementById('si_window_minimize_' + rand).style.display = 'none';
        let title = document.getElementById('si_window_titletext_' + rand).style.display = 'none';
        let contents = document.getElementById('si_window_content_' + rand).style.display = 'none';

        let container = document.getElementById('si_window_container_' + rand);

        lastNormalDims.w = container.style.width;
        lastNormalDims.h = container.style.height;
        lastNormalDims.l = container.style.left;
        lastNormalDims.t = container.style.top;

        container.animate([
            { //from
                'width': container.style.width,
                'height': container.style.height,
            }, {
                'width': "84px",
                'height': "32px",
            }]
            , options.MinMaxSpeed);
        setTimeout(function () {
            container.style.width = '84px';
            container.style.height = '32px';
            FixResizers();
        }, options.MinMaxSpeed);
        windowState = 'minimized';
    };
    let HandleIframes = function () {
        hasIframe = true;
        cont = document.getElementById('si_window_content_' + randId);

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
        cont.parentElement.appendChild(blocker);

    };
    let resizers = {
        topLeft: {
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
        topRight: {
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
        bottomLeft: {
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
        bottomRight: {
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
                id: "si_window_" + resizer + 'Resize_' + randId,
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
                    if (hasIframe || document.querySelectorAll('#si_window_content_' + randId + ' iframe').length > 0) {
                        HandleIframes();
                    }
                    startResize = { left: container.style.left, top: container.style.top, width: container.style.width, height: container.style.height };
                    resizeSensor = this;
                },
                appendTo: container
            });
        }
    }

    //if (this.Options.Parent) {
    //    this.Options.Parent.appendChild(this.Container);
    //}
    windowpane.appendChild(this.Container);
    return this;

};

