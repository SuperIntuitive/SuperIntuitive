
if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

SI.Widgets.IconLink = function (options) {
    let RandId = SI.Tools.String.RandomString(11);
    this.Defaults = {
        "IconUrl": "/scripts/widgets/icons/defaultAppIcon.png",
        "Link": "#",
        "Type": "div",
        "Size": 20,
        "Title": "",
    };
    options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    let linkbox = Ele(options.Type, {});
    let img = Ele('img', {
        width: options.Size,
        src: options.IconUrl,
        data: {
            url: options.Link,
        },
    });
    if (options.Title) {
        img.title = options.Title;
    }
    if (SI && SI.LoggedInUser && SI.LoggedInUser.Preferences && SI.LoggedInUser.Preferences.OpenLinksIn && SI.LoggedInUser.Preferences.OpenLinksIn != 'window' ) {
        let anc = Ele('a', {
            href: options.Link,
            target: '_blank',
            append: img,
            appendTo: linkbox,
        });
    } else {
        img.onclick = function () {
            let url = this.getAttribute('data-url');
            window.open(url, '_blank', 'location=yes,width=1280,height=720,scrollbars=yes,status=yes');
        };
        linkbox.appendChild(img);
    }
    return linkbox;
}