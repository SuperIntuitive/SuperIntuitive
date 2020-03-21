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
        "GoogleLink": "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3177.167267579618!2d-121.9833406484534!3d37.22000397976558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x808e35e353b864eb%3A0xfbf26268b4695c68!2s35%20College%20Ave%2C%20Los%20Gatos%2C%20CA%2095030!5e0!3m2!1sen!2sus!4v1584500054599!5m2!1sen!2sus",
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

