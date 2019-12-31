


function Field(options) {

    this.Defaults = {
        "Label": "",
        "Value": "",
        "Type": "text",
        "LabelColor": "",
        "InputColor": "",
        "Entity": "",
        "Editable": true,
        "OnChange": "",
        "KeepSynced": false,
    };
    this.options = Tools.Object.SetDefaults(options, this.Defaults);
    let self = this; //make available for event handelers.
    this.rand = Tools.String.RandomString();

    if (this.options.LabelColor.length === 0){
        switch (this.options.Type) {
            case "text": this.options.LabelColor = '#000000'; break;
            case "number": this.options.LabelColor = '#00FF00'; break;
            case "lookup": this.options.LabelColor = '#0000FF'; break;
            default: break;
        }

    }

    //this is the box that will be returned
    let field = Ele("div", {
        style: {
            display:'inline-block',
        }
    });
    //if there is a label, 
    if (this.options.Label.length > 0) {
        let label = Ele("label", {
            innerHTML: this.options.Label,
            for: "si_entityfield_" + rand,
            appendTo: field,
        });
    }
    //if it is editable, make it an input, else make it a span
    if (this.options.Editable) {


        switch (this.options.Type) {
            case "text":
                let input = Ele("input", {
                    id: "si_entityfield_" + rand,
                    value: this.options.Value,
                    appendTo: field,
                    onchange: function (ev) {

                        //allow change event handeler to be input
                        if (self.options.OnChange.length > 0) {
                            self.options.OnChange(ev);
                        }
                    }
                });

                break;
            case "number":

                break;
            case "lookup":

                break;
            default: break;
        }



        let input = Ele("input", {
            id: "si_entityfield_" + rand,
            value: this.options.Value,
            appendTo: field,
            onchange: function (ev) {
                
                //allow change event handeler to be input
                if (self.options.OnChange.length > 0) {
                    self.options.OnChange(ev);
                }
            }
        });
    }
    else
    {
        let span = Ele("span", {
            id: "si_entityfield_" + rand,
            value: this.options.Value,
            appendTo: field,
        });

    }




    return field;


}