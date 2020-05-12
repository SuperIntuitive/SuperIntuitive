if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.Map = function (options) {
    if (!(this instanceof SI.Widget.Map)) { return new SI.Widget.Map(); }
    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
        "Container": null,
        "Width": '320',
        "Height":'240',
        "GoogleLink": "https://www.google.com/maps/embed",
        "Frameborder": "0",
        "Border": 0,
        "AllowFullscreen": "",
        "AriaHidden": "false",
        "TabIndex": "0",

    }; 

    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    this.Container = Ele("iframe", {
        width: this.Options.Width,
        height: this.Options.Height,
        src: this.Options.GoogleLink,
        "aria-hidden": this.Options.AriaHidden,
        tabindex: this.Options.TabIndex,
        frameborder:this.Options.Frameborder,
        style: {
            border: this.Options.Border,
        }
    });

    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }
    return this;
}

