/* Shared placement for the Add palette and moving selected elements.
 * Previews live outside page blocks. Constructors run only after a valid drop.
 */
SI.Editor.Objects.Placement = {
    State: null,
    Init: function () {
        if (this.Initialized) return;
        this.Initialized = true;
        const placement = this;
        document.addEventListener('dragover', function (event) {
            if (!placement.State || placement.State.pointer) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            placement.Update(event.clientX, event.clientY);
            event.dataTransfer.dropEffect = placement.State.parent ? (placement.State.kind === 'move' ? 'move' : 'copy') : 'none';
        }, true);
        document.addEventListener('drop', function (event) {
            if (!placement.State || placement.State.pointer) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            placement.Update(event.clientX, event.clientY);
            placement.Commit();
        }, true);
        document.addEventListener('dragend', function () { placement.Cancel(); }, true);
        document.addEventListener('dragleave', function (event) {
            if (placement.State && !event.relatedTarget && (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= innerWidth || event.clientY >= innerHeight)) placement.Hide();
        }, true);
        document.addEventListener('mousemove', function (event) {
            if (placement.State && placement.State.pointer) placement.Update(event.clientX, event.clientY);
        });
        document.addEventListener('scroll', function () {
            const state = placement.State;
            if (state) placement.Update(state.x + (state.grabX || 0), state.y + (state.grabY || 0));
        }, true);
        window.addEventListener('blur', function () { placement.Cancel(); });
        document.addEventListener('click', function (event) {
            if (!placement.State || !placement.State.pointer || event.target.closest('#si_edit_container,.si-window-container,.si-deployment-control,[data-si-editor-ui]')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            placement.Update(event.clientX, event.clientY);
            if (placement.State.parent) placement.Commit();
        }, true);
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && placement.State) {
                event.preventDefault();
                event.stopImmediatePropagation();
                placement.Cancel();
            }
        }, true);
    },
    Begin: function (event, item) {
        this.Cancel();
        this.Init();
        const state = this.State = Object.assign({}, item, {pointer: !event.dataTransfer});
        const overlay = state.overlay = document.createElement('div');
        overlay.id = 'si_edit_placement';
        overlay.dataset.siEditorUi = 'true';
        overlay.setAttribute('aria-hidden', 'true');
        const outline = state.outline = document.createElement('div');
        outline.className = 'si-placement-target';
        const ghost = state.ghost = document.createElement('div');
        ghost.className = 'si-placement-ghost';
        const label = state.label = document.createElement('div');
        label.className = 'si-placement-label';
        let preview;
        if (item.kind === 'move') {
            const rect = item.element.getBoundingClientRect();
            state.grabX = event.clientX - rect.left;
            state.grabY = event.clientY - rect.top;
            // A lightweight visual snapshot; no duplicate live controls or handlers.
            preview = document.createElement('div');
            preview.textContent = item.element.textContent.trim().slice(0, 100) || item.element.tagName.toLowerCase();
            preview.style.width = rect.width + 'px';
            preview.style.height = rect.height + 'px';
        } else if (item.kind === 'widget') {
            const size = SI.Editor.Objects.Widgets.PlacementSize(item.name);
            preview = document.createElement('div');
            preview.className = 'si-placement-widget';
            preview.textContent = item.name;
            preview.style.width = size.width + 'px';
            preview.style.height = size.height + 'px';
        } else {
            preview = this.Tag(item, true);
        }
        state.preview = preview;
        ghost.appendChild(preview);
        overlay.append(outline, ghost, label);
        document.body.appendChild(overlay);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = item.kind === 'move' ? 'move' : 'copy';
            event.dataTransfer.setData('application/x-superintuitive-placement', item.name || item.element.id);
            event.dataTransfer.setData('text/plain', item.name || item.element.id);
            // The page ghost is the drag image; suppress the browser's second image.
            const image = document.createElement('canvas');
            image.width = image.height = 1;
            overlay.appendChild(image);
            event.dataTransfer.setDragImage(image, 0, 0);
        }
        event.stopPropagation();
        SI.Editor.UI.MainMenu.IsDragging = false;
        this.Update(event.clientX, event.clientY);
    },
    Tag: function (item, preview) {
        const name = item.name.trim().toLowerCase();
        // Executable, external, and invisible content has an inert outline preview.
        if (preview && /^(script|style|iframe|object|embed|link|meta|base|title|source|track|area)$/.test(name)) {
            const placeholder = document.createElement('div');
            placeholder.className = 'si-placement-widget';
            placeholder.textContent = '<' + name + '>';
            placeholder.style.width = '200px';
            placeholder.style.height = '80px';
            return placeholder;
        }
        const element = Ele(name, JSON.parse(JSON.stringify(item.defaults || {})));
        if (!SI.Tools.Is.EmptyElement(name) && !element.innerHTML.trim()) element.textContent = name === 'div' ? '' : name;
        if (name === 'script') element.textContent = "// Your script starts here\n";
        element.style.position = preview ? 'relative' : 'absolute';
        element.style.margin = '0';
        element.style.boxSizing = 'border-box';
        if (preview) {
            element.removeAttribute('id');
            element.removeAttribute('autofocus');
            element.tabIndex = -1;
            element.style.left = element.style.top = '0';
        }
        return element;
    },
    CanContain: function (parent, name) {
        const tag = parent.tagName.toLowerCase();
        if (tag === 'select') return /^(option|optgroup)$/.test(name);
        if (/^(html|head|script|style|iframe|object|textarea|input|option|button|svg|canvas|video|audio)$/.test(tag) || SI.Tools.Is.EmptyElement(tag)) return false;
        if (getComputedStyle(parent).display === 'contents') return false;
        const children = {table: ['caption', 'colgroup', 'thead', 'tbody', 'tfoot'], thead: ['tr'], tbody: ['tr'], tfoot: ['tr'], tr: ['td', 'th'], colgroup: ['col'], ul: ['li'], ol: ['li'], dl: ['dt', 'dd']};
        if (children[tag] && !children[tag].includes(name)) return false;
        const parents = {li: ['ul', 'ol'], tr: ['tbody', 'thead', 'tfoot'], td: ['tr'], th: ['tr'], option: ['select', 'datalist', 'optgroup'], caption: ['table'], colgroup: ['table'], col: ['colgroup'], thead: ['table'], tbody: ['table'], tfoot: ['table']};
        if (parents[name] && !parents[name].includes(tag)) return false;
        if (/^(a|p|span|h[1-6]|strong|em|label)$/.test(tag) && !/^(a|span|strong|em|b|i|small|br|img|input|code|sub|sup)$/.test(name)) return false;
        if (name === 'a' && parent.closest('a')) return false;
        return true;
    },
    Target: function (x, y) {
        const state = this.State;
        let target = document.elementFromPoint(x, y);
        if (!target || target.closest('#si_edit_container,.si-window-container,.si-deployment-control,[data-si-editor-ui]')) return null;
        if (state.kind === 'move' && state.element.contains(target)) target = state.element.parentElement;
        const block = target.closest('.si-block');
        if (!block) return null;
        const name = state.kind === 'tag' ? state.name.trim() : state.kind === 'move' ? state.element.tagName.toLowerCase() : 'div';
        while (target && block.contains(target)) {
            if (this.CanContain(target, name) && !(state.kind === 'move' && state.element.contains(target))) return target;
            if (target === block) break;
            target = target.parentElement;
        }
        return null;
    },
    Update: function (x, y) {
        const state = this.State;
        if (!state) return;
        state.x = x - (state.grabX || 0);
        state.y = y - (state.grabY || 0);
        state.parent = this.Target(x, y);
        state.overlay.style.display = 'block';
        state.ghost.style.left = state.x + 'px';
        state.ghost.style.top = state.y + 'px';
        state.overlay.classList.toggle('si-placement-invalid', !state.parent);
        state.outline.style.display = state.parent ? 'block' : 'none';
        if (state.parent) {
            const rect = state.parent.getBoundingClientRect();
            Object.assign(state.outline.style, {left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'});
            const style = getComputedStyle(state.parent);
            state.ghost.style.font = style.font;
            state.ghost.style.color = style.color;
        }
        state.label.textContent = state.parent ? (state.kind === 'move' ? 'Move' : 'Add') + ' ' + (state.name || state.element.tagName.toLowerCase()) + ' into ' + state.parent.tagName.toLowerCase() + (state.parent.id ? ' #' + state.parent.id : '') + ' · Esc to cancel' : 'Choose a position inside a page block · Esc to cancel';
        state.label.style.left = Math.max(4, Math.min(x, innerWidth - 330)) + 'px';
        state.label.style.top = Math.max(4, Math.min(y - 30, innerHeight - 35)) + 'px';
    },
    Position: function (element, x, y) {
        // Measure the actual containing block after insertion. This includes borders,
        // nested scrolling, document scrolling, and scaled ancestors.
        element.style.position = 'absolute';
        element.style.left = element.style.top = '0px';
        const origin = element.getBoundingClientRect();
        const scaleX = element.offsetWidth ? origin.width / element.offsetWidth : 1;
        const scaleY = element.offsetHeight ? origin.height / element.offsetHeight : 1;
        element.style.left = (x - origin.left) / (scaleX || 1) + 'px';
        element.style.top = (y - origin.top) / (scaleY || 1) + 'px';
    },
    Commit: function () {
        const state = this.State;
        if (!state || !state.parent || !state.parent.isConnected) { this.Cancel(); return; }
        const parent = state.parent;
        const block = parent.closest('.si-block');
        const oldBlock = state.kind === 'move' ? state.element.closest('.si-block') : null;
        let element;
        try {
            if (state.kind === 'widget') {
                const size = SI.Editor.Objects.Widgets.PlacementSize(state.name);
                element = SI.Editor.Objects.Widgets.AddInstance(block.id.replace('si_block_', ''), state.name, {Parent: parent, Width: size.width + 'px', Height: size.height + 'px'});
            } else {
                element = state.kind === 'move' ? state.element : this.Tag(state, false);
                parent.appendChild(element);
            }
            this.Position(element, state.x, state.y);
            SI.Editor.Objects.Widgets.UpdatePlacement(element, oldBlock);
            if (state.kind !== 'move') {
                SI.Editor.Objects.Elements.Editable(element);
                element.querySelectorAll('*').forEach(child => SI.Editor.Objects.Elements.Editable(child));
            }
            SI.Editor.Objects.Elements.MarkDirty(block);
            if (oldBlock && oldBlock !== block) SI.Editor.Objects.Elements.MarkDirty(oldBlock);
            SI.Editor.Objects.Elements.SelectNone(true);
            SI.Editor.Objects.Elements.Select(null, element.id);
            SI.Editor.UI.MainMenu.Element.style.display = 'none';
        } catch (error) {
            console.error('Unable to place item', error);
            SI.Tools.SuperAlert('Unable to add this item. Your page has not been saved.', 3000);
        } finally {
            this.Cancel();
        }
    },
    Hide: function () {
        if (this.State) { this.State.parent = null; this.State.overlay.style.display = 'none'; }
    },
    Cancel: function () {
        if (this.State) this.State.overlay.remove();
        this.State = null;
        if (SI.Editor.Objects.Elements) SI.Editor.Objects.Elements.DropParent = null;
    }
};
