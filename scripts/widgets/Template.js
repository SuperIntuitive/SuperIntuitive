if(!SI.Widgets.Template){SI.Widgets.Template = {}};
SI.Widget.Template = function  (options) { 
    if (!(this instanceof SI.Widget.Template)) { return new SI.Widget.Template(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Template");}
    this.Input = {...options};
    SI.Widgets.Template[this.Id] = this;

    this.Defaults = {
        "Parent": { "value": null, "type": "attr.parentElement", "affected": '#'+this.Id  },
        "Position": { "value": "absolute", "type": "style.position", "affected": '#'+this.Id  },
        "Display": { "value": "block", "type": "style.display", "affected": '#'+this.Id  },
        "Width": { "value": "320px", "type": "style.width", "affected": '#'+this.Id  },
        "Height": { "value": "240px", "type": "style.height", "affected": '#'+this.Id  },
        "Top": { "value": "0px", "type": "style.top", "affected": '#'+this.Id  },
        "Left": { "value": "0px", "type": "style.left", "affected": '#'+this.Id  },
        "BackgroundColor": { 'value': "green", 'type': "style.background-color", "affected": '#'+this.Id  },
        "Border": { "value": "0", "type": "style.border", "affected": '#'+this.Id  },
        "TabIndex": { "value": "0", "type": "attr.tabindex", "affected": '#'+this.Id  }
    };
    //debugger;
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    //for event handelers
    options = this.Options;


    this.Container = Ele("div", {
        id: this.Id,
        class: "si-widget si-widget-template",
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

        tabindex: this.Options.TabIndex,
    });


    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }

    return this;
}

