<?php 
header("Content-Type: application/javascript; charset: UTF-8");
?>

if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

SI.Widgets.Lookup = function (options) {
    this.Defaults = {
        "InstanceEntityName": "",
        "EntityName": "",
        "EntityId": "",
        "ContainerClass": "",
        "Position": "relative",
        "FetchJSON": {},
        "ParentId": "",
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
    let rand = SI.Tools.String.RandomString();
    this.options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.lookupWindow = null;
    this.entitytypewindow = null;
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
    this.Init = function (lookupfield) {
        //debugger;
        lookupfield.addEventListener('change', self.ChangeOptions, false);
        if (lookupfield.dataset.type === 'blocks') {
            //debugger;
        }
        // lookupfield.onchange += self.ChangeOptions;
        searchData = Ele("datalist", {
            id: lookupfield.id + "_datalist",
            appendTo: lookupfield,
        });
        if (lookupfield.dataset.type) {
            self.GetOptions({ type: lookupfield.dataset.type, datalist: lookupfield.id + "_datalist" });
        } else {
            if (self.entitytypewindow === null) {
                //debugger;
                var obj = { Name: "Select Entity", Title: lookupfield.id, "WindowControls": "CLOSE", StartWidth: '500px', StartHeight: '300px', StartTop: (window.pageYOffset + window.innerHeight / 2) + "px", StartLeft: (window.innerWidth / 2 - 250) + "px" };
                self.entitytypewindow = new Window(obj);
            }
            let container = Ele("div", {

            });
            self.entitytypewindow.Show();
        }
        lookupfield.setAttribute('list', lookupfield.id + "_datalist");
        SI.Tools.Element.InsertAfter(searchData, lookupfield);

    };
    this.GetOptions = function (obj) {
        //debugger;
        let type = obj.type;
        let list = obj.datalist;
        let options = {};
        options.Data = {
            Operation: "Retrieve",
            Entity: {
                Name: type,
            },
            LookupDatalist: obj.datalist,
        };
        options.Callback = self.SetOptions;
        //debugger;
        SI.Tools.Api.Send(options);
    };
    this.SetOptions = function (data, options) {
        if (options.Data.Entity === 'blocks') {
            //debugger;
        }
        let dl = document.getElementById(options.Data.LookupDatalist);
        for (let i in data) {
            if (data.hasOwnProperty(i)) {
                let row = data[i];
                let key = row.path;
                if (key === "") { key = "&nbsp;"; }
                if (typeof key !== 'undefined') {
                    let id = row.id;
                    Ele("option", {
                        innerHTML: key, data: { id: id }, appendTo: dl
                    });
                }

            }
        }
        Ele("option", {
            innerHTML: "LOOK IT UP!",
            data: {
                id: "LookItUp"
            },
            style: {
                backgroundColor: 'yellow',
            },
            appendTo: dl,
        });
    };
    this.ChangeOptions = function () {
        this.style.color = 'black';
        this.removeAttribute('title');
        if (this.value === "LOOK IT UP!") {
            if (self.lookupWindow === null) {
                //debugger;
                var obj = { Name: "Lookup", Title: "Lookup", "WindowControls": "CLOSE", StartWidth: '500px', StartHeight: '300px', StartTop: (window.pageYOffset + window.innerHeight / 2) + "px", StartLeft: (window.innerWidth / 2 - 250) + "px" };
                self.lookupWindow = new Window(obj);
            }
            this.value = '';
            self.lookupWindow.Append(self.DrawLookupWindow());
            self.lookupWindow.Show();
        }
        else {
            if (this.value.length > 0) {
                list = this.list.children;
                //search list for guid
                let found = false;
                for (l in list) {
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
    this.DrawLookupWindow = function () {
        let content = Ele('div', {
            innerHTML: 'lookup stuff here soon',

        });
        return content;
    };
    var self = this;
};
SI.Widgets.Lookup.Instances = {};
var si_lu = new SI.Widgets.Lookup();
si_lu.InitTimer();


