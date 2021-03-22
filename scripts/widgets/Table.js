if(!SI.Widgets.Table){SI.Widgets.Table = {}};
SI.Widget.Table = function  (options) { 
    if (!(this instanceof SI.Widget.Table)) { return new SI.Widget.Table(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Table");}
    this.Input = {...options};
    SI.Widgets.Table[this.Id] = this;

    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
    };

    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    this.Container = Ele("table", {
        id: this.Id, 
        class: "si-widget",
        style: {
            width: '100%',
            height: '100%',
            backgroundColor: 'green'
        }
    });
    for (let i = 0; i < 12; i++) {
        let r = document.createElement('tr');
        r.id = 'si_row_' + i + '_' + this.Random;
        for (let j = 0; j < 12; j++) {
            let c = document.createElement('td');
            c.id = 'si_' + i + '_' + j + '_' + this.Random;

            r.appendChild(c);
        }
        this.Container.appendChild(r);
    }
    if (this.Options.Parent) {
        this.Options.Parent.appendChild(container);
    }
    return this.Container;
};