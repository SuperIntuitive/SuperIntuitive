
SI.Editor.Objects.Widgets = {
    SelectedWidget : null,
    Draw: function () {
        let container = Ele('div', {
            class: 'si-tool-body',});
        let tabs = new SI.Widget.Tab({TranslateLabels: true});
        tabs.Items.Add("Instances", SI.Editor.Objects.Widgets.Instances());
        tabs.Items.Add("Widget Editor", SI.Editor.Objects.Widgets.Editor());
        container.appendChild(tabs.Draw());

        return container;
    },
    //for managing current instances of widgets.
    Instances: function () {
        let base = Ele('div', {
            class: 'si-tool-panel-body'
        });
        let menu = Ele('div', {
            class: 'si-tool-toolbar',

            appendTo: base
        });
        Ele('label', {
            innerHTML: SI.Tools.Text.Editor("Instance to edit:"),
            for: "si_edit_widget_instance_selector",
            style: {
                marginLeft:'2em'
            },
            appendTo: menu
        })
        let instanceselector = Ele('select', {
            id: "si_edit_widget_instance_selector",
            style: {
                margin: '4px',
            },
            onchange: function (ev) {
                SI.Editor.Objects.Widgets.SelectInstance(this.options[this.selectedIndex].value);
            },
            appendTo: menu
        });
        Ele("option", {
            innerHTML: "",
            appendTo: instanceselector
        });


        let optionsBox = Ele('div', {
            id: "si_edit_widget_instance_options",
            style: {
                margin: "8px",
                backgroundColor: "rgba(128,128,128,0.2)"
            },
            appendTo: base
        });
        SI.Editor.Objects.Widgets.RefreshInstances(instanceselector);
        return base;
    },
    PlacementSize: function (name) {
        const sizes = {Field: [280, 100], Lookup: [320, 110], IconLink: [180, 58], Table: [360, 220], DataGrid: [360, 220], Tab: [360, 240], Map: [360, 240], Menu: [280, 160], Tree: [280, 220], Tile: [180, 200]};
        const size = sizes[name] || [320, 240];
        const style = document.createElement('div').style;
        for (const operation of SI.Tools.Widget.Designs[name] || []) if (!operation.path.length && operation.attributes && operation.attributes.style) style.cssText = operation.attributes.style;
        return {width: /^\d+(?:\.\d+)?px$/.test(style.width) ? parseFloat(style.width) : size[0], height: /^\d+(?:\.\d+)?px$/.test(style.height) ? parseFloat(style.height) : size[1]};
    },
    AddInstance: function (block, widget, options, preview = false) {
        const parent = options.Parent;
        if (!parent || !(preview ? this.CanvasFor(parent) : parent.closest('.si-block')) || typeof SI.Widget[widget] !== 'function') throw new Error('Invalid widget destination');
        const id = SI.Tools.Element.SafeId(widget === 'Lookup' ? 'LookupField' : widget);
        const starter = {
            Field: {Label: 'Field', Placeholder: 'Enter text…'},
            Accordian: {Sections: {'Section 1': 'Your content'}},
            Menu: {Items: {item: {Text: 'Menu item'}}},
            Tree: {Leaves: {'Item 1': 'Your content'}},
            Window: {Title: SI.Tools.Text.Editor('Window')}
        };
        const input = Object.assign({}, starter[widget] || {}, options, {Id: id});
        if (preview) Object.assign(input, {SIWidgetPreview: true, SIWidgetRaw: true});
        // Constructors have historically returned either the instance or its DOM node.
        // Normalize both forms and mount exactly once, only after a valid placement.
        let result;
        try {
            result = new SI.Widget[widget](input);
        } catch (error) {
            const partial = document.getElementById(id);
            if (partial) partial.remove();
            if (SI.Widgets[widget]) delete SI.Widgets[widget][id];
            throw error;
        }
        const instance = SI.Widgets[widget] && SI.Widgets[widget][id] || result;
        let element = result instanceof HTMLElement ? result : result.Container;
        if (!element && typeof result.Draw === 'function') {
            if (widget === 'Tab' && result.Items && !result.Items.Count) result.Items.Add('Tab 1', 'Your content');
            element = result.Draw();
        }
        if (!(element instanceof HTMLElement)) {
            if (SI.Widgets[widget]) delete SI.Widgets[widget][id];
            throw new Error('Widget did not provide a page element');
        }
        element.id = id;
        if (widget === 'Window') element.style.display = 'block';
        if (element.parentElement !== parent) parent.appendChild(element);
        Object.assign(element.style, {position: 'absolute', width: options.Width, height: options.Height, margin: '0', boxSizing: 'border-box'});
        if (instance && !instance.Container) instance.Container = element;
        // Store a serializable parent reference, never a live DOM node in JSON.
        element.dataset.siWidget = widget;
        if (preview) {
            this.CaptureBase(element);
            return element;
        }
        this.CaptureBase(element);
        const saved = Object.assign({}, input, this.OptionsFor(element), {Id: id, Parent: parent.id, SIWidgetVersion: 1});
        if (!SI.Page.Blocks[block].Widgets) SI.Page.Blocks[block].Widgets = {};
        if (!Array.isArray(SI.Page.Blocks[block].Widgets[widget])) SI.Page.Blocks[block].Widgets[widget] = [];
        SI.Page.Blocks[block].Widgets[widget].push(JSON.stringify(saved));
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) SI.Editor.Objects.Blocks.AddWidget(block, widget, saved, table);
        SI.Editor.Objects.Widgets.RefreshInstances();
        return element;
    },
    UpdatePlacement: function (element, oldBlock) {
        if (this.CanvasFor(element)) { this.MarkCanvasDirty(); return; }
        const type = element.dataset.siWidget;
        if (!type) return;
        const block = element.closest('.si-block').id.replace('si_block_', '');
        const previous = oldBlock ? oldBlock.id.replace('si_block_', '') : block;
        const records = SI.Page.Blocks[previous].Widgets || {};
        let options;
        for (const stored of records[type] || []) {
            const candidate = typeof stored === 'string' ? JSON.parse(stored) : stored;
            if (candidate.Id === element.id) options = candidate;
        }
        if (!options) return;
        SI.Editor.Objects.Widgets.Forget(previous, element.id, false);
        Object.assign(options, {Parent: element.parentElement.id, Position: 'absolute', Left: element.style.left, Top: element.style.top, Width: element.style.width, Height: element.style.height});
        const destination = SI.Page.Blocks[block].Widgets || (SI.Page.Blocks[block].Widgets = {});
        if (!destination[type]) destination[type] = [];
        destination[type].push(JSON.stringify(options));
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) SI.Editor.Objects.Blocks.AddWidget(block, type, options, table);
        SI.Editor.Objects.Widgets.RefreshInstances();
    },
    Forget: function (block, id, unregister = true) {
        const widgets = SI.Page.Blocks[block].Widgets || {};
        for (const type of Object.keys(widgets)) {
            if (!Array.isArray(widgets[type])) continue;
            widgets[type] = widgets[type].filter(stored => (typeof stored === 'string' ? JSON.parse(stored) : stored).Id !== id);
            if (unregister && SI.Widgets[type]) delete SI.Widgets[type][id];
        }
        const table = document.getElementById('si_block_widgets_table_' + block);
        if (table) for (const row of Array.from(table.rows)) if (row.dataset.widgetId === id) row.remove();
    },
    RefreshInstances: function (selector) {
        selector = selector || document.getElementById('si_edit_widget_instance_selector');
        if (!selector) return;
        const selected = selector.value;
        selector.replaceChildren(new Option('Choose a widget…', ''));
        const groups = new Map();
        for (const element of document.querySelectorAll('.si-block [data-si-widget]')) {
            const block = element.closest('.si-block').id.replace('si_block_', '');
            if (!groups.has(block)) {
                const group = document.createElement('optgroup');
                group.label = block;
                groups.set(block, group);
                selector.appendChild(group);
            }
            groups.get(block).appendChild(new Option(element.dataset.siWidget + ' #' + element.id, element.id));
        }
        selector.value = selected;
    },
    SelectInstance: function (id) {
        const box = document.getElementById('si_edit_widget_instance_options');
        if (!box) return;
        box.replaceChildren();
        const element = id && document.getElementById(id);
        if (!element || !element.dataset.siWidget || !element.closest('.si-block')) return;
        SI.Editor.Objects.Elements.SelectNone(true);
        SI.Editor.Objects.Elements.Select(null, element.id);
        const description = document.createElement('p');
        description.textContent = element.dataset.siWidget + ' #' + element.id + SI.Tools.Text.Editor(' is selected. Edit its content, attributes, and styles on the page.');
        box.appendChild(description);
        const name = this.NameForType(element.dataset.siWidget);
        if (name) for (const kind of ['script', 'style']) Ele('button', {type: 'button', innerText: kind === 'script' ? SI.Tools.Text.Editor('Edit JavaScript') : SI.Tools.Text.Editor('Edit CSS'), onclick: () => this.OpenSource(name, kind), appendTo: box});
        Ele('button', {id: 'si_edit_widget_instance_edit', type: 'button', innerText: SI.Tools.Text.Editor('Edit widget on page'), onclick: function () {
            const menu = SI.Editor.UI.MainMenu.Element;
            menu.style.display = 'block';
            document.getElementById('si_edit_edit_menuitem').style.display = 'none';
            SI.Editor.UI.MainMenu.SelectMenu('si_edit_edit_menuitem');
        }, appendTo: box});
    },
    DeleteInstance: function (block, widgetid) {

    },
    //for editing widget scripts / styles. will effect all Instances
    Sources: null,
    Bases: SI.Tools.Widget.Bases,
    CanvasFor: function (element) { return element instanceof HTMLElement && element.closest('[data-si-widget-canvas]'); },
    Status: function (message) {
        const status = document.getElementById('si_edit_widget_status');
        if (status) status.textContent = message;
    },
    Request: function (data) {
        return new Promise((resolve, reject) => {
            let completed = false;
            const xhr = SI.Editor.Ajax.Run({Data: data, Callback: value => {
                completed = true;
                value === undefined ? reject(new Error('Widget request failed. Refresh your administrator session and try again.')) : resolve(value);
            }});
            if (!xhr || xhr.status === 403) { reject(new Error('This installation does not allow saving widget definitions.')); return; }
            xhr.timeout = 20000;
            xhr.addEventListener('loadend', () => { if (!completed) reject(new Error('Widget request failed (HTTP ' + xhr.status + ').')); });
        });
    },
    LoadSources: function () {
        if (this.Sources) return Promise.resolve(this.Sources);
        if (!this.SourceRequest) this.SourceRequest = (SI.Editor.Data.WidgetSources ? Promise.resolve(SI.Editor.Data.WidgetSources) : this.Request({KEY: 'GetWidgetSources'}))
            .then(sources => { this.Sources = sources; return sources; }).finally(() => { this.SourceRequest = null; });
        return this.SourceRequest;
    },
    SaveSource: async function (name, kind, source) {
        const result = await this.Request({KEY: 'SaveWidgetSource', name, kind, source});
        if (!result.saved) throw new Error('Widget was not saved.');
        this.Sources[name] = result.widget;
        SI.Tools.Widget.Designs[result.widget.type] = result.widget.design;
        this.Status(SI.Tools.Text.Editor('Saved ') + name + SI.Tools.Text.Editor(' in Dev. Promote to Test, then Live to publish.'));
        if (kind === 'style') {
            const current = document.getElementById('si_widgets_style');
            if (current) { const address = new URL(current.href); address.searchParams.set('v', Date.now()); current.href = address.href; }
            if (this.PreviewStyle) this.PreviewStyle.textContent = source;
        }
        return result;
    },
    NameForType: function (type) { return Object.keys(this.Sources || {}).find(name => this.Sources[name].type === type); },
    AddSourceOptions: async function (selector) {
        try {
            const sources = await this.LoadSources();
            const group = document.createElement('optgroup'); group.label = 'Widgets';
            for (const [name, entry] of Object.entries(sources)) {
                const option = new Option(entry.type, name); option.dataset.sourcetype = 'Widget'; group.appendChild(option);
            }
            selector.appendChild(group);
        } catch (error) { this.Status(error.message); }
    },
    OpenSource: async function (name, kind) {
        try {
            await this.LoadSources();
            const title = kind === 'script' ? 'Scripter' : 'Styler';
            const windowId = 'si_edit_' + title.toLowerCase() + '_window';
            if (!SI.Widgets.Window[windowId] || !SI.Widgets.Window[windowId].IsVisible()) SI.Editor.UI.ToolsPanel.OpenToolWindow(title);
            const editor = SI.Editor.Objects[title];
            const select = kind === 'script' ? editor.ScriptSelect : document.getElementById('si_styler_sheetselector');
            if (!Array.from(select.options).some(option => option.value === name && option.dataset.sourcetype === 'Widget')) {
                const option = new Option(this.Sources[name].type, name); option.dataset.sourcetype = 'Widget'; select.appendChild(option);
            }
            if (kind === 'script') await editor.OpenScript(name, 'Widget');
            else {
                for (const option of select.options) option.selected = option.value === name && option.dataset.sourcetype === 'Widget';
                select.onchange();
            }
        } catch (error) { this.Status(error.message); }
    },
    Editor: function () {
        const base = Ele('div', {class: 'si-widget-editor si-tool-panel-body'});
        const menu = Ele('div', {class: 'si-tool-toolbar', appendTo: base});
        Ele('label', {innerText: SI.Tools.Text.Editor('Widget to edit:'), for: 'si_edit_widget_editor_selector', appendTo: menu});
        this.WidgetSelector = Ele('select', {id: 'si_edit_widget_editor_selector', onchange: () => this.SelectWidget(this.WidgetSelector.value), appendTo: menu});
        for (const type of Object.keys(SI.Widget).sort()) if (typeof SI.Widget[type] === 'function') this.WidgetSelector.appendChild(new Option(type, type));
        const newName = Ele('input', {id: 'si_edit_widget_new_name', type: 'text', placeholder: SI.Tools.Text.Editor('NewWidgetName'), 'aria-label': SI.Tools.Text.Editor('New widget name'), appendTo: menu});
        Ele('button', {id: 'si_edit_widget_create', type: 'button', innerText: SI.Tools.Text.Editor('New widget'), onclick: async () => {
            try {
                if (this.CanvasDirty) { this.Status(SI.Tools.Text.Editor('Save the current design before creating another widget.')); return; }
                const name = newName.value.trim();
                if (!/^[A-Z][A-Za-z0-9_]{0,63}$/.test(name)) throw new Error('Use a widget name beginning with a capital letter, followed by letters, digits or underscores.');
                const result = await this.Request({KEY: 'CreateWidget', name});
                if (!result.saved) throw new Error('Widget was not created.');
                this.Sources[name] = result.widget;
                SI.Widget[name] = SI.Tools.Widget.Derive(name); SI.Tools.Widget.Register(name, []);
                this.WidgetSelector.appendChild(new Option(name, name));
                SI.Editor.UI.AddPanel.Item(document.getElementById('si_edit_add_widget'), {kind: 'widget', name}, name, 'Add a ' + name + ' widget');
                newName.value = ''; this.SelectWidget(name, true);
            } catch (error) { this.Status(error.message); }
        }, appendTo: menu});
        for (const kind of ['script', 'style']) Ele('button', {type: 'button', innerText: kind === 'script' ? SI.Tools.Text.Editor('Edit JavaScript') : SI.Tools.Text.Editor('Edit CSS'), onclick: () => this.OpenSource(this.NameForType(this.SelectedWidget), kind), appendTo: menu});
        Ele('button', {id: 'si_edit_widget_edit_selected', type: 'button', innerText: SI.Tools.Text.Editor('Edit selected'), onclick: () => {
            if (!this.Preview) return;
            if (!this.CanvasFor(SI.Editor.Objects.Elements.Selected)) SI.Editor.Objects.Elements.Select(null, this.Preview.id);
            SI.Editor.UI.MainMenu.Element.style.display = 'block';
            document.getElementById('si_edit_edit_menuitem').style.display = 'none';
            SI.Editor.UI.MainMenu.SelectMenu('si_edit_edit_menuitem');
        }, appendTo: menu});
        Ele('button', {id: 'si_edit_widget_save_design', type: 'button', innerText: SI.Tools.Text.Editor('Save design'), onclick: () => this.SaveDesign(), appendTo: menu});
        Ele('button', {type: 'button', innerText: SI.Tools.Text.Editor('Place on page'), onclick: event => {
            if (this.SelectedWidget && this.Preview) SI.Editor.Objects.Placement.Begin(event, {kind: 'widget', name: this.SelectedWidget, options: this.OptionsFor(this.Preview), design: this.Design(this.Preview), size: {width: parseFloat(this.Preview.style.width) || this.Preview.offsetWidth, height: parseFloat(this.Preview.style.height) || this.Preview.offsetHeight}});
        }, appendTo: menu});
        for (const target of ['test', 'live']) Ele('button', {type: 'button', innerText: SI.Tools.Text.Editor('To ') + (target === 'test' ? SI.Tools.Text.Editor('Test') : SI.Tools.Text.Editor('Live')), onclick: async () => {
            try {
                if (this.CanvasDirty) { this.Status(SI.Tools.Text.Editor('Save the canvas design before promoting.')); return; }
                await this.Request({KEY: 'PromoteWidgetSource', name: this.NameForType(this.SelectedWidget), target});
                this.Status(SI.Tools.Text.Editor('Promoted ') + (target === 'test' ? SI.Tools.Text.Editor('Dev → Test') : SI.Tools.Text.Editor('Test → Live')) + '.');
            } catch (error) { this.Status(error.message); }
        }, appendTo: menu});
        Ele('p', {class: 'si-add-hint', innerText: SI.Tools.Text.Editor('Drag tags or widgets from Add into this canvas. Double-click an element to edit it with Edit. Canvas changes are separate from page instances.'), appendTo: base});
        Ele('p', {id: 'si_edit_widget_status', role: 'status', appendTo: base});
        this.Canvas = Ele('div', {id: 'si_edit_widget_canvas', class: 'si-widget-canvas', appendTo: base});
        this.Canvas.dataset.siWidgetCanvas = 'true';
        this.PreviewStyle = Ele('style', {appendTo: base});
        this.WidgetSelector.value = 'Template'; this.SelectWidget('Template', true);
        this.LoadSources().then(() => {
            for (const [name, source] of Object.entries(this.Sources)) if (!Array.from(this.WidgetSelector.options).some(option => option.value === source.type)) this.WidgetSelector.appendChild(new Option(source.type, source.type));
            const selected = this.Sources[this.NameForType(this.SelectedWidget)];
            if (selected) this.PreviewStyle.textContent = selected.style;
        }).catch(error => {
            this.Status(error.message + SI.Tools.Text.Editor(' The canvas remains available for temporary editing.'));
        });
        return base;
    },
    ReleasePreview: function () {
        if (!this.Canvas) return;
        if (this.CanvasFor(SI.Editor.Objects.Elements.Selected)) SI.Editor.Objects.Elements.SelectNone();
        for (const input of this.Canvas.querySelectorAll('input[type="lookup"]')) SI.Widgets.Lookup.Lookup.Detach(input);
        for (const [type, instances] of Object.entries(SI.Widgets)) for (const [id, instance] of Object.entries(instances)) {
            const element = instance instanceof HTMLElement ? instance : instance.Container;
            if (element instanceof HTMLElement && this.Canvas.contains(element)) {
                if (typeof instance.Destroy === 'function') instance.Destroy();
                delete instances[id];
            }
        }
        this.Canvas.replaceChildren(); this.Preview = null;
    },
    SelectWidget: function (type, force = false) {
        if (!force && this.CanvasDirty && !window.confirm(SI.Tools.Text.Editor('Discard the unsaved widget canvas changes?'))) { this.WidgetSelector.value = this.SelectedWidget; return; }
        this.ReleasePreview(); this.SelectedWidget = type; this.WidgetSelector.value = type;
        try {
            const size = this.PlacementSize(type);
            this.Preview = this.AddInstance(null, type, {Parent: this.Canvas, Width: size.width + 'px', Height: size.height + 'px'}, true);
            Object.assign(this.Preview.style, {position: 'absolute', left: '24px', top: '24px'});
            // Layout belongs to the canvas, not the saved widget design.
            this.CaptureBase(this.Preview, true);
            const source = this.Sources && this.Sources[this.NameForType(type)];
            SI.Tools.Widget.ApplyDesign(this.Preview, source ? source.design : SI.Tools.Widget.Designs[type]);
            this.MakeCanvasEditable(); this.CanvasDirty = false;
            this.PreviewStyle.textContent = source ? source.style : '';
            this.Status(type + SI.Tools.Text.Editor(' preview · changes affect this working copy until saved.'));
        } catch (error) { this.Status(SI.Tools.Text.Editor('Cannot preview ') + type + ': ' + error.message); }
    },
    MakeCanvasEditable: function () {
        if (!this.Preview) return;
        for (const element of [this.Preview, ...this.Preview.querySelectorAll('*')]) SI.Editor.Objects.Elements.Editable(element);
    },
    MarkCanvasDirty: function () { this.CanvasDirty = true; this.Status(SI.Tools.Text.Editor('Unsaved widget design · Save design to keep it in Dev.')); },
    Clean: function (element) {
        const clone = element.cloneNode(true);
        for (const node of [clone, ...clone.querySelectorAll('*')]) {
            if (node.classList.contains('si-editable-element') || node.classList.contains('si-editor-selected')) {
                node.classList.remove('si-editable-element', 'si-editor-selected');
                if (!node.classList.length) node.removeAttribute('class');
            }
            for (const attribute of Array.from(node.attributes)) {
                if (attribute.name.startsWith('data-sistyle_') || attribute.name.startsWith('data-siattr_')) {
                    const property = attribute.name.replace(/^data-si(?:style|attr)_/, '');
                    if (attribute.name.startsWith('data-sistyle_')) node.style.setProperty(property, attribute.value === 'null' ? '' : attribute.value);
                    else if (attribute.value === 'null') node.removeAttribute(property); else node.setAttribute(property, attribute.value);
                    node.removeAttribute(attribute.name);
                }
            }
        }
        return clone;
    },
    CaptureBase: function (root) {
        SI.Tools.Widget.Remember(root, node => this.Clean(node));
    },
    NodeDesign: function (node, root, paths) {
        if (node.nodeType === Node.TEXT_NODE) return {text: node.textContent};
        if (!(node instanceof HTMLElement)) return null;
        if (paths && paths.has(node)) return {ref: paths.get(node)};
        const attributes = Object.fromEntries(Array.from(this.Clean(node).attributes, attr => [attr.name, attr.value]));
        if (attributes.id) attributes.id = attributes.id.startsWith(root.id + '_') ? '__SI_WIDGET__' + attributes.id.slice(root.id.length) : '__SI_WIDGET___' + attributes.id;
        const type = node.dataset.siWidget;
        if (type && this.Bases.has(node)) {
            const instance = SI.Widgets[type] && SI.Widgets[type][node.id];
            const options = this.OptionsFor(node);
            delete options.Parent; delete options.SIWidgetRaw; delete options.SIWidgetPreview;
            options.Id = attributes.id; options.Design = this.Design(node);
            return {widget: type, options};
        }
        return {tag: node.tagName.toLowerCase(), attributes, children: Array.from(node.childNodes, child => this.NodeDesign(child, root, paths)).filter(Boolean)};
    },
    Design: function (root) {
        const operations = [];
        const paths = new WeakMap();
        const remember = (node, path) => {
            paths.set(node, path);
            const base = this.Bases.get(node);
            if (base) base.children.filter(child => child instanceof HTMLElement).forEach((child, index) => remember(child, path.concat(index)));
        };
        if (root) remember(root, []);
        const walk = (node, path) => {
            const base = this.Bases.get(node); if (!base) return;
            const current = Object.fromEntries(Array.from(this.Clean(node).attributes, attr => [attr.name, attr.value]));
            const attributes = {};
            for (const key of new Set([...Object.keys(base.attributes), ...Object.keys(current)])) {
                if (key === 'id' || key === 'data-si-widget') continue;
                if (base.attributes[key] !== current[key]) attributes[key] = current[key] === undefined ? null : current[key];
            }
            const operation = {path, attributes};
            const originalElements = base.children.filter(child => child instanceof HTMLElement);
            for (const [index, child] of originalElements.entries()) {
                if (child.parentNode === node) walk(child, path.concat(index));
                else {
                    if (root.contains(child)) walk(child, path.concat(index));
                    operations.push({path: path.concat(index), remove: true});
                }
            }
            if (!originalElements.length && !node.children.length) {
                if (base.text !== node.textContent) operation.text = node.textContent;
            } else {
                const added = Array.from(node.childNodes).filter(child => !base.children.includes(child));
                if (added.length) operation.append = added.map(child => this.NodeDesign(child, root, paths)).filter(Boolean);
            }
            if (Object.keys(attributes).length || operation.text !== undefined || operation.append) operations.push(operation);
        };
        if (root) walk(root, []);
        return operations;
    },
    SaveDesign: async function () {
        try {
            if (!this.Preview) return;
            await this.SaveSource(this.NameForType(this.SelectedWidget), 'design', this.Design(this.Preview));
            this.CanvasDirty = false;
        } catch (error) { this.Status(error.message); }
    },
    SaveInstances: function (block) {
        const records = SI.Page.Blocks[block].Widgets || {};
        for (const [type, instances] of Object.entries(records)) {
            records[type] = instances.map(stored => {
                const options = typeof stored === 'string' ? JSON.parse(stored) : Object.assign({}, stored);
                const element = document.getElementById(options.Id);
                if (element) {
                    const current = this.OptionsFor(element);
                    for (const key of ['Value', 'Selected', 'Items', 'Columns', 'Rows']) if (Object.prototype.hasOwnProperty.call(current, key)) options[key] = current[key];
                }
                if (element && this.Bases.has(element)) options.InstanceDesign = this.Design(element);
                const table = document.getElementById('si_block_widgets_table_' + block);
                if (table) for (const row of table.rows) if (row.dataset.widgetId === options.Id) row.querySelector('textarea').value = JSON.stringify(options);
                return JSON.stringify(options);
            });
        }
    },
    OptionsFor: function (element) {
        const instance = SI.Widgets[element.dataset.siWidget] && SI.Widgets[element.dataset.siWidget][element.id];
        const options = JSON.parse(JSON.stringify(instance && instance.Input || {}, (key, value) => value instanceof Node || typeof value === 'function' ? undefined : value));
        for (const key of ['Id', 'Parent', 'SIWidgetRaw', 'SIWidgetPreview']) delete options[key];
        return options;
    },

    Tools:{
        AllowedFileTypes: function(container, current){
            let allowedMimesBox = Ele('fieldset', {
                style: {
                    width: '90%',
                    borderRadius: '10px',
                    marginLeft:'3%',
                },
                append: Ele('legend', { innerHTML: SI.Tools.Text.Editor('Allowed File Types') }),
                appendTo: container,
            });

            let mimetypes = SI.Editor.Data.Objects.MimeTypes;   
            let categories = [];
            for (let ext in mimetypes) {
                let data = mimetypes[ext].split("|");
                let mime = data[0];
                let cat = data[1];
                if (!(cat in categories)) {
                    categories[cat] = [];
                }
                categories[cat][ext] = mime;
            }

            let allowedFileTypes = current.split(',');

            for (let cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    let cattitle = Ele("div", {
                        innerHTML: cat,

                        class: 'si-tool-subheading',
                        onclick: function () {
                            let box = document.getElementById('si_edit_settings_categories_' + cat);
                            if (box.style.display === 'none') {
                                box.style.display = 'flex';
                            } else {
                                box.style.display = 'none';
                            }
                        },
                        appendTo: allowedMimesBox
                    });
                    let catbox = Ele("div", {
                        id: 'si_edit_settings_categories_' + cat,
                        style: {


                            display: 'none',
                            flexWrap: 'wrap',
                            justifyContent:'space-around'
                        },
                        appendTo: allowedMimesBox
                    });
                    for (let ext in categories[cat]) {
                        if (categories[cat].hasOwnProperty(ext)) {
                            let check = false;
                            if (allowedFileTypes.indexOf(ext)>-1) {
                                check = true;
                            }
                            let mimebox = Ele("span", {
                                appendTo: catbox,
                                style: {
                                    display:'inline',
                                    paddingLeft: "4px",
                                    paddingRight: "4px",
                                    border: "solid 1px black",
                                    borderRadius:'3px',
                                    backgroundColor: "darkgrey",
                                    margin:'1px'
                                }
                            });
                            let cb = Ele("input", {
                                type: 'checkbox',
                                class:"si-edit-settings-allowedfiletypes",
                                data: {
                                    extension: ext
                                },
                                appendTo: mimebox,
                                checked: check,
                                onchange: function () {

                                    let cbs = document.getElementsByClassName("si-edit-settings-allowedfiletypes");
                                    let fncsv = "";

                                    for (let i in cbs) {
                                        let cb = cbs[i];
                                        if (cb.checked) {
                                            fncsv += cb.dataset.extension+",";
                                        }
                                    }
                                    if (fncsv.length > 0) {
                                        fncsv = SI.Tools.String.TrimR(fncsv, ','); //lose the last comma.
                                    }

                                    let options = {
                                        Data: {
                                            KEY: "UpdateSetting",
                                            settingname: "AllowedFileTypes",
                                            settingvalue: fncsv
                                        }
                                    };

                                    SI.Editor.Ajax.Run(options);
                                }
                            });

                            Ele("span", {
                                innerHTML: ext +"&nbsp;-&nbsp;",
                                style: {
                                    color:"blue",
                                },
                                appendTo: mimebox
                            });
                            Ele("span", {
                                innerHTML: categories[cat][ext],
                                appendTo: mimebox
                            });

                        }
                    }


                }
            }

            return allowedMimesBox;
        }

    }

}
