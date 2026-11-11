/* Source-preserving JavaScript blocks. Scripter's editor logic stays in this entity. */
(function () {
    const S = SI.Editor.Objects.Scripter = {
        LoadedScript: null, LoadedType: null, LoadedParent: null,
        Container: null, Workspace: null, Codeview: null, Codepad: null,
        Source: '', Parsed: null, Mode: 'blocks', Revision: 0, LoadRequest: 0,
        History: [], Future: [], Nodes: new Map(), Lanes: new Map(), Collapsed: new Set(),
        Selected: null, ActiveLane: 'program', Drag: null, Dirty: false,
        Templates: [
            {name: 'Variable', group: 'Data', code: 'let value = 0;'},
            {name: 'Constant', group: 'Data', code: 'const value = null;'},
            {name: 'Object', group: 'Data', code: 'const record = {\n    name: "",\n    enabled: true\n};'},
            {name: 'Array', group: 'Data', code: 'const items = [];'},
            {name: 'If / else', group: 'Control', code: 'if (condition) {\n    // Then\n} else {\n    // Otherwise\n}'},
            {name: 'For loop', group: 'Control', code: 'for (let index = 0; index < 10; index++) {\n    // Repeat\n}'},
            {name: 'For each', group: 'Control', code: 'for (const item of items) {\n    // Use item\n}'},
            {name: 'While', group: 'Control', code: 'while (condition) {\n    // Repeat\n}'},
            {name: 'Switch', group: 'Control', code: 'switch (value) {\n    case 0:\n        break;\n    default:\n        break;\n}'},
            {name: 'Function', group: 'Functions', code: 'function calculate(value) {\n    return value;\n}'},
            {name: 'Async function', group: 'Functions', code: 'async function loadData() {\n    const response = await fetch("/");\n    return response.text();\n}'},
            {name: 'Return', group: 'Functions', code: 'return value;'},
            {name: 'Call', group: 'Functions', code: 'console.log(value);'},
            {name: 'Event listener', group: 'Browser', code: 'document.addEventListener("click", (event) => {\n    // Handle the event\n});'},
            {name: 'Try / catch', group: 'Control', code: 'try {\n    // Work\n} catch (error) {\n    console.error(error);\n}'},
            {name: 'Class', group: 'Functions', code: 'class Example {\n    constructor(value) {\n        this.value = value;\n    }\n}'},
            {name: 'JavaScript', group: 'Advanced', code: '// Add any JavaScript here.\nvoid 0;'}
        ],
        Element: function (tag, attrs, parent) {
            const element = document.createElement(tag);
            for (const [key, value] of Object.entries(attrs || {})) {
                if (key === 'class') element.className = value;
                else if (key === 'text') element.textContent = value;
                else if (key === 'data') Object.assign(element.dataset, value);
                else if (key.startsWith('aria-') || key === 'role') element.setAttribute(key, value);
                else element[key] = value;
            }
            if (parent) parent.appendChild(element);
            return element;
        },
        Button: function (text, title, action, parent, className) {
            return this.Element('button', {type: 'button', text, title, 'aria-label': title,
                class: className || 'si-script-action', onclick: action}, parent);
        },
        EnsureParser: function () {
            if (this.Parser) return Promise.resolve(this.Parser);
            if (!this.ParserPromise) {
                this.ParserPromise = new Promise((resolve, reject) => {
                    const previous = window.acorn;
                    const script = document.createElement('script');
                    script.src = '/editor/vendor/acorn.js';
                    script.onload = () => {
                        const parser = window.acorn;
                        if (previous === undefined) delete window.acorn; else window.acorn = previous;
                        if (!parser || typeof parser.parse !== 'function' || typeof parser.tokenizer !== 'function') {
                            reject(new Error('JavaScript parser did not load.')); return;
                        }
                        this.Parser = parser; resolve(parser);
                    };
                    script.onerror = () => reject(new Error('Cannot load the bundled JavaScript parser. Check /editor/vendor/acorn.js.'));
                    document.head.appendChild(script);
                }).catch(error => { this.ParserPromise = null; throw error; });
            }
            return this.ParserPromise;
        },
        Parse: function (source) {
            if (!this.Parser) throw new Error('The JavaScript parser is still loading.');
            let firstError;
            for (const sourceType of ['script', 'module']) {
                const tokens = [], comments = [];
                try {
                    const ast = this.Parser.parse(source, {ecmaVersion: 'latest', sourceType,
                        locations: true, allowHashBang: true, onToken: tokens, onComment: comments});
                    return {ast, tokens, comments, sourceType};
                } catch (error) {
                    if (!firstError || error.pos > firstError.pos) firstError = error;
                }
            }
            throw firstError;
        },
        ReadCode: function () {
            if (!this.CodeEdited || this.Codeview.hidden) return this.Codepad.textContent;
            const code = this.Codepad.innerText;
            return this.Source.includes('\r\n') ? code.replace(/\r?\n/g, '\r\n') : code;
        },
        Status: function (message, error) {
            if (!this.StatusBox) return;
            this.StatusBox.textContent = message;
            this.StatusBox.classList.toggle('is-error', !!error);
            this.StatusBox.setAttribute('role', error ? 'alert' : 'status');
        },
        Error: function (error) {
            const location = error.loc ? 'Line ' + error.loc.line + ', column ' + (error.loc.column + 1) + ': ' : '';
            this.Status(location + error.message, true);
            return false;
        },
        Draw: function () {
            this.Mode = 'blocks'; this.LoadRequest++;
            this.Source = ''; this.Parsed = null; this.Dirty = false;
            this.History = []; this.Future = []; this.Selected = null; this.ActiveLane = 'program';
            this.Container = this.Element('div', {id: 'si_scripter_container', class: 'si-tool-body si-tool-editor-body'});
            const toolbar = this.Element('div', {id: 'si_scripter_mainmenu', class: 'si-tool-toolbar'}, this.Container);
            const codeLabel = this.Element('label', {text: SI.Tools.Text.Editor('Code')}, toolbar);
            this.CodeSwitch = this.Element('input', {id: 'si_scripter_codeorguidcb', type: 'checkbox', checked: false,
                'aria-label': SI.Tools.Text.Editor('Show JavaScript code'), onclick: () => this.SwitchMode(this.CodeSwitch.checked ? 'code' : 'blocks')}, codeLabel);
            this.ScriptSelect = this.Element('select', {id: 'si_scripter_scriptselect', 'aria-label': SI.Tools.Text.Editor('Script'),
                onchange: () => {
                    const option = this.ScriptSelect.selectedOptions[0];
                    this.OpenScript(option.value, option.dataset.sourcetype, option.dataset.parent || null);
                }}, toolbar);
            const blocks = this.Element('optgroup', {label: SI.Tools.Text.Editor('Blocks')}, this.ScriptSelect);
            for (const name of Object.keys(SI.Editor.Data.Objects.Blocks || {})) {
                this.Element('option', {value: name, text: name, data: {sourcetype: 'Block'}}, blocks);
            }
            for (const [parent, plugin] of Object.entries(SI.Editor.Data.Objects.Plugins.Current || {})) {
                const group = this.Element('optgroup', {label: parent}, this.ScriptSelect);
                for (const name of Object.keys(plugin.scripts || {})) this.Element('option',
                    {value: name, text: name, data: {sourcetype: 'Plugin', parent}}, group);
            }
            if (SI.Editor.Objects.Widgets?.AddSourceOptions) SI.Editor.Objects.Widgets.AddSourceOptions(this.ScriptSelect);
            this.Button(SI.Tools.Text.Editor('Update'), SI.Tools.Text.Editor('Validate and update the other view'), () => this.BuildScript(), toolbar);
            this.Button(SI.Tools.Text.Editor('Save'), SI.Tools.Text.Editor('Save this script through the CMS'), () => this.SaveScript(), toolbar);
            this.UndoButton = this.Button('↶', SI.Tools.Text.Editor('Undo block edit'), () => this.Undo(), toolbar);
            this.RedoButton = this.Button('↷', SI.Tools.Text.Editor('Redo block edit'), () => this.Redo(), toolbar);
            this.StatusBox = this.Element('div', {class: 'si-script-status', role: 'status', 'aria-live': 'polite'}, this.Container);
            this.Workspace = this.Element('div', {id: 'si_scripter_workspace', class: 'si-tool-workspace si-script-workspace'}, this.Container);
            const layout = this.Element('div', {class: 'si-script-layout'}, this.Workspace);
            this.Palette = this.Element('aside', {class: 'si-script-palette', 'aria-label': SI.Tools.Text.Editor('Block library')}, layout);
            this.Element('h3', {text: SI.Tools.Text.Editor('Build')}, this.Palette);
            const search = this.Element('input', {type: 'search', placeholder: SI.Tools.Text.Editor('Find a block…'), 'aria-label': SI.Tools.Text.Editor('Find a block'),
                oninput: () => {
                    for (const button of this.Palette.querySelectorAll('[data-template]'))
                        button.hidden = !button.textContent.toLowerCase().includes(search.value.toLowerCase());
                    for (const group of this.Palette.querySelectorAll('.si-script-palette-group'))
                        group.hidden = !Array.from(group.querySelectorAll('[data-template]')).some(button => !button.hidden);
                }}, this.Palette);
            for (const groupName of new Set(this.Templates.map(template => template.group))) {
                const group = this.Element('div', {class: 'si-script-palette-group'}, this.Palette);
                this.Element('h4', {text: SI.Tools.Text.Editor(groupName)}, group);
                for (const template of this.Templates.filter(template => template.group === groupName)) {
                const button = this.Button(SI.Tools.Text.Editor(template.name), SI.Tools.Text.Editor('Insert ') + SI.Tools.Text.Editor(template.name), () => this.InsertTemplate(template.name), group, 'si-script-template');
                button.dataset.template = template.name; button.draggable = true;
                button.ondragstart = event => {
                    this.Drag = {template: template.name, revision: this.Revision};
                    event.dataTransfer.setData('application/x-si-script-block', 'template');
                    event.dataTransfer.effectAllowed = 'copy';
                };
                button.ondragend = () => this.ClearDrag();
                }
            }
            this.Element('p', {class: 'si-script-hint', text: SI.Tools.Text.Editor('Choose a body with + to insert inside it. Use JavaScript for any construct.')}, this.Palette);
            const center = this.Element('main', {class: 'si-script-canvas', 'aria-label': SI.Tools.Text.Editor('JavaScript blocks')}, layout);
            const heading = this.Element('div', {class: 'si-script-canvas-heading'}, center);
            this.Element('h3', {text: SI.Tools.Text.Editor('Flow')}, heading);
            this.Stats = this.Element('span', {class: 'si-script-stats'}, heading);
            this.Tree = this.Element('div', {class: 'si-script-tree'}, center);
            this.Inspector = this.Element('aside', {class: 'si-script-inspector', 'aria-label': SI.Tools.Text.Editor('Selected block')}, layout);
            this.Codeview = this.Element('div', {id: 'si_scripter_codeview', class: 'si-tool-code-view si-script-codeview', hidden: true}, this.Container);
            this.LineNumbers = this.Element('pre', {id: 'si_scripter_linenums', class: 'si-tool-code-gutter', 'aria-hidden': 'true'}, this.Codeview);
            this.Codepad = this.Element('pre', {id: 'si_scripter_codepad', class: 'si-scripter-codepad', contentEditable: 'true',
                spellcheck: false, role: 'textbox', 'aria-label': SI.Tools.Text.Editor('JavaScript source'), 'aria-multiline': 'true',
                oninput: () => { this.CodeEdited = true; this.Dirty = true; this.ComputeLineNumbers(); this.Status(SI.Tools.Text.Editor('Code changed · Update or open Blocks to validate.')); },
                onkeydown: event => { if (event.key === 'Tab') { event.preventDefault(); this.InsertText('    '); } },
                onpaste: event => { event.preventDefault(); this.InsertText(event.clipboardData.getData('text/plain')); }}, this.Codeview);
            this.Container.addEventListener('keydown', event => {
                if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); this.SaveScript(); }
                else if (this.Mode === 'blocks' && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z'
                    && !event.target.matches('input,textarea')) { event.preventDefault(); event.shiftKey ? this.Redo() : this.Undo(); }
            });
            this.UpdateHistoryButtons(); this.DrawInspector();
            if (this.ScriptSelect.options.length) {
                const option = this.ScriptSelect.selectedOptions[0];
                this.OpenScript(option.value, option.dataset.sourcetype, option.dataset.parent || null);
            } else this.LoadScriptCode('');
            return this.Container;
        },
        InsertText: function (text) {
            const selection = window.getSelection();
            if (!selection.rangeCount || !this.Codepad.contains(selection.anchorNode)) return;
            const range = selection.getRangeAt(0); range.deleteContents();
            const node = document.createTextNode(text);
            range.insertNode(node); range.setStartAfter(node); range.collapse(true);
            selection.removeAllRanges(); selection.addRange(range);
            this.Codepad.dispatchEvent(new Event('input', {bubbles: true}));
        },
        OpenScript: async function (name, type, parent) {
            if ((this.Dirty || this.HasInspectorDraft()) && this.LoadedScript !== null && !window.confirm(SI.Tools.Text.Editor('Discard the unsaved Scripter edits and open another script?'))) {
                for (const option of this.ScriptSelect.options) option.selected = option.value === this.LoadedScript
                    && option.dataset.sourcetype === this.LoadedType && (option.dataset.parent || null) === this.LoadedParent;
                return false;
            }
            this.LoadedScript = name; this.LoadedType = type; this.LoadedParent = parent || null;
            for (const option of this.ScriptSelect.options) option.selected = option.value === name
                && option.dataset.sourcetype === type && (option.dataset.parent || null) === this.LoadedParent;
            const source = type === 'Widget' ? (await SI.Editor.Objects.Widgets.LoadSources())[name]?.script : type === 'Block' ? SI.Editor.Data.Objects.Blocks[name]?.script
                : SI.Editor.Data.Objects.Plugins.Current[parent]?.scripts?.[name];
            return this.LoadScriptCode(typeof source === 'string' ? source : '');
        },
        LoadScriptCode: async function (source) {
            const request = ++this.LoadRequest;
            this.ClearDrag(); this.Revision++;
            this.Source = source; this.Dirty = false;
            this.History = []; this.Future = []; this.Selected = null; this.ActiveLane = 'program'; this.Parsed = null;
            this.InspectorDraft = null;
            this.WriteCode(source); this.Status(SI.Tools.Text.Editor('Reading JavaScript…'));
            try {
                await this.EnsureParser();
                if (request !== this.LoadRequest) return false;
                this.Parsed = this.Parse(source);
                if (this.CodeEdited) return this.Accept(this.ReadCode());
                this.WriteCode(source); this.RenderBlocks(); this.UpdateHistoryButtons();
                return true;
            } catch (error) {
                if (request !== this.LoadRequest) return false;
                this.Mode = 'code'; this.CodeSwitch.checked = true; this.Codeview.hidden = false; this.Workspace.hidden = true;
                this.Tree.replaceChildren(); this.DrawInspector(); return this.Error(error);
            }
        },
        SwitchMode: async function (mode) {
            try {
                await this.EnsureParser();
                if (mode === this.Mode && this.Parsed) return true;
                if (this.Mode === 'blocks' && !this.FlushInspector()) return false;
                if (this.Mode === 'code' && !this.Accept(this.ReadCode(), {render: false})) { this.CodeSwitch.checked = true; return false; }
                this.Mode = mode; this.CodeSwitch.checked = mode === 'code';
                this.Codeview.hidden = mode !== 'code'; this.Workspace.hidden = mode === 'code';
                if (mode === 'blocks') this.RenderBlocks(); else this.WriteCode(this.Source);
                return true;
            } catch (error) { this.CodeSwitch.checked = this.Mode === 'code'; return this.Error(error); }
        },
        Accept: function (source, options) {
            options = options || {};
            let parsed;
            try { parsed = this.Parse(source); } catch (error) { return this.Error(error); }
            if (source !== this.Source) {
                if (options.history !== false) { this.History.push(this.Source); if (this.History.length > 60) this.History.shift(); this.Future = []; }
                this.Source = source; this.Dirty = true; this.Revision++;
            }
            this.Parsed = parsed; this.Selected = options.select === undefined ? this.Selected : options.select;
            this.WriteCode(source); if (options.render !== false) this.RenderBlocks();
            this.UpdateHistoryButtons(); return true;
        },
        BuildScript: async function () {
            try {
                await S.EnsureParser();
                if (S.Mode === 'code') return S.Accept(S.ReadCode());
                if (!S.FlushInspector()) return false;
                S.WriteCode(S.Source); S.Status(SI.Tools.Text.Editor('JavaScript updated · ') + S.Parsed.sourceType); return true;
            } catch (error) { return S.Error(error); }
        },
        SaveScript: async function () {
            if (!await S.BuildScript()) return false;
            if (S.LoadedType === 'Widget') {
                try {
                    await SI.Editor.Objects.Widgets.SaveSource(S.LoadedScript, 'script', S.Source);
                    S.Dirty = false; S.Status(SI.Tools.Text.Editor('Widget JavaScript saved in Dev · reload to run the new constructor.')); return true;
                } catch (error) { return S.Error(error); }
            }
            if (S.LoadedType !== 'Block' || !SI.Editor.Data.Objects.Blocks[S.LoadedScript]) {
                S.Status(SI.Tools.Text.Editor('Select a CMS block to save. Plugin source can be copied from Code.')); return false;
            }
            const block = SI.Editor.Data.Objects.Blocks[S.LoadedScript];
            block.script = S.Source; block.IsDirty = true; block.EditRevision = (block.EditRevision || 0) + 1;
            SI.Editor.Objects.Blocks.Save(S.LoadedScript, 'script');
            S.Dirty = false; S.Status(SI.Tools.Text.Editor('Save requested · ') + S.LoadedScript);
            // Preserve the existing explicit Save preview behavior.
            const current = document.getElementById('si_page_script');
            if (current) {
                const script = document.createElement('script');
                const address = new URL(current.src, location.href);
                address.searchParams.set('v', String(Date.now()));
                script.id = 'si_page_script'; script.src = address.href; current.replaceWith(script);
            }
            return true;
        },
        Undo: function () {
            if (!this.History.length) return false;
            const previous = this.History.pop(); this.Future.push(this.Source);
            return this.Accept(previous, {history: false, select: null});
        },
        Redo: function () {
            if (!this.Future.length) return false;
            const next = this.Future.pop(); this.History.push(this.Source);
            return this.Accept(next, {history: false, select: null});
        },
        UpdateHistoryButtons: function () {
            if (this.UndoButton) this.UndoButton.disabled = !this.History.length;
            if (this.RedoButton) this.RedoButton.disabled = !this.Future.length;
        },
        Slice: function (node) { return node ? this.Source.slice(node.start, node.end) : ''; },
        Children: function (node) {
            const children = [];
            for (const [key, value] of Object.entries(node)) {
                if (key === 'loc') continue;
                if (Array.isArray(value)) {
                    for (const child of value) if (child && typeof child.type === 'string') children.push({node: child, key});
                } else if (value && typeof value.type === 'string') children.push({node: value, key});
            }
            return children.sort((a, b) => a.node.start - b.node.start);
        },
        Regions: function (node) {
            const regions = [];
            if (node.type === 'BlockStatement' || node.type === 'StaticBlock') {
                return [{id: 'body:' + node.start, owner: node,
                    start: node.start + this.Source.slice(node.start, node.end).indexOf('{') + 1,
                    end: node.end - 1, nodes: node.body, label: SI.Tools.Text.Editor('Body'), single: false}];
            }
            const visit = (current, parent, key) => {
                const labels = {consequent: 'Then', alternate: 'Else', finalizer: 'Finally', block: 'Try'};
                if (['BlockStatement', 'ClassBody', 'StaticBlock'].includes(current.type)) {
                    let label = labels[key] || (parent?.type === 'CatchClause' ? 'Catch' : 'Body');
                    if (/Function/.test(parent?.type || '') && node !== parent) label = 'Callback body';
                    regions.push({id: current.type + ':' + current.start, owner: current,
                        start: current.start + (current.type === 'StaticBlock' ? this.Source.slice(current.start, current.end).indexOf('{') + 1 : 1),
                        end: current.end - 1, nodes: current.body, label, single: false});
                    return;
                }
                if (current.type === 'SwitchCase') {
                    const colon = this.Parsed.tokens.find(token => token.start >= (current.test ? current.test.end : current.start + 7)
                        && token.end <= (current.consequent[0]?.start || current.end) && token.type.label === ':');
                    regions.push({id: 'case:' + current.start, owner: current, start: colon ? colon.end : current.end,
                        end: current.end, nodes: current.consequent,
                        label: current.test ? SI.Tools.Text.Editor('case ') + this.Slice(current.test) : SI.Tools.Text.Editor('default'), single: false});
                    return;
                }
                if (current !== node && /Statement$/.test(current.type) && ['body', 'consequent', 'alternate'].includes(key)) {
                    regions.push({id: parent.type + ':' + parent.start + ':' + key, owner: parent,
                        start: current.start, end: current.end, nodes: [current], label: labels[key] || 'Body', single: true});
                    return;
                }
                for (const child of this.Children(current)) visit(child.node, current, child.key);
            };
            for (const child of this.Children(node)) visit(child.node, node, child.key);
            return regions;
        },
        Category: function (node) {
            if (/Function|Method/.test(node.type)) return {name: 'Function', tone: 'function'};
            if (/For|While|DoWhile/.test(node.type)) return {name: 'Loop', tone: 'loop'};
            if (/If|Switch|Conditional/.test(node.type)) return {name: 'Branch', tone: 'branch'};
            if (/Variable/.test(node.type)) return {name: 'Data', tone: 'data'};
            if (/Class/.test(node.type)) return {name: 'Class', tone: 'function'};
            if (/Return|Break|Continue|Throw|Try/.test(node.type)) return {name: node.type.replace(/Statement$/, ''), tone: 'control'};
            if (/Import|Export/.test(node.type)) return {name: 'Module', tone: 'module'};
            if (node.type === 'ExpressionStatement') return {name: /addEventListener/.test(this.Slice(node.expression)) ? 'Event' : 'Expression', tone: 'expression'};
            return {name: node.type.replace(/(Statement|Declaration|Expression)$/, ''), tone: 'expression'};
        },
        Summary: function (node, regions) {
            let text = this.Slice(node);
            for (const region of [...regions].sort((a, b) => b.start - a.start)) {
                text = text.slice(0, region.start - node.start) + ' … ' + text.slice(region.end - node.start);
            }
            return text.replace(/\s+/g, ' ').slice(0, 190);
        },
        RenderBlocks: function () {
            if (!this.Parsed || !this.Tree) return;
            const scroll = this.Tree.parentElement.scrollTop;
            this.Nodes = new Map(); this.Lanes = new Map(); this.Tree.replaceChildren();
            this.DrawLane({id: 'program', owner: this.Parsed.ast, start: 0, end: this.Source.length,
                nodes: this.Parsed.ast.body, label: SI.Tools.Text.Editor('Program'), single: false}, this.Tree, 0);
            if (!this.Lanes.has(this.ActiveLane)) this.ActiveLane = 'program';
            for (const [id, value] of this.Lanes) value.element.classList.toggle('is-active', id === this.ActiveLane);
            this.Stats.textContent = this.Parsed.ast.body.length + SI.Tools.Text.Editor(' top-level blocks · ') + this.Parsed.sourceType;
            this.DrawInspector(); this.Tree.parentElement.scrollTop = scroll;
            this.Status((this.Dirty ? SI.Tools.Text.Editor('Unsaved edits · ') : '') + SI.Tools.Text.Editor('JavaScript · ') + this.Parsed.sourceType + SI.Tools.Text.Editor(' · parsing does not run code.'));
        },
        DrawLane: function (region, parent, depth) {
            const lane = this.Element('section', {class: 'si-script-lane', data: {lane: region.id}}, parent);
            this.Lanes.set(region.id, {region, element: lane});
            const heading = this.Element('div', {class: 'si-script-lane-heading'}, lane);
            this.Element('span', {text: region.label}, heading);
            this.Button('+', SI.Tools.Text.Editor('Insert into ') + region.label, () => {
                this.ActiveLane = region.id;
                for (const [id, value] of this.Lanes) value.element.classList.toggle('is-active', id === region.id);
                this.Status(SI.Tools.Text.Editor('Insert into ') + region.label + SI.Tools.Text.Editor(' · choose a block from Build.'));
                this.Palette.querySelector('input').focus();
            }, heading);
            if (!region.nodes.length) this.Element('div', {class: 'si-script-empty', text: SI.Tools.Text.Editor('Drop or add a block here')}, lane);
            for (const node of region.nodes) this.DrawNode(node, region, lane, depth);
            lane.ondragover = event => {
                if (!this.Drag) return;
                event.preventDefault(); event.stopPropagation(); lane.classList.add('is-drop-target');
                event.dataTransfer.dropEffect = this.Drag.template ? 'copy' : 'move';
            };
            lane.ondragleave = event => { if (!lane.contains(event.relatedTarget)) lane.classList.remove('is-drop-target'); };
            lane.ondrop = event => {
                if (!this.Drag) return;
                event.preventDefault(); event.stopPropagation();
                const cards = Array.from(lane.children).filter(child => child.classList.contains('si-script-block'));
                let index = region.nodes.length;
                for (let i = 0; i < cards.length; i++) {
                    const rect = cards[i].getBoundingClientRect();
                    if (event.clientY < rect.top + rect.height / 2) { index = i; break; }
                }
                const drag = this.Drag; this.ClearDrag();
                if (drag.revision !== this.Revision) return this.Status(SI.Tools.Text.Editor('The script changed; drag the block again.'), true);
                if (drag.template) this.InsertTemplate(drag.template, region, index);
                else this.MoveNode(drag.start, region, index);
            };
        },
        DrawNode: function (node, region, parent, depth) {
            const category = this.Category(node), regions = this.Regions(node);
            const card = this.Element('article', {class: 'si-script-block tone-' + category.tone,
                data: {start: node.start, type: node.type}, tabIndex: 0,
                onclick: event => {
                    if (event.target.closest('button,input,textarea,select') || event.target.closest('.si-script-block') !== card) return;
                    this.Select(node.start);
                },
                onkeydown: event => {
                    if (event.target === card && ['Enter', ' '].includes(event.key)) { event.preventDefault(); this.Select(node.start); }
                }}, parent);
            this.Nodes.set(node.start, {node, region, card});
            if (this.Selected === node.start) card.classList.add('is-selected');
            const head = this.Element('div', {class: 'si-script-block-heading'}, card);
            const handle = this.Button('⋮⋮', SI.Tools.Text.Editor('Drag ') + category.name + SI.Tools.Text.Editor(' block'), () => this.Select(node.start), head, 'si-script-drag');
            handle.draggable = true;
            handle.ondragstart = event => {
                this.Drag = {start: node.start, revision: this.Revision};
                event.dataTransfer.setData('application/x-si-script-block', String(node.start));
                event.dataTransfer.effectAllowed = 'move'; event.stopPropagation();
            };
            handle.ondragend = () => this.ClearDrag();
            this.Element('span', {class: 'si-script-kind', text: category.name}, head);
            this.Element('code', {class: 'si-script-summary', text: this.Summary(node, regions), title: this.Slice(node)}, head);
            this.Element('span', {class: 'si-script-line', text: String(node.loc.start.line)}, head);
            this.Button(SI.Tools.Text.Editor('Edit'), SI.Tools.Text.Editor('Edit ') + category.name + SI.Tools.Text.Editor(' block'), () => this.Select(node.start), head);
            if (regions.length) {
                const key = node.type + ':' + node.start;
                const closed = this.Collapsed.has(key) || (depth > 1 && !this.Expanded?.has(key));
                const body = this.Element('div', {class: 'si-script-bodies', hidden: closed}, card);
                let drawn = false;
                const draw = () => { if (!drawn) { for (const child of regions) this.DrawLane(child, body, depth + 1); drawn = true; } };
                if (!closed) draw();
                const fold = this.Button(closed ? '▸' : '▾', SI.Tools.Text.Editor('Collapse or expand nested blocks'), () => {
                    body.hidden = !body.hidden; fold.textContent = body.hidden ? '▸' : '▾';
                    if (body.hidden) this.Collapsed.add(key);
                    else { this.Collapsed.delete(key); if (!this.Expanded) this.Expanded = new Set(); this.Expanded.add(key); draw(); }
                    fold.setAttribute('aria-expanded', String(!body.hidden));
                }, head);
                fold.setAttribute('aria-expanded', String(!closed));
            }
        },
        Select: function (start) {
            if (this.Selected !== start && this.HasInspectorDraft()) return this.Error(new Error('Apply the inspector changes before selecting another block.'));
            this.Selected = start;
            const selected = this.Nodes.get(start);
            if (selected) this.ActiveLane = selected.region.id;
            for (const [position, value] of this.Nodes) value.card.classList.toggle('is-selected', position === start);
            this.DrawInspector();
        },
        Fields: function (node) {
            const fields = [];
            const add = (label, value, extra) => { if (value) fields.push(Object.assign({label, start: value.start, end: value.end, value: this.Slice(value)}, extra)); };
            const parameters = fn => {
                if (fn.params.length) {
                    const first = fn.params[0], last = fn.params[fn.params.length - 1];
                    const unwrapped = fn.type === 'ArrowFunctionExpression' && fn.params.length === 1
                        && !this.Source.slice(fn.start, first.start).includes('(');
                    fields.push({label: SI.Tools.Text.Editor('Parameters'), start: first.start, end: last.end,
                        value: this.Source.slice(first.start, last.end),
                        transform: value => unwrapped && !/^[A-Za-z_$][\w$]*$/.test(value.trim()) ? '(' + value + ')' : value});
                } else {
                    const open = this.Parsed.tokens.find(token => token.start >= fn.start && token.end <= fn.body.start && token.type.label === '(');
                    if (open) fields.push({label: SI.Tools.Text.Editor('Parameters'), start: open.end, end: open.end, value: ''});
                }
            };
            if (node.type === 'VariableDeclaration') {
                const prefix = this.Parsed.tokens.filter(token => token.start >= node.start && token.end <= node.declarations[0].id.start);
                fields.push({label: SI.Tools.Text.Editor('Declaration'), start: node.start, end: prefix.at(-1)?.end || node.start + node.kind.length,
                    value: node.kind, choices: [...new Set(['const', 'let', 'var', node.kind])]});
                for (const declaration of node.declarations) {
                    add('Binding', declaration.id);
                    if (declaration.init && /Function/.test(declaration.init.type)) parameters(declaration.init);
                    else add('Value', declaration.init);
                }
            } else if (/^Function/.test(node.type)) {
                add('Name', node.id); parameters(node);
            } else if (node.type === 'IfStatement' || /^(While|DoWhile)Statement$/.test(node.type)) add('Condition', node.test);
            else if (node.type === 'ForStatement') {
                const open = this.Parsed.tokens.find(token => token.start >= node.start && token.type.label === '(');
                const first = this.Parsed.tokens.find(token => token.start >= (node.init?.end || open.end) && token.start < node.body.start && token.type.label === ';');
                const second = first && this.Parsed.tokens.find(token => token.start >= (node.test?.end || first.end) && token.start < node.body.start && token.type.label === ';');
                if (first && second) {
                    const close = this.Parsed.tokens.filter(token => token.end <= node.body.start && token.type.label === ')').at(-1);
                    for (const [label, start, end] of [['Initialize', open.end, first.start], ['Condition', first.end, second.start], ['Update', second.end, close.start]])
                        fields.push({label, start, end, value: this.Source.slice(start, end).trim()});
                }
            } else if (/^For(In|Of)Statement$/.test(node.type)) { add('Binding', node.left); add(node.type === 'ForOfStatement' ? 'Iterable' : 'Object', node.right); }
            else if (/^(Return|Throw)Statement$/.test(node.type)) add('Value', node.argument);
            else if (/^Class/.test(node.type)) { add('Name', node.id); add('Extends', node.superClass); }
            else if (node.type === 'SwitchStatement') add('Value', node.discriminant);
            else if (node.type === 'ExpressionStatement') {
                let expression = node.expression;
                if (expression.type === 'AwaitExpression') expression = expression.argument;
                if (['CallExpression', 'NewExpression'].includes(expression.type)) {
                    add('Call', expression.callee);
                    for (const argument of expression.arguments) {
                        if (/Function/.test(argument.type)) parameters(argument); else add('Argument', argument);
                    }
                } else if (expression.type === 'AssignmentExpression') { add('Target', expression.left); add('Value', expression.right); }
                else add('Expression', node.expression);
            }
            if (!fields.length && !this.Regions(node).length) add('JavaScript', node);
            return fields;
        },
        DrawInspector: function () {
            if (!this.Inspector) return;
            this.InspectorDraft = null;
            this.Inspector.replaceChildren();
            const selected = this.Nodes.get(this.Selected);
            this.Element('h3', {text: selected ? this.Category(selected.node).name : SI.Tools.Text.Editor('Inspector')}, this.Inspector);
            if (!selected) {
                this.Element('p', {class: 'si-script-hint', text: SI.Tools.Text.Editor('Select a block to edit its values. Every block also exposes its full JavaScript.')}, this.Inspector);
                return;
            }
            const node = selected.node, fields = this.Fields(node), controls = [];
            this.Element('p', {class: 'si-script-hint', text: node.type + SI.Tools.Text.Editor(' · line ') + node.loc.start.line}, this.Inspector);
            const form = this.Element('form', {class: 'si-script-fields', onsubmit: event => {
                event.preventDefault();
                this.FlushInspector();
            }}, this.Inspector);
            for (const field of fields) {
                const label = this.Element('label', {text: field.label}, form);
                const input = this.Element(field.choices ? 'select' : 'textarea',
                    {value: field.value, rows: field.value.includes('\n') ? 4 : 2, 'aria-label': field.label}, label);
                if (field.choices) {
                    for (const choice of field.choices) this.Element('option', {value: choice, text: choice}, input);
                    input.value = field.value;
                }
                controls.push({field, input, initialValue: input.value});
            }
            if (fields.length) this.Element('button', {type: 'submit', text: SI.Tools.Text.Editor('Apply changes'), class: 'si-script-primary'}, form);
            const actions = this.Element('div', {class: 'si-script-block-actions'}, this.Inspector);
            this.Button('↑', SI.Tools.Text.Editor('Move block up'), () => this.MoveRelative(node.start, -1), actions);
            this.Button('↓', SI.Tools.Text.Editor('Move block down'), () => this.MoveRelative(node.start, 1), actions);
            this.Button(SI.Tools.Text.Editor('Duplicate'), SI.Tools.Text.Editor('Duplicate this block'), () => this.Duplicate(node.start), actions);
            this.Button(SI.Tools.Text.Editor('Delete'), SI.Tools.Text.Editor('Delete this block'), () => this.DeleteNode(node.start), actions, 'si-script-danger');
            const raw = this.Element('details', {class: 'si-script-source'}, this.Inspector);
            this.Element('summary', {text: SI.Tools.Text.Editor('Full JavaScript')}, raw);
            const editor = this.Element('textarea', {value: this.Slice(node), rows: 10, spellcheck: false, 'aria-label': SI.Tools.Text.Editor('Full block JavaScript')}, raw);
            this.InspectorDraft = {node, controls, editor, source: editor.value};
            this.Button(SI.Tools.Text.Editor('Apply JavaScript'), SI.Tools.Text.Editor('Replace this block with JavaScript'), () => this.FlushInspector(), raw);
            this.Element('p', {class: 'si-script-hint', text: SI.Tools.Text.Editor('Changes are parsed in the surrounding program. Invalid edits leave the last valid version intact.')}, raw);
        },
        InspectorPatches: function () {
            const draft = this.InspectorDraft;
            if (!draft) return [];
            return draft.controls.filter(item => item.input.value !== item.initialValue).map(item => ({
                start: item.field.start, end: item.field.end,
                text: item.field.transform ? item.field.transform(item.input.value) : item.input.value
            }));
        },
        HasInspectorDraft: function () {
            const draft = this.InspectorDraft;
            return !!draft && (draft.editor.value !== draft.source || this.InspectorPatches().length > 0);
        },
        FlushInspector: function () {
            const draft = this.InspectorDraft;
            if (!draft) return true;
            const patches = this.InspectorPatches(), rawChanged = draft.editor.value !== draft.source;
            if (patches.length && rawChanged) return this.Error(new Error('Apply field edits or full JavaScript edits separately.'));
            if (rawChanged) return this.ApplyPatches([{start: draft.node.start, end: draft.node.end, text: draft.editor.value}], draft.node.start);
            return !patches.length || this.ApplyPatches(patches, draft.node.start);
        },
        ApplyPatches: function (patches, select) {
            let candidate = this.Source, boundary = candidate.length + 1;
            for (const patch of [...patches].sort((a, b) => b.start - a.start || b.end - a.end)) {
                if (patch.start < 0 || patch.end < patch.start || patch.end > this.Source.length || patch.end > boundary)
                    return this.Error(new Error('These edits overlap. Apply one change at a time.'));
                candidate = candidate.slice(0, patch.start) + patch.text + candidate.slice(patch.end);
                boundary = patch.start;
            }
            return this.Accept(candidate, {select});
        },
        UnitRange: function (node, region) {
            const index = region.nodes.indexOf(node), previous = region.nodes[index - 1];
            let start = previous ? previous.end : region.start, end = node.end;
            if (!previous && region.id === 'program' && this.Source.startsWith('#!')) start = this.Source.indexOf('\n') + 1;
            for (const comment of this.Parsed.comments) {
                if (previous && comment.start >= previous.end && comment.end <= node.start && comment.loc.start.line === previous.loc.end.line) start = comment.end;
                if (comment.start >= node.end && comment.end <= region.end && comment.loc.start.line === node.loc.end.line) end = Math.max(end, comment.end);
            }
            return {start, end};
        },
        InsertTemplate: function (name, region, index) {
            const template = this.Templates.find(item => item.name === name);
            if (!template || !this.Parsed) return false;
            region = region || this.Lanes.get(this.ActiveLane)?.region || this.Lanes.get('program').region;
            let code = template.code;
            const first = /^(?:const|let|var|(?:async\s+)?function|class)\b/.test(code) ? this.Parse(code).ast.body[0] : {};
            const binding = first.type === 'VariableDeclaration' ? first.declarations[0].id : first.id;
            if (binding?.type === 'Identifier') {
                let name = binding.name, suffix = 2;
                while (new RegExp('\\b' + name + '\\b').test(this.Source)) name = binding.name + suffix++;
                if (name !== binding.name) code = code.replace(new RegExp('\\b' + binding.name + '\\b', 'g'), name);
            }
            return this.InsertInto(region, index === undefined ? region.nodes.length : index, code);
        },
        InsertInto: function (region, index, text) {
            if (this.HasInspectorDraft()) return this.Error(new Error('Apply the inspector changes before inserting a block.'));
            const position = index < region.nodes.length ? this.UnitRange(region.nodes[index], region).start : region.end;
            if (region.single) {
                const current = this.Source.slice(region.start, region.end), relative = position - region.start;
                return this.ApplyPatches([{start: region.start, end: region.end,
                    text: '{\n' + current.slice(0, relative) + '\n' + text + '\n' + current.slice(relative) + '\n}'}], region.start);
            }
            return this.ApplyPatches([{start: position, end: position, text: '\n' + text + '\n'}], position + 1);
        },
        DeleteNode: function (start) {
            if (this.HasInspectorDraft()) return this.Error(new Error('Apply the inspector changes before deleting a block.'));
            const value = this.Nodes.get(start);
            if (!value) return false;
            const range = this.UnitRange(value.node, value.region);
            return this.ApplyPatches([{start: range.start, end: range.end, text: value.region.single ? '{}' : ''}], null);
        },
        Duplicate: function (start) {
            if (this.HasInspectorDraft()) return this.Error(new Error('Apply the inspector changes before duplicating a block.'));
            const value = this.Nodes.get(start);
            if (!value) return false;
            const range = this.UnitRange(value.node, value.region);
            return this.ApplyPatches([{start: range.end, end: range.end, text: '\n' + this.Source.slice(range.start, range.end) + '\n'}], range.end + 1);
        },
        MoveRelative: function (start, direction) {
            const value = this.Nodes.get(start);
            if (!value) return false;
            const index = value.region.nodes.indexOf(value.node);
            if (index + direction < 0 || index + direction >= value.region.nodes.length) return false;
            return this.MoveNode(start, value.region, direction < 0 ? index - 1 : index + 2);
        },
        MoveNode: function (start, target, index) {
            if (this.HasInspectorDraft()) return this.Error(new Error('Apply the inspector changes before moving a block.'));
            const value = this.Nodes.get(start);
            if (!value) return false;
            if (value.region === target) {
                const current = target.nodes.indexOf(value.node);
                if (index === current || index === current + 1) return true;
            }
            const range = this.UnitRange(value.node, value.region);
            const position = index < target.nodes.length ? this.UnitRange(target.nodes[index], target).start : target.end;
            if (position >= range.start && position <= range.end) return this.Error(new Error('A block cannot be moved inside itself.'));
            if (target.start >= value.node.start && target.end <= value.node.end) return this.Error(new Error('A block cannot contain itself.'));
            const text = '\n' + this.Source.slice(range.start, range.end) + '\n';
            const remove = {start: range.start, end: range.end, text: value.region.single ? '{}' : ''};
            if (target.single) {
                const body = this.Source.slice(target.start, target.end), at = position - target.start;
                return this.ApplyPatches([remove, {start: target.start, end: target.end,
                    text: '{\n' + body.slice(0, at) + text + body.slice(at) + '\n}'}], null);
            }
            return this.ApplyPatches([remove, {start: position, end: position, text}], null);
        },
        ClearDrag: function () {
            this.Drag = null;
            if (this.Tree) for (const lane of this.Tree.querySelectorAll('.is-drop-target')) lane.classList.remove('is-drop-target');
        },
        WriteCode: function (source) {
            if (!this.Codepad) return;
            const fragment = document.createDocumentFragment();
            try {
                if (!this.Parser) throw new Error('Parser is loading.');
                const comments = [], spans = [];
                const tokenizer = this.Parser.tokenizer(source, {ecmaVersion: 'latest', onComment: comments});
                for (;;) {
                    const token = tokenizer.getToken();
                    if (token.type.label === 'eof') break;
                    const label = token.type.label;
                    let kind = token.type.keyword ? 'keyword' : ['string', 'template', String.fromCharCode(96)].includes(label) ? 'string'
                        : ['num', 'bigint', 'regexp'].includes(label) ? 'literal' : 'punctuation';
                    if (label === 'name' || label === 'privateId') kind = 'name';
                    spans.push({start: token.start, end: token.end, kind});
                }
                for (const comment of comments) spans.push({start: comment.start, end: comment.end, kind: 'comment'});
                let position = 0;
                for (const span of spans.sort((a, b) => a.start - b.start)) {
                    fragment.appendChild(document.createTextNode(source.slice(position, span.start)));
                    this.Element('span', {class: 'si-script-token-' + span.kind, text: source.slice(span.start, span.end)}, fragment);
                    position = span.end;
                }
                fragment.appendChild(document.createTextNode(source.slice(position)));
            } catch (_) { fragment.replaceChildren(document.createTextNode(source)); }
            this.Codepad.replaceChildren(fragment); this.CodeEdited = false; this.ComputeLineNumbers();
        },
        HighlightSyntax: function () { S.WriteCode(S.ReadCode()); },
        ComputeLineNumbers: function () {
            if (!this.LineNumbers || !this.Codepad) return 1;
            const count = this.Codepad.textContent.split(/\r\n|\r|\n/).length;
            this.LineNumbers.textContent = Array.from({length: count}, (_, index) => index + 1).join('\n');
            return count;
        },
        AddLineNumbers: function (count) {
            const current = this.ComputeLineNumbers();
            if (this.LineNumbers) this.LineNumbers.textContent = Array.from({length: Math.max(current, count || 1)}, (_, index) => index + 1).join('\n');
        }
    };
})();
