if (!SI.Widgets.Table) SI.Widgets.Table = {};
SI.Widget.Table = function (options) {
    if (!(this instanceof SI.Widget.Table)) return new SI.Widget.Table(options);
    SI.Widget.Table.Build(this, options || {});
    SI.Widgets.Table[this.Id] = this;
    return this.Container;
};
// DataGrid uses the same renderer so cells, sorting and selection stay consistent.
SI.Widget.Table.Build = function (instance, options) {
    instance.Id = options.Id || SI.Tools.Element.SafeId('Table'); instance.Input = {...options};
    instance.Defaults = {Parent: null, Columns: [], Rows: [], Caption: '', EmptyText: 'No records yet', Sortable: false, Selectable: false, OnSelect: null, Width: '100%', Height: 'auto'};
    instance.Options = SI.Tools.Object.SetDefaults(options, instance.Defaults);
    instance.Container = Ele('table', {id: instance.Id, class: 'si-widget si-widget-table', style: {width: instance.Options.Width}});
    const table = instance.Container;
    let rows = instance.Options.Rows.slice(), selected = null, sort = null, direction = 1;
    instance.SetData = function (data, columns) { rows = data.slice(); if (columns) instance.Options.Columns = columns; selected = null; render(); };
    instance.GetSelectedRow = () => selected;
    instance.SelectRow = function (row, event) {
        selected = row;
        for (const element of table.querySelectorAll('tbody tr[data-row]')) element.setAttribute('aria-selected', String(rows[Number(element.dataset.row)] === row));
        if (instance.Options.OnSelect) instance.Options.OnSelect(row, event);
        table.dispatchEvent(new CustomEvent('rowselect', {bubbles: true, detail: row}));
    };
    const render = () => {
        table.replaceChildren();
        if (instance.Options.Caption) table.createCaption().textContent = instance.Options.Caption;
        let columns = instance.Options.Columns.length ? instance.Options.Columns : rows.length ? Object.keys(rows[0]) : [];
        columns = columns.map((column, index) => typeof column === 'string' ? {Key: column, Label: column} : Object.assign({Key: index, Label: String(index + 1)}, column));
        const head = table.createTHead().insertRow();
        for (const column of columns) {
            const cell = Ele('th', {scope: 'col', appendTo: head});
            const key = column.Key ?? column.name; const label = column.Label ?? column.label ?? key;
            if (instance.Options.Sortable) {
                cell.setAttribute('aria-sort', sort === key ? direction === 1 ? 'ascending' : 'descending' : 'none');
                Ele('button', {type: 'button', innerText: label, onclick: () => {
                    direction = sort === key ? -direction : 1; sort = key;
                    rows.sort((a,b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), undefined, {numeric: true}) * direction); render();
                }, appendTo: cell});
            } else cell.textContent = label;
        }
        const body = table.createTBody();
        if (!rows.length) {
            const row = body.insertRow(); const cell = row.insertCell(); cell.colSpan = Math.max(columns.length,1); cell.className = 'si-widget-empty'; cell.textContent = instance.Options.EmptyText;
        }
        rows.forEach((record, index) => {
            const row = body.insertRow(); row.dataset.row = index;
            if (instance.Options.Selectable) {
                row.tabIndex = index ? -1 : 0; row.setAttribute('aria-selected', String(record === selected));
                row.addEventListener('click', event => instance.SelectRow(record,event));
                row.addEventListener('keydown', event => {
                    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); instance.SelectRow(record,event); }
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); const next = event.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling; if (next) { row.tabIndex=-1; next.tabIndex=0; next.focus(); } }
                });
            }
            for (const column of columns) {
                const cell = row.insertCell(); const value = record[column.Key ?? column.name]; cell.textContent = value == null ? '' : String(value);
            }
        });
    };
    instance.Render = render; render(); if (instance.Options.Parent) instance.Options.Parent.appendChild(table);
};
