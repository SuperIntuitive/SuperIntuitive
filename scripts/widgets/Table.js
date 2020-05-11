if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.Table = function (options) {
    if (!(this instanceof SI.Widget.Table)) { return new SI.Widget.Table(); }
    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
    };

    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.Random = SI.Tools.String.RandomString(11);

    this.Container = Ele("table", {
        id: "si_datagrid_" + this.Random,
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
    return this;
};