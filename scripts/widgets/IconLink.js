if (!SI) { var SI = {}; }
if (!SI.Widget) { SI.Widget = {}; }

SI.Widget.IconLink = function (options) {
    if (!(this instanceof SI.Widget.IconLink)) { return new SI.Widget.IconLink(); }
    let self = this;
    this.Random = SI.Tools.String.RandomString(11);
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
        id:"si_iconlink_"+this.Random,
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
           // let url = this.getAttribute('data-url');
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

