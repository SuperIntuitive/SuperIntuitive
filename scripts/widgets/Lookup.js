<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>



SI.Widget.Lookup = function (options) {
    if (!(this instanceof SI.Widget.Lookup)) { return new SI.Widget.Lookup(); }
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
    let self = this;
    random = SI.Tools.String.RandomString();
    options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    //The window that holds the advanced lookup search
    this.LookupWindow = null;
    this.EntityTypeWindow = null;
    this.InitTimer = function () {
        //debugger;
        let initLoopTime = 1000;
        let initLoopTries = 10;
        let timer = 500;
        let thereafter = 3000;
        let lookuptimer = setInterval(function () {
            if (initLoopTries > 0) {
                initLoopTries--;
                timer = initLoopTime;
            } else {
                timer = thereafter;
                clearInterval(lookuptimer);
            }

            let lookups = document.querySelectorAll("input[type=lookup]");
            let status = "init";
            if (lookups) {
                for (let i in lookups) {
                    if (lookups.hasOwnProperty(i)) {
                        lookup = lookups[i];
                        if (typeof lookup.dataset.stage === 'undefined') {
                            //debugger;
                            self.Init(lookup);
                            lookup.dataset.stage = "ready";
                        }
                    }
                }
            }

        }, timer);
    };

    //Initili
    this.Init = function (lookupfield) {
        //debugger;
        lookupfield.addEventListener('change', self.ChangeOptions, false);
        searchData = Ele("datalist", {
            id: lookupfield.id + "_datalist",
            appendTo: lookupfield,
        });
        if (lookupfield.dataset.type) {
            self.GetDatalist({ type: lookupfield.dataset.type, datalist: lookupfield.id + "_datalist" });
        } else {
            if (self.EntityTypeWindow === null) {
                var obj = { Name: "Select Entity", Title: lookupfield.id, "WindowControls": "CLOSE", StartWidth: '500px', StartHeight: '300px', StartTop: (window.pageYOffset + window.innerHeight / 2) + "px", StartLeft: (window.innerWidth / 2 - 250) + "px" };
                self.EntityTypeWindow = new Window(obj);
            }
            self.EntityTypeWindow.Show();
        }
        lookupfield.setAttribute('list', lookupfield.id + "_datalist");
        SI.Tools.Element.InsertAfter(searchData, lookupfield);
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
        ajax.Callback = self.PopulateDatalist;
        SI.Tools.Api.Send(ajax);
    };

    //Once the data is returned from the server, the datalist is populated
    this.PopulateDatalist = function (data, responce) {
        if (responce.Data.Entity === 'blocks') {
            //debugger;
        }
        let datalist = document.getElementById(responce.Data.LookupDatalist);
        for (let i in data) {
            if (data.hasOwnProperty(i)) {
                let row = data[i];
                let key = row.path;
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
                var obj = { Name: "Lookup", Title: "Lookup", "WindowControls": "CLOSE", StartWidth: '500px', StartHeight: '300px', StartTop: (window.pageYOffset + window.innerHeight / 2) + "px", StartLeft: (window.innerWidth / 2 - 250) + "px" };
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
//SI.Widget.Lookups.Instances = {};
//var si_lu =
new SI.Widget.Lookup().InitTimer();
//si_lu.InitTimer();


