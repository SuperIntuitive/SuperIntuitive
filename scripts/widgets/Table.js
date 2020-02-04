if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

function Table(obj) {
    if (typeof obj === "undefined") {
        obj = {};
    }


    let base = document.createElement('table');
    base.style.width = '100%';
    base.style.height = '100%';
    base.style.backgroundColor = 'green';

    for (var i = 0; i < 12; i++) {
        let r = document.createElement('tr');
        r.id = 'tr-' + i + '_' + id;
        for (var j = 0; j < 12; j++) {
            let c = document.createElement('td');
            c.id = 'td-' + i + '-' + j + '_' + id;

            r.appendChild(c);
        }
        base.appendChild(r);
    }

    return base;

}