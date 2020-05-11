if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.Field = function (options) {
    if (!(this instanceof SI.Widget.Field)) { return new SI.Widget.Field(); }
    this.Defaults = {
        "Parent": null, 
        "ParentIndex": null, 
        "Label": null,
        "Placeholder": null,
        "Value": null,
        "Type": { "value": "text", "type": "ENUM", "choices": ["button", "checkbox", "color", "date", "datetime-local", "email", "file", "hidden", "image", "lookup", "month", "number", "optionset", "password", "radio", "range", "reset", "search", "submit", "tel", "text", "textarea", "time", "url", "week"] },
        "LabelColor": "",
        "InputColor": "",
        "BackgroundColor": "rgba(255, 255, 255, 0.1)",
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
    this.Random = SI.Tools.String.RandomString();
    let self = this; //make available for event handelers.

    if (this.Options.LabelColor.length === 0) {
        switch (this.Options.Type) {
            case "optionset":
            case "text": this.Options.LabelColor = '#00ee00'; break;
            case "number": this.Options.LabelColor = '#111111'; break;
            case "lookup": this.Options.LabelColor = '#0000FF'; break;
           
            default: break;
        }

    }

    //this is the box that will be returned
    let field = Ele("div", {
        id: "si_field_" + this.Random,
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
            for: "si_entityfield_" + +this.Random,
            style: {
                textAlight: 'right',
                marginRight: '10px',
                width:"50%"
            },
            appendTo: field
        });
        if (this.Options.ToolTip) {
            label.title = this.Options.ToolTip;
        }
    }


    

    //make a input object. 
    let input = {
        tag:"input",
        id: "si_entityfield_" + this.Random,
        value: this.Options.Value,
        onchange: function (ev) {
            debugger;
            if (self.options.OnChange) {
                self.options.OnChange(ev, this);
            }
            if (self.Options.Entity && this.name.length>0) {
                if (SI.Tools.Object.GetIfExists("SI.LoggedInUser.Preferences.autosave")) {
                    //do a api save here. 
                }
            }

        },
        appendTo: field
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

    let isInput = true;
    //determine the tag type
    switch (this.Options.Type) {
        case "optionset":
            input.tag = "select";

            input.onchange = function (ev) {
                if (self.options.OnChange) {
                    self.options.OnChange(ev, this);
                }

            };
            break;
        case "textarea": input.tag = "textarea"; break;
    }
    
    if (isInput) {
        switch (this.Options.Type) {
            case "text":
                input.tag = "input";

                break;
            case "number":
                tag = "input";
                input.type = "number";
                input.oninput = function (ev) {
                    if (self.options.OnChange) {
                        self.options.OnChange(ev, this);
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



    Ele(null, input );



    return field;
};
