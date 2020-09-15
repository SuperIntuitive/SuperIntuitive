if(!SI.Widgets.IconLink){SI.Widgets.IconLink = {}};
SI.Widget.IconLink = function  (options) { 
    if (!(this instanceof SI.Widget.IconLink)) { return new SI.Widget.IconLink(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Window");}
    this.Input = {...options};
    SI.Widgets.Window[this.Id] = this;
    let self = this;

    this.Defaults = {
        "Parent": null,
        "ParentIndex": null,
        "IconUrl": "/scripts/widgets/icons/defaultAppIcon.png",
        "Link": "#",
        "Type": "div",
        "Size": 20,
        "Title": ""
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);


    this.Container = Ele(this.Options.Type, {
        id: this.Id,
    });

    let img = Ele('img', {
        width: this.Options.Size,
        src: this.Options.IconUrl,
        data: {
            url: this.Options.Link,
        },
    });

    if (this.Options.Title) {
        img.title = this.Options.Title;
    }

    if (SI.Tools.Object.GetIfExists("SI.User.Preferences.open_links_in") !== 'window') {
        let anc = Ele('a', {
            href: this.Options.Link,
            target: '_blank',
            append: img,
            appendTo: this.Container,
        });
    } else {
        img.onclick = function () {
            let url = self.Options.Link;
            window.open(url, '_blank', 'location=yes,width=1280,height=720,scrollbars=yes,status=yes');
        };
        this.Container.appendChild(img);
    }

    if (this.Options.Parent) {
        this.Options.Parent.appendChild(this.Container);
    }

    return this;
}

