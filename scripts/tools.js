

<?php 
header("Content-type: text/js; charset: UTF-8");
session_start();
error_reporting(E_ALL ^ E_WARNING);
$openMethod = isset($_SESSION['USERPREFS']['OPEN_LINK_IN']) ? $_SESSION['USERPREFS']['OPEN_LINK_IN'] : 'window';
?>


//global hack to set page height
//document.body.style.height = window.innerHeight + 'px';


Q = function (selector) {
    return document.querySelectorAll(selector);
}
EleRun= 0;
Ele = function (tag, attrs, log) {
    log = typeof log !== 'undefined' ? log : false; //silly IE can handle defaults
    if (typeof tag === 'undefined' || tag === null) { //if the tag is packed in the object for some reason.
        if (typeof attrs.tag === 'undefined') {
            console.warn("Error tag name is missing. data:");
            console.log(attrs);
            return null; //cant make a tag without a tag
        } else {
            tag = attrs.tag;
        }
    }
    let parent = null;
    let after = null;
    let ele = document.createElement(tag);
    for (let attr in attrs) {
        if (attrs.hasOwnProperty(attr)) {
            if (attr == 'style') {
                let styles = attrs[attr];
                for (let style in styles) {
                    if (styles.hasOwnProperty(style)) {
                        if (typeof styles[style] != 'undefined' && styles[style].length > 0) {
                            ele.style[style] = styles[style];
                        }
                    }
                }
            } 
            else if (attr == 'data') {
                let data = attrs[attr];
                if (tag !== 'object') {
                    if (typeof data === 'object') {
                        for (let datum in data) {
                            if (data.hasOwnProperty(datum)) {
                                ele.setAttribute('data-' + datum, data[datum]);
                            }
                        }
                    } else if (typeof data === 'string') {
                        ele.data = attrs[attr];
                    }
                } else {
                    //debugger;
                    ele.setAttribute('data',data);
                }

            } 
            else if (attr == 'class') {
                if (attrs[attr].length > 0) {
                    if (ele.classList) {
                        let cs = attrs[attr].trim().replace(/ /g, ',').split(',');
                        for (let c in cs) {
                            ele.classList.add(cs[c]);
                        } 
                    } else {
                        ele.className += ' ' + attrs[attr]; //if old IE is needed
                    }  
                }

            }
            else if (attr == 'appendTo') {
                if (typeof HTMLElement === "object" ? attrs[attr] instanceof HTMLElement : attrs[attr] && typeof attrs[attr] === "object" && attrs[attr] !== null && attrs[attr].nodeType === 1 && typeof attrs[attr].nodeName === "string") {
                    parent = attrs[attr];
                }
                else if (typeof attrs[attr] === 'string') { 
                    if (attrs[attr].length > 0) {
                        let tmp = document.querySelectorAll(attrs[attr])[0];
                        if (tmp == null) { tmp = document.getElementById(attrs[attr]);}
                        if (tmp != null) { parent = tmp; }
                        else { console.warn("The query string: " + attrs[attr]+" did not return an element")}
                    }
                } 
            }
            else if (attr == 'append') {
                 let child = attrs[attr]; 
                if (typeof child === 'string') {
                    ele.innerHTML += child;
                } else if (typeof HTMLElement === "object" ? child instanceof HTMLElement : child && typeof child === "object" && child !== null && child.nodeType === 1 && typeof child.nodeName === "string") {
                    
                    ele.appendChild(child);
                } else {
                    debugger;
                }
            }
            else if (attr == 'innerHTML') {
                ele[attr] += attrs[attr];
            }
            else if (attr == 'after') {
                after = attr;
            }
            else {
                ele[attr] = attrs[attr];
            }
        }
    }
    if (parent != null) {
        parent.appendChild(ele);

        if (after) {
            if (!Array.isArray(after)) {
                after = [after];
            }
            for (e in after) {
                if (e.parent) {
                    Ele(null, e); 
                } else {
                    parent.appendChild(Ele(null, e));
                }
            }
        }
    }



    if (log) {
        console.log(ele);
    }

    EleRun++;
    return ele;
}


//prototypes
String.prototype.replaceArray = function (find, replace) {   // so-5069464
    var replaceString = this;
    var regex;
    for (var i = 0; i < find.length; i++) {
        regex = new RegExp(find[i], "g");
        replaceString = replaceString.replace(regex, replace[i]);
    }
    return replaceString;
};
String.prototype.replaceObj = function (replaceValues) {

    var replaceString = this;
    var regex;
    for (let replace in replaceValues) {
        if (replaceValues.hasOwnProperty(replace)) {
            regex = new RegExp(replace, 'g');
            replaceString = replaceString.replace(regex, replaceValues[replace]);
        }
    }
    return replaceString;
};
String.prototype.hexEncode = function () { //21647928
    var hex, i;

    var result = "";
    for (i = 0; i < this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }
    return result
}
String.prototype.hexDecode = function () { //21647928
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for (j = 0; j < hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }
    return back;
}

Element.prototype.remove = function () {
    this.parentElement.removeChild(this);
}
NodeList.prototype.remove = HTMLCollection.prototype.remove = function () {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i] && this[i].parentElement) {
            this[i].parentElement.removeChild(this[i]);
        }
    }
}

Element.prototype.hide = function () {
    this.style.display = "none";
}

Element.prototype.clear = function () {
    this.innerHTML = "";
}

NodeList.prototype.hide = HTMLCollection.prototype.remove = function () {
    for (var i = this.length - 1; i >= 0; i--) {
        if (this[i]) {
            this[i].style.display = 'none';
        }
    }
}

//Array.prototype.unique = function() {
    //var prev;
    //return this.sort().filter(e => e !== prev && (prev = e));
  //  return [...new Set(this)];
 // }

if (!SI) {
    var SI = {};
}

