<?php 
header("Content-Type: application/javascript; charset: UTF-8");
$widgetType = "Template";
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
            "Parent": { "value": null, "type": "attr.parentElement", "effect": this.Id },
            "Position": { "value": "absolute", "type": "style.position", "effect": this.Id },
            "Display": { "value": "block", "type": "style.display", "effect": this.Id },
            "Width": { "value": "320px", "type": "style.width", "effect": this.Id },
            "Height": { "value": "240px", "type": "style.height", "effect": this.Id },
            "Top": { "value": "0px", "type": "style.top", "effect": this.Id },
            "Left": { "value": "0px", "type": "style.left", "effect": this.Id },
            "BackgroundColor": { 'value': "green", 'type': "style.background-color", "effect": this.Id },
            "Border": { "value": "0", "type": "style.border", "effect": this.Id },
            "TabIndex": {
                "value": "0", "type": "attr.INT", "effect": this.Id
            }
        };
        //debugger;
        this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
        //for event handelers
        options = this.Options;

        this.Container = Ele("div", {
            id: this.Id,
            class: "si-widget si-widget-<?= $widgetType ?>",
            style: {
                position: this.Options.Position,
                display: this.Options.Display,
                backgroundColor: this.Options.BackgroundColor,
                width: this.Options.Width,
                height: this.Options.Height,
                top: this.Options.Top,
                left: this.Options.Left,
                border: this.Options.Border
            },
            onclick: function () {
               let creating = browser.windows.create();
            },
            tabindex: this.Options.TabIndex,
            appendTo: this.Options.Parent
        });

        return this;
    }

