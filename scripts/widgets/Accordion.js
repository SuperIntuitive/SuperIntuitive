if(!SI.Widgets.Accordian){ SI.Widgets.Accordian = {};}
SI.Widget.Accordian = function  (options) { 
    options = typeof options !== 'undefined' ? options : {};
    if (!(this instanceof SI.Widget.Accordian)) { return new SI.Widget.Accordian(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Accordian");}
    this.Input = {...options};
    SI.Widgets.Accordian[this.Id] = this;

    this.Defaults = {
        "Parent": null,
        "Sections": null,
        "Duration": null,
        "Width": '100%',
        "HeaderBackgroundColor": "#444",
        "HeaderBorder": "solid 1px black",
        "ContentBackgroundColor": "#777",
        "ContentTextColor": "#000",
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);
    this.Random = SI.Tools.String.RandomString();
    let self = this; //make available for event handelers.

    this.Groups = [];
    this.Container = Ele("div", {
        id: this.Id,
        class:"si-widget si-widget-accordion",
    });

    this.AddSection = function (name, content) {
        //Draw the header box
        let header = Ele("div", {
            style: {
                width: self.Options.Width,
                backgroundColor: self.Options.HeaderBackgroundColor,
                border: self.Options.HeaderBorder,
                borderTop: '0px'
            },
            onclick: this.ClickBar,
            appendTo: self.Container
        });
        //add the header text
        Ele('span', {
            innerHTML: name,
            style: {
                margin: '20px'
            },
            appendTo: header
        });

        let contentbox = Ele("div", {
            style: {
                height: '0px',
                width: self.Options.Width,
                backgroundColor: self.Options.ContentBackgroundColor,
                color: self.Options.ContentTextColor,
                overflow: 'hidden',
            },
            appendTo:this.Container
        });


        if (SI.Tools.Is.Element(content)) {
            contentbox.appendChild(content);
        } else {
            contentbox.innerHTML = content;
        }


        this.Groups.push(name);
    };
    this.ClickBar = function () {
        if (this.nextSibling.style.height === "0px") {
            //This little hack expands the div gets the height then collapses it so we can tell the animate function how far to go. 
            //It also makes the duration steady at 1/1000th second per pixel.
            this.nextSibling.style.height = 'auto';
            let h = this.nextSibling.offsetHeight;
            this.nextSibling.style.height = "0px";
            if (!self.Options.Duration)
                self.Options.Duration = h;

            this.nextSibling.animate([
                { height: "0px" },
                { height: h + "px" }
            ], {
                    duration: self.Options.Duration,
                easing: "ease-in-out",
            });
            this.nextSibling.style.height = "auto";
        } else {
            let h = this.nextSibling.offsetHeight;
            if (!self.Options.Duration)
                self.Options.Duration = h;

            this.nextSibling.animate([
                { height: h + "px" },
                { height: "0px" }
            ], {
                    duration: self.Options.Duration,
                easing: "ease-in-out",
            });
            this.nextSibling.style.height = "0px";
        }
    }

    //if we have sections in the options then add them now.
    if (self.Options.Sections) {
        for (let section in self.Options.Sections) {
            if (self.Options.Sections.hasOwnProperty(section)) {
                self.AddSection(section, self.Options.Sections[section]);
            }
        }

    }

    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }

    SI.Widgets.Accordian[this.Id] = this;

    return this;

};
