
SI.Editor.Objects.Widgets = {
    Draw: function () {
        let base = Ele('div', {
            style: {
                width: "100%",
                height: "100%",
                backgroundColor: '#111',
                overflow: "scroll",
                color: SI.Editor.Style.TextColor,
            },
        });

        let tabs = new SI.Widget.Tab();
        tabs.Items.Add("Existing", SI.Editor.Objects.Widgets.Existing());
        tabs.Items.Add("Editor", SI.Editor.Objects.Widgets.Editor());
        base.appendChild(tabs.Draw());


        SI.Editor.UI.Widgets.Window.Append(base);
    },



    Editor: function () {
        let container = Ele("div", {});

        let widgetselector = Ele('select', {
            onchange: function (ev) {
                let widget = new SI.Widget[this.value]();
                let tree = SI.Tools.Object.ToDataTree(widget.Defaults);
                let optbox = document.getElementById("si_edit_widgets_optionsedit");
                optbox.innerHTML = "";
                optbox.appendChild(tree);
            },
            appendTo: container
        });

        let widgets = SI.Widget;
        for (let widget in widgets) {
            Ele('option', {
                innerHTML: widget,
                appendTo: widgetselector
            });
        }

        let optionsedit = Ele("div", {
            id: "si_edit_widgets_optionsedit",
            appendTo: container
        });
        return container;
    },




    Existing: function () {
        let container = Ele("div", {});


        return container;
    },

}