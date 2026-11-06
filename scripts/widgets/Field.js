if(!SI.Widgets.Field){SI.Widgets.Field = {}};
SI.Widget.Field = function  (options) { 
    if (!(this instanceof SI.Widget.Field)) { return new SI.Widget.Field(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Field");}
    this.Input = {...options};
    SI.Widgets.Field[this.Id] = this;
    let self = this;

    this.Defaults = {
        "Parent": null, 
        "ParentIndex": null, 
        "Label": null,
        "Placeholder": null,
        "Value": null,
        "Type": { "value": "text", "type": "ENUM", "choices": ["button", "checkbox", "color", "date", "datetime-local", "email", "file", "hidden", "image", "lookup", "month", "number", "optionset", "password", "radio", "range", "reset", "search", "submit", "tel", "text", "textarea", "time", "url", "week"] },
        "LabelColor": "",
        "InputColor": "",
        "BackgroundColor": "var(--si-widget-surface)",
        "LookupEntity": "pages",
        "LookupEntities": null,
        "Multiple": false,
        "DisplayColumn": null,
        "SearchColumns": null,
        "Filters": {},
        "Entity": null,
        "Name":null,
        "ReadOnly": false,
        "Disabled": false,
        "Required": false,
        "OnChange": null,
        "Validator":null,
        "MaxChars":"default",
        "Columns": 0,
        "Rows": 0,
        "OptionSet": { "value": null, "type": "ENUM", "choices": [] },
        "Width": [],
        "Groups": [],
        "TabIndex": null,
        "ToolTip": null,
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);


     //make available for event handelers.

    if (this.Options.LabelColor.length === 0) {
        switch (this.Options.Type) {
            case "optionset":
            case "text": this.Options.LabelColor = 'var(--si-widget-muted)'; break;
            case "number": this.Options.LabelColor = 'var(--si-widget-muted)'; break;
            case "lookup": this.Options.LabelColor = 'var(--si-widget-muted)'; break;
           
            default: break;
        }

    }

    //this is the box that will be returned
    let container = Ele("div", {
        id: this.Id,
        class:"si-field-"+this.Options.Type,
        style: {
            backgroundColor: this.Options.BackgroundColor,
            display: 'inline-block',
            padding: '10px'
        }
    });

    //if there is a label, 
    if (this.Options.Label) {
        let label = Ele("label", {
            innerHTML: this.Options.Label,
            htmlFor: this.Id+"_input",
            style: {
                textAlign: 'left',
                color: this.Options.LabelColor,
                marginRight: '10px',
                width:"50%"
            },
            appendTo: container
        });
        if (this.Options.ToolTip) {
            label.title = this.Options.ToolTip;
        }
    }


    //make a input object. 
    let input = {
        tag:"input",
        type: this.Options.Type,
        id: this.Id+"_input",
        value: this.Options.Value,
        onchange: function (ev) {
            if (self.Options.Type === 'lookup' && self.Lookup) self.Input.Value = self.Lookup.GetValue(this);
            else if (!['password', 'file'].includes(self.Options.Type)) self.Input.Value = ['checkbox', 'radio'].includes(self.Options.Type) ? this.checked : this.value;
            if (self.Options.OnChange) {
                self.Options.OnChange(ev, this);
            }
            if (self.Options.Entity && this.name.length>0) {
                if (SI.Tools.Object.GetIfExists("SI.User.Preferences.autosave")) {
                    //do a api save here. 
                }
            }

        },
        appendTo: container
    };

    if (this.Options.Name) {
        input.name = this.Options.Name;
    }
    if (this.Options.Placeholder) {
        input.placeholder = this.Options.Placeholder;
    }
    if (this.Options.Validator) {
        input.pattern = this.Options.Validator;
    }
    input.required = this.Options.Required;
    input.disabled = this.Options.Disabled;
    input.readOnly = this.Options.ReadOnly;
    if (this.Options.TabIndex !== null) input.tabIndex = this.Options.TabIndex;
    if (this.Options.ToolTip) input.title = this.Options.ToolTip;

    let isInput = true;
    //if this a select or a textarea filed, change tag/handler
    switch (this.Options.Type) {
        case "optionset":
            input.tag = "select";
            input.onchange = function (ev) {
                self.Input.Value = this.value;
                if (self.Options.OnChange) {
                    self.Options.OnChange(ev, this);
                }

            };
            break;

        case "textarea": input.tag = "textarea"; 
            break;



    }
    
    if (isInput) {
        switch (this.Options.Type) {
            case "text":
                input.tag = "input";

                break;
            case "number":
                input.tag = "input";
                input.type = "number";
                input.oninput = function (ev) {
                    self.Input.Value = this.value;
                    if (self.Options.OnChange) {
                        self.Options.OnChange(ev, this);
                    }
                };
                break;
            case "lookup": break;

            case "optionset": break;
            default: break;
        }

    }

    let parent = this.Options.Parent;
    let parentIndex = this.Options.ParentIndex;



    this.Field = Ele(null, input);
    if (['checkbox', 'radio'].includes(this.Options.Type)) this.Field.checked = !!this.Options.Value;
    if (this.Options.Type === 'optionset' && this.Options.OptionSet) {
        for (const [value, label] of Object.entries(this.Options.OptionSet)) this.Field.appendChild(new Option(label, value));
        if (this.Options.Value !== null) this.Field.value = this.Options.Value;
    }
    if (this.Options.Type === 'lookup') {
        this.Field.dataset.type = this.Options.LookupEntity;
        this.Lookup = SI.Widgets.Lookup.Lookup;
        this.Lookup.Init(this.Field, {EntityName: this.Options.LookupEntity, Entities: this.Options.LookupEntities, Multiple: this.Options.Multiple, DisplayColumn: this.Options.DisplayColumn, SearchColumns: this.Options.SearchColumns, Filters: this.Options.Filters});
        if (this.Options.Value && typeof this.Options.Value === 'object') this.Lookup.SetValue(this.Field, this.Options.Value, false);
    }



    this.Container = container;
    this.Destroy = () => {
        if (this.Lookup) this.Lookup.Detach(this.Field);
        if (container.parentNode) container.remove();
        delete SI.Widgets.Field[this.Id];
    };
    if (parent) parent.appendChild(container);
    return container;
};
