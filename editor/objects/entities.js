
SI.Editor.Objects.Entity = {
    Draw: function () {
        //Draw the Container to pass to the Window
        let container = Ele("div", {
            id: 'si_edit_entities_container',
            style: {
                width: '100%',
                height: '100%',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                overflow: 'scroll',
            },
        });
        SI.Editor.UI.Entities.Window.Append(container);



        //debugger;
        //let tabs = new SI.Widget.Tabs();
        //for (let tab in SI.Editor.Objects.Entity.Tabs) {
        //    tabs.Items.Add(tab, SI.Editor.Objects.Entity.Tabs[tab]);
        //}
        //tabs.Draw(container);



        //Select Entity Text
        Ele('span', {
            innerHTML: ' Select Entity:',
            appendTo: container,
        });

        //debugger;
        //Get all the entity data
        let ent = SI.Editor.Data.Objects.Entities.Definitions

        entitiesSelectChange = function (e) {
            //debugger;
            SI.Tools.Class.Loop('si-edit-entities-attributes-container', function (ele) {
                ele.style.display = 'none';
            });
            if (this.value !== 'null') {
                document.getElementById('si_edit_entities_attributes_container_' + this.value).style.display = "block";
                let options = {};
                options.Data = {
                    Operation: "Retrieve",
                    Entity: {
                        Name: this.value,
                    },
                };
                options.Callback = SI.Editor.Objects.Entity.PopulateEntityGrid;
                SI.Tools.Api.Send(options);
            }
        }

        //Entities List
        let entitiesSelect = Ele('select', {
            id: 'si_edit_entities_select',
            appendTo: container,
            onchange: entitiesSelectChange,
        });



        //Top blank
        Ele("option", {
            value: null,
            innerHTML: "",
            appendTo: entitiesSelect,
        });

        let newEntity = Ele('button', {
            innerHTML: "New Entity &#9746",
            style: { marginLeft: '10px' },
            appendTo: container,
            onclick: function () {

                let controls = document.getElementById("si_edit_entity_new_controls");
                if (controls.style.display == 'block') {
                    this.innerHTML = "New Entity &#9746",
                        controls.style.display = 'none';
                } else {
                    this.innerHTML = "New Entity &#9745",
                        controls.style.display = 'block';
                }
            }
        });

        let newEntityControls = Ele('div', {
            id: 'si_edit_entity_new_controls',
            style: {
                position: 'absolute',
                height: '100%',
                width: '100%',
                display: 'none',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                padding: '10px',
            },
            appendTo: container,
            append: SI.Editor.Objects.Entity.NewEntityDialog(),
        });
        //append: SI.Editor.UI.Entities.Methods.NewEntityDialog(),

        for (let e in ent) {
            let entity = ent[e];
            //create an option tag for each entity
            Ele("option", {
                value: e,
                innerHTML: e,
                appendTo: entitiesSelect,

            });

            //create the entity box for both the view and form
            let entityContainer = Ele("div", {
                id: 'si_edit_entities_attributes_container_' + e,
                class: 'si-edit-entities-attributes-container',
                style: {
                    display: 'none',
                },
                appendTo: container,
            });

            //create the tabbox
            let tabView = Ele('div', {
                id: 'si_edit_entities_view_' + e,
                class: 'si-edit-entities-view',
                style: {
                    width: "100%",
                    height: "100%",
                    backgroundColor: "black",
                    paddingLeft: '5px',
                    overflow: 'visible',
                },
                appendTo: entityContainer,
            });

            //UI Buttons
            let newBtn = Ele('button', {
                id: 'si_edit_entities_new_' + e,
                innerHTML: "new",
                appendTo: tabView,
                onclick: SI.Editor.Objects.Entity.New,

            });
            //SI.Editor.UI.Entities.Methods.New,
            let editBtn = Ele('button', {
                id: 'si_edit_entities_edit_' + e,
                innerHTML: "edit",
                appendTo: tabView,
                onclick: SI.Editor.Objects.Entity.Edit,
            });
            //SI.Editor.UI.Entities.Methods.Edit,
            //View tab 
            let entityTable = Ele("table", {
                id: "si_edit_entity_table_" + e,
                style: {
                    backgroundColor: "rgba(43,87,79,1)",
                    borderCollapse: 'collapse',
                },
                appendTo: tabView,
            });

            //Form tab
            var tabForm = Ele('div', {
                id: 'si_edit_entities_form_' + e,
                style: {
                    width: "100%",
                    height: "500px",
                    backgroundColor: "black",
                    paddingLeft: '5px',
                    //   overflow: 'auto',
                    display: 'none',
                },
                appendTo: entityContainer,
            });

            //let attributesSelect = Ele('select', {
            //    id: 'si_edit_attributes_select_' + e,
            //    class: 'si-edit-attributes-select',

            //});

            let closeBtn = Ele('button', {
                id: 'si_edit_entities_close_' + e,
                innerHTML: "Close",
                onclick: SI.Editor.Objects.Entity.Close,
                appendTo: tabForm,
            });
            //SI.Editor.UI.Entities.Methods.Close,
            let saveBtn = Ele('button', {
                id: 'si_edit_entities_save_' + e,
                innerHTML: "Save",
                appendTo: tabForm,
                onclick: SI.Editor.Objects.Entity.Save,
            });
            //SI.Editor.UI.Entities.Methods.Save,
            let entityform = Ele("form", {
                id: 'si_edit_entities_formdata_' + e,
                style: {
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                },
                data: {
                    entityname: e
                },
                appendTo: tabForm,
            });


            //Attributes loop
            let hiddenFields = ["instanceguid", 'deployable', 'p_id', 'id', 'sum', 'entity_id'];
            let readonlyFields = ["createdon", 'modifiedon'];

            for (let a in entity.attributes) {
                //debugger;
                let attribute = entity.attributes[a.trim()];
                if (hiddenFields.indexOf(a) > -1) {
                    //debugger;
                    switch (a) {
                        case "instanceguid": entityform.dataset.recordid = attribute; break;
                    }
                } else {
                    let type;
                    let options;
                    let deployable;
                    let textcolor = SI.Editor.Style.TextColor;
                    let title;
                    //debugger;
                    if (typeof attribute['type'] !== 'undefined') {
                        type = attribute.type;
                    }
                    if (typeof attribute['deployable'] !== 'undefined') {
                        deployable = true;
                        textcolor = "rgba(0, 255, 0)";
                    } else {
                        deployable = false;
                    }
                    switch (type) {
                        case "optionset": type = 'select'; options = attribute['options'].replace(/'/g, "").replace(/"/g, "").split(","); break;
                        case "datetime": type = "datetime-local"; break;
                        case "lookup": textcolor = "rgba(0,255,255)"; title = attribute['lookup']; break;
                        //  default: type = 'text'; break;
                    }

                    let attrControl = Ele("div", {
                        appendTo: entityform,
                        style: {
                            backgroundColor: SI.Editor.Style.BackgroundColor,
                        }
                    });

                    let attrLabel = Ele("label", {
                        id: 'si_edit_attributes_label_' + e + '_' + a,
                        for: 'si_edit_attributes_input_' + e + '_' + a,
                        innerHTML: a,
                        appendTo: attrControl,
                        style: {
                            color: textcolor,
                            margin: '2px',
                        }
                    });
                    let attrInput;

                    if (type == "select") {
                        attrInput = Ele("select", {

                            type: type,
                            appendTo: attrControl,
                            style: {
                                //  color: textcolor,
                                margin: '12px',
                            },
                        })
                        for (let o in options) {

                            Ele('option', {
                                innerHTML: options[o],
                                value: o,
                                appendTo: attrInput,
                            });
                        }
                    }
                    else if (type == "textarea") {
                        attrInput = Ele("textarea", {

                            type: type,
                            appendTo: attrControl,
                            style: {
                                //    color: textcolor,
                                margin: '12px',
                            },
                        })
                    }
                    else if (type == 'lookup') {
                        if (typeof attribute['lookup'] !== 'undefined') {


                            attrInput = Ele("input", {
                                id: 'si_edit_attributes_input_' + e + '_' + a,
                                type: type,
                                appendTo: attrControl,
                                style: {
                                    // color: textcolor,
                                    margin: '12px',
                                },
                                data: {
                                    type: attribute['lookup'],
                                },
                            })

                        }
                    }
                    else {
                        attrInput = Ele("input", {

                            appendTo: attrControl,
                            style: {
                                // color: textcolor,
                                margin: '12px',
                            },
                            placeholder: type,
                        })
                    }
                    if (!attrInput.id) {
                        attrInput.id = 'si_edit_attributes_input_' + e + '_' + a;
                    }

                    attrInput.name = a;

                    if (title) {
                        attrLabel.title = title;
                    }
                    if (readonlyFields.indexOf(a) > -1) {
                        attrInput.readOnly = true;
                    }
                    attrInput.classList.add("si-edit-entity-form-input");
                }
            }

            entityContainer.appendChild(tabView);
            entityContainer.appendChild(tabForm);

        }

        // SI.Editor.UI.Entities.Window.Append(container);

    },
    Tabs: {  //TODO chage entities into a tabbed workspace.
        Query: function () {
            tabcontainer = Ele('div', {
                innerHTML: 'Query',
                style: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'blue',
                }
            });



            return tabcontainer
        },
        Manage: function () {
            tabcontainer = Ele('div', {
                innerHTML: 'Manage',
                style: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'green',
                }
            });

            return tabcontainer
        },
        New: function () {
            tabcontainer = Ele('div', {
                innerHTML: 'New',
                style: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'red',
                }
            });

            return tabcontainer
        },

    },
    //CRUD   maybe just use api
    Create: function (ent) {

    },
    Retrieve: function (ent) {

    },
    Update: function (ent) {

    },
    Delete: function (ent) {

    },
    Find: function (search) {
        if (typeof SI.Editor.Data.Objects.Entities.Definitions[search] !== 'undefined') {
            return SI.Editor.Data.Objects.Entities.Definitions[search];
        }
        else {
            let info = SI.Editor.Data.Objects.Entities.Definitions;
            for (let item in info) {
                if (typeof item.instanceguid !== 'undefined') {
                    if (search == item.instanceguid || '0x' + search == item.instanceguid) {
                        return item;
                    }
                }
            }
        }
    },
    Lists: {
        FwdRevLookup: {},
        NotAllowedNames: ['domain', 'domains', 'businessunit', 'businessunits', 'entity', 'entities'],
        NotAllowedAttributes: ['p_id', 'id', 'status', 'statusreason', 'createdon', 'modifiedon', 'entity_id'],
    },
    NewEntityDialog: function () {
        //Container
        let container = Ele('div', { style: { width: '95%', height: '95%', padding: '4px' } });

        //New Entity Singular Name label
        Ele('span', { innerHTML: 'Singular Name:', appendTo: container });
        //New Entity Name input
        let sname = Ele('input', {
            id: 'si_edit_entity_newSname',
            style: { marginLeft: '10px' },
            appendTo: container,
            onchange: function () {
                //debugger;
                let lowname = this.value.toLowerCase();
                if (lowname) {
                    if (SI.Editor.Objects.Entity.Lists.NotAllowedNames.indexOf(lowname) !== -1) {
                        alert("An entity by that name already exists.");
                        this.value = "";
                        return;
                    } else { }
                    this.value = lowname;
                }
                if (lowname.length > 0)
                    document.getElementById('si_edit_entity_newPname').value = lowname + "s";
            }
        });

        //New Entity Plural Name label
        Ele('span', { innerHTML: ' Plural Name:', appendTo: container });
        //New Entity Name input
        let pname = Ele('input', {
            id: 'si_edit_entity_newPname',
            style: { marginLeft: '10px' },
            appendTo: container,
            onchange: function () {
                //debugger;
                let lowname = this.value.toLowerCase();
                if (lowname) {
                    if (SI.Editor.Objects.Entity.Lists.NotAllowedNames.indexOf(lowname) !== -1) {
                        alert("An entity by that name already exists.");
                        this.value = "";
                        return;
                    } else { }
                    this.value = lowname;
                }

            }
        });

        // Is Global Entity label
        Ele('label', { innerHTML: " Global", for: "si_edit_entities_globalcb", style: { marginLeft: '10px' }, appendTo: container });

        Ele('input', {
            id: "si_edit_entities_globalcb",
            type: 'checkbox',
            style: {
                marginLeft: '10px'
            },
            title: "Make the entity global to all domains",
            appendTo: container,
            onchange: function () {
            },
        });

        //Attributes Box
        let lgndAttributes = Ele('legend', {
            innerHTML: 'Attributes',
        });

        let attributes = Ele('fieldset', {
            id: "si_edit_entities_attributesbox",
            append: lgndAttributes,
            appendTo: container,
        });

        //Add Attributes Box
        let lgndAddAttr = Ele('legend', {
            innerHTML: 'Add',
        });

        let addattr = Ele('fieldset', {
            style: {
                lineHeight: '28px',
            },
            append: lgndAddAttr,
            appendTo: attributes,
        });

        Ele('span', {
            innerHTML: 'Name:',
            appendTo: addattr,
        });
        let attrname = Ele('input', {
            id: "si_edit_entities_newattrname",
            style: {
                width: '300px',
                marginLeft: '10px',
            },
            appendTo: addattr,
        });
        Ele('br', { appendTo: addattr, });
        Ele('span', {
            innerHTML: 'Type:',
            appendTo: addattr,
        });
        //Add a entity attribute
        let datatypeTable = Ele('select', {
            id: "si_edit_entities_newattrtype",
            style: {
                width: '304px',
                marginLeft: '18px',
            },
            appendTo: addattr,
            onchange: function () {
                //debugger;
                document.getElementById('si_edit_entities_lookup_select').style.display = 'none';
                document.getElementById('si_edit_entities_lookup_select').required = false;
                document.getElementById('si_edit_entities_enum_label').style.display = 'none';
                document.getElementById('si_edit_entities_enum_input').style.display = 'none';
                document.getElementById('si_edit_entities_enum_input').required = false;
                document.getElementById('si_edit_entities_enum_input').value = '';
                document.getElementById('si_edit_entities_size_label').style.display = 'none';
                document.getElementById('si_edit_entities_size_input').style.display = 'none';
                document.getElementById('si_edit_entities_size_input').required = false;
                document.getElementById('si_edit_entities_size_input').value = '';
                let seltxt = this.options[this.selectedIndex].text;
                if (seltxt === 'LOOKUP') {
                    document.getElementById('si_edit_entities_lookup_select').style.display = 'inline-block';
                    document.getElementById('si_edit_entities_lookup_select').required = true;
                }
                else if (seltxt === 'ENUM' || seltxt === 'SET') {
                    document.getElementById('si_edit_entities_enum_label').style.display = 'inline-block';
                    document.getElementById('si_edit_entities_enum_input').style.display = 'inline-block';
                    document.getElementById('si_edit_entities_enum_input').required = true;
                }
                else if (seltxt === 'CHAR' || seltxt === 'VARCHAR' || seltxt === 'BINARY' || seltxt === 'VARBINARY' || seltxt === 'VARCHAR') {
                    let max = 0;
                    let def = null;
                    switch (seltxt) {
                        case 'CHAR': max = 255; def = 1; break;
                        case "VARCHAR": max = 65535; break;
                        case "BINARY": max = 65535; def = 1; break;

                    }
                    document.getElementById('si_edit_entities_size_label').style.display = 'inline-block';
                    document.getElementById('si_edit_entities_size_input').style.display = 'inline-block';
                    document.getElementById('si_edit_entities_size_input').max = max;
                    if (def) {
                        document.getElementById('si_edit_entities_size_input').value = def;
                    }
                }
                //set default type. first text and then catch other type.
                document.getElementById('si_edit_entities_newattrdefault').type = 'text';
                let def = document.getElementById('si_edit_entities_newattrdefault');
                if (seltxt === 'TINYINT' || seltxt === 'SMALLINT' || seltxt === 'MEDIUMINT' || seltxt === 'INT' || seltxt === 'BIGINT') {
                    def.type = 'number';
                    def.step = 1;
                }



            },
        });
        //Jacked from phpmyadmin for the most part

        Ele('option', { innerHTML: "", appendTo: datatypeTable });
        Ele('option', { title: "A guid key for another entity", innerHTML: "LOOKUP", appendTo: datatypeTable });
        Ele('option', { title: "A 4-byte integer, signed range is -2,147,483,648 to 2,147,483,647, unsigned range is 0 to 4,294,967,295", innerHTML: "INT", appendTo: datatypeTable });
        Ele('option', { title: "A variable-length (0-65,535) string, the effective maximum length is subject to the maximum row size", innerHTML: "VARCHAR", appendTo: datatypeTable });
        Ele('option', { title: "A TEXT column with a maximum length of 65,535 (2^16 - 1) characters, stored with a two-byte prefix indicating the length of the value in bytes", innerHTML: "TEXT", appendTo: datatypeTable });
        Ele('option', { title: "A date, supported range is 1000-01-01 to 9999-12-31", innerHTML: "DATE", appendTo: datatypeTable });
        let numeric = Ele('optgroup', { label: "Numeric", appendTo: datatypeTable });
        Ele('option', { title: "A 1-byte integer, signed range is -128 to 127, unsigned range is 0 to 255", innerHTML: "TINYINT", appendTo: numeric });
        Ele('option', { title: "A 2-byte integer, signed range is -32,768 to 32,767, unsigned range is 0 to 65,535", innerHTML: "SMALLINT", appendTo: numeric });
        Ele('option', { title: "A 3-byte integer, signed range is -8,388,608 to 8,388,607, unsigned range is 0 to 16,777,215", innerHTML: "MEDIUMINT", appendTo: numeric });
        Ele('option', { title: "A 4-byte integer, signed range is -2,147,483,648 to 2,147,483,647, unsigned range is 0 to 4,294,967,295", innerHTML: "INT", appendTo: numeric });
        Ele('option', { title: "An 8-byte integer, signed range is -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807, unsigned range is 0 to 18,446,744,073,709,551,615", innerHTML: "BIGINT", appendTo: numeric });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: numeric });
        Ele('option', { title: "A fixed-point number (M, D) - the maximum number of digits (M) is 65 (default 10), the maximum number of decimals (D) is 30 (default 0)", innerHTML: "DECIMAL", appendTo: numeric });
        Ele('option', { title: "A small floating-point number, allowable values are -3.402823466E+38 to -1.175494351E-38, 0, and 1.175494351E-38 to 3.402823466E+38", innerHTML: "FLOAT", appendTo: numeric });
        Ele('option', { title: "A double-precision floating-point number, allowable values are -1.7976931348623157E+308 to -2.2250738585072014E-308, 0, and 2.2250738585072014E-308 to 1.7976931348623157E+308", innerHTML: "DOUBLE", appendTo: numeric });
        Ele('option', { title: "Synonym for DOUBLE (exception: in REAL_AS_FLOAT SQL mode it is a synonym for FLOAT)", innerHTML: "REAL", appendTo: numeric });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: numeric });
        Ele('option', { title: "A bit-field type (M), storing M of bits per value (default is 1, maximum is 64)", innerHTML: "BIT", appendTo: numeric });
        Ele('option', { title: "A synonym for TINYINT(1), a value of zero is considered false, nonzero values are considered true", innerHTML: "BOOLEAN", appendTo: numeric });
        Ele('option', { title: "An alias for BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE", innerHTML: "SERIAL", appendTo: numeric });
        let datatime = Ele('optgroup', { label: "Date and time", appendTo: datatypeTable });
        Ele('option', { title: "A date, supported range is 1000-01-01 to 9999-12-31", innerHTML: "DATE", appendTo: datatime });
        Ele('option', { title: "A date and time combination, supported range is 1000-01-01 00:00:00 to 9999-12-31 23:59:59", innerHTML: "DATETIME", appendTo: datatime });
        Ele('option', { title: "A timestamp, range is 1970-01-01 00:00:01 UTC to 2038-01-09 03:14:07 UTC, stored as the number of seconds since the epoch (1970-01-01 00:00:00 UTC)", innerHTML: "TIMESTAMP", appendTo: datatime });
        Ele('option', { title: "A time, range is -838:59:59 to 838:59:59", innerHTML: "TIME", appendTo: datatime });
        Ele('option', { title: "A year in four-digit (4, default) or two-digit (2) format, the allowable values are 70 (1970) to 69 (2069) or 1901 to 2155 and 0000", innerHTML: "YEAR", appendTo: datatime });
        let string = Ele('optgroup', { label: "String", appendTo: datatypeTable });
        Ele('option', { title: "A fixed-length (0-255, default 1) string that is always right-padded with spaces to the specified length when stored", innerHTML: "CHAR", appendTo: string });
        Ele('option', { title: "A variable-length (0-65,535) string, the effective maximum length is subject to the maximum row size", innerHTML: "VARCHAR", appendTo: string });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
        Ele('option', { title: "A TEXT column with a maximum length of 255 (2^8 - 1) characters, stored with a one-byte prefix indicating the length of the value in bytes", innerHTML: "TINYTEXT", appendTo: string });
        Ele('option', { title: "A TEXT column with a maximum length of 65,535 (2^16 - 1) characters, stored with a two-byte prefix indicating the length of the value in bytes", innerHTML: "TEXT", appendTo: string });
        Ele('option', { title: "A TEXT column with a maximum length of 16,777,215 (2^24 - 1) characters, stored with a three-byte prefix indicating the length of the value in bytes", innerHTML: "MEDIUMTEXT", appendTo: string });
        Ele('option', { title: "A TEXT column with a maximum length of 4,294,967,295 or 4GiB (2^32 - 1) characters, stored with a four-byte prefix indicating the length of the value in bytes", innerHTML: "LONGTEXT", appendTo: string });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
        Ele('option', { title: "Similar to the CHAR type, but stores binary byte strings rather than non-binary character strings", innerHTML: "BINARY", appendTo: string });
        Ele('option', { title: "Similar to the VARCHAR type, but stores binary byte strings rather than non-binary character strings", innerHTML: "VARBINARY", appendTo: string });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
        Ele('option', { title: "A BLOB column with a maximum length of 255 (2^8 - 1) bytes, stored with a one-byte prefix indicating the length of the value", innerHTML: "TINYBLOB", appendTo: string });
        Ele('option', { title: "A BLOB column with a maximum length of 16,777,215 (2^24 - 1) bytes, stored with a three-byte prefix indicating the length of the value", innerHTML: "MEDIUMBLOB", appendTo: string });
        Ele('option', { title: "A BLOB column with a maximum length of 65,535 (2^16 - 1) bytes, stored with a two-byte prefix indicating the length of the value", innerHTML: "BLOB", appendTo: string });
        Ele('option', { title: "A BLOB column with a maximum length of 4,294,967,295 or 4GiB (2^32 - 1) bytes, stored with a four-byte prefix indicating the length of the value", innerHTML: "LONGBLOB", appendTo: string });
        Ele('option', { disabled: "disabled", innerHTML: "-", appendTo: string });
        Ele('option', { title: "An enumeration, chosen from the list of up to 65,535 values or the special '' error value", innerHTML: "ENUM", appendTo: string });
        Ele('option', { title: "A single value chosen from a set of up to 64 members", innerHTML: "SET", appendTo: string });
        let spatial = Ele('optgroup', { label: "Spatial", appendTo: datatypeTable });
        Ele('option', { title: "A type that can store a geometry of any type", innerHTML: "GEOMETRY", appendTo: spatial });
        Ele('option', { title: "A point in 2-dimensional space", innerHTML: "POINT", appendTo: spatial });
        Ele('option', { title: "A curve with linear interpolation between points", innerHTML: "LINESTRING", appendTo: spatial });
        Ele('option', { title: "A polygon", innerHTML: "POLYGON", appendTo: spatial });
        Ele('option', { title: "A collection of points", innerHTML: "MULTIPOINT", appendTo: spatial });
        Ele('option', { title: "A collection of curves with linear interpolation between points", innerHTML: "MULTILINESTRING", appendTo: spatial });
        Ele('option', { title: "A collection of polygons", innerHTML: "MULTIPOLYGON", appendTo: spatial });
        Ele('option', { title: "A collection of geometry objects of any type", innerHTML: "GEOMETRYCOLLECTION", appendTo: spatial });
        //debugger;

        //Entities List
        let lookupEntity = Ele('select', {
            id: 'si_edit_entities_lookup_select',
            appendTo: addattr,
            style: {
                display: 'none',
                marginLeft: '15px',
            },
            onchange: function () {

            }
        });
        Ele("option", {
            value: '',
            innerHTML: '',
            appendTo: lookupEntity,
        });
        let ent = SI.Editor.Data.Objects.Entities.Definitions;
        for (let e in ent) {
            let entity = ent[e];
            //create an option tag for each entity
            Ele("option", {
                value: e,
                innerHTML: e,
                appendTo: lookupEntity,
            });
        }
        Ele('br', { appendTo: addattr, });
        Ele('span', { id: 'si_edit_entities_enum_label', innerHTML: "Comma seperated values:", style: { display: 'none' }, appendTo: addattr });
        let enumvals = Ele('input', {
            id: 'si_edit_entities_enum_input',
            style: {
                display: 'none',
                width: '300px',
                marginLeft: '55px',
            },
            appendTo: addattr,
            onchange: function () {
                let enumchoices = "'" + this.value.replace(/([\'\"])/g, '').split(',').join("','") + "'";
                this.value = enumchoices;
            },
        });

        Ele('span', { id: 'si_edit_entities_size_label', innerHTML: "Size:", style: { display: 'none' }, appendTo: addattr });
        let datasize = Ele('input', {
            type: 'number',
            id: 'si_edit_entities_size_input',
            style: {
                display: 'none',
                width: '300px',
                marginLeft: '22px',
            },
            appendTo: addattr,
        });


        Ele('br', { appendTo: addattr });
        //Deployable switch
        Ele('span', { innerHTML: "Deployable:", appendTo: addattr });
        Ele('input', {
            id: 'si_edit_entities_newattrdeploy',
            type: 'checkbox',
            style: {
                marginLeft: '10px'
            },
            title: "Make the field deployable from dev to test to live",
            appendTo: addattr
        });
        //Default value
        Ele('br', { appendTo: addattr, });
        Ele('span', { innerHTML: "Default:", appendTo: addattr });
        let defaultval = Ele('input', {
            id: 'si_edit_entities_newattrdefault',
            style: {
                width: '295px',
                marginLeft: '6px',
            },
            appendTo: addattr,
        });
        Ele('br', { appendTo: addattr, });

        Ele('button', {
            innerHTML: 'Add Attribute',
            style: { marginLeft: '10px' },
            appendTo: addattr,
            onclick: function () {
                //debugger;
                let name = document.getElementById('si_edit_entities_newattrname').value;
                let type = document.getElementById('si_edit_entities_newattrtype').value;
                let lookup = document.getElementById('si_edit_entities_lookup_select').value;
                let enumchoices = document.getElementById('si_edit_entities_enum_input').value;
                let size = document.getElementById('si_edit_entities_size_input').value;
                let deploy = document.getElementById('si_edit_entities_newattrdeploy').checked;
                let def = document.getElementById('si_edit_entities_newattrdefault').value;

                let attrBox = Ele('div', {
                    class: 'si-edit-entity-newattr',
                    style: {
                        minWidth: '200px',
                        minHeight: '40px',
                        display: 'inline-block',
                        margin: '5px',
                        borderRadius: '5px',
                        padding: '10px',
                        border: '3px groove #111',
                        background: 'radial-gradient(circle, rgba(15,136,226,0.5) 8%, rgba(48,54,135,0.5) 76%, rgba(14,36,41,0.5) 100%)',
                    },
                    data: {
                        name: name,
                        type: type,
                        lookup: lookup,
                        enumchoices: enumchoices,
                        size: size,
                        deploy: deploy,
                        def: def,
                    },
                    appendTo: attributes,
                });
                let close = Ele('div', {
                    innerHTML: 'x',
                    style: {
                        width: '16px',
                        height: '14px',
                        backgroundColor: 'firebrick',
                        display: 'inline-block',
                        float: 'right',
                        borderRadius: '2px',
                        textAlign: 'center',
                        paddingBottom: '3px',
                        cursor: 'pointer',
                        border: '2px outset #222',
                    },
                    onclick: function () {
                        this.parentElement.parentElement.removeChild(this.parentElement);
                    },
                    appendTo: attrBox,
                });


                let attrname = Ele('span', {
                    class: 'si-edit-entity-newattr-name',
                    innerHTML: "Name: " + name,
                    style: {
                        color: 'white',
                        margin: '2px',
                    },
                    appendTo: attrBox,
                });
                Ele('br', { appendTo: attrBox });
                let attrtype = Ele('span', {
                    class: 'si-edit-entity-newattr-type',
                    innerHTML: "Type: " + type,
                    style: {
                        color: 'white',
                        margin: '5px',
                    },
                    appendTo: attrBox,
                });


                if (lookup.length > 0) {
                    Ele('br', { appendTo: attrBox });
                    Ele('span', {
                        class: 'si-edit-entity-newattr-lookupentity',
                        innerHTML: "Lookup Entity: " + lookup,
                        style: {
                            color: 'white',
                            margin: '5px',
                        },
                        appendTo: attrBox,
                    });
                }

                if (enumchoices.length > 0) {
                    Ele('br', { appendTo: attrBox });
                    Ele('span', {
                        class: 'si-edit-entity-newattr-enumchoices',
                        innerHTML: "Enum Chioces: " + enumchoices,
                        style: {
                            color: 'white',
                            margin: '5px',
                        },
                        appendTo: attrBox,
                    });
                }

                if (size.length > 0) {
                    Ele('br', { appendTo: attrBox });
                    Ele('span', {
                        class: 'si-edit-entity-newattr-size',
                        innerHTML: "Size: " + size,
                        style: {
                            color: 'white',
                            margin: '5px',
                        },
                        appendTo: attrBox,
                    });
                }

                if (deploy) {
                    Ele('br', { appendTo: attrBox });
                    Ele('span', {
                        class: 'si-edit-entity-newattr-deploy',
                        innerHTML: "Deployable: " + deploy,
                        style: {
                            color: 'white',
                            margin: '5px',
                        },
                        appendTo: attrBox,
                    });
                }

                if (def) {
                    Ele('br', { appendTo: attrBox });
                    Ele('span', {
                        class: 'si-edit-entity-newattr-default',
                        innerHTML: "Default: " + def,
                        style: {
                            color: 'white',
                            margin: '5px',
                        },
                        appendTo: attrBox,
                    });
                }

                document.getElementById('si_edit_entities_newattrname').value = '';
                document.getElementById('si_edit_entities_newattrtype').value = '';
                document.getElementById('si_edit_entities_lookup_select').value = '';
                document.getElementById('si_edit_entities_enum_input').value = '';
                document.getElementById('si_edit_entities_size_input').value = '';
                document.getElementById('si_edit_entities_newattrdeploy').checked = true;
                document.getElementById('si_edit_entities_newattrdefault').value = '';
                document.getElementById('si_edit_entities_lookup_select').style.display = 'none';
                document.getElementById('si_edit_entities_size_input').style.display = 'none';
                document.getElementById('si_edit_entities_enum_input').style.display = 'none';
                document.getElementById('si_edit_entities_newattrdeploy').checked = false;
            }
        });

        Ele('br', { appendTo: container });

        let save = Ele('button', {
            innerHTML: 'Create',
            style: { marginLeft: '10px' },
            appendTo: container,
            onclick: function () {
                let attrboxes = document.querySelectorAll("#si_edit_entities_attributesbox .si-edit-entity-newattr");

                let sname = document.getElementById('si_edit_entity_newSname').value;
                let pname = document.getElementById('si_edit_entity_newPname').value;
                let global = document.getElementById('si_edit_entities_globalcb').checked;


                //build the entity
                let entity = {
                    type: 'entity',
                    KEY: 'NewEntity',
                    sname: sname,
                    pname: pname,
                    global: global,
                    attributes: []
                };

                for (let abox of attrboxes) {
                    let i = entity.attributes.push();
                    entity.attributes[i] = {};
                    let data = abox.dataset;
                    for (let d in data) {
                        if (data.hasOwnProperty(d)) {
                            if (data[d].length > 0) {
                                entity.attributes[i][d] = data[d];
                            }
                        }
                    }
                }

                let options = {};
                options.Data = entity;
                //console.log(entity);
                SI.Editor.Ajax.Run(options);
            }
        });

        return container;
    },
    New: function (ev) {
        //debugger;
        //first clear the fields
        SI.Editor.Objects.Entity.ClearFields();
        //then show the form
        let form = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_form_'));
        let entityName = this.id.replace('si_edit_entities_new_', '');
        let view = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_view_'));
        let formdata = document.getElementById(this.id.replace('si_edit_entities_new_', 'si_edit_entities_formdata_'));
        formdata.dataset.recordid = "";
        view.style.display = 'none';
        form.style.display = 'block';
        form.dataset.operation = 'create';
        formdata.dataset.operation = 'create';
    },
    Edit: function (ev) {
        //debugger;
        SI.Editor.Objects.Entity.ClearFields();
        let selEnt = document.getElementById('si_edit_entities_select').value;
        if (selEnt) {
            let cbs = document.querySelectorAll('.si-edit-entity-checkbox-' + selEnt + ":checked");
            if (cbs.length > 0) {
                let formdata = document.getElementById(this.id.replace('si_edit_entity_checkbox_', 'si_edit_entities_formdata_'));
                formdata.dataset.operation = 'update';
                let colrow = document.getElementById('si_edit_entity_tableheader_' + selEnt);
                let cols = colrow.childNodes;
                let rowid = cbs[0].id.replace('si_edit_entity_checkbox_', 'si_edit_entity_datarow_');
                let row = document.getElementById(rowid);
                let recordid = row.dataset.recordid;
                if (typeof recordid !== 'undefined') {
                    let cells = row.childNodes;
                    if (cols.length > 0) {
                        for (let i = 1; i < cols.length; i++) {
                            //debugger;
                            let column = cols[i].innerHTML;
                            let val = cells[i].innerHTML;
                            let input = document.getElementById('si_edit_attributes_input_' + selEnt + '_' + column).value = val;
                        }
                        let form = document.getElementById(this.id.replace('si_edit_entities_edit_', 'si_edit_entities_form_'));
                        let view = document.getElementById(this.id.replace('si_edit_entities_edit_', 'si_edit_entities_view_'));
                        view.style.display = 'none';
                        form.style.display = 'block';
                        form.dataset.operation = 'update';
                    }
                } else {
                    console.error('Datarow does not have an id');
                }
            } else {
                alert("Please select a row to edit it");
            }
        }
    },
    Close: function (ev) {
        //debugger;
        let self = this;
        let form = document.getElementById(self.id.replace('si_edit_entities_close_', 'si_edit_entities_form_'));
        let view = document.getElementById(self.id.replace('si_edit_entities_close_', 'si_edit_entities_view_'));
        view.style.display = 'block';
        form.style.display = 'none';
    },
    Save: function (ev) {
        //debugger;
        let entity = {};
        let form = document.getElementById(this.id.replace('si_edit_entities_save_', 'si_edit_entities_form_'));
        let entityname = this.id.replace('si_edit_entities_save_', '');
        entity['entityname'] = entityname;
        let formdata = document.getElementById(this.id.replace('si_edit_entities_save_', 'si_edit_entities_formdata_'));
        let oper2 = formdata.dataset.operation;
        let entityAttributes = {};
        let done = false;
        let i = 0;
        while (!done) {
            if (formdata[i]) {
                if (!entityAttributes.hasOwnProperty(formdata[i])) {
                    entityAttributes[formdata[i].name] = formdata[i].value;
                    i++;
                }
            } else {
                done = true;
            }

        }

        entity.attributes = entityAttributes;

        let oper = form.dataset.operation;
        if (typeof oper !== 'undefined') {
            if (oper === 'create') {

            } else if (oper === 'update') {

            }
        }
    },
    PopulateEntityGrid: function (options) {
        //debugger;
        let done = false;
        let entityName = options.Return.Entity.Name;
        let table = document.getElementById("si_edit_entity_table_" + entityName);
        while (table.hasChildNodes()) {
            table.removeChild(table.firstChild);
        }
        let rownum = 0;
        let columnBlacklist = ['id', 'entity_id']; //we dont need to see these in our grid
        while (!done) {
            if (rownum === 0) {  //make the table header
                let header = Ele('tr', {
                    id: 'si_edit_entity_tableheader_' + entityName,
                    style: {
                        maxHeight: '20px',
                    },
                });
                Ele('th', {
                    style: {
                        maxHeight: '20px',
                    },
                    innerHTML: "select",
                    appendTo: header,
                });
                for (let f in options[0]) {
                    if (columnBlacklist.indexOf(f) === -1) {
                        Ele('th', {
                            style: {
                                height: '20px',
                                border: '1px solid black',
                            },
                            innerHTML: f,
                            appendTo: header,
                        });
                    }
                }
                table.appendChild(header);
            }
            if (typeof options[rownum] != 'undefined') { //make the data
                let rowdata = options[rownum];

                let tr = Ele('tr', {
                    id: 'si_edit_entity_datarow_' + entityName + "_" + rownum,
                    style: {
                        height: '20px',
                    },
                    data: {

                    },
                });

                let cbd = Ele('th', {
                    style: {
                        height: '20px',
                        border: '1px solid black',
                    },

                    appendTo: tr,
                });
                let cb = Ele("input", {
                    id: 'si_edit_entity_checkbox_' + entityName + "_" + rownum,
                    class: 'si-edit-entity-checkbox-' + entityName,
                    type: 'checkbox',
                    appendTo: cbd,
                    data: {
                        entityname: entityName,
                    },
                    onchange: function () {
                        //debugger;
                        let checked = this.checked;
                        SI.Tools.Class.Loop('si-edit-entity-checkbox-' + this.dataset.entityname, function (ele) { ele.checked = false; })
                        if (checked) {
                            this.checked = true;
                        } else {
                            this.checked = false;
                        }
                    },
                });
                for (let f in rowdata) {
                    if (columnBlacklist.indexOf(f) === -1) {
                        //debugger;
                        let value = rowdata[f];
                        if (typeof SI.Editor.Data.Objects.Entities.Definitions[entityName] !== 'undefined' && typeof SI.Editor.Data.Objects.Entities.Definitions[entityName][f] !== 'undefined') {
                            fieldAttrs = SI.Editor.Data.Objects.Entities.Definitions[entityName][f];
                            //debugger;

                        }
                        try {
                            if (value && value.indexOf && value.indexOf("</") > -1) {
                                value = value.replace(/&/g, "&amp").replace(/</g, "&lt");
                                //  value = "<pre><code> " + value + " </code></pre>";
                            }
                        } catch (ex) {
                            console.error("PopulateEntityGrid gt&lt replace error: " + ex.message);
                        }

                        let maxlength = 64;
                        let cellvalue = value;
                        if (cellvalue != null && cellvalue.length > maxlength) {
                            //debugger;
                            cellvalue = value.substring(0, maxlength) + "...";
                        } else {
                            value = "";
                        }

                        let title = "";



                        let td = Ele('td', {
                            style: {
                                height: '20px',
                                overflow: 'auto',
                                border: '1px solid black',
                                resize: 'both'
                            },
                            data: {
                                extvalue: value,
                            },
                            class: 'si-edit-entity-',
                            contentEditable: true,
                            title: title,
                            innerHTML: cellvalue,
                            appendTo: tr,
                            onfocus: function (ev) {
                                //debugger;
                                if (this.dataset.extvalue && this.dataset.extvalue.length > 0) {
                                    //we know we have big text. put it in the value so this person can edit it.
                                    this.innerHTML = this.dataset.extvalue;
                                    //this.dataset.extvalue = '';
                                }

                            },
                            onblur: function (ev) {
                                //debugger;
                                if (this.innerHTML.length > 64) {
                                    //we know we have big text. put it in the value so this person can edit it.
                                    this.dataset.extvalue = this.innerHTML;
                                    this.innerHTML = this.innerHTML.substring(0, 64) + "...";
                                }
                            },
                        });

                        //if (value) {
                        //    if (value.length > 50) {
                        //        title = value.replace(/&amp/g, "&").replace(/&lt/g, "<");
                        //        value = value.substr(0, 50) + '...';
                        //    }
                        //}
                    } else {
                        if (f === 'id') {
                            tr.dataset.recordid = '0x' + rowdata[f];
                        }
                    }
                }
                table.appendChild(tr);
                rownum++;
            } else {
                done = true;
            }
        }
    },
    ClearFields: function () {
        SI.Tools.Class.Loop("si-edit-entity-form-input", function (ele) { ele.value = '' });
    },
}