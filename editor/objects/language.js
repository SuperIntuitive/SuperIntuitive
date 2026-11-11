SI.Editor.Objects.Language = {
    CurrentInstalled: [],
    PerferredInstalledLanguage: "",
    ActiveLanguage: "",
    Tabs: null,
    Body: null,
    Pending: {},
    LastChar: 32,
    Id: function (id) {
        return "0x" + id.replace(/^0x/i, "").toLowerCase();
    },
    Element: function (id) {
        return this.Body ? this.Body.querySelector("#" + id) : null;
    },
    Find: function (id) {
        if (!id) return null;
        return SI.Editor.Data.Objects.Language.Current.find(record => this.Id(record.id) === this.Id(id)) || null;
    },
    Preferences: function () {
        const model = SI.Editor.Data.Objects.Language;
        const codes = [];
        for (const value of model.Installed.concat(model.CurrentPreference.split(","))) {
            const code = value.split(";")[0].trim().toLowerCase();
            for (const candidate of [code, code.split("-")[0]]) {
                if (candidate && !codes.includes(candidate)) codes.push(candidate);
            }
        }
        if (!codes.includes("en")) codes.push("en");
        return codes;
    },
    Translation: function (record, otherLanguages = false) {
        const codes = this.Preferences();
        if (otherLanguages) {
            for (const field of Object.keys(record)) {
                if (field.startsWith("_") && !codes.includes(field.slice(1))) codes.push(field.slice(1));
            }
        }
        for (const code of codes) {
            const text = record["_" + code];
            if (typeof text === "string" && text.length) return { language: code, text: text };
        }
        return { language: "", text: "" };
    },
    Populate: function (select) {
        const selected = select.value;
        select.replaceChildren(Ele("option", { value: "" }));
        for (const record of SI.Editor.Data.Objects.Language.Current) {
            const translation = this.Translation(record, true);
            const preview = document.createElement("template");
            preview.innerHTML = translation.text;
            const text = preview.content.textContent.trim() || record.name;
            const characters = Array.from(text);
            Ele("option", {
                textContent: characters.length > 32 ? characters.slice(0, 32).join("") + "\u2026" : text,
                value: this.Id(record.id),
                data: { token: record.name, lang: translation.language },
                appendTo: select,
            });
        }
        select.value = selected;
        if (select.selectedIndex < 0) select.value = "";
    },
    RefreshOptions: function () {
        for (const id of ["si_edit_lang_textselect", "si_edit_main_advanced_mlselect"]) {
            const select = id === "si_edit_lang_textselect" ? this.Element(id) : document.getElementById(id);
            if (select) this.Populate(select);
        }
    },
    Controls: function () {
        const available = this.Element("si_edit_lang_availablelangs");
        const add = this.Element("si_edit_language_add");
        if (available && add) {
            const option = available.selectedOptions[0];
            add.textContent = option && option.value ? SI.Tools.Text.Editor("Add ") + option.text : SI.Tools.Text.Editor("Add");
            add.disabled = !!this.Pending.AddLanguage || !option || !option.value || option.disabled;
        }
        const create = this.Element("si_edit_lang_new");
        if (create) create.disabled = !!this.Pending.LocaltextNew || !this.PerferredInstalledLanguage;
        const save = this.Element("si_edit_lang_save");
        if (save) {
            save.value = SI.Tools.Text.Editor("Save") + (this.ActiveLanguage ? " " + this.ActiveLanguage : "");
            save.disabled = !!this.Pending.UpdateLocaltext || !this.Selected() || !this.ActiveLanguage;
        }
        const installed = this.Element("si_edit_lang_supportedlangs");
        const remove = this.Element("si_edit_language_remove");
        if (installed && remove) {
            const defaults = SI.Editor.Data.Objects.Language.DefaultLanguages;
            remove.disabled = !!this.Pending.RemoveLanguage || !installed.value || this.CurrentInstalled.length <= 1 || defaults.includes(installed.value);
            remove.title = defaults.includes(installed.value) ? SI.Tools.Text.Editor("Configured default languages cannot be removed.") : SI.Tools.Text.Editor("Permanently delete this language's translations across all sites in this database.");
        }
    },
    Request: function (data) {
        if (this.Pending[data.KEY]) return;
        this.Pending[data.KEY] = true;
        this.Controls();
        const finished = () => { delete this.Pending[data.KEY]; this.Controls(); };
        const request = SI.Editor.Ajax.Run({ Data: data, Finally: finished });
        // Private read-only integrations can reject synchronously instead of returning an XHR.
        if (request && request.status >= 400) finished();
    },
    Selected: function () {
        const select = this.Element("si_edit_lang_textselect");
        return select ? this.Find(select.value) : null;
    },
    Select: function (id) {
        const select = this.Element("si_edit_lang_textselect");
        select.value = id ? this.Id(id) : "";
        const record = this.Selected();
        for (const box of this.Body.getElementsByClassName("si_edit_lang_box")) {
            box.innerHTML = record && typeof record["_" + box.dataset.language] === "string" ? record["_" + box.dataset.language] : "";
            box.contentEditable = record ? "true" : "false";
        }
        this.Controls();
    },
    Preview: function (record) {
        const text = this.Translation(record).text;
        SI.Tools.Class.Loop("si-multilingual-" + record.name, element => { element.innerHTML = text; });
    },
    Text: function (box) {
        // Browsers leave a placeholder BR after deleting the last editable character.
        return box.innerHTML === "<br>" ? "" : box.innerHTML;
    },
    Bind: function (element, id) {
        if (!element) {
            SI.Tools.SuperAlert(SI.Tools.Text.Editor("Select an element first."), 4000);
            return false;
        }
        const record = id ? this.Find(id) : null;
        if (id && !record) {
            SI.Tools.SuperAlert(SI.Tools.Text.Editor("The multilingual text was not found."), 4000);
            return false;
        }
        for (const name of Array.from(element.classList)) {
            if (name === "si-multilingual" || name.startsWith("si-multilingual-")) element.classList.remove(name);
        }
        delete element.dataset.si_ml_index;
        delete element.dataset.si_ml_token;
        if (record) {
            element.innerHTML = this.Translation(record).text;
            element.classList.add("si-multilingual", "si-multilingual-" + record.name);
            element.dataset.si_ml_index = SI.Editor.Data.Objects.Language.Current.indexOf(record);
            element.dataset.si_ml_token = record.name;
        }
        SI.Editor.Objects.Elements.MarkDirty(element);
        SI.Editor.UI.EditPanel.SetSelectedElementValues(element);
        return true;
    },
    AddTab: function (code, name) {
        const record = this.Selected();
        const box = Ele("div", {
            id: "si_edit_lang_box_" + code,
            class: "si_edit_lang_box",
            data: { language: code },
            contentEditable: record ? "true" : "false",
            innerHTML: record && typeof record["_" + code] === "string" ? record["_" + code] : "",
            style: { minHeight: "500px", width: "100%", padding: "15px" },
            oninput: function () {
                const language = SI.Editor.Objects.Language;
                const current = language.Selected();
                if (!current) return;
                current["_" + this.dataset.language] = language.Text(this);
                language.Preview(current);
                language.RefreshOptions();
            },
        });
        SI.Tools.Text.FingAutoCorrect(box);
        this.Tabs.Items.Add(name, box);
    },
    Added: function (language) {
        const code = language.langcode;
        const installed = this.Element("si_edit_lang_supportedlangs");
        const available = this.Element("si_edit_lang_availablelangs");
        if (!this.CurrentInstalled.includes(code)) {
            this.CurrentInstalled.push(code);
            if (installed) {
                Ele("option", { textContent: language.name, value: code, appendTo: installed });
                SI.Tools.Select.Sort(installed);
            }
            if (this.Tabs) this.AddTab(code, language.name);
        }
        if (available) {
            for (const option of available.options) if (option.value === code) option.disabled = true;
            const next = Array.from(available.options).find(option => option.value && !option.disabled);
            available.value = next ? next.value : "";
        }
        const model = SI.Editor.Data.Objects.Language;
        if (installed) model.SupportedLanguages = installed.innerHTML;
        SI.Editor.Data.Objects.Entities.Definitions.localtext.attributes["_" + code] = { type: "text" };
        if (!this.PerferredInstalledLanguage) {
            this.PerferredInstalledLanguage = code;
            this.ActiveLanguage = code;
            const input = this.Element("si_edit_lang_newtext");
            if (input) { input.dataset.language = code; input.placeholder = code + SI.Tools.Text.Editor(" text"); }
        }
        this.Controls();
    },
    Remove: function () {
        const code = this.Element("si_edit_lang_supportedlangs").value;
        const defaults = SI.Editor.Data.Objects.Language.DefaultLanguages;
        if (!code || this.CurrentInstalled.length <= 1 || defaults.includes(code)) {
            SI.Tools.SuperAlert(SI.Tools.Text.Editor("Configured defaults and the last installed language cannot be removed."), 4000);
            return;
        }
        if (confirm(SI.Tools.Text.Editor("Permanently remove ") + code + SI.Tools.Text.Editor("?\n\nThis deletes ALL of this language's translations for EVERY site sharing this database, including unsaved text in this language. It cannot be undone. The other languages and text records remain.\n\nBack up the database first. Continue?"))) {
            this.Request({ KEY: "RemoveLanguage", langcode: code, confirm: true });
        }
    },
    Removed: function (language) {
        const code = language.langcode;
        this.CurrentInstalled = this.CurrentInstalled.filter(value => value !== code);
        const installed = this.Element("si_edit_lang_supportedlangs");
        if (installed) {
            const option = Array.from(installed.options).find(value => value.value === code);
            if (option) {
                if (this.Tabs) this.Tabs.Items.Remove(option.text);
                option.remove();
            }
            SI.Editor.Data.Objects.Language.SupportedLanguages = installed.innerHTML;
        }
        const available = this.Element("si_edit_lang_availablelangs");
        if (available) {
            for (const option of available.options) if (option.value === code) option.disabled = false;
            available.value = code;
        }
        delete SI.Editor.Data.Objects.Entities.Definitions.localtext.attributes["_" + code];
        for (const record of SI.Editor.Data.Objects.Language.Current) {
            delete record["_" + code];
            this.Preview(record);
        }
        const fallback = this.Preferences().find(value => this.CurrentInstalled.includes(value)) || this.CurrentInstalled[0] || "";
        if (this.ActiveLanguage === code) this.ActiveLanguage = fallback;
        if (this.PerferredInstalledLanguage === code) {
            this.PerferredInstalledLanguage = fallback;
            const input = this.Element("si_edit_lang_newtext");
            if (input) { input.value = ""; input.dataset.language = fallback; input.placeholder = fallback + SI.Tools.Text.Editor(" text"); }
        }
        if (installed && this.Tabs) {
            const option = Array.from(installed.options).find(value => value.value === this.ActiveLanguage);
            if (option) this.Tabs.SelectTab(option.text);
        }
        this.RefreshOptions();
        this.Controls();
        SI.Tools.SuperAlert(SI.Tools.Text.Editor("Language removed. Its translations were permanently deleted."), 4000);
    },
    Draw: function () {
        const language = this;
        const model = SI.Editor.Data.Objects.Language;
        const base = Ele("div", { class: "si-tool-body" });
        this.Body = base;
        const menu = Ele("div", { style: { width: "100%", lineHeight: "25px" }, appendTo: base });
        Ele("span", { textContent: SI.Tools.Text.Editor("Detected Languages: ") + model.Installed.join(", "), appendTo: menu });
        Ele("br", { appendTo: menu });
        Ele("span", { textContent: SI.Tools.Text.Editor("Installed Languages: "), appendTo: menu });
        const installed = Ele("select", {
            id: "si_edit_lang_supportedlangs", innerHTML: model.SupportedLanguages, appendTo: menu,
            onchange: function () {
                if (this.value && language.Tabs) language.Tabs.SelectTab(this.selectedOptions[0].text);
            },
        });
        SI.Tools.Select.Sort(installed);
        Ele("button", {
            id: "si_edit_language_remove", textContent: SI.Tools.Text.Editor("Remove"), style: { color: "red", marginLeft: "10px" },
            onclick: () => this.Remove(), appendTo: menu,
        });
        this.CurrentInstalled = Array.from(installed.options, option => option.value.toLowerCase()).filter(Boolean);
        this.PerferredInstalledLanguage = this.Preferences().find(code => this.CurrentInstalled.includes(code)) || this.CurrentInstalled[0] || "";
        this.ActiveLanguage = this.PerferredInstalledLanguage;
        Ele("br", { appendTo: menu });
        Ele("span", { textContent: SI.Tools.Text.Editor("Install a new language: "), appendTo: menu });
        const available = Ele("select", {
            id: "si_edit_lang_availablelangs", innerHTML: model.Options, appendTo: menu,
            onchange: () => this.Controls(),
        });
        for (const option of available.options) option.disabled = this.CurrentInstalled.includes(option.value);
        const next = Array.from(available.options).find(option => option.value && !option.disabled);
        available.value = next ? next.value : "";
        Ele("button", {
            id: "si_edit_language_add", textContent: SI.Tools.Text.Editor("Add"), style: { color: "red" }, appendTo: menu,
            onclick: function () {
                const option = available.selectedOptions[0];
                if (option && option.value && !option.disabled) language.Request({ KEY: "AddLanguage", langcode: option.value, name: option.text });
            },
        });
        const mapLabel = Ele("div", { textContent: SI.Tools.Text.Editor("Char Map "), style: { margin: "5px 0" }, appendTo: base });
        this.LastChar = 32;
        const map = Ele("div", {
            id: "si_edit_language_charmap", contentEditable: true, appendTo: base,
            style: { padding: "10px", height: "150px", width: "95%", color: "white", overflowY: "scroll", overflowX: "auto", font: "20px/40px Arial, Helvetica, sans-serif", display: "none", letterSpacing: ".5em", cursor: "pointer" },
            onscroll: function () {
                if (this.scrollTop + this.clientHeight >= this.scrollHeight - 40) language.DrawChars(1000);
            },
        });
        SI.Tools.Text.FingAutoCorrect(map);
        Ele("input", {
            type: "checkbox", appendTo: mapLabel,
            onchange: function () {
                if (this.checked && language.LastChar === 32) language.DrawChars(3000);
                map.style.display = this.checked ? "block" : "none";
            },
        });
        const newLabel = Ele("div", { textContent: SI.Tools.Text.Editor("New: "), style: { display: "inline-block", margin: "5px 5px 5px 0" }, appendTo: base });
        Ele("input", {
            id: "si_edit_lang_newtext", placeholder: this.PerferredInstalledLanguage + SI.Tools.Text.Editor(" text"),
            data: { language: this.PerferredInstalledLanguage }, appendTo: newLabel,
        });
        Ele("input", { id: "si_edit_lang_new", type: "button", value: SI.Tools.Text.Editor("New"), style: { marginRight: "20px" }, onclick: () => this.New(), appendTo: newLabel });
        const editLabel = Ele("div", { textContent: SI.Tools.Text.Editor("Edit: "), style: { display: "inline-block" }, appendTo: base });
        const select = Ele("select", { id: "si_edit_lang_textselect", onchange: function () { language.Select(this.value); }, appendTo: editLabel });
        this.Populate(select);
        Ele("input", { id: "si_edit_lang_save", type: "button", value: SI.Tools.Text.Editor("Save"), onclick: () => this.Update(), appendTo: editLabel });
        this.Tabs = new SI.Widget.Tab({
            Width: "90%", Height: "70%",
            OnChange: function (tab) {
                language.ActiveLanguage = language.Tabs.Items.Contents(tab.dataset.tabname).dataset.language;
                installed.value = language.ActiveLanguage;
                language.Controls();
            },
        });
        for (const option of installed.options) if (option.value) this.AddTab(option.value, option.text);
        base.appendChild(this.Tabs.Draw());
        const preferred = Array.from(installed.options).find(option => option.value === this.ActiveLanguage);
        if (preferred) this.Tabs.SelectTab(preferred.text);
        this.Select("");
        this.Controls();
        return base;
    },
    Created: function (response) {
        const code = response.language.slice(1);
        let record = this.Find(response.id);
        if (!record) {
            record = {
                id: response.id, name: response.token, status: "active", options: {},
                entity_id: SI.Editor.Data.Objects.Entities.Definitions.localtext.instanceguid,
                createdon: new Date().toISOString().slice(0, 19).replace("T", " "), modifiedon: null,
            };
            for (const installed of this.CurrentInstalled) record["_" + installed] = "";
            record[response.language] = response.text;
            SI.Editor.Data.Objects.Language.Current.push(record);
        }
        this.RefreshOptions();
        const select = this.Element("si_edit_lang_textselect");
        if (select) this.Select(record.id);
        const input = this.Element("si_edit_lang_newtext");
        if (input && input.dataset.language === code && input.value === response.text) input.value = "";
        const installed = this.Element("si_edit_lang_supportedlangs");
        const option = installed && Array.from(installed.options).find(value => value.value === code);
        if (option && this.Tabs) this.Tabs.SelectTab(option.text);
        this.Controls();
    },
    DrawChars: function (quantity = 100) {
        const end = Math.min(this.LastChar + quantity, 300000);
        const characters = [];
        for (let code = this.LastChar; code < end; code++) {
            if (code < 0xD800 || code > 0xDFFF) characters.push(String.fromCodePoint(code));
        }
        this.Element("si_edit_language_charmap").appendChild(document.createTextNode(characters.join(" ")));
        this.LastChar = end;
    },
    New: function () {
        const input = this.Element("si_edit_lang_newtext");
        if (!input.value.length || !input.dataset.language) {
            SI.Tools.SuperAlert(SI.Tools.Text.Editor("Add some text in an installed language first."), 4000);
            return;
        }
        this.Request({ KEY: "LocaltextNew", language: input.dataset.language, text: input.value });
    },
    Clear: function () {
        this.Select("");
    },
    Update: function () {
        const record = this.Selected();
        const code = this.ActiveLanguage;
        if (!record || !this.CurrentInstalled.includes(code)) {
            SI.Tools.SuperAlert(SI.Tools.Text.Editor("Select a text and an installed language first."), 4000);
            return;
        }
        const box = this.Element("si_edit_lang_box_" + code);
        record["_" + code] = this.Text(box);
        this.Preview(record);
        this.Request({ KEY: "UpdateLocaltext", id: this.Id(record.id), language: code, text: record["_" + code] });
    },
    Updated: function (saved) {
        SI.Tools.SuperAlert(saved ? SI.Tools.Text.Editor("Translation saved.") : SI.Tools.Text.Editor("The translation could not be saved."), 4000);
    },
};
