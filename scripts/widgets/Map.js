<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>



SI.Widget.Map = function (options) {
    if (!(this instanceof SI.Widget.Map)) { return new SI.Widget.Map(); }
    this.Input = options;
    if ("Id" in options) {
        this.Id = options.Id;
    } else {
        this.Id = SI.Tools.Element.SafeId("map");
    }

    this.Defaults = {
        "Parent": {"value": null, "type": "attr.parentElement", "effect": this.Id},
        "Position": { "value":"absolute", "type": "style.position","effect": this.Id},
        "Display": {"value":"block", "type":"style.display","effect": this.Id},
        "Width": {"value":"320px", "type":"style.width", "effect": this.Id},
        "Height": {"value":"240px", "type":"style.height", "effect": this.Id },
        "Top": {"value": "0px", "type": "style.top", "effect": this.Id},
        "Left": {"value": "0px", "type": "style.left","effect": this.Id},
        "GoogleLink": {
            "value": "https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d28078.82324487119!2d-81.57531871963056!3d28.393510428748897!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sus!4v1589306972461!5m2!1sen!2sus",
            "type": "attr.url", "effect": this.Id },
        "Frameborder": { "value": "0", "type": "attr.INT", "effect": this.Id },
        "Border": { "value": "0", "type": "style.border", "effect": this.Id },
        "AllowFullscreen": { "value": "", "type": "attr.ATTRIBUTE", "effect": this.Id },
        "AriaHidden": { "value": false, "type": "attr.BOOL", "effect": this.Id },
        "TabIndex": { "value": "0", "type": "attr.INT", "effect": this.Id
        }
    }; 

   // debugger;

    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    //for event handelers
    options = this.Options;

    this.Container = Ele("iframe", {
        id: this.Id,
        class: "si-widget si-widget-map",
        style: {
            position: this.Options.Position,
            display:this.Options.Display,
            width: this.Options.Width,
            height: this.Options.Height,
            top: this.Options.Top,
            left: this.Options.Left,
            border: this.Options.Border,
        },
        src: this.Options.GoogleLink,
        "aria-hidden": this.Options.AriaHidden,
        tabindex: this.Options.TabIndex,
        frameborder: this.Options.Frameborder,
        allowfullscreen: this.Options.AllowFullscreen,
    });

    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    } else {
        this.Container = null;
    }

    return this;
}

