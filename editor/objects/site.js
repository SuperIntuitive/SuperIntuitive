﻿SI.Editor.Objects.Site = {
    Draw: function () {
        let base = Ele('div', {
            style: {
                width: '100%',
                backgroundColor: SI.Editor.Style.FavoriteColor,
                color:SI.Editor.Style.TextColor,
            }
        });
        Ele("div", {
            style: {
                width: '100%',
                backgroundColor: SI.Editor.Style.FavoriteColor,
                height:'10px'
            },
            appendTo: base
        });
        let fldNewPage = Ele('fieldset', {
            style:{
                margin: '6px',
                backgroundColor: SI.Editor.Style.BackgroundColor,
                width: "95%",
                display: 'block',
                borderRadius: '10px'
            },
            append: Ele('legend', { 
                innerHTML: 'Create a new Page',
                class:'si-edit-legend',
            }),
        });
        //   fldNewPage.style.width = "300px";
        //    
        //    lgndNewPage.innerHTML = 'Create a new Page';
        //    fldNewPage.appendChild(lgndNewPage);

        let tblNewPage = document.createElement('table');
        let hgrNewPage = document.createElement('tr');
        let hBuNewPage = document.createElement('th');
        hBuNewPage.innerHTML = "Business Unit";
        hBuNewPage.title = 'sub-domain';
        hgrNewPage.appendChild(hBuNewPage);
        let hDoNewPage = document.createElement('th');
        hDoNewPage.innerHTML = "Domain";
        hgrNewPage.appendChild(hDoNewPage);
        let hPgNewPage = document.createElement('th');
        hPgNewPage.innerHTML = "Page";
        hgrNewPage.appendChild(hPgNewPage);
        let blankNewPage = document.createElement('th');
        hgrNewPage.appendChild(blankNewPage);

        tblNewPage.appendChild(hgrNewPage);

        let inRowNewPage = document.createElement('tr');
        let dBuNewPage = document.createElement('td');
        let dBuINewPage = document.createElement('input');
        dBuINewPage.id = "SI_Struct_NewPage_BU";
        dBuINewPage.value = SI.Editor.Data.Site.SubDomain;

        dBuINewPage.readOnly = true; 
        dBuNewPage.appendChild(dBuINewPage);
        inRowNewPage.appendChild(dBuNewPage);

        let dDoNewPage = document.createElement('td');
        let dDoINewPage = document.createElement('input');
        dDoINewPage.readOnly = true;
        dDoINewPage.id = "SI_Struct_NewPage_Domain";
        dDoINewPage.value = SI.Editor.Data.Site.Domain;
        dDoNewPage.appendChild(dDoINewPage);
        inRowNewPage.appendChild(dDoNewPage);

        let dPgNewPage = document.createElement('td');
        let dPgINewPage = document.createElement('input');
        dPgINewPage.id = "si_edit_site_newpage";
        dPgNewPage.appendChild(dPgINewPage);
        inRowNewPage.appendChild(dPgNewPage);

        let dSuNewPage = document.createElement('td');

        let dSuINewPage = document.createElement('input');
        dSuINewPage.type = 'button';
        dSuINewPage.onclick = function () {
            //debugger;
            //  let b = document.getElementById("SI_Struct_NewPage_BU").value;
            //  let d = document.getElementById("SI_Struct_NewPage_Domain").value;
            let p = document.getElementById("si_edit_site_newpage").value;
            SI.Editor.Objects.Page.New(p);
        }
        dSuINewPage.value = 'Create';
        dSuNewPage.appendChild(dSuINewPage);
        inRowNewPage.appendChild(dSuNewPage);

        tblNewPage.appendChild(inRowNewPage);
        fldNewPage.appendChild(tblNewPage);
        base.appendChild(fldNewPage);


        //Directory

        let directory = Ele('fieldset', {
            class:'si-edit-fieldset',
            style:{
                backgroundColor: SI.Editor.Style.BackgroundColor,
            },
            append: Ele('legend', {
                 innerHTML: 'Directory',
                 class:'si-edit-legend'
            }),
            appendTo: base,
        });


        let pageData = SI.Editor.Data.Objects.Pages;


        let json = {'domains':{}};
        json.domains.NODE_DATA = {};

        let domains = [];
        for (let domain of pageData) {
            //Deal with domain setup
            if (!domains.includes(domain['domainName'])) {
                let domName = domain['domainName'];
                
                json.domains[domName] = {};
                json.domains[domName].NODE_DATA = {};
                json.domains[domName].NODE_DATA.guid=domain['domainId'];
                json.domains[domName].subdomains = {};
                json.domains[domName].subdomains.NODE_DATA = {};

                let dom = Ele('fieldset', {
                    id: 'si_edit_site_domain_' + domain['domainName'],
                    class:'si-edit-fieldset',
                    style:{
                        backgroundColor: SI.Editor.Style.BackgroundColor,
                        filter: 'brightness(120%)'
                    },
                    append: Ele('legend', {
                        innerHTML: "Domains",
                        class:'si-edit-legend'
                    }),
                    appendTo: directory,
                });
                Ele('span', {
                    innerHTML: domain['domainName'],
                    appendTo: dom,
                }),
                    domains.push(domain['domainName']);

                //Deal with subdomain setup
                let subdoms = [];
                for (let sub of pageData) {
                    if ((!subdoms.includes(sub['subdomainName'])) && (domain['domainName'] === sub['domainName'])) {
                        let subname = ''
                        if (sub['subdomainName'] === '') {
                            subname = ' ';
                        } else {
                            subname = sub['subdomainName'];
                        }

                        json.domains[domName].subdomains[subname] = {};
                        json.domains[domName].subdomains[subname].NODE_DATA = {};
                        json.domains[domName].subdomains[subname].NODE_DATA.guid = sub['subdomainId'];
                        json.domains[domName].subdomains[subname].NODE_DATA.ele =  
                            {
                                tag:'button',
                                innerHTML:"New",
                                style:{
                                    float:'right'
                                },
                                onclick: function (e) {
                                    e.stopPropagation();
                                },
                            }

                        

                        let bu = Ele('fieldset', {
                            id: 'si_edit_site_domain_' + sub['domainName'] + '_' + subname,
                            class:'si-edit-fieldset',
                            style:{
                                backgroundColor: SI.Editor.Style.BackgroundColor,
                                filter: 'brightness(120%)'
                            },
                            append: Ele('legend', {
                                innerHTML: "SubDomains",
                                class:'si-edit-legend'
                            }),
                            appendTo: dom,
                        });
                        Ele('span', {
                            innerHTML: subname,
                            appendTo: bu
                        }),
                        subdoms.push(sub['subdomainName']);
                        let pages = [];
                        json.domains[domName].subdomains[subname].pages = {};
                        json.domains[domName].subdomains[subname].pages.NODE_DATA = {};
                        json.domains[domName].subdomains[subname].pages.NODE_DATA.ele = 
                        [
                            {
                                tag:'button',
                                innerHTML:"New",
                                style:{
                                    float:'right'
                                },
                                onclick: function (e) {
                                    e.stopPropagation();
                                },
                            },
                            {
                                tag:'button',
                                innerHTML:"Delete",
                                style:{
                                    float:'right'
                                },
                                onclick: function (e) {
                                    e.stopPropagation();
                                },
                            }
                            
                        ];
                        for (let page of pageData) {
                            let pgname = ''
                            if (page['pageName'] === '') {
                                pgname = 'ROOT';
                            } else {
                                pgname = page['pageName'];
                            }

                            if ((!pages.includes(page['pageName'])) && (page['subdomainName'] === sub['subdomainName'])) {
                                pageName = page['pageName'];


                                json.domains[domName].subdomains[subname].pages[pageName] = {};
                                json.domains[domName].subdomains[subname].pages[pageName].name = pageName;
                                json.domains[domName].subdomains[subname].pages[pageName].NODE_DATA = {};
                                json.domains[domName].subdomains[subname].pages[pageName].NODE_DATA.id = page['pageId'];

                                let pageid = '0x' + page['pageId'].toLowerCase();

                                let pg = Ele('fieldset', {
                                    id: 'si_edit_site_domain_' + domName+ '_' + subname + '_' + pgname,
                                    class:'si-edit-fieldset',
                                    style:{
                                        backgroundColor: SI.Editor.Style.BackgroundColor,
                                        filter: 'brightness(120%)'
                                    },
                                    append: Ele('legend', {
                                        innerHTML: pgname,
                                        class:'si-edit-legend'
                                    }),
                                    appendTo: bu,
                                });

                                //try to round up some relationships
                                let relationships = SI.Editor.Data.Objects.Entities.Relationships;
                                //debugger;

                                let removeredirect = Ele('button', {
                                    id: 'si_edit_site_rmredirect_' + pageid,
                                    innerHTML: 'Remove Redirect',
                                    style: {
                                        margin: '15px',
                                        display: 'none',
                                    },
                                    data:{
                                        guid:pageid
                                    },
                                    appendTo: pg,
                                    onclick: function (e) {
                                        let options = {};
                                        options.Data = {};
                                        options.Data.KEY = "RemoveRedirect";
                                        options.Data.pageid = this.dataset.guid; //.id.replace('si_edit_site_rmredirect_', '');
                                        SI.Editor.Ajax.Run(options);
                                    },
                                });


                                if (page.redirecttopage) {
                                    removeredirect.style.display = 'block';
                                } else {

                                }

                                let parentEntBox = Ele('fieldset', {
                                    id: 'si_edit_site_domain_' + domName + '_' + subname + '_' + pgname,
                                    class:'si-edit-fieldset',
                                    style:{
                                        backgroundColor: SI.Editor.Style.BackgroundColor,
                                        filter: 'brightness(120%)'
                                    },
                                    append: Ele('legend', {
                                        innerHTML: "Parent Entities",
                                        class:'si-edit-legend'
                                    }),
                                    appendTo: pg,
                                });

                                let childEntBox = Ele('fieldset', {
                                    id: 'si_edit_site_domain_' + page['domainName'] + '_' + subname + '_' + pgname,
                                    class:'si-edit-fieldset',
                                    style:{
                                        backgroundColor: SI.Editor.Style.BackgroundColor,
                                        filter: 'brightness(120%)'
                                    },
                                    append: Ele('legend', {
                                        innerHTML: "Child Entities",
                                        class:'si-edit-legend'
                                    }),
                                    appendTo: pg,
                                });

                                let parentEnts = [];
                                let childEnts = [];

                                for (let r in relationships) {

                                    let relation = relationships[r];
                                    //check for parents or children
                                    let relid = '0x' + relation.id.toLowerCase();
                                    let parentid = '0x' + relation.parent_id.toLowerCase();
                                    let childid = '0x' + relation.child_id.toLowerCase();

                                    let pEntName = relation.parententity_name;
                                    let cEntName = relation.childentity_name;
                                    //debugger;
                                    //save only the correct id
                                    if (parentid !== pageid) {
                                        parentid = null;
                                    }
                                    if (childid !== pageid) {
                                        childid = null;
                                    }
                                    //this should never be both
                                    if (parentid || childid) {
                                        //debugger;
                                        //put the remaining id into the id
                                        let id = (parentid || childid);
                                        ;
                                        let entName = null;
                                        let appendto = null;
                                        let makeFS = false;
                                        let pg;
                                        if (parentid) {  //The page is the parent  
                                            if (!parentEnts.includes(parentid)) {
                                                parentEnts.push(parentid);
                                                entName = pEntName;
                                                appendto = parentEntBox;
                                                makeFS = true;
                                                //debugger;
                                            } else {
                                                entName = pEntName;
                                                appendto = parentEntBox;
                                            }
                                        } else {    //The page is the child 
                                            if (childEnts.includes(childid)) {
                                                childEnts.push(childid);
                                                entName = cEntName;
                                                appendto = childEntBox;
                                                makeFS = true;
                                                //debugger;
                                            }
                                            else {

                                            }
                                        }
                                        //debugger;
                                        if (makeFS) {
                                            pg = Ele('fieldset', {
                                                id: 'si_edit_site_domain_' + page['domainName'] + '_' + subname + '_' + pgname,
                                                class:'si-edit-fieldset',
                                                style:{
                                                    backgroundColor: SI.Editor.Style.BackgroundColor,
                                                    filter: 'brightness(120%)'
                                                },
                                                append: Ele('legend', {
                                                    innerHTML: cEntName,
                                                    class:'si-edit-legend'
                                                }),
                                                appendTo: appendto,
                                            });

                                        } else {
                                            //debugger;
                                            pg = document.getElementById('si_edit_site_domain_' + page['domainName'] + '_' + subname + '_' + pgname);
                                        }
                                        //debugger;
                                        let relbox = Ele('div', {
                                            id: 'si_edit_site_domain_' + page['domainName'] + '_' + subname + '_' + pgname + "_" + id,
                                            innerHTML: relation.note,
                                            style: {
                                                display: 'inline-block',
                                                backgroundColor: SI.Editor.Style.BackgroundColor,
                                            },
                                            appendTo: pg,
                                        });

                                    }
                                    //then check for children
                                }
                                pages.push(page['pageName']);
                            }
                        }
                    }
                }
            }
        }


        debugger;
        let ul =  new SI.Widget.Tree({Leaves:json});
        let pre = Ele('div', {
            style: {
                tabSize: '0',
                color:'white',
            },
            append: ul,
            appendTo:base,
        })
        return base;



        //let pageLibrary = SI.Editor.Objects.Page.Current;

        //let selectCurrentPages = document.createElement('select');


        //for (let page in pageLibrary){
        ////    console.log("PAGE");
        //    let pg = pageLibrary[page];

        //    let bu = pg['subdomainName'];
        //    if (bu.length > 0) {
        //        bu = bu + '.';
        //    }
        //    let domain = pg['domainName'];
        //    let pagename = pg['pageName'];

        //    let option = document.createElement('option');
        //    option.value = bu + domain + "/" + pagename;
        //    option.innerHTML = bu + domain + "/" + pagename;
        //    selectCurrentPages.appendChild(option);
        //}


        //let btnOpenPage = document.createElement('button');
        //btnOpenPage.innerHTML = 'Open';
        // fldCurrentPages.appendChild(selectCurrentPages);
        //     base.appendChild(fldCurrentPages);


        let fldNewInstance = Ele('fieldset', {
            append: Ele('legend', { innerHTML: 'Create a new Instance' }),
            appendTo: base,
        });
        let tblNewInstance = Ele('table', { appendTo: fldNewInstance });
        let tblHdrInstance = Ele('tr', { appendTo: tblNewInstance });

        Ele('th', { innerHTML: 'Business Unit', appendTo: tblHdrInstance });
        Ele('th', { innerHTML: 'Domain', appendTo: tblHdrInstance });
        Ele('th', { appendTo: tblHdrInstance });

        let tblDtaInstance = Ele('tr', { appendTo: tblNewInstance });
        let tblDtaBuInstance = Ele('td', { appendTo: tblDtaInstance });
        Ele('input', { appendTo: tblDtaBuInstance });
        let tblDtaDoInstance = Ele('td', { appendTo: tblDtaInstance });
        Ele('input', { appendTo: tblDtaDoInstance });
        let tblDtaSubInstance = Ele('td', { appendTo: tblDtaInstance });
        Ele('input', { appendTo: tblDtaSubInstance });


        return base;
    },

}