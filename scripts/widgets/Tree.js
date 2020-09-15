if(!SI.Widgets.Tree){SI.Widgets.Tree = {}};
SI.Widget.Tree = function (options) { 
    if (!(this instanceof SI.Widget.Tree)) { return new SI.Widget.Tree(options); }

    options = typeof options !== 'undefined' ? options : {};
    if ("Id" in options) { this.Id = options.Id; } else { this.Id = SI.Tools.Element.SafeId("Tree");}
    this.Input = {...options};
    SI.Widgets.Tree[this.Id] = this;

    this.Defaults = {
        "Leaves": {},
    };
    this.Options = SI.Tools.Object.SetDefaults(options, this.Defaults);

    this.Random = SI.Tools.String.RandomString(11);
    options = this.Options;
    let self = this;
    //debugger;
    let dir = Ele("ul", {
        style: {
            backgroundColor: "#333",
            listStyleType: 'none',
        },
    });
    for (let i in this.Options.Leaves) {
        if (this.Options.Leaves.hasOwnProperty(i)) {
            switch (typeof this.Options.Leaves[i]) {
                case 'array':
                case 'object':
                    let color;
                    switch (i) {
                        case 'domains': color = 'yellow'; break;
                        default: color = 'white'; break;
                    }
                    let btn = Ele("div", {
                        innerHTML: i,
                        style: {
                            height: '22px',
                            paddingLeft: '20px',
                            backgroundRepeat: 'no-repeat',
                            backgroundImage: 'url(scripts/widgets/icons/minus.png)',
                            backgroundPosition: 'left',
                            cursor: 'zoom-out',
                            color: color
                        },
                        onclick: function (e) {
                            e.stopPropagation();
                            //debugger;
                            var children = this.parentElement.children;
                            if (children.length > 1) {
                                if (children[1].style.display === 'block' || children[1].style.display === '') {
                                    this.style.backgroundImage = 'url(scripts/widgets/icons/plus.png)';
                                    this.style.cursor = 'zoom-in';
                                    for (let i = 1; i < children.length; i++) {
                                        children[i].style.display = 'none';
                                    }
                                } else {
                                    for (let i = 1; i < children.length; i++) {
                                        this.style.backgroundImage = 'url(scripts/widgets/icons/minus.png)';
                                        this.style.cursor = 'zoom-out';
                                        children[i].style.display = 'block';
                                    }
                                }
                            }
                        }
                    });

                    let li = Ele("li", {
                        append: btn,
                        appendTo: dir
                    });
                    let suboptions = options;
                    suboptions.Leaves = this.Options.Leaves[i];
                    li.appendChild(new SI.Widget.Tree(suboptions));

                    break;
                default:
                    Ele("li", {
                        innerHTML: i + ":" + object[i],
                        style: {
                            backgroundColor: "#888",
                            color: '#000',
                            paddingLeft: '5px',
                            listStyleType: 'none'
                        },
                        onclick: function (e) {
                            e.stopPropagation();
                        },
                        appendTo: dir
                    });
            }
        }
    }

    return dir;
};