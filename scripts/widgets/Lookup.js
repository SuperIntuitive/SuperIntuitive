/* Record lookup: the selected value is a reference, never unresolved free text. */
if (!SI.Widgets.Lookup) SI.Widgets.Lookup = {};
SI.Widget.Lookup = function (options) {
    if (!(this instanceof SI.Widget.Lookup)) return new SI.Widget.Lookup(options);
    options = options || {};
    const standalone = options.Parent || options.Standalone || options.SIWidgetInstance || options.SIWidgetPreview;
    this.Id = options.Id || SI.Tools.Element.SafeId(standalone ? 'LookupField' : 'LookupService');
    if (standalone && this.Id === 'Lookup') throw new Error('Lookup is reserved for the shared lookup controller. Use another widget ID.');
    this.Input = {...options};
    this.Defaults = {Parent: null, ParentIndex: null, EntityName: 'pages', Entities: null, DisplayColumn: null, SearchColumns: null, Columns: null, Filters: {}, View: 'active', Value: null, Multiple: false, Placeholder: 'Look for a record…', Label: 'Record', Width: '320px', Height: 'auto', Disabled: false, ReadOnly: false, Required: false, OnChange: null, OnOpen: null, OnCreate: null, Provider: null};
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    SI.Widgets.Lookup[this.Id] = this;
    this.LookupWindow = null;
    this.Fields = new Set();
    if (standalone) {
        this.Container = Ele('div', {id: this.Id, class: 'si-widget si-widget-lookup'});
        const label = Ele('label', {innerText: this.Options.Label, for: this.Id + '_input', appendTo: this.Container});
        if (!this.Options.Label) label.hidden = true;
        this.Field = Ele('input', {id: this.Id + '_input', type: 'lookup', placeholder: this.Options.Placeholder, appendTo: this.Container});
        this.Field.disabled = this.Options.Disabled; this.Field.readOnly = this.Options.ReadOnly; this.Field.required = this.Options.Required;
        this.Init(this.Field, this.Options);
        if (this.Options.OnChange) this.Field.addEventListener('change', event => this.Options.OnChange(event, this.Field));
        if (this.Options.Value) this.SetValue(this.Field, this.Options.Value, false);
        if (this.Options.Parent) this.Options.Parent.appendChild(this.Container);
    }
};
SI.Widget.Lookup.Fields = new WeakMap();
SI.Widget.Lookup.Recent = new Map();
SI.Widget.Lookup.prototype = {
    constructor: SI.Widget.Lookup,
    CheckLookups: function () {
        for (const input of document.querySelectorAll('input[type="lookup"]')) if (!SI.Widget.Lookup.Fields.has(input)) this.Init(input);
    },
    Init: function (input, overrides) {
        if (SI.Widget.Lookup.Fields.has(input)) return SI.Widget.Lookup.Fields.get(input);
        if (!input.id) input.id = SI.Tools.Element.SafeId('LookupField');
        const options = Object.assign({}, this.Options, overrides || {});
        options.EntityName = input.dataset.type || options.EntityName;
        options.DisplayColumn = input.dataset.column || input.dataset.displayColumn || options.DisplayColumn;
        if (input.dataset.searchColumns) options.SearchColumns = input.dataset.searchColumns.split(',').map(value => value.trim());
        if (input.dataset.multiple === 'true') options.Multiple = true;
        input.dataset.type = options.EntityName;
        input.dataset.stage = 'ready';
        input.autocomplete = 'off'; input.spellcheck = false;
        const oldList = input.list;
        input.removeAttribute('list'); if (oldList) oldList.remove();
        const control = input.closest('.si-lookup-control') || document.createElement('div');
        if (!control.classList.contains('si-lookup-control')) {
            control.className = 'si-lookup-control'; input.parentNode.insertBefore(control, input); control.appendChild(input);
        } else for (const child of Array.from(control.children)) if (child !== input) child.remove();
        const chips = Ele('div', {class: 'si-lookup-chips', appendTo: control}); control.insertBefore(chips, input);
        const browse = Ele('button', {type: 'button', class: 'si-lookup-browse', innerText: '⌕', title: 'Search records', appendTo: control});
        browse.setAttribute('aria-label', 'Search records');
        const state = {manager: this, input, control, chips, browse, options, currentEntity: options.EntityName, preSearch: new Set(), required: input.required, selection: [], records: [], active: -1, requests: {}, view: options.View, destroyed: false, entities: options.Entities || [options.EntityName]};
        const initial = input.dataset.guid;
        if (initial && /^(?:0x)?[a-f0-9]{32}$/i.test(initial)) state.selection = [{id: this.Guid(initial), entityType: options.EntityName, name: input.value, fields: {}}];
        SI.Widget.Lookup.Fields.set(input, state); this.Fields.add(state);
        input.Lookup = {
            getValue: () => this.GetValue(input), setValue: value => this.SetValue(input, value),
            setFilter: filters => { state.options.Filters = filters; },
            addCustomFilter: filters => { state.options.Filters = Object.assign({}, state.options.Filters, filters); },
            addPreSearch: callback => state.preSearch.add(callback), removePreSearch: callback => state.preSearch.delete(callback),
            openAdvanced: () => this.OpenAdvanced(state), clear: () => this.Commit(state, [])
        };
        input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
        if (!input.hasAttribute('aria-label') && !input.labels.length) input.setAttribute('aria-label', options.Label || 'Look for a record');
        const signal = (state.events = new AbortController()).signal;
        input.addEventListener('input', () => {
            if (!options.Multiple) state.selection = [];
            this.Sync(state); clearTimeout(state.timer);
            state.timer = setTimeout(() => this.Search(state), 180);
        }, {signal});
        input.addEventListener('focus', () => { if (!state.selection.length || options.Multiple) this.Search(state); }, {signal});
        input.addEventListener('keydown', event => {
            if (event.key === 'Escape') { this.Close(state); return; }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                if (!state.popup || state.popup.hidden) { this.Search(state); return; }
                const count = state.records.length;
                if (count) { state.active = (state.active + (event.key === 'ArrowDown' ? 1 : -1) + count) % count; this.Highlight(state); }
            } else if (event.key === 'Enter' && state.popup && !state.popup.hidden) {
                event.preventDefault();
                if (state.active >= 0 && state.records[state.active]) this.Choose(state, state.records[state.active]);
                else this.Resolve(state);
            } else if (event.key === 'Backspace' && options.Multiple && !input.value && state.selection.length) this.Commit(state, state.selection.slice(0, -1));
        }, {signal});
        input.addEventListener('blur', () => { state.blurTimer = setTimeout(() => { if (!state.control.contains(document.activeElement) && !state.popup?.contains(document.activeElement)) { this.Resolve(state); this.Close(state); } }, 130); }, {signal});
        input.addEventListener('change', () => {
            if (!options.Multiple && state.selection.length && input.value !== state.selection[0].name) { state.selection = []; this.Sync(state); }
        }, {signal});
        browse.addEventListener('click', () => { input.hidden = false; input.value = ''; input.focus(); this.Search(state, true); }, {signal});
        document.addEventListener('pointerdown', event => { if (!control.contains(event.target) && !state.popup?.contains(event.target)) this.Close(state); }, {signal});
        window.addEventListener('resize', () => this.Position(state), {signal});
        document.addEventListener('scroll', () => this.Position(state), {signal, capture: true});
        this.Sync(state); return state;
    },
    Guid: function (id) { return '0x' + String(id).replace(/^0x/i, '').toLowerCase(); },
    State: function (input) { return SI.Widget.Lookup.Fields.get(input || this.Field); },
    GetValue: function (input) {
        const state = this.State(input); if (!state) return null;
        const values = state.selection.map(record => ({id: record.id, entityType: record.entityType, name: record.name}));
        return state.options.Multiple ? values : values[0] || null;
    },
    SetValue: function (input, value, notify = true) {
        if (!(input instanceof HTMLInputElement)) { notify = value === undefined ? true : value; value = input; input = this.Field; }
        const state = this.State(input); if (!state) return;
        const values = value == null ? [] : Array.isArray(value) ? value : [value];
        const records = values.map(record => {
            if (!record || !/^(?:0x)?[a-f0-9]{32}$/i.test(record.id || '') || !state.entities.includes(record.entityType || state.options.EntityName)) throw new Error('Invalid lookup reference');
            return {id: this.Guid(record.id), entityType: record.entityType || state.options.EntityName, name: String(record.name || ''), fields: record.fields || {}};
        });
        this.Commit(state, records, notify);
    },
    Commit: function (state, records, notify = true) {
        records = records.map(record => Object.assign({}, record, {name: record.name || record.id}));
        state.selection = state.options.Multiple ? records : records.slice(0, 1);
        if (state.selection.length && !state.options.Multiple) state.currentEntity = state.selection[0].entityType;
        state.input.value = state.options.Multiple ? '' : state.selection[0]?.name || state.selection[0]?.id || '';
        this.Sync(state); this.Close(state);
        if (state.input === this.Field) this.Input.Value = this.GetValue(state.input);
        if (notify) {
            state.input.dispatchEvent(new Event('change', {bubbles: true}));
            state.input.dispatchEvent(new CustomEvent('lookupchange', {bubbles: true, detail: this.GetValue(state.input)}));
        }
    },
    Choose: function (state, record) {
        state.currentEntity = record.entityType;
        const key = this.RecentKey(state);
        const recent = SI.Widget.Lookup.Recent.get(key) || [];
        SI.Widget.Lookup.Recent.set(key, [record.id, ...recent.filter(id => id !== record.id)].slice(0, 5));
        const selected = state.selection.filter(item => item.id !== record.id || item.entityType !== record.entityType);
        this.Commit(state, state.options.Multiple ? [...selected, record] : [record]);
    },
    Sync: function (state) {
        const {input, options, selection} = state;
        if (selection.length && !options.Multiple) input.dataset.guid = selection[0].id; else delete input.dataset.guid;
        if (options.Multiple) input.dataset.guids = JSON.stringify(selection.map(record => record.id));
        input.setCustomValidity(input.value && (options.Multiple || !selection.length) ? 'Choose a record from the lookup results.' : '');
        if (options.Multiple) input.required = state.required && !selection.length;
        input.setAttribute('aria-invalid', String(!!input.validationMessage));
        state.control.classList.toggle('si-lookup-selected', !!selection.length && !options.Multiple);
        state.control.classList.toggle('si-lookup-disabled', input.disabled || input.readOnly);
        state.browse.disabled = input.disabled || input.readOnly;
        input.hidden = !!selection.length && !options.Multiple;
        state.chips.replaceChildren();
        for (const record of selection) {
            const chip = Ele('span', {class: 'si-lookup-chip', appendTo: state.chips});
            Ele('button', {type: 'button', class: 'si-lookup-record', innerText: record.name || record.id, title: 'Open record', onclick: () => this.OpenRecord(state, record), appendTo: chip});
            Ele('button', {type: 'button', class: 'si-lookup-clear', innerText: '×', title: 'Remove ' + (record.name || 'record'), disabled: input.disabled || input.readOnly, onclick: () => {
                this.Commit(state, selection.filter(item => item !== record)); input.focus();
            }, appendTo: chip}).setAttribute('aria-label', 'Remove ' + (record.name || 'record'));
        }
        input.placeholder = options.Placeholder;
    },
    RecentKey: function (state) { return state.currentEntity + ':' + state.view + ':' + JSON.stringify(state.options.Filters); },
    Request: function (state, extra = {}, channel = 'inline') {
        const prior = state.requests[channel];
        const request = {revision: (prior?.revision || 0) + 1}; state.requests[channel] = request;
        if (prior?.xhr) prior.xhr.abort();
        for (const callback of state.preSearch) callback(state.input.Lookup, state.input);
        const data = Object.assign({Operation: 'Lookup', Entity: {Name: state.currentEntity}, Search: state.input.hidden ? '' : state.input.value, Filters: state.options.Filters, View: state.view, PageSize: 8, Page: 0}, extra);
        for (const key of ['DisplayColumn', 'Columns', 'SearchColumns']) if (state.options[key]) data[key] = state.options[key];
        if (state.options.Provider) return Promise.resolve(state.options.Provider(data)).then(value => { if (state.destroyed || state.requests[channel] !== request) throw new DOMException('Superseded', 'AbortError'); return value; });
        return new Promise((resolve, reject) => {
            let completed = false;
            const xhr = SI.Tools.Api.Send({Data: data, Callback: value => {
                completed = true;
                if (state.destroyed || state.requests[channel] !== request) { reject(new DOMException('Superseded', 'AbortError')); return; }
                if (!Array.isArray(value.Records)) { reject(new Error(value.ERROR || 'Unable to search records.')); return; }
                resolve(value);
            }});
            request.xhr = xhr;
            if (completed) return;
            if (!xhr || xhr.status === 403) { reject(new Error('These records are not available in this session.')); return; }
            xhr.timeout = 15000;
            xhr.addEventListener('loadend', () => {
                if (!completed) reject(state.requests[channel] !== request || state.destroyed ? new DOMException('Cancelled', 'AbortError') : new Error(xhr.status === 403 ? 'You do not have access to these records.' : 'Unable to search records. Check the connection and try again.'));
            });
        });
    },
    Popup: function (state) {
        if (!state.popup) {
            state.popup = Ele('div', {id: state.input.id + '_results', class: 'si-lookup-popup', appendTo: document.body});
            state.input.setAttribute('aria-controls', state.input.id + '_list');
        }
        state.popup.hidden = false; state.input.setAttribute('aria-expanded', 'true'); this.Position(state);
        return state.popup;
    },
    Position: function (state) {
        if (!state.popup || state.popup.hidden) return;
        const rect = state.control.getBoundingClientRect();
        if (!rect.width || !rect.height) { this.Close(state); return; }
        const below = innerHeight - rect.bottom - 16, above = rect.top - 16;
        const down = below >= 180 || below >= above;
        const height = Math.max(80, Math.min(340, down ? below : above));
        const width = Math.min(Math.max(280, rect.width), innerWidth - 24);
        Object.assign(state.popup.style, {position: 'fixed', width: width + 'px', left: Math.max(12, Math.min(rect.left, innerWidth - width - 12)) + 'px', top: (down ? rect.bottom + 5 : Math.max(12, rect.top - height - 5)) + 'px', maxHeight: height + 'px'});
    },
    Search: async function (state, browse = false) {
        if (state.input.disabled || state.input.readOnly || state.destroyed) return;
        this.Popup(state).replaceChildren(Ele('p', {class: 'si-lookup-message', innerText: 'Searching…', role: 'status'}));
        try {
            let value, recent = false;
            const ids = SI.Widget.Lookup.Recent.get(this.RecentKey(state)) || [];
            if (!browse && !state.input.value && ids.length) { value = await this.Request(state, {Ids: ids}); recent = value.Records.length > 0; }
            if (!recent) value = await this.Request(state, browse ? {Search: ''} : {});
            if (state.input.getAttribute('aria-expanded') !== 'true' || state.destroyed) return;
            state.records = value.Records; state.active = -1;
            const popup = this.Popup(state); popup.replaceChildren();
            Ele('p', {class: 'si-lookup-heading', innerText: recent ? 'Recent records' : 'Matching records', appendTo: popup});
            if (state.entities.length > 1) {
                const types = Ele('select', {'aria-label': 'Record type', class: 'si-lookup-types', appendTo: popup});
                for (const entity of state.entities) types.appendChild(new Option(entity, entity));
                types.value = state.currentEntity;
                types.onchange = () => { state.currentEntity = types.value; state.focusTypes = true; this.Search(state, true); };
                if (state.focusTypes) { state.focusTypes = false; types.focus(); }
            }
            const list = Ele('div', {id: state.input.id + '_list', role: 'listbox', appendTo: popup});
            for (const [index, record] of value.Records.entries()) {
                const row = Ele('div', {id: state.input.id + '_result_' + index, class: 'si-lookup-result', role: 'option', appendTo: list});
                row.setAttribute('aria-selected', 'false');
                Ele('span', {class: 'si-lookup-record-icon', innerText: '▤', appendTo: row});
                const text = Ele('span', {appendTo: row}); Ele('strong', {innerText: record.name || '(Unnamed record)', appendTo: text});
                const secondary = Object.entries(record.fields || {}).filter(([key, val]) => key !== 'id' && val && String(val) !== record.name).map(([,val]) => String(val)).slice(0,2).join(' · ');
                Ele('small', {innerText: secondary || record.entityType + ' · ' + record.id.slice(-8), appendTo: text});
                row.addEventListener('pointerdown', event => event.preventDefault());
                row.addEventListener('click', () => this.Choose(state, record));
            }
            if (!value.Records.length) Ele('p', {class: 'si-lookup-message', role: 'status', innerText: 'No records found. Try another search.', appendTo: list});
            Ele('button', {type: 'button', class: 'si-lookup-advanced-button', innerText: 'Advanced lookup' + (value.More ? ' · More records' : ''), onclick: () => this.OpenAdvanced(state), appendTo: popup});
        } catch (error) {
            if (error.name !== 'AbortError' && state.input.getAttribute('aria-expanded') === 'true' && !state.destroyed) this.Popup(state).replaceChildren(Ele('p', {class: 'si-lookup-message si-widget-error', role: 'alert', innerText: error.message}));
        }
    },
    Highlight: function (state) {
        const rows = state.popup.querySelectorAll('[role="option"]');
        rows.forEach((row, index) => row.setAttribute('aria-selected', String(index === state.active)));
        const row = rows[state.active]; if (row) { state.input.setAttribute('aria-activedescendant', row.id); row.scrollIntoView({block: 'nearest'}); }
    },
    Resolve: function (state) {
        if (state.options.Multiple || state.selection.length || !state.input.value) return;
        const exact = state.records.filter(record => record.name.toLocaleLowerCase() === state.input.value.toLocaleLowerCase());
        if (exact.length === 1) this.Choose(state, exact[0]); else { state.input.setCustomValidity(exact.length > 1 ? 'More than one record matches. Choose a result.' : 'Choose a record from the lookup results.'); state.input.setAttribute('aria-invalid', 'true'); }
    },
    Close: function (state) {
        clearTimeout(state.timer);
        if (state.popup) state.popup.hidden = true;
        state.input.setAttribute('aria-expanded', 'false'); state.input.removeAttribute('aria-activedescendant');
        state.requests.inline?.xhr?.abort();
        if (state.selection.length && !state.options.Multiple) { state.input.value = state.selection[0].name; state.input.hidden = true; }
    },
    OpenRecord: async function (state, record) {
        if (state.options.OnOpen) { state.options.OnOpen(record, state.input); return; }
        const window = this.WindowFor(state, 'Record details');
        const content = Ele('div', {class: 'si-lookup-advanced'});
        const status = Ele('p', {class: 'si-lookup-message', role: 'status', innerText: 'Loading record…', appendTo: content});
        window.Content.replaceChildren(content); window.Show();
        try {
            const result = await this.Request(state, {Entity: {Name: record.entityType}, Search: '', Ids: [record.id]}, 'details');
            if (this.DialogState !== state || !content.isConnected) return;
            const record = result.Records[0];
            if (!record) { status.textContent = 'This record is no longer available.'; return; }
            status.textContent = record.name;
            const table = Ele('table', {class: 'si-widget-table', appendTo: content});
            for (const [name, value] of Object.entries(record.fields)) {
                const row = table.insertRow(); Ele('th', {scope: 'row', innerText: name.replaceAll('_', ' '), appendTo: row}); row.insertCell().textContent = String(value ?? '');
            }
            const footer = Ele('div', {class: 'si-lookup-footer', appendTo: content});
            Ele('button', {type: 'button', innerText: 'Change record', onclick: () => this.OpenAdvanced(state, record), appendTo: footer});
            Ele('button', {type: 'button', innerText: 'Close', onclick: () => window.Hide(), appendTo: footer});
        } catch (error) { if (error.name !== 'AbortError') status.textContent = error.message; }
    },
    WindowFor: function (state, title) {
        this.Close(state);
        const manager = this;
        if (!this.LookupWindow) {
            this.LookupWindow = new SI.Widget.Window({Id: SI.Tools.Element.SafeId('si_lookup_window'), Title: 'Look up records', WindowControls: 'CLOSE', Width: '740px', Height: '540px', OpenPosition: 'CENTER', Modal: true});
            const hide = this.LookupWindow.Hide;
            this.LookupWindow.Hide = function (...args) { const result = hide.apply(this,args); const state = manager.DialogState; if (state) (state.input.hidden ? state.browse : state.input).focus(); return result; };
        }
        this.DialogState = state;
        this.LookupWindow.Title.textContent = title;
        this.LookupWindow.Container.setAttribute('role', 'dialog'); this.LookupWindow.Container.setAttribute('aria-modal', 'true'); this.LookupWindow.Container.setAttribute('aria-label', title);
        this.LookupWindow.Content.classList.add('si-lookup-window-content');
        return this.LookupWindow;
    },
    OpenAdvanced: function (state, initial) {
        this.WindowFor(state, 'Look up records');
        const content = this.DrawLookupWindow(state, initial);
        this.LookupWindow.Content.replaceChildren(content); this.LookupWindow.Content.classList.add('si-lookup-window-content');
        this.LookupWindow.Container.setAttribute('role', 'dialog'); this.LookupWindow.Container.setAttribute('aria-modal', 'true'); this.LookupWindow.Container.setAttribute('aria-label', 'Look up records');
        this.LookupWindow.Show(); content.querySelector('input[type="search"]').focus();
    },
    DrawLookupWindow: function (state = this.DialogState, initial) {
        const box = Ele('div', {class: 'si-lookup-advanced'});
        const toolbar = Ele('div', {class: 'si-lookup-toolbar', appendTo: box});
        const entities = Ele('select', {'aria-label': 'Record type', appendTo: toolbar});
        for (const entity of state.entities) entities.appendChild(new Option(entity,entity)); entities.value = state.currentEntity;
        const view = Ele('select', {'aria-label': 'View', appendTo: toolbar}); view.append(new Option('Active records','active'),new Option('All records','all')); view.value = state.view;
        const search = Ele('input', {type: 'search', placeholder: 'Search records…', 'aria-label': 'Search records', value: state.input.hidden ? '' : state.input.value, appendTo: toolbar});
        const scroller = Ele('div', {class: 'si-lookup-grid', appendTo: box});
        const status = Ele('p', {class: 'si-lookup-message', role: 'status', appendTo: box});
        const footer = Ele('div', {class: 'si-lookup-footer', appendTo: box});
        const previous = Ele('button', {type: 'button', innerText: 'Previous', appendTo: footer});
        const next = Ele('button', {type: 'button', innerText: 'Next', appendTo: footer});
        const chosen = Ele('span', {class: 'si-lookup-selection-summary', appendTo: footer});
        const cancel = Ele('button', {type: 'button', innerText: 'Cancel', appendTo: footer});
        const done = Ele('button', {type: 'button', innerText: 'Done', class: 'si-widget-primary', appendTo: footer});
        let page = 0, sorting = null, direction = 'asc', selected = initial ? [initial] : state.selection.slice(), timer;
        const create = state.options.OnCreate ? Ele('button', {type: 'button', innerText: 'New record', hidden: true, appendTo: toolbar}) : null;
        const summary = () => { chosen.textContent = selected.length ? selected.map(record=>record.name).join(', ') : 'No record selected'; done.disabled = !selected.length; }; summary();
        const load = async () => {
            status.textContent = 'Searching…'; previous.disabled = next.disabled = true;
            try {
                const extra = {Entity: {Name: entities.value}, Search: search.value, View: view.value, Page: page, PageSize: 20};
                if (sorting) Object.assign(extra,{SortColumn: sorting,SortDirection: direction});
                const result = await this.Request(state, extra, 'advanced');
                if (!box.isConnected || this.DialogState !== state) return;
                scroller.replaceChildren();
                const table = Ele('table', {class: 'si-widget-table si-lookup-table', appendTo: scroller});
                const head = table.createTHead().insertRow(); Ele('th',{innerText:'Select',appendTo:head});
                for (const column of result.Columns) {
                    const cell = Ele('th', {appendTo: head}); cell.setAttribute('aria-sort',sorting===column?(direction==='asc'?'ascending':'descending'):'none');
                    Ele('button',{type:'button',innerText:column.replaceAll('_',' '),onclick:()=>{direction=sorting===column&&direction==='asc'?'desc':'asc';sorting=column;page=0;load();},appendTo:cell});
                }
                const body = table.createTBody();
                for (const record of result.Records) {
                    const row = body.insertRow(); const cell = row.insertCell();
                    const check = Ele('input',{type:state.options.Multiple?'checkbox':'radio',name:this.Id+'_record',checked:selected.some(value=>value.id===record.id&&value.entityType===record.entityType),appendTo:cell});
                    check.setAttribute('aria-label','Select '+record.name);
                    const select = () => { selected = state.options.Multiple ? [...selected.filter(value=>value.id!==record.id||value.entityType!==record.entityType),...(check.checked?[record]:[])] : [record]; summary(); };
                    check.addEventListener('change',select);
                    row.addEventListener('dblclick',()=>{this.Commit(state,[record]);this.LookupWindow.Hide();});
                    for(const column of result.Columns) row.insertCell().textContent = String(record.fields[column] ?? '');
                }
                status.textContent = result.Records.length ? 'Page '+(page+1)+' · '+result.Records.length+' records' : 'No records found.';
                previous.disabled = page===0; next.disabled = !result.More;
                if (create) create.hidden = !result.CanCreate;
            } catch(error) { if(error.name!=='AbortError')status.textContent=error.message; }
        };
        search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{page=0;load();},180);});
        entities.addEventListener('change',()=>{page=0;sorting=null;load();}); view.addEventListener('change',()=>{page=0;load();});
        previous.onclick=()=>{page--;load();}; next.onclick=()=>{page++;load();};
        cancel.onclick=()=>this.LookupWindow.Hide(); done.onclick=()=>{this.Commit(state,selected);this.LookupWindow.Hide();};
        if (create) create.onclick = async () => {
            try {
                const created = await state.options.OnCreate(entities.value);
                if (created) {
                    const result = await this.Request(state, {Entity: {Name: entities.value}, Search: '', Ids: [created.id]}, 'created');
                    selected = result.Records; summary(); load();
                }
            } catch (error) { status.textContent = error.message; }
        };
        box.addEventListener('keydown',event=>{
            if(event.key==='Escape'){event.preventDefault();this.LookupWindow.Hide();}
            if(event.key==='Tab'){
                const controls=Array.from(box.querySelectorAll('button,input,select')).filter(element=>!element.disabled&&element.getClientRects().length);const first=controls[0],last=controls.at(-1);
                if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
            }
        });
        queueMicrotask(load); return box;
    },
    // Compatibility with existing CMS fields and older callers.
    ChangeOptions: function () { const state = SI.Widget.Lookup.Fields.get(this); if (state) state.manager.Resolve(state); },
    GetDatalist: function (options) {
        const list=document.getElementById(options.datalist),input=list&&document.getElementById(options.datalist.replace(/_datalist$/,''));
        if(input){const state=this.State(input)||this.Init(input,{EntityName:options.type,DisplayColumn:options.column});return this.Search(state,true);}
    },
    PopulateDatalist: function () { this.CheckLookups(); },
    Detach: function (input) {
        const state = this.State(input); if (!state) return;
        state.destroyed=true;state.events.abort();clearTimeout(state.timer);clearTimeout(state.blurTimer);
        for(const request of Object.values(state.requests))request.xhr?.abort();
        state.popup?.remove();state.manager.Fields.delete(state);SI.Widget.Lookup.Fields.delete(input);delete input.Lookup;
    },
    Destroy: function () {
        for(const state of this.Fields)this.Detach(state.input);
        this.Fields.clear();this.LookupWindow?.Destroy();if(this.Container?.parentNode)this.Container.remove();delete SI.Widgets.Lookup[this.Id];
    }
};
new SI.Widget.Lookup({Id:'Lookup'});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>SI.Widgets.Lookup.Lookup.CheckLookups(),{once:true});
else queueMicrotask(()=>SI.Widgets.Lookup.Lookup.CheckLookups());
