            //future use
            DrawStyles2: function() {
                /*
                //create a box for the groups
                var styleview = Ele('div', {
                    id: 'si_edit_style_view',
                    style: {
                        backgroundColor: SI.Editor.Style.BackColor,

                    },
                });
                //create the menubar for controls
                var styleviewctrls = Ele('div', {
                    id: 'si_edit_style_view_controls',
                    style: {
                        backgroundColor: SI.Editor.Style.MenuColor,
                        height:'20px',
                    },
                    appendTo: styleview
                });
                //add the Group radio box
                var styleviewradiogrouplabel = Ele('label', {
                    for: 'si_edit_style_view_controls_radio_group',
                    innerHTML: "Group",
                    style: {
                        marginLeft: '10px',
                    },
                    appendTo: styleviewctrls
                });
                var styleviewradiogroup = Ele('input', {
                    type: "radio",
                    checked:"checked",
                    name:'si_edit_style_view_controls_sort',
                    id: 'si_edit_style_view_controls_radio_group',
                    style: {marginRight:'10px'},
                    appendTo: styleviewctrls,
                    onchange: function () {
                        document.getElementById('si_edit_style_view_groups').style.display = 'block';
                        document.getElementById('si_edit_style_view_alpha').style.display = 'none';
                    }
                });
                //add the Alpha radio box
                var styleviewradioalphalabel = Ele('label', {
                    for: 'si_edit_style_view_controls_radio_alpha',
                    innerHTML: "A-Z",
                    appendTo: styleviewctrls
                });
                var styleviewradioalpha = Ele('input', {
                    type: "radio",
                    name: 'si_edit_style_view_controls_sort',
                    id: 'si_edit_style_view_controls_radio_alpha',
                    data: {
                        'si-loaded': false
                    },
                    appendTo: styleviewctrls,
                    onchange: function () {
                        alert("alpha");
                        document.getElementById('si_edit_style_view_groups').style.display = 'none';
                        let sortedbox = document.getElementById('si_edit_style_view_alpha');
                        if (!sortedbox.dataset.loaded === true) {
                            SI.Editor.UI.EditPanel.DrawSortedStyles();
                        }
                        sortedbox.style.display = 'block';
                    }
                });
                //The Groups Box
                var styleviewgroups = Ele('div', {
                    id: 'si_edit_style_view_groups',
                    style: {
                        height: '290px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                    },
                    appendTo: styleview
                });
                //The Alphabatized Box
                var styleviewalpha = Ele('div', {
                    id: 'si_edit_style_view_alpha',
                    style: {
                        height: '290px',
                        overflowX: 'hidden',
                        overflowY: 'scroll',
                        display:'none'
                    },
                    appendTo: styleview
                });

                let groups = SI.Editor.Data.DataLists.StyleGroups;
                let groupObject = {};
                for (let g in groups) {

                    let groupbox = Ele("div", { });

                    let props = groups[g];
                    for (let p in props) {
                        let prop = props[p];
                        let style = SI.Editor.Data.Code.Styles[prop];

                        Ele("div", {
                            innerHTML:prop,           
                            appendTo:groupbox
                        });

                    }

                    groupObject[g] = groupbox;
                }
             //   debugger;
                let options = { Parent: styleviewgroups, Sections: groupObject };
                let accordion = new SI.Widget.Accordion(options);
 
                return styleview
                */
            },
            DrawSortedStyles: function() {
                /*
                //only draw this if the user selected it.
                let box = document.getElementById('si_edit_style_view_alpha');
                
                let styles = SI.Editor.Data.Code.Styles;
                let styleObject = {};

                for (let s in styles) {

                   
                }

                let options = { Sections: styleObject };
                let accordion = new SI.Widget.Accordion(options);
                debugger;
                box.dataset.loaded = true;
                */
            },