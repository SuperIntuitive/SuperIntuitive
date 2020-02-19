if (!SI) { var SI = {}; }
if (!SI.Widgets) { SI.Widgets = {}; }

SI.Widgets.DataGrid = function (obj) {
    if (typeof obj === "undefined") {
        obj = {};
    }

    this.randomid = SI.Tools.String.RandomString(11);
    var randId = this.randomid;



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
};
SI.Widgets.DataGrid.Instances = {};

/*
    var id_ = 'columns-full';
    var cols_ = document.querySelectorAll('#' + id_ + ' .column');
    var dragSrcEl_ = null;
    this.handleDragStart = function (e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        dragSrcEl_ = this;
        this.classList.add('moving');
    };
    this.handleDragOver = function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    };
    this.handleDragEnter = function (e) {
        this.classList.add('over');
    };
    this.handleDragLeave = function (e) {
        this.classList.remove('over');
    };
    this.handleDrop = function (e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (dragSrcEl_ != this) {
            dragSrcEl_.innerHTML = this.innerHTML;
            this.innerHTML = e.dataTransfer.getData('text/html');
            var count = this.querySelector('.count');
            var newCount = parseInt(count.getAttribute('data-col-moves')) + 1;
            count.setAttribute('data-col-moves', newCount);
            count.textContent = 'moves: ' + newCount;
        }
        return false;
    };
    this.handleDragEnd = function (e) {
        [].forEach.call(cols_, function (col) {
            col.classList.remove('over');
            col.classList.remove('moving');
        });
    };
    [].forEach.call(cols_, function (col) {
        col.setAttribute('draggable', 'true');
        col.addEventListener('dragstart', this.handleDragStart, false);
        col.addEventListener('dragenter', this.handleDragEnter, false);
        col.addEventListener('dragover', this.handleDragOver, false);
        col.addEventListener('dragleave', this.handleDragLeave, false);
        col.addEventListener('drop', this.handleDrop, false);
        col.addEventListener('dragend', this.handleDragEnd, false);
    });
*/




