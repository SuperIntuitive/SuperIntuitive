if (!SI.Widgets.DataGrid) SI.Widgets.DataGrid = {};
SI.Widget.DataGrid = function (options) {
    if (!(this instanceof SI.Widget.DataGrid)) return new SI.Widget.DataGrid(options);
    options = Object.assign({Sortable: true, Selectable: true}, options || {});
    SI.Widget.Table.Build(this, options);
    this.Container.classList.add('si-widget-datagrid');
    SI.Widgets.DataGrid[this.Id] = this;
    return this;
};