SI.Tools = {
    String: {
        RandomString: function (length) {
            //stupid IE11 cant do defaults. //will be glad when it is dead
            length = typeof length !== 'undefined' ? length : '7';
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            for (var i = 0; i < length; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        },
        TrimR: function (string, chartoRemove) {
            chartoRemove = typeof chartoRemove !== 'undefined' ? chartoRemove : ' ';
            if (string.substring(string.length - 1) == chartoRemove) {
                return string.substring(0, string.length - 1);
            }

        },
        TrimB: function (s, c) {
            if (c === "]") c = "\\]";
            if (c === "\\") c = "\\\\";
            return s.replace(new RegExp("^[" + c + "]+|[" + c + "]+$", "g"), "");
        },
        IsUpperCase: function (str) {
            return str === str.toUpperCase();
        },
        CapFirst: function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },

    },
    Object: {
        Loop: function (obj, func) {
            for (var k in obj) {

                if (typeof obj[k] == "object" && obj[k] !== null) {
                    SI.Tools.Object.Loop(obj[k]);
                }
                else if (typeof obj === "function") {
                    if (obj.hasOwnProperty(k)) {
                        // Do things here
                        func(k, obj);
                    }

                }
            }
        },
        SetDefaults: function (options, defaults) {

            //if we dont have a options object
            if (typeof options === "undefined") {
                //use all the defaults
                //loop through the defaults and get the values. options should never have json. only defaults
                options = [];
                for (let def in defaults) {
                    if (typeof (def.Value) != 'undefined') {
                        options[def] = defaults[def].value;
                    } else {
                        options[def] = defaults[def];
                    }
                }
            }
            else {
                //if the parent has the value set as a default 
                let checkparentdefault = false;
                if (typeof options.Defaults != 'undefined') {
                    checkparentdefault = options.Defaults;
                }
                //rifle through the defaults and one by one set the missing options 
                for (let name in defaults) {

                    if (typeof options[name] === "undefined") {
                        let key = defaults[name];
                        if (key == null) {
                            value = null;
                        }
                        else if (typeof key.value === 'undefined') {
                            value = defaults[name];
                        } else {
                            //debugger;
                            value = defaults[name].value;
                        }
                        options[name] = value;
                    } else {
                        if (checkparentdefault && typeof checkparentdefault[name] !== 'undefined') {
                            //debugger;
                            options[name] = checkparentdefault[name].value;
                        }
                    }
                }
            }
            return options;
        },
        ToDataTree: function (object) {
        //debugger;
            let dir = Ele("ul", {
                style: {
                    backgroundColor: "#333",
                    listStyleType: 'none',
                },
            });
            for (i in object) {
                if (object.hasOwnProperty(i)) {
                    let ot = typeof object[i];
                    switch (ot) {
                        case 'array':
                        case 'object':
                            let color;
                            switch (i) {
                                case 'domains': color = 'yellow'; break;
                                default: color = 'white';break;
                            }
                            let btn = Ele("div", {
                                innerHTML:i,
                                style: {
                                    height: '22px',
                                    paddingLeft: '20px',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundImage: 'url(scripts/widgets/icons/minus.png)',
                                    backgroundPosition: 'left',
                                    cursor: 'zoom-out',
                                    color: color,
                                },
                                onclick: function (e) {
                                    e.stopPropagation();
                                    //debugger;
                                    var children = this.parentElement.children;
                                    if (children.length > 1) {
                                        if (children[1].style.display === 'block' || children[1].style.display === '') {
                                            this.style.backgroundImage = 'url(scripts/widgets/icons/plus.png)';
                                            this.style.cursor = 'zoom-in';
                                            for (var i = 1; i < children.length; i++) {
                                                children[i].style.display = 'none';
                                            }
                                        } else {
                                            for (var i = 1; i < children.length; i++) {
                                                this.style.backgroundImage = 'url(scripts/widgets/icons/minus.png)';
                                                this.style.cursor = 'zoom-out';
                                                children[i].style.display = 'block';
                                            }
                                        }

                                    }
                                },

                            });

                            let li = Ele("li", {
                                append:btn,
                                appendTo: dir,
                            });
                            li.appendChild(SI.Tools.Object.ToDataTree(object[i]));
                            break;
                        default:
                            Ele("li", {
                                innerHTML: i + ":" + object[i],
                                style: {
                                    backgroundColor: "#888",
                                    color: '#000',
                                    paddingLeft: '5px',
                                    listStyleType:'none',
                                },
                                onclick:function(e){
                                    e.stopPropagation();
                                },
                                appendTo: dir,
                            });
                    }
                }
            }
            return dir;
        },
        IsEmpty: function (obj) {
            return Object.entries(obj).length === 0 && obj.constructor === Object
        },

        GetById: function (current, guid) {  //This function will loop through its 1st gen children looking if at the property 'id' and that id = guid and return that child
            if (guid.length == 32) { //it does not work yet and I found a quick workaround hack so this needs to be finished and would be very helpfull.
                guid = '0x' + guid;
            }
            for (obj in current) {
                
            }
        }
    },
    Text: {
        InsertAtCursor: function (text) {
            var sel, range, html;
            if (window.getSelection) {
                sel = window.getSelection();
                if (sel.getRangeAt && sel.rangeCount) {
                    range = sel.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(text));
                    window.getSelection().removeAllRanges();
                }
            } else if (document.selection && document.selection.createRange) {
                document.selection.createRange().text = text;
                document.selection.empty();
            }
        },
        ClearSelection: function () {
            if (window.getSelection) { window.getSelection().removeAllRanges(); }
            else if (document.selection) { document.selection.empty(); }
        },
        FingAutoCorrect: function (element) {
            element.setAttribute('autocomplete', "off");
            element.setAttribute('autocorrect', "off");
            element.setAttribute('autocapitalize', "off");
            element.setAttribute('spellcheck', false);
        },
    },
    Color: {
        HexToRgb: function (hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        RgbToHex: function (r, g, b) {

            function componentToHex(c) {
                var hex = Number(c).toString(16);
                if (hex.length < 2) {
                    hex = "0" + hex;
                }
                return hex;
            }
            let hex = componentToHex(r) + componentToHex(g) + componentToHex(b);
            return "#" + hex;
        },
        InvertColor: function (hexTripletColor) {
            var color = hexTripletColor;
            color = color.substring(1); // remove #
            color = parseInt(color, 16); // convert to integer
            color = 0xFFFFFF ^ color; // invert three bytes
            color = color.toString(16); // convert to hex
            color = ("000000" + color).slice(-6); // pad with leading zeros
            color = "#" + color; // prepend #
            return color;
        },
        ParseToHex: function (rgb) {
            if (typeof rgb == 'undefined') {
                return null;
            }
            if (rgb.charAt(0) == "#") {
                return rgb;//already hex
            }
            else if (/\d/.test(rgb)) {
                //remove all th text, split it by , and table only the first 3 vals
                rgb = rgb.replace("rgb(", "").replace("rgba(", '').replace(")", '').split(",").slice(0, 3);
                return SI.Tools.Color.RgbToHex(rgb[0].trim(), rgb[1].trim(), rgb[2].trim());
            } else {
                //maybe it is a color name
                let hex = SI.Tools.Color.NameToHex(rgb);
                if (hex) { return hex }
                return null;
            }

        },
        ParseOpacity: function (rgb) {
            if (typeof rgb === 'undefined') {
                return null;
            }
            //debugger;
            //remove all th text, split it by , and table only the first 3 vals
            opacity = rgb.replace("rgb(", "").replace("rgba(", '').replace(")", '').split(",").slice(3);
            if (opacity.length > 0) {
                return parseFloat(opacity);
            } else {
                return 1;
            }

        },
        Random: function () {
            var letters = '0123456789ABCDEF';
            var color = '#';
            for (var i = 0; i < 6; i++) {
                color += letters[Math.floor(Math.random() * 16)];
            }
            return color;
        },
        NameToHex: function (name) {
            colors = { "aliceblue": "#f0f8ff", "antiquewhite": "#faebd7", "aqua": "#00ffff", "aquamarine": "#7fffd4", "azure": "#f0ffff", "beige": "#f5f5dc", "bisque": "#ffe4c4", "black": "#000000", "blanchedalmond": "#ffebcd", "blue": "#0000ff", "blueviolet": "#8a2be2", "brown": "#a52a2a", "burlywood": "#deb887", "cadetblue": "#5f9ea0", "chartreuse": "#7fff00", "chocolate": "#d2691e", "coral": "#ff7f50", "cornflowerblue": "#6495ed", "cornsilk": "#fff8dc", "crimson": "#dc143c", "cyan": "#00ffff", "darkblue": "#00008b", "darkcyan": "#008b8b", "darkgoldenrod": "#b8860b", "darkgray": "#a9a9a9", "darkgrey": "#a9a9a9", "darkgreen": "#006400", "darkkhaki": "#bdb76b", "darkmagenta": "#8b008b", "darkolivegreen": "#556b2f", "darkorange": "#ff8c00", "darkorchid": "#9932cc", "darkred": "#8b0000", "darksalmon": "#e9967a", "darkseagreen": "#8fbc8f", "darkslateblue": "#483d8b", "darkslategray": "#2f4f4f", "darkslategrey": "#2f4f4f", "darkturquoise": "#00ced1", "darkviolet": "#9400d3", "deeppink": "#ff1493", "deepskyblue": "#00bfff", "dimgray": "#696969", "dimgrey": "#696969", "dodgerblue": "#1e90ff", "firebrick": "#b22222", "floralwhite": "#fffaf0", "forestgreen": "#228b22", "fuchsia": "#ff00ff", "gainsboro": "#dcdcdc", "ghostwhite": "#f8f8ff", "gold": "#ffd700", "goldenrod": "#daa520", "gray": "#808080", "grey": "#808080", "green": "#008000", "greenyellow": "#adff2f", "honeydew": "#f0fff0", "hotpink": "#ff69b4", "indianred�": "#cd5c5c", "indigo�": "#4b0082", "ivory": "#fffff0", "khaki": "#f0e68c", "lavender": "#e6e6fa", "lavenderblush": "#fff0f5", "lawngreen": "#7cfc00", "lemonchiffon": "#fffacd", "lightblue": "#add8e6", "lightcoral": "#f08080", "lightcyan": "#e0ffff", "lightgoldenrodyellow": "#fafad2", "lightgray": "#d3d3d3", "lightgrey": "#d3d3d3", "lightgreen": "#90ee90", "lightpink": "#ffb6c1", "lightsalmon": "#ffa07a", "lightseagreen": "#20b2aa", "lightskyblue": "#87cefa", "lightslategray": "#778899", "lightslategrey": "#778899", "lightsteelblue": "#b0c4de", "lightyellow": "#ffffe0", "lime": "#00ff00", "limegreen": "#32cd32", "linen": "#faf0e6", "magenta": "#ff00ff", "maroon": "#800000", "mediumaquamarine": "#66cdaa", "mediumblue": "#0000cd", "mediumorchid": "#ba55d3", "mediumpurple": "#9370db", "mediumseagreen": "#3cb371", "mediumslateblue": "#7b68ee", "mediumspringgreen": "#00fa9a", "mediumturquoise": "#48d1cc", "mediumvioletred": "#c71585", "midnightblue": "#191970", "mintcream": "#f5fffa", "mistyrose": "#ffe4e1", "moccasin": "#ffe4b5", "navajowhite": "#ffdead", "navy": "#000080", "oldlace": "#fdf5e6", "olive": "#808000", "olivedrab": "#6b8e23", "orange": "#ffa500", "orangered": "#ff4500", "orchid": "#da70d6", "palegoldenrod": "#eee8aa", "palegreen": "#98fb98", "paleturquoise": "#afeeee", "palevioletred": "#db7093", "papayawhip": "#ffefd5", "peachpuff": "#ffdab9", "peru": "#cd853f", "pink": "#ffc0cb", "plum": "#dda0dd", "powderblue": "#b0e0e6", "purple": "#800080", "rebeccapurple": "#663399", "red": "#ff0000", "rosybrown": "#bc8f8f", "royalblue": "#4169e1", "saddlebrown": "#8b4513", "salmon": "#fa8072", "sandybrown": "#f4a460", "seagreen": "#2e8b57", "seashell": "#fff5ee", "sienna": "#a0522d", "silver": "#c0c0c0", "skyblue": "#87ceeb", "slateblue": "#6a5acd", "slategray": "#708090", "slategrey": "#708090", "snow": "#fffafa", "springgreen": "#00ff7f", "steelblue": "#4682b4", "tan": "#d2b48c", "teal": "#008080", "thistle": "#d8bfd8", "tomato": "#ff6347", "turquoise": "#40e0d0", "violet": "#ee82ee", "wheat": "#f5deb3", "white": "#ffffff", "whitesmoke": "#f5f5f5", "yellow": "#ffff00", "yellowgreen": "#9acd32" };
            let hex = colors[name.toLowerCase()];
            if (typeof hex != 'undefined') {
                return hex;
            } else {
                return null;
            }
        },
        GetTheme: function () {
            si_theme = document.getElementById('si_colorscheme');
            if (si_theme) {
                document.body.appendChild(si_theme);
                let compStyles = window.getComputedStyle(si_theme);
                let color = compStyles.getPropertyValue('color');
                return (color === 'rgb(255, 255, 255)') ? 'light' : 'dark';
            }
            return 'dark';
        },
    },
    Style: {
        Color: {
            HexToRgb: function (hex) {
                var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : null;
            },
            RgbToHex: function (r, g, b) {
                return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
            },
        },
        FadeOut: function (id, ms) {
            if (typeof (ms) === "undefined") { ms = 1000; }
            else if (typeof ms == "number") {

            }
            else if (ms.toLowerCase() === 'fast') {
                ms = 250;
            } else if (ms.toLowerCase() === 'slow') {
                ms = 2500;
            }
            if (SI.Tools.Is.Element(id)) {
                var ele = id;
            } else {
                var ele = document.getElementById(id);
            }
            if (ele != null) {
                if (ele.animate) {
                    ele.animate({
                        opacity: [1, 0],
                    }, ms);
                    setTimeout(function () { ele.style.display = 'none' }, ms - 50);

                } else {
                    ele.style.display = 'none';
                }

            } else {
                console.warn('FadeOut elemnent is null')
            }
        },
        FadeIn: function (id, ms) {
            if (typeof (ms) === "undefined") { ms = 1000; }
            else if (typeof ms == "number") {

            }
            else if (ms.toLowerCase() === 'fast') {
                ms = 250;
            } else if (ms.toLowerCase() === 'slow') {
                ms = 2000;
            }
            if (SI.Tools.Is.Element(id)) {
                var ele = id;
            } else {
                var ele = document.getElementById(id);
            }

            if (ele != null) {
                if (ele.animate) {
                    ele.animate({
                        opacity: [0, 1],
                    }, ms);
                    setTimeout(function () { ele.style.display = 'block' }, 10);
                } else {
                    ele.style.display = 'block';
                }
            }

            else {
                console.warn('FadeIn elemnent is null')
            }

        },
        GetFonts: function (obj) {
            var o = obj || {},
                sheet = document.styleSheets,
                rule = null,
                i = sheet.length, j;
            while (0 <= --i) {
                rule = sheet[i].rules || sheet[i].cssRules || [];
                j = rule.length;
                while (0 <= --j) {
                    if (rule[j].constructor.name === 'CSSFontFaceRule') { // rule[j].slice(0, 10).toLowerCase() === '@font-face'
                        o[rule[j].style.fontFamily] = rule[j].style.src;
                    };
                }
            }
            return o;
        }
    },
    Class: {
        Loop: function (c, func) {
            var eles = document.getElementsByClassName(c);
            for (var i = 0; i < eles.length; ++i) {
                func(eles[i]);
            }
        },
        InheritsFrom: function (element, classname) {
            if (element.className.split(' ').indexOf(classname) >= 0) return true;
            return element.parentNode && SI.Tools.Class.InheritsFrom(element.parentNode, classname);
        },
        GetAll: function () {
            //wtf syntax? got me
            let c = [].concat(...[...document.querySelectorAll('*')].map(elt => [...elt.classList]));
            return [...new Set(c)];

            //    let allClasses = [];  /*SO-38024631*/
            //    let allElements = document.querySelectorAll('*');
            //    for (let i = 0; i < allElements.length; i++) {
            //    let classes = allElements[i].className.toString().split(/\s+/);
            //   for (let j = 0; j < classes.length; j++) {
            //       let cls = classes[j];
            //       if (cls && allClasses.indexOf(cls) === -1)
            //           allClasses.push(cls);
            //       }
            //   }
            //return allClasses;
        },
        Hide: function(myclass){
            let eles = document.getElementsByClassName(myclass);
            for (ele of eles) {
                ele.style.display = 'none';
            }
        },
        Show: function (myclass, display = 'block') {
            display = typeof display === 'undefined' ? 'block' : display;
            let eles = document.getElementsByClassName(myclass);
            for (ele of eles) {
                ele.style.display = display;
            }
        },
    },
    Convert: {
        CssProp2JsKey: function (cssproperty) {
            return cssproperty.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
        },
        JsArray2HtmlSelect: function (array) {
            let sel = Ele("select", {});
            for (i in array) {
                let option = array[i];
                if (option != null) {
                    Ele("option", {
                        innerHTML: option,
                        appendTo: sel,
                        value: option,
                    });
                }
            }
            return sel;
        }

    },
    Zoom: {
        SetZoom: function (zoom, el) {
            let transformOrigin = [0, 0];
            el = el || instance.getContainer();
            var p = ["webkit", "mdn", "ms", "o"],
                s = "scale(" + zoom + ")",
                oString = (transformOrigin[0] * 100) + "% " + (transformOrigin[1] * 100) + "%";
            for (var i = 0; i < p.length; i++) {
                el.style[p[i] + "Transform"] = s;
                el.style[p[i] + "TransformOrigin"] = oString;
            }
            el.style["transform"] = s;
            el.style["transformOrigin"] = oString;
        },
        ShowValue: function (a) {
            var zoomScale = Number(a) / 10;
            SI.Tools.Zoom.SetZoom(zoomScale, document.getElementsByClassName('container')[0])
        }
    },
    Positioning: {
        GetDocOffset: function (el) {
            var rect = el.getBoundingClientRect(),
                scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
                scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            return { y: rect.top + scrollTop, x: rect.left + scrollLeft }
        }
    },
    CssProp2JsKey: function (cssproperty) {
        return cssproperty.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
    },
    Events: {
        Fire: function (el, etype) {
            if (SI.Tools.Is.Element(el)) {
                if (el.fireEvent) {
                    etype = (etype.startsWith('on')) ? etype : 'on' + etype;
                    el.fireEvent('on' + etype);
                } else {
                    var evObj = document.createEvent('Events');
                    evObj.initEvent(etype, true, false);
                    el.dispatchEvent(evObj);
                }
            } else {
                console.warn("Error firing event on non element");
                //debugger;
            }

        },
    },
    RegEx: {
        Fix: function (flag, test) {

            switch (flag.toLowerCase()) {
                case "okid":
                    test = test.replace(/\W/g, '');
                    if (test.match(/^\d/)) {
                        test = "_" + test;
                    }
                    return test;
                    break;
                case "email": break;
            }
        },
        Match: function (flag, test) {
            switch (flag.toLowerCase()) {
                case "guid": return test.match(/0[xX][0-9a-fA-F]{32}|[0-9a-fA-F]{32}/);
                case "email": return test.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
            }
           
        }
    },
    Meta: {
        SetFavicon: function (imagename) {
            var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            link.href = 'media/icons/' + imagename;
            document.getElementsByTagName('head')[0].appendChild(link);
        },
    },
    LogAllJsObject: function () {

        console.log(Object.getOwnPropertyNames(Infinity));
        console.log(Object.getOwnPropertyNames(NaN));
        console.log(Object.getOwnPropertyNames(undefined));
        console.log(Object.getOwnPropertyNames(null));
        console.log(Object.getOwnPropertyNames(eval()));
        console.log(Object.getOwnPropertyNames(uneval()));
        console.log(Object.getOwnPropertyNames(isFinite()));
        console.log(Object.getOwnPropertyNames(isNaN()));
        console.log(Object.getOwnPropertyNames(parseFloat()));
        console.log(Object.getOwnPropertyNames(parseInt()));
        console.log(Object.getOwnPropertyNames(decodeURI()));
        console.log(Object.getOwnPropertyNames(decodeURIComponent()));
        console.log(Object.getOwnPropertyNames(encodeURI()));
        console.log(Object.getOwnPropertyNames(encodeURIComponent()));
        console.log(Object.getOwnPropertyNames(escape()));
        console.log(Object.getOwnPropertyNames(unescape()));
        console.log(Object.getOwnPropertyNames(Object));
        console.log(Object.getOwnPropertyNames(Function));
        console.log(Object.getOwnPropertyNames(Boolean));
        console.log(Object.getOwnPropertyNames(Symbol));
        console.log(Object.getOwnPropertyNames(Error));
        console.log(Object.getOwnPropertyNames(EvalError));
        console.log(Object.getOwnPropertyNames(InternalError));
        console.log(Object.getOwnPropertyNames(RangeError));
        console.log(Object.getOwnPropertyNames(ReferenceError));
        console.log(Object.getOwnPropertyNames(SyntaxError));
        console.log(Object.getOwnPropertyNames(TypeError));
        console.log(Object.getOwnPropertyNames(URIError));
        console.log(Object.getOwnPropertyNames(Number));
        console.log(Object.getOwnPropertyNames(Math));
        console.log(Object.getOwnPropertyNames(Date));
        console.log(Object.getOwnPropertyNames(String));
        console.log(Object.getOwnPropertyNames(RegExp));
        console.log(Object.getOwnPropertyNames(Array));
        console.log(Object.getOwnPropertyNames(Int8Array));
        console.log(Object.getOwnPropertyNames(Uint8Array));
        console.log(Object.getOwnPropertyNames(Uint8ClampedArray));
        console.log(Object.getOwnPropertyNames(Int16Array));
        console.log(Object.getOwnPropertyNames(Uint16Array));
        console.log(Object.getOwnPropertyNames(Int32Array));
        console.log(Object.getOwnPropertyNames(Uint32Array));
        console.log(Object.getOwnPropertyNames(Float32Array));
        console.log(Object.getOwnPropertyNames(Float64Array));
        console.log(Object.getOwnPropertyNames(Map));
        console.log(Object.getOwnPropertyNames(Set));
        console.log(Object.getOwnPropertyNames(WeakMap));
        console.log(Object.getOwnPropertyNames(WeakSet));
        console.log(Object.getOwnPropertyNames(SIMD));
        console.log(Object.getOwnPropertyNames(SIMD.Float32x4));
        console.log(Object.getOwnPropertyNames(SIMD.Float64x2));
        console.log(Object.getOwnPropertyNames(SIMD.Int8x16));
        console.log(Object.getOwnPropertyNames(SIMD.Int16x8));
        console.log(Object.getOwnPropertyNames(SIMD.Int32x4));
        console.log(Object.getOwnPropertyNames(SIMD.Uint8x16));
        console.log(Object.getOwnPropertyNames(SIMD.Uint16x8));
        console.log(Object.getOwnPropertyNames(SIMD.Uint32x4));
        console.log(Object.getOwnPropertyNames(SIMD.Bool8x16));
        console.log(Object.getOwnPropertyNames(SIMD.Bool16x8));
        console.log(Object.getOwnPropertyNames(SIMD.Bool32x4));
        console.log(Object.getOwnPropertyNames(SIMD.Bool64x2));
        console.log(Object.getOwnPropertyNames(ArrayBuffer));
        console.log(Object.getOwnPropertyNames(SharedArrayBuffer));
        console.log(Object.getOwnPropertyNames(Atomics));
        console.log(Object.getOwnPropertyNames(DataView));
        console.log(Object.getOwnPropertyNames(JSON));
        console.log(Object.getOwnPropertyNames(Control));
        console.log(Object.getOwnPropertyNames(Promise));
        console.log(Object.getOwnPropertyNames(Generator));
        console.log(Object.getOwnPropertyNames(GeneratorFunction));
        console.log(Object.getOwnPropertyNames(AsyncFunction));
        console.log(Object.getOwnPropertyNames(Reflection));
        console.log(Object.getOwnPropertyNames(Reflect));
        console.log(Object.getOwnPropertyNames(Proxy));
        console.log(Object.getOwnPropertyNames(Internationalization));
        console.log(Object.getOwnPropertyNames(Intl));
        console.log(Object.getOwnPropertyNames(Intl.Collator));
        console.log(Object.getOwnPropertyNames(Intl.DateTimeFormat));
        console.log(Object.getOwnPropertyNames(Intl.NumberFormat));
        console.log(Object.getOwnPropertyNames(WebAssembly));
        console.log(Object.getOwnPropertyNames(WebAssembly));
        console.log(Object.getOwnPropertyNames(WebAssembly.Module));
        console.log(Object.getOwnPropertyNames(WebAssembly.Instance));
        console.log(Object.getOwnPropertyNames(WebAssembly.Memory));
        console.log(Object.getOwnPropertyNames(WebAssembly.Table));
        console.log(Object.getOwnPropertyNames(WebAssembly.CompileError));
        console.log(Object.getOwnPropertyNames(WebAssembly.LinkError));
        console.log(Object.getOwnPropertyNames(WebAssembly.RuntimeError));
        console.log(Object.getOwnPropertyNames(arguments));

    },
    Is: {
        Visible: function (ele) {  
            if (typeof (ele) == 'string') {
                ele = document.getElementById(ele);
            }
            if(ele){
                disp = ele.currentStyle ? ele.currentStyle.display : getComputedStyle(ele, null).display;
                return disp == 'none' ? false : true;
            } else {

                //console.warn("Tried to determine if "+ele+" IsVisable. The element was null");
            }
        },
        Element: function (o) {
            return (
                typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
                    o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName === "string"
            );
        },
        InlineElement: function (ele) {
            const inlines = ['a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite', 'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map', 'object', 'q', 'samp', 'script', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'var']
            let inOf = null;
            if (typeof ele == 'string') {
                inOf = inlines.indexOf(ele.toLowerCase());
            } else if (SI.Tools.Is.Element(ele)) {
                inOf = inlines.indexOf(ele.tagName.toLowerCase());
            }
            if (inOf == -1) {
                return false;
            } else {
                return true;
            }

        },
        EmptyElement: function (ele) {
            let inOf = null;
            const emptyElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
            if (typeof ele == 'string') {
                inOf = emptyElements.indexOf(ele.toLowerCase());
            } else if (SI.Tools.Is.Element(ele)) {
                inOf = emptyElements.indexOf(ele.tagName.toLowerCase());
            }
            if (inOf == -1) {
                return false;
            } else {
                return true;
            }
        },
        EmptyObject: function (obj) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        },
        Private: function () {
            var fs = window.RequestFileSystem || window.webkitRequestFileSystem;
            let b = false;
            if (!fs) {
                console.log("check failed?");
            } else {
                fs(window.TEMPORARY,
                    100,
                    function () { b = true },
                    function () { b = false });
            }
            return b;
        },
        Node: function (o) {
            return (
                typeof Node === "object" ? o instanceof Node :
                    o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
            );
        },
        Guid: function (test) { return SI.Tools.RegEx.Match('guid', test);},
    },
    Storage: {
        AppendToStorage: function (name, data) {
            var old = localStorage.getItem(name);
            if (old === null) old = "";
            localStorage.setItem(name, old + data);
        },
        OverwriteStorage: function (name, data) {
            localStorage.setItem(name, data);
        },
    },
    IsNode: function (o) {
        return (
            typeof Node === "object" ? o instanceof Node :
                o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName === "string"
        );
    },
    ResizeElement: function (ele) {
        console.log(ele);
    },
    Ajax: function (obj) {
        if (typeof obj === "undefined") {
            //if the object is empty, ping the server to renew the session
            obj = {};
        }
        if (typeof obj.Data === "undefined") { this.data = "{}"; } else { this.data = obj.Data; }
        if (typeof obj.Callback === "undefined") { this.callback = function () { }; } else { this.callback = obj.Callback; }
        if (typeof obj.Method === "undefined") { this.method = 'POST'; } else { this.method = obj.Method; }
        if (typeof obj.Url === "undefined") { this.url = '/delegate.php'; } else { this.url = obj.Url; }
        if (typeof obj.ContentType === "undefined") { this.contentType = 'application/json'; } else { this.contentType = obj.ContentType; }
        if (typeof obj.Async === "undefined") { this.async = true; } else { this.async = obj.Async; }
        //debugger;
        
        var xhr = new XMLHttpRequest();
        xhr.open(this.method, this.url, this.async);
        xhr.setRequestHeader("Content-Type", this.contentType);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                //debugger;
                try {
                    if (xhr.responseText != null && xhr.responseText.length > 0) {
                        SI.Tools.Success(xhr.responseText);
                    }
                } catch (ex) {
                    //debugger;
                    console.warn(xhr.responseText);
                    console.warn(ex);
                }
            }
        };

        var stringdata = JSON.stringify(this.data);
        xhr.send(stringdata);
    },
    Success: function (response) {
        json = JSON.parse(response.trim());
        json = json[0];
        for (var prop in json) {
            if (json.hasOwnProperty(prop)) {
                //debugger;
                switch (prop) {
                    case "EXCEPTION": alert(response); break;
                    case "REFRESH": setTimeout(function () { location.reload(); }, 3000); break; //jus give it a second
                    case "LOGINFAIL": alert("Username or password is incorrect"); break;
                    case "PLUGIN": SI.Tools.ProcessPlugin(json);
                }
            }
        }
    },
    ProcessPlugin: function (data) {
         //plugin ajax returns will be processed here. we will return them to their respective plugin functions here. 
         
    },
    Element: {
        SetParent: function (el, newParent) {
            newParent.appendChild(el);
        },
        SwapNodes: function (n1, n2) {
            var p1 = n1.parentNode;
            var p2 = n2.parentNode;
            var i1, i2;
            if (!p1 || !p2 || p1.isEqualNode(n2) || p2.isEqualNode(n1)) return;
            for (var i = 0; i < p1.children.length; i++) {
                if (p1.children[i].isEqualNode(n1)) {
                    i1 = i;
                }
            }
            for (var i = 0; i < p2.children.length; i++) {
                if (p2.children[i].isEqualNode(n2)) {
                    i2 = i;
                }
            }
            if (p1.isEqualNode(p2) && i1 < i2) {
                i2++;
            }
            p1.insertBefore(n2, p1.children[i1]);
            p2.insertBefore(n1, p2.children[i2]);
        },
        Animate: function (element, endstyle, time) {
            if (typeof time === 'undefined') {
                time = 1000;
            }
            //first loop to inspect
            obj = {};
            for (let style in endstyle) {
                if (style == "width") {
                    obj.width = element.offsetWidth;
                }
                else if (style == "height") {
                    obj.height = element.offsetHeight;
                }
                //get the beginning, get the end, find out the delta and divid by 1000

            }
        },
        GenerationsFromBlock: function (ele) {
            let foundBlock = false;
            let generations = 0;
            let checking = ele;
            while (!foundBlock) {
                if (checking.classList.contains('si-block')) {
                    foundBlock = true;
                }
                else{
                    checking = checking.parentElement;
                    generations++;
                }  

                if(generations > 100){
                    return null;
                }
            }
            return generations;
        },
        InsertAfter(el, referenceNode) {
            if (referenceNode.nextSibling) {
                referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
            } else {
                referenceNode.parentNode.appendChild(el);
            }
            
        },
        Tags:{
            Input:{
                AddData:function(input, data){     
                    dl = document.createElement('datalist');       
                    dl.id = input.id+"_dl";
                    for (let i = 0; i < data.length; i += 1) {
                        var option = document.createElement('option');
                        option.value = data[i];
                        dl.appendChild(option);
                    }
                    input.appendChild(dl);
                }
            }
        },
        GetBlock: function (element) {
            while (true) {
                //debugger;
                let pop = element.parentElement;
                if (pop.tagName == 'BODY') {
                    return false;
                } else if (pop.classList.contains('si-block')) {
                    return pop;
                } else {
                    return SI.Tools.Element.GetBlock(pop);
                }
            }
        },
        SafeId: function (id) {
            //debugger;
            //we cant have spaces in ids
            id = id.replace(/\s/g, "_"); 
            //make sure the id is unique to the doc or else increment it
            let i = 1;
            let len = id.length;
            do {
                if (i > 1) {
                    id = id.substring(0, len) + i;
                }
                i++;
                let x = document.getElementById(id);
            } while (document.getElementById(id));
            return id;
        },
        GetTotalOffset(ele, stopid = null) {
            off = { left: 0, top: 0 };
            off.left += ele.offsetLeft;
            off.top += ele.offsetTop;
            let par = ele.parentElement;
            while (par) {
                off.left += par.offsetLeft;
                off.top += par.offsetTop;
                par = par.parentElement;
                //bail if we hit the desired top
                if (stopid && par.id == stopid) {
                    break;
                }
            }
            return off;
        }
    },
    GetAllFunctions(obj = window) { //11279441
        let allfunctions = [];
        let blacklist = ['webkitStorageInfo'];
        //debugger;
        for (var i in obj) {
            if (blacklist.indexOf(i) === -1 && (typeof obj[i]).toString() == "function" ) {
                allfunctions.push(obj[i].name);
            }
        }
        return allfunctions;
    },
    StopOverscroll: function (element) { //NEEDS WORKS. Locks up on anthing with some size
        element.onwheel= function (e) {
            if ((this.scrollTop > parseInt(this.style.height) - 120 && e.deltaY > 0) || (this.scrollTop < 2 && e.deltaY < 0)) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    },

    AddPhp: function (php) {
        document.body.appendChild(document.createComment("<?php " + php + " ?>"));
    },
    GetSubdomain: function (hostname) {
        hostname = typeof hostname !== 'undefined' ? hostname : window.location.hostname;
        //debugger;
        var regexParse = new RegExp('[a-z\-0-9]{2,63}\.[a-z\.]{2,5}$');
        var urlParts = regexParse.exec(hostname);
        if (urlParts != null && urlParts.length > 0) {
            return hostname.replace(urlParts[0], '').slice(0, -1);
        }
    },
    GetPathDirectory: function (hostname) {

        var loc = window.location.pathname;

        loc = loc.replace('https://', '').replace('http://', '');

        if (loc.charAt(0) == '/') {
            loc = loc.substr(1);
        }
   
        if (loc.indexOf("?")>-1) {
            retval = loc.split('?')[0];
            return retval;
        } else {
            return loc;
        }

    },
    GetQueryString: function () {
        return <?php echo $_SERVER['QUERY_STRING']; ?>;
        
    },
    CreateCSSSelector: function (selector, style, stylesheet) {
        if (stylesheet === undefined) {
            stylesheet = "editor-temp.css";
        }
        if (!document.styleSheets) return; //no style sheets?

        if (document.getElementsByTagName('head').length == 0) return; //no head? 

        var styleSheet, mediaType;
        //  L(document.styleSheets);
        if (document.styleSheets.length > 0) {
            for (var i = 0, l = document.styleSheets.length; i < l; i++) {
                if (document.styleSheets[i].href.indexOf(stylesheet) > -1) {

                    if (document.styleSheets[i].disabled)
                        continue;
                    var media = document.styleSheets[i].media;
                    mediaType = typeof media;

                    if (mediaType === 'string') {
                        if (media === '' || (media.indexOf('screen') !== -1)) {
                            styleSheet = document.styleSheets[i];
                        }
                    }
                    else if (mediaType == 'object') {
                        if (media.mediaText === '' || (media.mediaText.indexOf('screen') !== -1)) {
                            styleSheet = document.styleSheets[i];
                        }
                    }

                    if (typeof styleSheet !== 'undefined')
                        break;
                }
            }
        }

        if (typeof styleSheet === 'undefined') {
            var styleSheetElement = document.createElement('style');
            styleSheetElement.type = 'text/css';
            document.getElementsByTagName('head')[0].appendChild(styleSheetElement);

            for (i = 0; i < document.styleSheets.length; i++) {
                if (document.styleSheets[i].disabled) {
                    continue;
                }
                styleSheet = document.styleSheets[i];
            }

            mediaType = typeof styleSheet.media;
        }

        if (mediaType === 'string') {
            for (var i = 0, l = styleSheet.rules.length; i < l; i++) {
                if (styleSheet.rules[i].selectorText && styleSheet.rules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                    styleSheet.rules[i].style.cssText = style;
                    return;
                }
            }
            styleSheet.addRule(selector, style);
        }
        else if (mediaType === 'object') {
            var styleSheetLength = (styleSheet.cssRules) ? styleSheet.cssRules.length : 0;
            for (var i = 0; i < styleSheetLength; i++) {
                if (styleSheet.cssRules[i].selectorText && styleSheet.cssRules[i].selectorText.toLowerCase() == selector.toLowerCase()) {
                    styleSheet.cssRules[i].style.cssText = style;
                    return;
                }
            }
            styleSheet.insertRule(selector + '{' + style + '}', styleSheetLength);
        }
    },
    RandomColor: function () {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    },
    ToFixed: function (x) {
        if (Math.abs(x) < 1.0) {
            var e = parseInt(x.toString().split('e-')[1]);
            if (e) {
                x *= Math.pow(10, e - 1);
                x = '0.' + (new Array(e)).join('0') + x.toString().substring(2);
            }
        } else {
            var e = parseInt(x.toString().split('+')[1]);
            if (e > 20) {
                e -= 20;
                x /= Math.pow(10, e);
                x += (new Array(e + 1)).join('0');
            }
        }
        return x;
    },
    GetElementOffset: function (element, property) {
        if (property == "offsetLeft" || property == "offsetTop") {
            var actualOffset = element[property];
            var current = element.offsetParent;
            //Look up the node tree to add up all the offset value
            while (current != null) {
                actualOffset += current[property];
                current = current.offsetParent;
            }
            return actualOffset;
        } else if (property == "offsetHeight" || property == "offsetWidth") {
            return element[property];
        }
        return false;
    },
    GetComputedStyle:function (tag) {
        var cStyle,
        t = document.createElement(tag),
        gcs = "getComputedStyle" in window;

        document.body.appendChild(t);
        cStyle = (gcs ? window.getComputedStyle(t, "") : t.currentStyle).display;
        document.body.removeChild(t);

        return cStyle;
    },
    GetMediaFilePath: function (filename, brackets) {
        if (typeof filename !== 'undefined' && filename.length > 0) {
            filename = filename.replace('url("', '').replace('")', '').replace('"', '');
            filename = filename.substring(filename.lastIndexOf('/') + 1);
            var re = /(?:\.([^.]+))?$/;
            var ext = re.exec(filename)[1];
            let path = "";
            switch (ext) {
                case "jpg":
                case "jpeg":
                case "png":
                case "bmp":
                case "gif": path = "/media/images/" + filename;
                    break;
                case "mp4":
                case "avi":
                case "mpg": path = "/media/videos/" + filename;
                    break;
                case "mp3":
                case "wav":
                case "flac": path = "/media/audio/" + filename;
                    break;
                case "json":
                case "xml":
                case "csv":
                case "xlsx":
                case "xls": path = "/media/data/" + filename;
                    break;
                case "docx":
                case "pdf": path = "/media/documents/" + filename;
                    break;
                case "ttf":
                case "otf": path = "/media/fonts/" + filename;
                    break;
                default: path = null;
            }
            if (brackets) {
                path = 'url("' + path + '")';
            }
            return path;
        }
        return null;
    },
    Api: {
        Send: function (options) {
            //debugger;
            this.Defaults = {
                "Data": {},
                "Callback": SI.Tools.Api.Returned,
            }

            options = SI.Tools.Object.SetDefaults(options, this.Defaults);
            
            var ajax = new XMLHttpRequest();
            ajax.open("POST", "/api.v1.php", true);
            ajax.setRequestHeader("Content-Type", "application/json");
            ajax.onreadystatechange = function () {
                if (ajax.readyState === 4 && ajax.status === 200) {
                    try {
                        if (ajax.responseText != null && ajax.responseText.length > 0) {
                           //debugger;
                            json = JSON.parse(ajax.responseText.trim());
                            options.Callback(json, options);
                        }
                    } catch (ex) {
                        //debugger;
                        console.warn(ajax.responseText);
                        console.warn(ex);
                    }
                }
            };
            var stringdata = JSON.stringify(options.Data);
            //debugger;
            ajax.send(stringdata);
            return ajax;
        },
        Returned: function (response) {
            //debugger;
            if (typeof response['Return'] != 'undefined') {
                let queryElements = null;
                let retEntity = null;

                if (typeof response['Return']['Query'] != 'undefined') {                  
                    queryElements = document.querySelectorAll(response['Return']['Query']);
                }
                if (typeof response['Return']['Entity']['Name'] != 'undefined') {
                    retEntity = response['Return']['Entity']['Name'];
                }

            }

        },

    },

    Select: {
        Sort: function(selElem) {
            var tmpAry = new Array();
            for (var i = 0; i < selElem.options.length; i++) {
                tmpAry[i] = new Array();
                tmpAry[i][0] = selElem.options[i].text;
                tmpAry[i][1] = selElem.options[i].value;
            }
            tmpAry.sort();
            while (selElem.options.length > 0) {
                selElem.options[0] = null;
            }
            for (var i = 0; i < tmpAry.length; i++) {
                var op = new Option(tmpAry[i][0], tmpAry[i][1]);
                selElem.options[i] = op;
            }
            return;
        }
    }

};



