/**
Copyright 2008-2015 Geode Systems LLC
*/


//Properties
var PROP_LAYOUT_TYPE = "layoutType";
var PROP_LAYOUT_COLUMNS = "layoutColumns";
var PROP_SHOW_MAP = "showMap";
var PROP_SHOW_MENU  = "showMenu";
var PROP_FROMDATE = "fromDate";
var PROP_TODATE = "toDate";

//
//adds the display manager to the list of global display managers
//
function addDisplayManager(displayManager) {
    if(window.globalDisplayManagers == null) {
        window.globalDisplayManagers =  {};
        // window.globalDisplayManager = null;
    }
    window.globalDisplayManagers[displayManager.getId()] = displayManager;
    window.globalDisplayManager = displayManager;
}


function addGlobalDisplayType(type) {
    if(window.globalDisplayTypes == null) {
        window.globalDisplayTypes=  [];
    }
    window.globalDisplayTypes.push(type);
}

//
//This will get the currently created global displaymanager or will create a new one
//
function getOrCreateDisplayManager(id, properties, force) {
    if(!force) {
        var displayManager = getDisplayManager(id);
        if(displayManager != null) {
            return displayManager;
        }
        if(window.globalDisplayManager!=null) {
            return window.globalDisplayManager;
        }
    }
    var displayManager =     new DisplayManager(id, properties);
    if(window.globalDisplayManager==null) {
        window.globalDisplayManager  = displayManager;
    }
    return displayManager;
}

//
//return the global display manager with the given id, null if not found
//
function getDisplayManager(id) {
    if(window.globalDisplayManagers==null) {
        return null;
    }
    var manager =  window.globalDisplayManagers[id];
    return manager;
}



var ID_DISPLAYS = "displays";

//
//DisplayManager constructor
//

