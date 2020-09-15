if(!SI.Widgets.Lookup){SI.Widgets.Lookup = {}};
SI.Widget.Lookup = function (options) { 

    if (!(this instanceof SI.Widget.Lookup)) { return new SI.Widget.Lookup(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Lookup");}
    this.Input = {...options};
    SI.Widgets.Lookup[this.Id] = this;
    let self = this;

    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
        "InstanceEntityName": "",
        "EntityName": "",
        "EntityId": "",
        "ContainerClass": "",
        "Position": "relative",
        "FetchJSON": { value : {}, type:'JSON'},
        "Width": "100",
        "Height": "100%",
        "Top": "",
        "Bottom": "",
        "Left": "",
        "Right": "",
        "FontSize": "1em",
        "FontColor": "black",
        "TextAlign": "left"
    };
  
    options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    //The window that holds the advanced lookup search
    this.LookupWindow = null;
    this.EntityTypeWindow = null;
    this.CheckLookups = function(){
        let lookups = document.querySelectorAll("input[type=lookup]");
        if (lookups) {
            for (let i in lookups) {
                if (lookups.hasOwnProperty(i)) {
                    lookup = lookups[i];
                    if (typeof lookup.dataset.stage !== 'ready') {
                        self.Init(lookup);
                        lookup.dataset.stage = "ready";
                    }
                }
            }
        }
    },

    this.Init = function (lookupfield) {


        if(lookupfield.dataset.stage ==="changing"){
            
        }else{
            lookupfield.addEventListener('change', self.ChangeOptions, false);
        }

        let column = null;
        if(lookupfield.dataset.column ==="changing"){
            column = lookupfield.dataset.column;
        }

        if(lookupfield.list){
            lookupfield.list.remove();
        }
        let searchData = Ele("datalist", {
            id: lookupfield.id + "_datalist",
        });

        SI.Tools.Element.InsertAfter(searchData, lookupfield);
        lookupfield.setAttribute('list', lookupfield.id + "_datalist");

        if (lookupfield.dataset.type) {
            self.GetDatalist({ type: lookupfield.dataset.type, datalist: lookupfield.id + "_datalist", column:column });
        } else {
            if (self.EntityTypeWindow === null) {
                var obj = { Name: "Select Entity", Title: lookupfield.id, "WindowControls": "CLOSE", Width: '500px', Height: '300px', Top: (window.pageYOffset + window.innerHeight / 2) + "px", Left: (window.innerWidth / 2 - 250) + "px" };
                self.EntityTypeWindow = new Window(obj);
            }
            self.EntityTypeWindow.Show();
        }
        
        
    };

    //Go to the server and get the data for the lookup
    this.GetDatalist = function (obj) {
        //debugger;
        let ajax = {};
        ajax.Data = {
            Operation: "Retrieve",
            Entity: {
                Name: obj.type
            },
            LookupDatalist: obj.datalist
        };
        if(obj.column){
            ajax.Data.Columns=obj.column;
        }
        ajax.Callback = self.PopulateDatalist;
        SI.Tools.Api.Send(ajax);
    };

    //Once the data is returned from the server, the datalist is populated
    this.PopulateDatalist = function (data, responce) {
        let datalist = document.getElementById(responce.Data.LookupDatalist);
        datalist.innerHTML = "";
        for (let i in data) {
            if (data.hasOwnProperty(i)) {
                let row = data[i];
                let key;
                switch(responce.Data.Entity.Name) {
                    case 'media': 
                    case 'pages': 
                        key = row.path; 
                        break;
                    default: 
                        key = row.name; 
                        break;
                }
                if (key === "") { key = "&nbsp;"; }
                if (typeof key !== 'undefined') {
                    let id = row.id;
                    Ele("option", {
                        innerHTML: key,
                        data: { id: id },
                        appendTo: datalist
                    });
                }
            }
        }
        Ele("option", {
            innerHTML: "Database Lookup",
            data: {
                id: "LookItUp"
            },
            style: {
                color: 'yellow',
            },
            appendTo: datalist,
        });
    };

    //The event handeler for when the datalist is changed
    this.ChangeOptions = function () {
        this.style.color = 'black';
        this.removeAttribute('title');
        if (this.value === "Database Lookup") {
            if (self.LookupWindow === null) {
                //debugger;
                var obj = { Name: "Lookup", Title: "Lookup", "WindowControls": "CLOSE", Width: '500px', Height: '300px', Top: (window.pageYOffset + window.innerHeight / 2) + "px", Left: (window.innerWidth / 2 - 250) + "px" };
                self.LookupWindow = new SI.Widget.Window(obj);
            }
            this.value = '';
            self.LookupWindow.Append(self.DrawLookupWindow());
            self.LookupWindow.Show();
        }
        else {
            if (this.value.length > 0) {
                list = this.list.children;
                //search list for guid
                let found = false;
                for (let l in list) {
                    if (list[l].value === this.value) {
                        this.setAttribute('data-guid', list[l].dataset.id);
                        found = true;
                    }
                }
                if (!found) {
                    this.style.color = 'red';
                    this.title = "This item cannot be found in the database";
                }
            } else {
                this.removeAttribute('data-guid');
            }
        }
    };

    //if the option is not in the intital datalist, enable the user to search for it
    this.DrawLookupWindow = function () {
        let content = Ele('div', {
            innerHTML: 'lookup stuff here soon',

        });
        return content;
    };
   
};

new SI.Widget.Lookup();