function DisplayManager(argId,argProperties) {


    var ID_MENU_BUTTON = "menu_button";
    var ID_MENU_OUTER =  "menu_outer";
    var ID_MENU_INNER =  "menu_inner";

    RamaddaUtil.inherit(this, this.SUPER = new DisplayThing(argId, argProperties));

    RamaddaUtil.initMembers(this, {
                dataList : [],
                displayTypes: [],
                initMapBounds : null,
                });

    if(window.globalDisplayTypes!=null) {
        for(var i=0;i<window.globalDisplayTypes.length;i++) {
            this.displayTypes.push(window.globalDisplayTypes[i]);
        }
    }




    RamaddaUtil.defineMembers(this, {
           group: new DisplayGroup(this, argId,argProperties),
           showmap : this.getProperty(PROP_SHOW_MAP,null),
           addDisplayType: function(type,label) {
               this.displayTypes.push({type:label});
           },
           getLayoutManager: function () {
               return this.group;
           },
           collectEntries: function() {
               var entries = this.getLayoutManager().collectEntries();
               return entries;
           },
           getData: function() {
               return this.dataList;
           },
           handleEventFieldsSelected: function (source, fields) {
               this.notifyEvent("handleEventFieldsSelected", source, fields);
           },
           handleEventEntriesChanged: function (source, entries) {
               this.notifyEvent("handleEventEntriesChanged", source, entries);
           },
           handleEventMapBoundsChanged: function (source,  bounds, forceSet) {
                var args = {
                    "bounds":bounds,
                    "force":forceSet
                };
                this.notifyEvent("handleEventMapBoundsChanged", source, args);
           },
           addMapLayer: function(source, entry) {
               this.notifyEvent("addMapLayer", source, {entry:entry});
           },
           handleEventMapClick: function (mapDisplay, lon, lat) {
                var indexObj = [];
                var records = null;
                for(var i=0;i<this.dataList.length;i++) {
                    var pointData = this.dataList[i];
                    records = pointData.getRecords();
                    if(records!=null) break;
                }
                var indexObj = [];
                var closest =  RecordUtil.findClosest(records, lon, lat, indexObj);
                if(closest!=null) {
                    this.handleEventRecordSelection(mapDisplay, pointData, indexObj.index);
                }
                this.notifyEvent("handleEventMapClick", mapDisplay, {mapDisplay:mapDisplay,lon:lon,lat:lat});
            },
            handleEventRecordSelection: function(source, pointData, index) {

                if(pointData ==null && this.dataList.length>0) {
                    pointData = this.dataList[0];
                }
                var fields =  pointData.getRecordFields();
                var records = pointData.getRecords();
                if(records == null) {
                    return;
                }
                if(index<0 || index>= records.length) {
                    console.log("handleEventRecordSelection: bad index= " + index);
                    return;
                 }

                var record = records[index];
                var values = this.getRecordHtml(record,fields);


                this.notifyEvent("handleEventRecordSelection", source, {index:index, record:record, html:values});
                var entries  =source.getEntries();
                if(entries!=null && entries.length>0) {
                    this.handleEventEntrySelection(source, {entry:entries[0], selected:true});
                }
            },
            handleEventEntrySelection: function(source,  props) {
               this.notifyEvent("handleEventEntrySelection", source, props);
            },
            handleEventPointDataLoaded: function(source, pointData) {
                this.notifyEvent("handleEventPointDataLoaded", source, pointData);
            },
           ranges: {
               //               "TRF": [0,100],
           },
           setRange: function(field, range) {
               if(this.ranges[field.getId()] == null) {
                   this.ranges[field.getId()] = range;
               } 
           },
           getRange: function(field) {
               return this.ranges[field.getId()];
           },
            makeMainMenu: function() {
                if(!this.getProperty(PROP_SHOW_MENU, true))  {
                    return "";
                }
                //How else do I refer to this object in the html that I add 
                var get = "getDisplayManager('" + this.getId() +"')";
                var layout = "getDisplayManager('" + this.getId() +"').getLayoutManager()";
                var html = "";
                var newMenus = {};
                var cats = [];
                var chartMenu = "";
                for(var i=0;i<this.displayTypes.length;i++) {
                    //The ids (.e.g., 'linechart' have to match up with some class function with the name 
                    var type = this.displayTypes[i];
                    if(Utils.isDefined(type.forUser) && !type.forUser) continue;
                    var category = type.category;
                    if(category == null) {
                        category = "Misc";
                    }
                    if(newMenus[category] == null) {
                        newMenus[category] = "";
                        cats.push(category);
                    }
                    newMenus[category]+= HtmlUtil.tag(TAG_LI,[], HtmlUtil.tag(TAG_A, ["onclick", get+".userCreateDisplay('" + type.type+"');"], type.label));
                }

                var newMenu = "";
                for(var i=0;i<cats.length;i++) {
                    var cat =  cats[i];
                    if(cat == "Charts") {
                        chartMenu = newMenus[cat];
                    }
                    var subMenu = HtmlUtil.tag("ul",[], newMenus[cat]);
                    var catLabel = HtmlUtil.tag(TAG_A,[],cat);
                    newMenu  += HtmlUtil.tag(TAG_LI,[],catLabel+subMenu);
                    //                    newMenu  += HtmlUtil.tag(TAG_LI,[], "SUB " + i);
                }
                var publishMenu = 
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".publish('media_photoalbum');", "New Photo Album")) +"\n" +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".publish('wikipage');", "New Wiki Page")) +"\n" +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".publish('blogentry');", "New Blog Post")) +"\n";


                var fileMenu = 
                    HtmlUtil.tag(TAG_LI,[], "<a>Publish</a>" + HtmlUtil.tag("ul",[], publishMenu)) +"\n" +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".copyDisplayedEntries();", "Save entries")) +"\n";


                var titles = HtmlUtil.tag(TAG_DIV,["class","ramadda-menu-block"],"Titles: " + HtmlUtil.onClick(layout +".titlesOn();", "On") +"/" + HtmlUtil.onClick(layout +".titlesOff();", "Off"));
                var dates =   HtmlUtil.tag(TAG_DIV,["class","ramadda-menu-block"], 
                                           "Set date range: " + 
                                           HtmlUtil.onClick(layout +".askMinDate();", "Min") +"/" +
                                           HtmlUtil.onClick(layout +".askMaxDate();", "Max"));
                var editMenu = 
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.tag(TAG_DIV,["class","ramadda-menu-block"],
                                                         "Set axis range :" +
                                                         HtmlUtil.onClick(layout +".askMinZAxis();", "Min") +"/" +
                                                         HtmlUtil.onClick(layout +".askMaxZAxis();", "Max"))) +
                    HtmlUtil.tag(TAG_LI,[], dates) +
                    HtmlUtil.tag(TAG_LI,[], titles) +"\n" +
                    HtmlUtil.tag(TAG_LI,[],HtmlUtil.tag(TAG_DIV,["class", "ramadda-menu-block"], "Details: " + HtmlUtil.onClick(layout +".detailsOn();", "On",[]) +"/" +
                                                        HtmlUtil.onClick(layout +".detailsOff();", "Off",[]))) +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".deleteAllDisplays();", "Delete all displays")) +"\n" +
                    "";


                var table = HtmlUtil.tag(TAG_DIV,["class","ramadda-menu-block"],"Table: " + 
                                         HtmlUtil.onClick(layout +".setLayout('table',1);", "1 column")+" / " +
                                         HtmlUtil.onClick(layout +".setLayout('table',2);", "2 column") +" / " +
                                         HtmlUtil.onClick(layout +".setLayout('table',3);", "3 column") +" / " +
                                         HtmlUtil.onClick(layout +".setLayout('table',4);", "4 column"));
                var layoutMenu = 
                    HtmlUtil.tag(TAG_LI,[], table) +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".setLayout('rows');", "Rows")) +"\n" +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".setLayout('columns');", "Columns")) +"\n" +
                    HtmlUtil.tag(TAG_LI,[], HtmlUtil.onClick(layout +".setLayout('tabs');", "Tabs"));



                var menuBar =  HtmlUtil.tag(TAG_LI,[],"<a>File</a>" + HtmlUtil.tag("ul",[], fileMenu));
                if(chartMenu!="") {
                    menuBar += HtmlUtil.tag(TAG_LI,[],"<a>Charts</a>" + HtmlUtil.tag("ul",[], chartMenu));
                }
                menuBar+= HtmlUtil.tag(TAG_LI,[],"<a>Edit</a>" + HtmlUtil.tag("ul",[], editMenu)) +
                    HtmlUtil.tag(TAG_LI,[],"<a>New</a>" + HtmlUtil.tag("ul",[], newMenu)) +
                    HtmlUtil.tag(TAG_LI,[],"<a>Layout</a>" + HtmlUtil.tag("ul", [], layoutMenu));
                var menu = HtmlUtil.div([ATTR_CLASS,"ramadda-popup", ATTR_ID, this.getDomId(ID_MENU_OUTER)], 
                                        HtmlUtil.tag("ul", [ATTR_ID, this.getDomId(ID_MENU_INNER),ATTR_CLASS, "sf-menu"], menuBar));

                html += menu;
                html += HtmlUtil.tag(TAG_A, [ATTR_CLASS, "display-menu-button", ATTR_ID, this.getDomId(ID_MENU_BUTTON)],"&nbsp;");
                //                html+="<br>";
                return html;
            },
            hasGeoMacro: function(jsonUrl) {
               return  jsonUrl.match(/(\${latitude})/g) !=null;
            },
            getJsonUrl:function(jsonUrl, display, props) {
                var fromDate  = display.getProperty(PROP_FROMDATE);
                if(fromDate!=null) {
                    jsonUrl += "&fromdate=" + fromDate;
                }
                var toDate  = display.getProperty(PROP_TODATE);
                if(toDate!=null) {
                    jsonUrl += "&todate=" + toDate;
                }
                
                if(this.hasGeoMacro(jsonUrl)) {
                    var lon = props.lon;
                    var lat = props.lat;
                    
                    if((lon == null || lat == null) &&  this.map!=null) {
                        var tuple = this.getPosition();
                        if(tuple!=null) {
                            lat = tuple[0];
                            lon = tuple[1];
                        }
                    } 
                    if(lon != null && lat != null) {
                    	jsonUrl = jsonUrl.replace("${latitude}",lat.toString());
                        jsonUrl = jsonUrl.replace("${longitude}",lon.toString());
                    } 
                }
                jsonUrl = jsonUrl.replace("${numpoints}",1000);
                return jsonUrl;
            },
            getDefaultData: function() {
                for(var i in this.dataList) {
                    var data = this.dataList[i];
                    var records = data.getRecords();
                    if(records!=null) {
                        return data;
                    }
                }
                if(this.dataList.length>0) {
                    return this.dataList[0];
                }
                return null;
            },

           writeDisplay: function() {
               if(this.originalLocation==null) {
                   this.originalLocation = document.location;
               }
               var url = this.originalLocation+"#";
               url += "&display0=linechart";
               for(var attr in document) {
                   //                   if(attr.toString().contains("location")) 
                   //                       console.log(attr +"=" + document[attr]);
               }
               document.location = url;

           },
           userCreateDisplay: function(type, props) {
               if(props == null) {
                   props ={};
               }
               props.editMode = true;
               if(type == DISPLAY_LABEL && props.text == null) {
                   var text = prompt("Text");
                   if(text == null) return;
                   props.text = text;
               }
               return this.createDisplay(type, props);
           },
           createDisplay: function(type, props) {
               if(props == null) {
                   props ={};
               }
                if(props.data!=null) {
                    var haveItAlready = false;
                    for(var i=0;i<this.dataList.length;i++) {
                        var existingData = this.dataList[i];
                        if(existingData.equals(props.data)) {
                            props.data = existingData;
                            haveItAlready = true;
                            break;
                        }
                    }
                    if(!haveItAlready) {
                        this.dataList.push(props.data);
                    }
                }

                //Upper case the type name, e.g., linechart->Linechart
                var proc = type.substring(0,1).toUpperCase() + type.substring(1);

                //Look for global functions  Ramadda<Type>Display, <Type>Display, <Type> 
                //e.g. - RamaddaLinechartDisplay, LinechartDisplay, Linechart 
                var classname = null;
                var names = ["Ramadda" +proc + "Display",
                            proc +"Display",
                            proc];
                var func = null;
                var funcName = null;
                var msg = "";
                for(var i=0;i<names.length;i++) {
                    msg += ("trying:" + names[i] +"\n");
                    if(window[names[i]]!=null) {
                        funcName = names[i];
                        func = window[names[i]];
                        break;
                    }

                }
                if(func==null) {
                    console.log("Error: could not find display function:" + type);
                    //                    alert("Error: could not find display function:" + type);
                    alert("Error: could not find display function:" + type +" msg: " + msg);
                    return;
                }
                var displayId = this.getUniqueId("display");
                if(props.data==null && this.dataList.length>0) {
                    props.data =  this.dataList[0];
                }
                props.createdInteractively = true;
                if(!props.entryId) {
                    props.entryId = this.group.entryId;
                }


                var display =  eval(" new " + funcName+"(this,'" +  displayId+"', props);");
                if(display == null) {
                    console.log("Error: could not create display using:" + funcName);
                    alert("Error: could not create display using:" + funcName);
                    return;
                }
                this.addDisplay(display);
                return display;
            },
            addDisplay: function(display) {
                display.setDisplayManager(this);
                display.loadInitialData();
                this.getLayoutManager().addDisplay(display);
            },
            notifyEvent:function(func, source, data) {
               this.getLayoutManager().notifyEvent(func, source, data);
            }, 
            removeDisplay:function(display) {
                this.getLayoutManager().removeDisplay(display);
                this.notifyEvent("handleEventRemoveDisplay", this, display);
            },
        });

    addDisplayManager(this);

    var displaysHtml = HtmlUtil.div([ATTR_ID, this.getDomId(ID_DISPLAYS),ATTR_CLASS,"display-container"]);
    var html = HtmlUtil.openTag(TAG_DIV);
    html += this.makeMainMenu();
    var targetDiv = this.getProperty("target");
    var _this = this;
    if(targetDiv!=null) {
        $( document ).ready(function() {
                $("#" + targetDiv).html(displaysHtml);
                _this.getLayoutManager().doLayout();
            });

    } else {
        html +=   displaysHtml;
    }
    html += HtmlUtil.closeTag(TAG_DIV);

    $("#"+ this.getId()).html(html)
    if(this.showmap) {
        this.createDisplay('map');
    }
    var theDisplayManager = this;

    $("#"+this.getDomId(ID_MENU_BUTTON)).button({ icons: { primary: "ui-icon-gear", secondary: "ui-icon-triangle-1-s"}}).click(function(event) {
            var id =theDisplayManager.getDomId(ID_MENU_OUTER); 
            showPopup(event, theDisplayManager.getDomId(ID_MENU_BUTTON), id, false,null,"left bottom");
            $("#"+  theDisplayManager.getDomId(ID_MENU_INNER)).superfish({
                    //Don't set animation - it is broke on safari
                    //                    animation: {height:'show'},
                        speed: 'fast',
                            delay: 300
                        });
        });

}

