/*
 * Copyright (c) 2008-2015 Geode Systems LLC
 */



// google maps
var map_google_terrain = "google.terrain";
var map_google_streets = "google.streets";
var map_google_hybrid = "google.hybrid";
var map_google_satellite = "google.satellite";

// ESRI Maps
var map_esri_topo = "esri.topo";
var map_esri_street = "esri.street";
var map_esri_worldimagery = "esri.worldimagery";
var map_opentopo = "opentopo";

var map_usgs_topo = "usgs.topo";
var map_usgs_imagery = "usgs.imagery";
var map_usgs_relief = "usgs.relief";

// Microsoft maps - only work for -180 to 180
var map_ms_shaded = "ms.shaded";
var map_ms_hybrid = "ms.hybrid";
var map_ms_aerial = "ms.aerial";

var map_osm = "osm";


// doesn't support EPSG:900913
var map_wms_topographic = "wms:Topo Maps,http://terraservice.net/ogcmap.ashx,DRG";
var map_ol_openstreetmap = "ol.openstreetmap";

var map_default_layer =  map_osm;


function createLonLat(lon,lat) {
    lon = parseFloat(lon);
    lat = parseFloat(lat);
    return new OpenLayers.LonLat(lon, lat);
}

function createBounds(v1,v2,v3,v4) {
    v1 = parseFloat(v1);
    v2 = parseFloat(v2);
    v3 = parseFloat(v3);
    v4 = parseFloat(v4);
    //    console.log("bounds:" + v1 +" " + v2 + " " + v3 + " " + v4);

    return  new OpenLayers.Bounds(v1,v2,v3,v4);
}

function createProjection(name) {
    return  new OpenLayers.Projection(name);
}



var defaultLocation = createLonLat(-100, 40);
var defaultZoomLevel = 11;
var sphericalMercatorDefault = true;
var maxLatValue = 85;
var maxExtent = createBounds(-20037508, -20037508, 20037508, 20037508);
var earthCS = createProjection("EPSG:4326");
var sphericalMercatorCS = createProjection("EPSG:900913");

var sourceProjection  = sphericalMercatorCS;
var displayProjection=  earthCS;


var positionMarkerID = "location";
var latlonReadoutID = "ramadda-map-latlonreadout";

//Global list of all maps on this page
var ramaddaMaps = new Array();

var wrapDatelineDefault = true;
var zoomLevelsDefault = 30;


var ramaddaMapMap = {};

function ramaddaAddMap(map) {
    ramaddaMaps.push(map);
}

function RepositoryMap(mapId, params) {
    ramaddaMapMap[mapId] = this;
    if(!params) params = {};
    ramaddaAddMap(this);
    var theMap = this;
    if (mapId == null) {
        mapId = "map";
    }


    $.extend(this, {
            sourceProjection:sourceProjection,
                displayProjection: displayProjection,
                mapId: mapId,
                mapDivId: mapId,
                showScaleLine : true,
                showLayerSwitcher : true,
                showZoomPanControl : true,
                showZoomOnlyControl : false,
                showLatLonPosition : true,
                enableDragPan : true,
                defaultLocation : defaultLocation,
                initialZoom : defaultZoomLevel,
                latlonReadout : latlonReadoutID,
                map: null,
                defaultMapLayer: map_default_layer,
                haveAddedDefaultLayer: false,
                layer: null,
                markers: null,
                vectors: null,
                boxes: null,
                vectorLayers:[],
                features:{},
                lines: null,
                selectorBox: null,
                selectorMarker: null,
                listeners: [],
                initialLayers: [],
                imageLayers:{
                },
                });


        var  dflt = {
            pointRadius: 3,
            fillOpacity: 0.6,
            fillColor: "#e6e6e6",
            strokeColor: "#999",
            strokeWidth: 1,
            scrollToZoom: false,
            selectOnHover: false,
            highlightOnHover: true
        };


        $.extend(this, dflt);
        $.extend(this, params);

        this.default = {};


        if(Utils.isDefined(params.onSelect)) {
            this.onSelect = params.onSelect;
        } else {
            this.onSelect =null;
        }
        if(params.initialLocation) {
            this.defaultLocation = createLonLat(params.initialLocation[1],params.initialLocation[0]);
        } else  if(Utils.isDefined(params.initialBounds) && params.initialBounds[0]<=90 && params.initialBounds[0]>=-90)  {
            this.defaultBounds = createBounds(params.initialBounds[1], params.initialBounds[2],params.initialBounds[3],params.initialBounds[0]);
        }



    jQuery(document).ready(function($) {
            if(theMap.map) {
                theMap.map.updateSize();
            }
     });


    RamaddaUtil.defineMembers(this,  {
            addLayer: function(layer) {
                if(this.map!=null) {
                    this.map.addLayer(layer);
                } else {
                    this.initialLayers.push(layer);
                }
            },
        });

    this.addImageLayer = function(layerId, name, desc, url, visible, north,west,south,east, width,height) {
        var _this = this;
        //Things go blooeey with lat up to 90
        if(north>88) north = 88;
        if(south<-88) south = -88;
        var imageBounds = createBounds(west, south,east,north);
        imageBounds = this.transformLLBounds(imageBounds);
        var image = new OpenLayers.Layer.Image(
                                                    name,url,
                                                    imageBounds,
                                                    new OpenLayers.Size(width, height),
                                                    {numZoomLevels: 3, 
                                                            isBaseLayer: false,
                                                            resolutions:this.map.layers[0].resolutions,
                                                            maxResolution:this.map.layers[0].resolutions[0]}
                                                    );
        
        var lonlat =  new createLonLat(west,north);
        image.lonlat = this.transformLLPoint(lonlat);

        image.setVisibility(visible);
        image.id = layerId;
        image.text = this.getPopupText(desc);
        image.ramaddaId = layerId;
        image.ramaddaName = name;
        this.map.addLayer(image);
        image.north = north;
        image.west =  west;
        image.south =  south;
        image.east =  east;
        if(visible)  {
            image.box = this.createBox(layerId, north, west, south, east, desc, {});
        } 

        if(!this.imageLayers) this.imageLayers = {}
        this.imageLayers[layerId] = image;

    }


    this.addWMSLayer = function(name, url, layer, isBaseLayer) {
        var layer = new OpenLayers.Layer.WMS(name, url, {
                layers : layer,
                format: "image/png",
                isBaseLayer: false,
                srs:"epse:4326",
                transparent: true

        }, {
            wrapDateLine : wrapDatelineDefault
        });
        if(isBaseLayer)  {
            layer.isBaseLayer = true;
            layer.visibility = false;
        }    else {
            layer.isBaseLayer = false;
            layer.visibility = true;
        }


        //If we have this here we get this error: 
        //http://lists.osgeo.org/pipermail/openlayers-users//2012-August/026025.html
        //        layer.reproject = true;

        this.map.addLayer(layer);
    }



    this.addMapLayer = function(name, url, layer, isBaseLayer, isDefault) {
        var layer;
        if (/\/tile\//.exec(url)) {
            layer = new OpenLayers.Layer.XYZ(
                        name, url, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
        } else {
            layer = new OpenLayers.Layer.WMS(name, url, {
                    layers : layer,
                    format: "image/png"
                }, {
                    wrapDateLine : wrapDatelineDefault
                });
        }
        if(isBaseLayer) 
            layer.isBaseLayer = true;
        else
            layer.isBaseLayer = false;
        layer.visibility = false;
        layer.reproject = true;
        this.map.addLayer(layer);
        if(isDefault) {
            this.haveAddedDefaultLayer = true;
            this.map.setLayerIndex(layer, 0);
            this.map.setBaseLayer(layer);
        }
    }

    this.addGeoJsonLayer = function(name, geoJsonUrl, canSelect, selectCallback, unselectCallback) {
        var geoJsonLayer = new OpenLayers.Layer.Vector(name, {
            projection: this.displayProjection,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: geoJsonUrl,
                format: new OpenLayers.Format.GeoJSON()
            }),
            styleMap: new OpenLayers.StyleMap({
                "default": new OpenLayers.Style({
                    pointRadius: 3,
                    fillOpacity: 0.6,
                    fillColor: "#e6e6e6",
                    strokeColor: "#777777",
                    strokeWidth: 1
                }),
                "select": new OpenLayers.Style({
                    pointRadius: 3,
                    fillOpacity: 0.95,
                    fillColor: "#555555",
                    strokeColor: "#222222",
                    strokeWidth: 1
                })
            })
        });
        this.map.addLayer(geoJsonLayer);
        


        if (canSelect) {
            select = new OpenLayers.Control.SelectFeature(geoJsonLayer, {
                 multiple: false, 
                 hover: this.selectOnHover,
                 //highlightOnly: true,
                 renderIntent: "select",
            });


            theMap = this;
            if(!Utils.isDefined(selectCallback)) selectCallback = function(layer){theMap.onFeatureSelect(layer)};
            if(!Utils.isDefined(unselectCallback)) unselectCallback = this.onFeatureUnselect;

            geoJsonLayer.events.on({ 
                "featureselected": selectCallback,
                "featureunselected": unselectCallback
            });
            this.map.addControl(select);
            select.activate();   
        }
    }


    this.onFeatureSelect = function(layer) {
        if( this.onSelect) {
            func = window[this.onSelect];
            func(this, layer);
            return;
        }


        var format = new OpenLayers.Format.GeoJSON();
        var feature = layer.feature;
        var json = format.write(feature);
        var p = feature.attributes;
        var out = "<table>";
        for (var attr in p) {
            var label = attr.replace("_"," ");
            out += "<tr><td align=right><div style=\"margin-right:5px;margin-bottom:3px;\"><b>" + label + ":</b></div></td><td><div style=\"margin-right:5px;margin-bottom:3px;\">";
            if (typeof p[attr] == 'object' || typeof p[attr] == 'Object') {
               var o = p[attr];
               out += o["value"];
            } else {
                out +=  p[attr];
            }
            out +=  "</div></td></tr>";
        }
        out += "</table>";

        if (this.currentPopup) {
            this.map.removePopup(this.currentPopup);
            this.currentPopup.destroy();
        }
        var popup = new OpenLayers.Popup.FramedCloud("popup", feature.geometry.getBounds().getCenterLonLat(),
                null, out, null, true, function() {
                    theMap.onPopupClose()
                });
        feature.popup = popup;
        popup.feature = feature;

        //Use theMap instead of this because when the function is called the this object isn't the ramaddamap
        theMap.map.addPopup(popup);
        theMap.currentPopup = popup;
    }

    this.onFeatureUnselect = function(layer) {
       theMap.onPopupClose();
    }

    this.removeKMLLayer = function(layer) {
        this.map.removeLayer(layer);
    }

    this.addKMLLayer = function(name, kmlUrl, canSelect, selectCallback, unselectCallback, argProps) {
        if(argProps) {
            console.log("map.addKMLLayer:" + argProps);
        }
        var  props = {
            pointRadius: this.pointRadius,
            fillOpacity:this.fillOpacity,
            fillColor:this.fillColor,
            strokeColor:this.strokeColor,
            strokeWidth:this.strokeWidth,
        };
        if (argProps) RamaddaUtil.inherit(props, argProps);
        var kmlLayer = new OpenLayers.Layer.Vector(name, {
            projection: this.displayProjection,
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: kmlUrl,
                format: new OpenLayers.Format.KML({
                        //extractStyles: true, 
                        extractAttributes: true,
                        maxDepth: 2
                })
            }),
            styleMap: new OpenLayers.StyleMap({
                "default": new OpenLayers.Style({
                    pointRadius: props.pointRadius,
                    fillOpacity: props.fillOpacity,
                    fillColor: props.fillColor,
                    strokeColor: props.strokeColor,
                    strokeWidth: props.strokeWidth,
                }),
                "select": new OpenLayers.Style({
                    pointRadius: 3,
                    fillOpacity: 0.95,
                    fillColor: "#666",
                    strokeColor: "#222222",
                    strokeWidth: 1
                })
            })
        });
        this.map.addLayer(kmlLayer);
        
        //        console.log(kmlLayer.getDataExtent());



        if (canSelect) {
            select = new OpenLayers.Control.SelectFeature(kmlLayer, {
                 multiple: false, 
                 hover: this.selectOnHover,
                 //highlightOnly: true,
                 renderIntent: "select",
            });
            if (this.highlightOnHover) {
                highlight = new OpenLayers.Control.SelectFeature(kmlLayer, {
                     multiple: false, 
                     hover: true,
                     highlightOnly: true,
                     renderIntent: "temporary"
                });
            }
            theMap = this;
            theMap.foobar = "foobar";
            if(!Utils.isDefined(selectCallback)) selectCallback = function(layer){theMap.onFeatureSelect(layer)};
            if(!Utils.isDefined(unselectCallback)) unselectCallback = this.onFeatureUnselect;

            kmlLayer.events.on({ 
                "featureselected": selectCallback,
                "featureunselected": unselectCallback
            });
            if (this.highlightOnHover) {
                this.map.addControl(highlight);
                highlight.activate();   
            }
            this.map.addControl(select);
            select.activate();   
        }
        return kmlLayer;
    }

    this.addBaseLayers = function() {
        if (!this.mapLayers) {
            this.mapLayers = [ 
                              map_osm,
                              map_esri_topo,
                              map_opentopo,
                              map_usgs_topo,
                              map_usgs_imagery,
                              map_usgs_relief,
                              //                              map_esri_worldimagery,

                              map_google_hybrid,
                              map_google_terrain,
                              map_google_streets, 
                              map_google_satellite,
            ];
        }

        var needgoogle = false;
        for (var i=0; i<this.mapLayers.length; i++) {
            if (this.mapLayers[i].indexOf('google') >= 0) {
                needgoogle = true;
                break;
            }
        }

        //if (needgoogle && (typeof google.maps === 'undefined')) {
        if (needgoogle && !(google && google.maps)) {
            console.log("No google maps");
            return;
        }

        var dflt =  this.defaultMapLayer;

        //        dflt =   map_osm;


        if(!this.haveAddedDefaultLayer && dflt) {
            var index = this.mapLayers.indexOf(dflt);
            if(index >= 0) { 
                this.mapLayers.splice(index, 1);
                this.mapLayers.splice(0, 0,dflt);
            }
        }

        this.firstLayer = null;
        this.hybridLayer = null;
        this.defaultOLMapLayer = null;


        for (i = 0; i < this.mapLayers.length; i++) {
            mapLayer = this.mapLayers[i];
            if(mapLayer == null) {
                continue;
            }
            var newLayer = null;
            if (mapLayer == map_google_hybrid) {
            	this.hybridLayer = newLayer  =  new OpenLayers.Layer.Google("Google Hybrid",
                        {
                            'type' : google.maps.MapTypeId.HYBRID,
                            numZoomLevels : zoomLevelsDefault,
                            sphericalMercator : sphericalMercatorDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_google_streets) {
                newLayer  =  new OpenLayers.Layer.Google("Google Streets",
                        {
                            numZoomLevels :zoomLevelsDefault,
                            sphericalMercator : sphericalMercatorDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_google_terrain) {
                newLayer  =  new OpenLayers.Layer.Google("Google Terrain",
                        {
        	 		numZoomLevels : zoomLevelsDefault,
                            'type' : google.maps.MapTypeId.TERRAIN,
                            sphericalMercator : sphericalMercatorDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_google_satellite) {
                newLayer  =  new OpenLayers.Layer.Google(
                        "Google Satellite", {
                            'type' : google.maps.MapTypeId.SATELLITE,
                            numZoomLevels : zoomLevelsDefault,
                            sphericalMercator : sphericalMercatorDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if(mapLayer == map_osm) {
                newLayer = new OpenLayers.Layer.OSM();
            } else if (mapLayer == map_ms_shaded) {
                newLayer  =  new OpenLayers.Layer.VirtualEarth(
                        "Virtual Earth - Shaded", {
                            'type' : VEMapStyle.Shaded,
                            sphericalMercator : sphericalMercatorDefault,
                            wrapDateLine : wrapDatelineDefault,
                            numZoomLevels : zoomLevelsDefault
                        });
            } else if (mapLayer == map_ms_hybrid) {
                newLayer  =  new OpenLayers.Layer.VirtualEarth(
                        "Virtual Earth - Hybrid", {
                            'type' : VEMapStyle.Hybrid,
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_ms_aerial) {
                newLayer  =  new OpenLayers.Layer.VirtualEarth(
                        "Virtual Earth - Aerial", {
                            'type' : VEMapStyle.Aerial,
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            /* needs OpenLayers 2.12
            } else if (mapLayer == map_ol_openstreetmap) {
            newLayer  =  new OpenLayers.Layer.OSM("OpenStreetMap", null, {
                      transitionEffect: "resize",
                      attribution: "&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
                      sphericalMercator : sphericalMercatorDefault,
                      wrapDateLine : wrapDatelineDefault
                  });
            */
            } else if (mapLayer == map_opentopo) {
                var layerURL = "http://a.tile.opentopomap.org/${z}/${x}/${y}.png}";
                newLayer  =  new OpenLayers.Layer.XYZ(
                        "OpenTopo", layerURL, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });

            } else if (mapLayer == map_esri_worldimagery) {
                //Not working
                var layerURL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
                newLayer  =  new OpenLayers.Layer.XYZ(
                        "ESRI - World Imagery", layerURL, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_usgs_topo) {
                newLayer = new OpenLayers.Layer.XYZ(
                                                    "USGS Topo",
                                                     "https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSTopo/MapServer/tile/${z}/${y}/${x}",
                                                    {
                                                        sphericalMercator: true,
                                                        isBaseLayer: true,
                                                        attribution:'USGS - The National Map'
                                                    }
                                                    );
            } else if (mapLayer == map_usgs_imagery) {
                newLayer = new OpenLayers.Layer.XYZ(
                                                    "USGS Imagery",
                                                     "https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSImageryOnly/MapServer/tile/${z}/${y}/${x}",
                                                    {
                                                        sphericalMercator: true,
                                                        isBaseLayer: true,
                                                        attribution:'USGS - The National Map'
                                                    }
                                                    );
            } else if (mapLayer == map_usgs_relief) {
                newLayer = new OpenLayers.Layer.XYZ(
                                                    "USGS Shaded Relief",
                                                     "https://basemap.nationalmap.gov/ArcGIS/rest/services/USGSShadedReliefOnly/MapServer/tile/${z}/${y}/${x}",
                                                    {
                                                        sphericalMercator: true,
                                                        isBaseLayer: true,
                                                        attribution:'USGS - The National Map'
                                                    }
                                                    );


            } else if (mapLayer == map_esri_topo) {
                var layerURL = "http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}";
                newLayer  =  new OpenLayers.Layer.XYZ(
                        "ESRI - Topo", layerURL, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (mapLayer == map_esri_street) {
                var layerURL = "http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}";
                newLayer  =  new OpenLayers.Layer.XYZ(
                        "ESRI - Streets", layerURL, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });
            } else if (/\/tile\//.exec(mapLayer)) {
                var layerURL = mapLayer;
                newLayer  =  new OpenLayers.Layer.XYZ(
                                                           "ESRI - China Map", layerURL, {
                            sphericalMercator : sphericalMercatorDefault,
                            numZoomLevels : zoomLevelsDefault,
                            wrapDateLine : wrapDatelineDefault
                        });

            } else {
                var match = /wms:(.*),(.*),(.*)/.exec(mapLayer);
                if (!match) {
                    alert("no match for map layer:" + mapLayer);
                    continue;
                }
                this.addWMSLayer(match[1], match[2], match[3], true);
            }

            if(this.firstLayer == null) {
                this.firstLayer = newLayer;
            }
            if(newLayer  !=null) {
                if(mapLayer == this.defaultMapLayer) {
                    this.defaultOLMapLayer = newLayer;
                }
                this.map.addLayer(newLayer);
            }

        }

        this.graticule = new OpenLayers.Control.Graticule( {
            layerName : "Lat/Lon Lines",
            numPoints : 2,
            labelled : true,
            visible : false
        });
        this.map.addControl(this.graticule);

        return;
    }



    this.setLatLonReadout = function(llr) {
        this.latlonReadout = llr;
    }

    this.getMap = function() {
        return this.map;
    }
    this.initMap = function(doRegion) {
        if (this.inited)
            return;
        this.inited = true;
        this.name = "map";
        var theMap = this;
        var options = {
            projection : this.sourceProjection,
            displayProjection : this.displayProjection,
            units : "m",
            controls: [],
            maxResolution : 156543.0339,
            maxExtent : maxExtent
            
        };
        

        this.map = new OpenLayers.Map(this.mapDivId,options);
        this.addBaseLayers();

        //this.vectors = new OpenLayers.Layer.Vector("Drawing");
        //this.map.addLayer(this.vectors);



        if (this.enableDragPan) {
          this.map.addControl(new OpenLayers.Control.Navigation({
                      zoomWheelEnabled : this.scrollToZoom,
                      dragPanOptions: {
                          enableKinetic: true
                            }
          }));
        }
        
        
        /*this.map.addControl(new OpenLayers.Control.TouchNavigation({
            dragPanOptions: {
                enableKinetic: true
            }
        }));*/
        

        if (this.showZoomPanControl && !this.showZoomOnlyControl) {
            this.map.addControl(new OpenLayers.Control.PanZoom());
        }
        if (this.showZoomOnlyControl && !this.showZoomPanControl) {
            this.map.addControl(new OpenLayers.Control.Zoom());
        }

        if (this.showScaleLine) {
            this.map.addControl(new OpenLayers.Control.ScaleLine());
        }
        //        this.map.addControl(new OpenLayers.Control.OverviewMap());
        this.map.addControl(new OpenLayers.Control.KeyboardDefaults());
        if (this.showLayerSwitcher) {
            this.map.addControl(new OpenLayers.Control.LayerSwitcher());
        }

        if (this.showLatLonPosition) {
            var latLonReadout = GuiUtils.getDomObject(this.latlonReadout);
            if(latLonReadout) {
                this.map.addControl(new OpenLayers.Control.MousePosition( {
                            numDigits : 3,
                                element: latLonReadout.obj,
                                prefix: "Position: "
                        }));
            } else {
                this.map.addControl(new OpenLayers.Control.MousePosition( {
                            numDigits : 3,
                            prefix: "Position: "
                        }));
            }
        }


        if (this.initialBoxes) {
            this.initBoxes(this.initialBoxes);
            this.initialBoxes = null;
        }

        //        this.defaultLocation =  createLonLat(-105,40);
        if(this.defaultLocation && !this.defaultBounds) {
            var center =  this.defaultLocation;
            var offset = 10.0;
            this.defaultBounds =  createBounds(center.lon-offset,center.lat-offset,center.lon+offset,center.lat+offset);
            this.defaultLocation = null;
        }

        if (this.defaultBounds) {
            var llPoint = this.defaultBounds.getCenterLonLat();
            var projPoint = this.transformLLPoint(llPoint);
            this.map.setCenter(projPoint);
            this.map.zoomToExtent(this.transformLLBounds(this.defaultBounds));
            this.defaultBounds = null;
        }  else { 
            this.map.zoomToMaxExtent(); 
        }

        if (this.markers) {
            this.addVectorLayer(this.markers);
        }

        if (this.circles) {
            this.addVectorLayer(this.circles);
        }

        for(var i=0;i<this.initialLayers.length;i++) {
            this.map.addLayer(this.initialLayers[i]);
        }
        this.initialLayers = [];

        if (doRegion) {
            this.addRegionSelectorControl();
        }

        var cbx =   $(':input[id*=\"' + "visible_" + this.mapId +'\"]');
        var _this = this;
        cbx.change(function(event) {
                _this.checkImageLayerVisibility();
                _this.checkMarkerVisibility();
                _this.checkLinesVisibility();
                _this.checkBoxesVisibility();
            });

        var cbxall =   $(':input[id*=\"' + "visibleall_" + this.mapId +'\"]');
        cbxall.change(function(event) {
                cbx.prop("checked", cbxall.is(':checked'));
                _this.checkImageLayerVisibility();
                _this.checkMarkerVisibility();
                _this.checkLinesVisibility();
                _this.checkBoxesVisibility();

                //                cbx.prop("checked", cbxall.is(':checked')).trigger("change");
            });
    }



    this.addVectorLayer = function(layer) {
        this.map.addLayer(layer);
        this.vectorLayers.push(layer);
        var _this = this;
        if(!this.map.featureSelect) {
            this.map.featureSelect = new OpenLayers.Control.SelectFeature(layer, {
                    multiple: false,
                    hover: this.selectOnHover,
                    onSelect: function(feature) { 
                        _this.showMarkerPopup(feature);
                    }
                });
            this.map.addControl(this.map.featureSelect);
            this.map.featureSelect.activate();
        } else {
            this.map.featureSelect.setLayer(this.vectorLayers);
        }
    }

    this.isLayerVisible = function(id) {
        var cbx =   $(':input[id*=\"' + "visible_" + this.mapId +"_" + id+'\"]');
        if(cbx.size()==0) return true;
        return cbx.is(':checked');
    }

    this.initForDrawing = function() {
        var theMap = this;
        if (!theMap.drawingLayer) {
            theMap.drawingLayer = new OpenLayers.Layer.Vector("Drawing");
            theMap.map.addLayer(theMap.drawingLayer);
        }
        theMap.drawControl = new OpenLayers.Control.DrawFeature(
                theMap.drawingLayer, OpenLayers.Handler.Point);
        // theMap.drawControl.activate();
        theMap.map.addControl(theMap.drawControl);
    }

    this.drawingFeatureAdded = function(feature) {
        // alert(feature);
    }


    this.addClickHandler = function(lonfld, latfld, zoomfld, object) {

        this.lonFldId = lonfld;
        this.latFldId = latfld;

        if (this.clickHandler)
            return;
        if (!this.map)
            return;
        this.clickHandler = new OpenLayers.Control.Click();
        this.clickHandler.setLatLonZoomFld(lonfld, latfld, zoomfld, object);
        this.clickHandler.setTheMap(this);
        this.map.addControl(this.clickHandler);
        this.clickHandler.activate();
    }

    this.setSelection = function(argBase, doRegion, absolute) {
    	this.selectRegion = doRegion;
        this.argBase = argBase;
        if (!GuiUtils) {
            return;
        }
        this.fldNorth = GuiUtils.getDomObject(this.argBase + "_north");
        if (this.fldNorth ==null)
            this.fldNorth = GuiUtils.getDomObject(this.argBase + ".north");
        if (this.fldNorth ==null)
            this.fldNorth = GuiUtils.getDomObject(this.mapId + "_north");


        this.fldSouth = GuiUtils.getDomObject(this.argBase + "_south");
        if (!this.fldSouth)
            this.fldSouth = GuiUtils.getDomObject(this.argBase + ".south");
        if (this.fldSouth ==null)
            this.fldSouth = GuiUtils.getDomObject(this.mapId + "_south");

        this.fldEast = GuiUtils.getDomObject(this.argBase + "_east");
        if (!this.fldEast)
            this.fldEast = GuiUtils.getDomObject(this.argBase + ".east");
        if (this.fldEast ==null)
            this.fldEast = GuiUtils.getDomObject(this.mapId + "_east");

        this.fldWest = GuiUtils.getDomObject(this.argBase + "_west");
        if (!this.fldWest)
            this.fldWest = GuiUtils.getDomObject(this.argBase + ".west");

        if (this.fldWest ==null)
            this.fldWest = GuiUtils.getDomObject(this.mapId + "_west");

        this.fldLat = GuiUtils.getDomObject(this.argBase + "_latitude");
        if (!this.fldLat)
            this.fldLat = GuiUtils.getDomObject(this.argBase + ".latitude");

        if (this.fldLat ==null)
            this.fldLat = GuiUtils.getDomObject(this.mapId + "_latitude");


        this.fldLon = GuiUtils.getDomObject(this.argBase + "_longitude");
        if (!this.fldLon)
            this.fldLon = GuiUtils.getDomObject(this.argBase + ".longitude");
        if (this.fldLon ==null)
            this.fldLon = GuiUtils.getDomObject(this.mapId + "_longitude");


        if (this.fldLon) {
            this.addClickHandler(this.fldLon.id, this.fldLat.id);
            this.setSelectionMarker(this.fldLon.obj.value, this.fldLat.obj.value);
        }
    }




    this.selectionPopupInit = function() {
        if (!this.inited) {
            this.initMap(this.selectRegion);
            if (this.argBase && !this.fldNorth) {
                this.setSelection(this.argBase);
            }

            if (this.fldNorth) {
                // alert("north = " + this.fldNorth.obj.value);
                this.setSelectionBox(this.fldNorth.obj.value,
                        this.fldWest.obj.value, this.fldSouth.obj.value,
                        this.fldEast.obj.value);
            }
            
            if (this.fldLon) {
                this.addClickHandler(this.fldLon.id, this.fldLat.id);
                this.setSelectionMarker(this.fldLon.obj.value, this.fldLat.obj.value);
            }
        }
    }

    this.setSelectionBoxFromFields = function(zoom) {
        if (this.fldNorth) {
            // alert("north = " + this.fldNorth.obj.value);
            this.setSelectionBox(this.fldNorth.obj.value,
                    this.fldWest.obj.value, this.fldSouth.obj.value,
                    this.fldEast.obj.value);
            if (this.selectorBox) {
                var boxBounds = this.selectorBox.bounds
                this.map.setCenter(boxBounds.getCenterLonLat());
                if (zoom) {
                    this.map.zoomToExtent(boxBounds);
                }
            }
        }
    }

    this.toggleSelectorBox = function(toggle) {
       if (this.selectorControl) {
          if (toggle) {
             this.selectorControl.activate();
             this.selectorControl.box.activate();
          } else {
             this.selectorControl.deactivate();
             this.selectorControl.box.deactivate();
          }
       }
    }

    this.resetExtent = function() {
       this.map.zoomToMaxExtent();
    }

    // Assume that north, south, east, and west are in degrees or
    // some variant thereof
    this.setSelectionBox = function(north, west, south, east) {
        if (north == "" || west == "" || south == "" || east == "")
            return;
        if (!this.selectorBox) {
            var args = {
                "color" : "red",
                "selectable" : false
            };
            this.selectorBox = this.createBox("", north, west, south, east, "", args);
        } else {
            var bounds = createBounds(west, Math.max(south,
                    -maxLatValue), east, Math.min(north, maxLatValue));
            this.selectorBox.bounds = this.transformLLBounds(bounds);
            // this.selectorBox.bounds = bounds;
        }
        if(this.boxes) {
            this.boxes.redraw();
        }
    }

    this.clearSelectionMarker = function() {
        if(this.selectorMarker!=null) {
            this.removeMarker(this.selectorMarker);
            this.selectorMarker = null;
        }
    }

    this.clearSelectedFeatures = function() {
        if(this.map.controls != null) {
            var myControls = this.map.controls;
            for (i = 0; i < myControls.length; i++) {
                if (myControls[i].displayClass == "olControlSelectFeature") {
                   myControls[i].unselectAll();
                }
            }
        }
    }

    this.setSelectionMarker = function(lon, lat, andCenter, zoom) {
        if (!lon || !lat || lon == "" || lat == "")
            return;
        if(this.lonFldId!=null) {
            $("#" +this.lonFldId).val(formatLocationValue(lon));
            $("#" +this.latFldId).val(formatLocationValue(lat));
        }

        var lonlat = new createLonLat(lon,lat);
        if (this.selectorMarker == null) {
            this.selectorMarker = this.addMarker(positionMarkerID, lonlat, "", "", 20,10);
        } else {
            this.selectorMarker.lonlat = this.transformLLPoint(lonlat);
        }
        if(this.markers) {
            this.markers.redraw();
        }
        if(andCenter) {
            this.map.setCenter(this.selectorMarker.lonlat);
        }
        if(zoom) {
            if(zoom.zoomOut) {
                var level = this.map.getZoom();
                level--;
                if(this.map.isValidZoomLevel(level)) {
                    this.map.zoomTo(level);
                }
                return;
            }
            if(zoom.zoomIn) {
                var level = this.map.getZoom();
                level++;
                if(this.map.isValidZoomLevel(level)) {
                    this.map.zoomTo(level);
                }
                return;
            }

            var offset = zoom.offset;
            if(offset) {
                var bounds = this.transformLLBounds(createBounds(lon-offset, lat-offset,lon+offset,lat+offset));
                this.map.zoomToExtent(bounds);
            }
            
        }
    }
    
    this.transformLLBounds = function(bounds) {
        if (!bounds)
            return;
        var llbounds = bounds.clone();
        return llbounds.transform(this.displayProjection, this.sourceProjection);
    }

    this.transformLLPoint = function(point) {
        if (!point)
            return null;
        var llpoint = point.clone();
        return llpoint.transform(this.displayProjection, this.sourceProjection);
    }

    this.transformProjBounds = function(bounds) {
        if (!bounds)
            return;
        var projbounds = bounds.clone();
        return projbounds.transform(this.sourceProjection, this.displayProjection);
    }

    this.transformProjPoint = function(point) {
        if (!point)
            return;
        var projpoint = point.clone();
        return projpoint.transform(this.sourceProjection, this.displayProjection);
    }

    this.normalizeBounds = function(bounds) {
        if (!this.map) {
            return bounds;
        }
        var newBounds = bounds;
        var newLeft = bounds.left;
        var newRight = bounds.right;
        var extentBounds = this.map.restrictedExtent;
        if (!extentBounds) {
            extentBounds = maxExtent;
        }
        /*
         * if (extentBounds.left < 0) { // map is -180 to 180 if (bounds.right >
         * 180) { //bounds is 0 to 360 newLeft = bounds.left-360; newRight =
         * bounds.right-360; } } else { // map is 0 to 360
         */
        if (extentBounds.left >= 0) { // map is 0 to 360+
            if (bounds.left < 0) { // left edge is -180 to 180
                newLeft = bounds.left + 360;
            }
            if (bounds.right < 0) { // right edge is -180 to 180
                newRight = bounds.right + 360;
            }
        }
        // just account for crossing the dateline
        if (newLeft > newRight) {
            newRight = bounds.right + 360;
        }
        newLeft = Math.max(newLeft, extentBounds.left);
        newRight = Math.min(newRight, extentBounds.right);
        newBounds = createBounds(newLeft, bounds.bottom, newRight,
                bounds.top);
        return newBounds;
    }

    this.findSelectionFields = function() {
        if (this.argBase && !(this.fldNorth || this.fldLon)) {
            this.setSelection(this.argBase);
        }
    }

    this.selectionClear = function() {
        this.findSelectionFields();
        if (this.fldNorth) {
            this.fldNorth.obj.value = "";
            this.fldSouth.obj.value = "";
            this.fldWest.obj.value = "";
            this.fldEast.obj.value = "";
        } else if (this.fldLat) {
            this.fldLon.obj.value = "";
            this.fldLat.obj.value = "";
        }
        if (this.selectorBox && this.boxes) {
            this.boxes.removeMarker(this.selectorBox);
            this.selectorBox = null;
        }
        if (this.selectorMarker && this.markers) {
            this.removeMarker(this.selectorMarker);
            this.selectorMarker = null;
        }
    }

    this.getMarkers = function() {
        if(this.markers == null) return [];
        return this.markers.features;
    },
    this.clearRegionSelector = function(listener) {
        if (!this.selectorControl)
            return;
        if(this.selectorControl.box) {
            //Nothing here really works to hide the box
            this.selectorControl.box.removeBox();
        }
    },
    this.addRegionSelectorControl = function(listener) {
        var theMap = this;
        if (theMap.selectorControl)
            return;
        theMap.selectorListener = listener;
        theMap.selectorControl = new OpenLayers.Control();
        OpenLayers.Util.extend(theMap.selectorControl, {
            draw : function() {
                // this Handler.Box will intercept the shift-mousedown
                // before Control.MouseDefault gets to see it
                this.box = new OpenLayers.Handler.Box(theMap.selectorControl, 
                    { "done" : this.notice }, 
                    { keyMask : OpenLayers.Handler.MOD_SHIFT });
                this.box.activate();
            },

            notice : function(bounds) {
                var ll = this.map.getLonLatFromPixel(new OpenLayers.Pixel(
                        bounds.left, bounds.bottom));
                var ur = this.map.getLonLatFromPixel(new OpenLayers.Pixel(
                        bounds.right, bounds.top));
                ll = theMap.transformProjPoint(ll);
                ur = theMap.transformProjPoint(ur);
                var bounds = createBounds(ll.lon, ll.lat, ur.lon,
                        ur.lat);
                bounds = theMap.normalizeBounds(bounds);
                theMap.setSelectionBox(bounds.top, bounds.left, bounds.bottom, bounds.right);
                theMap.findSelectionFields();
                if(listener) {
                    listener(bounds);
                }
                if (theMap.fldNorth) {
                    // theMap.fldNorth.obj.value = ur.lat;
                    // theMap.fldSouth.obj.value = ll.lat;
                    // theMap.fldWest.obj.value = ll.lon;
                    // theMap.fldEast.obj.value = ur.lon;
                    theMap.fldNorth.obj.value = formatLocationValue(bounds.top);
                    theMap.fldSouth.obj.value = formatLocationValue(bounds.bottom);
                    theMap.fldWest.obj.value = formatLocationValue(bounds.left);
                    theMap.fldEast.obj.value = formatLocationValue(bounds.right);
                }
                // OpenLayers.Event.stop(evt);
            }
        });
        theMap.map.addControl(theMap.selectorControl);
    }

    this.onPopupClose = function(evt) {
        if (this.currentPopup) {
            this.map.removePopup(this.currentPopup);
            this.currentPopup.destroy();
            this.currentPopup = null;
            this.hiliteBox('');
        }
    }

    this.findObject = function(id, array) {
        for (i = 0; i < array.length; i++) {
            var aid  = array[i].ramaddaId;
            if(!aid)
                array[i].id;
            if (aid == id) {
                return array[i];
            }
        }
        return null;
    }

    this.findMarker = function(id) {
        if (!this.markers) {
            return null;
        }
        return this.findObject(id, this.getMarkers());
    }

    this.findFeature = function(id) {
        return this.features[id];
    }

    this.findBox = function(id) {
        if (!this.boxes) {
            return null;
        }
        return this.findObject(id, this.boxes.markers);
    }

    this.hiliteBox = function(id) {
        if (this.currentBox) {
            this.currentBox.setBorder("blue");
        }
        this.currentBox = this.findBox(id);
        if (this.currentBox) {
            this.currentBox.setBorder("red");
        }
    }
    this.checkMarkerVisibility= function() {
        if(!this.markers) return;
        var list =  this.getMarkers();
        for(var marker in list) {
            marker = list[marker];
            var visible = this.isLayerVisible(marker.ramaddaId);
            if(visible) {
                marker.style.display = 'inline';
            } else {
                marker.style.display = 'none';
            }
            //            marker.display(visible);
        }
        this.markers.redraw();
    }

    this.checkLinesVisibility = function() {
        if (!this.lines) return;
        var features = this.lines.features;
        for (var i = 0; i < features.length; i++) {
            var line = features[i];
            var visible = this.isLayerVisible(line.ramaddaId);
            if(visible) {
                line.style.display = 'inline';
            } else {
                line.style.display = 'none';
            }

        }
        this.lines.redraw();
        
    }


    this.checkBoxesVisibility = function() {
        if (!this.boxes) return;
        for(var marker in this.boxes.markers) {
            marker = this.boxes.markers[marker];
            var visible = this.isLayerVisible(marker.ramaddaId);
            marker.display(visible);
        }
        this.boxes.redraw();
        
    }



    this.checkImageLayerVisibility = function() {
        if(!this.imageLayers) return;
        for(var i in this.imageLayers) {
            var visible = this.isLayerVisible(i);
            var image = this.imageLayers[i];
            image.setVisibility(visible);
            if(!visible) {
                if(image.box) {
                    this.removeBox(image.box);
                    image.box = null;
                }
            } else {
                if(image.box) {
                    this.removeBox(image.box);
                }
                image.box = this.createBox(i, image.north, image.west, image.south, image.east, image.text, {});
            }
        }
    }

    this.hiliteMarker = function(id) {
        var mymarker = this.findMarker(id);
        if(!mymarker) {
            mymarker = this.findFeature(id);
        }

        if (!mymarker && this.imageLayers) {
            mymarker = this.imageLayers[id];
        }

        if (!mymarker) {
            return;
        }
        this.map.setCenter(mymarker.lonlat);
        this.showMarkerPopup(mymarker);
    }

    // bounds are in lat/lon
    this.centerOnMarkers = function(bounds) {
        // bounds = this.boxes.getDataExtent();
        if(bounds) {
            if(bounds.left<-180||bounds.right>180 || bounds.bottom<-90 || bounds.top>90) {
                console.log("Got bad bounds:" +bounds);
                bounds = createBounds(-180,-90,180,90);
            }
        }
        if (!bounds) {
            if (this.markers) {
                // markers are in projection coordinates
                var dataBounds = this.markers.getDataExtent();
                bounds = this.transformProjBounds(dataBounds);
            }
            if(this.lines) {
                var dataBounds = this.lines.getDataExtent();
                var fromLine = this.transformProjBounds(dataBounds);
                if(bounds)
                    bounds.extend(fromLine);
                else
                    bounds = fromLine;
            }
        }
        /*
        if(bounds!=null) {
            if(bounds.left==-9999 ||bounds.right==-9999 || bounds.bottom==-9999 || bounds.top==-9999) {
                console.log("bad bounds:" +  bounds);
                return;
            }
        }
        */

        //        console.log("bounds:" +  bounds);

        if (!bounds) {
            return;
        }

        if (!this.map) {
            this.defaultBounds = bounds;
            return;
        }
        if(bounds.getHeight()>160) {
            bounds.top = 80;
            bounds.bottom=-80;
        }
        projBounds = this.transformLLBounds(bounds);
        if(projBounds.getWidth() ==0) {
            this.map.zoomTo(this.initialZoom);
        } else {
            this.map.zoomToExtent(projBounds);
        }
        this.map.setCenter(projBounds.getCenterLonLat());
    }

    this.setCenter = function(latLonPoint) {
        var projPoint =  this.transformLLPoint(latLonPoint);
        this.map.setCenter(projPoint);
    }


    this.zoomToMarkers = function() {
        if (!this.markers)
            return;
        bounds = this.markers.getDataExtent();
        if(bounds == null) return;
        this.map.setCenter(bounds.getCenterLonLat());
        this.map.zoomToExtent(bounds);
    }

    this.centerToMarkers = function() {
        if (!this.markers)
            return;
        bounds = this.markers.getDataExtent();
        this.map.setCenter(bounds.getCenterLonLat());
    }

    this.setInitialCenterAndZoom = function(lon, lat, zoomLevel) {
        this.defaultLocation = createLonLat(lon, lat);
        this.initialZoom = zoomLevel;
    }



    this.getPopupText = function (text, marker) {
        if(text == null) return null;
        if(text.indexOf("base64:")==0) {
            text =             window.atob(text.substring(7));
            if(text.indexOf("{") == 0) {
                props=  JSON.parse(text);
                text = props.text;
                if(!text) text = "";
                if(marker) {
                    marker.inputProps = props;
                }
            }
        }
        return text;
    }

    this.addMarker = function(id, location, iconUrl, text, size, voffset) {
        if(size == null) size = 16;
        if(voffset ==null) voffset = 0;

        
        if (!this.markers) {
            this.markers = new OpenLayers.Layer.Markers("Markers");
            this.markers = new OpenLayers.Layer.Vector("Markers");

            // Added this because I was getting an unknown method error
            /*
            this.markers.getFeatureFromEvent = function(evt) {
                console.log("feature:" + evt);
                return null;
            };
            this.markers.renderer = {moveRoot: function(root){}}
            */

            if (this.map) {
                this.addVectorLayer(this.markers);
            }
        }
        if (!iconUrl) {
            iconUrl = ramaddaBaseUrl + '/icons/marker.png';
        }
        var sz = new OpenLayers.Size(size, size);
        var calculateOffset = function(size) {
            //            return new OpenLayers.Pixel(-(size.w / 2), -size.h);
            return new OpenLayers.Pixel(-(size.w / 2), -(size.h/2)-voffset);
        };

        var icon = new OpenLayers.Icon(iconUrl, sz, null, calculateOffset);
        var projPoint = this.transformLLPoint(location);
        var marker = new OpenLayers.Marker(projPoint, icon);

        var feature = new OpenLayers.Feature.Vector(
                                                    new OpenLayers.Geometry.Point( location.lon,location.lat ).transform(this.displayProjection, this.sourceProjection),
    {description:''} ,
    {externalGraphic: iconUrl, graphicHeight: size, graphicWidth: size, graphicXOffset:-size/2, graphicYOffset:-size/2  });


        feature.ramaddaId = id;
        feature.text= this.getPopupText(text, feature);
        feature.location = location;

        marker.ramaddaId = id;
        marker.text = this.getPopupText(text, marker);
        marker.location = location;

        var _this = this;
        var clickFunc = function(evt) {
            _this.showMarkerPopup(marker);
            if(marker.ramaddaClickHandler!=null) {
                marker.ramaddaClickHandler.call(null, marker);
            }
            OpenLayers.Event.stop(evt);
        };

        marker.events.register('click', marker, clickFunc);
        marker.events.register('touchstart', marker, clickFunc);

        var visible = this.isLayerVisible(marker.ramaddaId);
        if(!visible) marker.display(false);

        feature.what = "marker";
        this.markers.addFeatures( [ feature ]);

        /*
        this.markers.addMarker(marker);
        if(this.selectorMarker!=null && this.selectorMarker!=marker) {
            this.markers.removeMarker(this.selectorMarker);
            this.markers.addMarker(this.selectorMarker);
            }
        return marker;
        */
        return feature;
    }



    this.initBoxes = function(theBoxes) {
        if (!this.map) {
            // alert('whoa, no map');
        }
        this.map.addLayer(theBoxes);
        // Added this because I was getting an unknown method error
        theBoxes.getFeatureFromEvent = function(evt) {
            return null;
        };
        var sf = new OpenLayers.Control.SelectFeature(theBoxes);
        this.map.addControl(sf);
        sf.activate();
    }

    this.removeBox = function(box) {
        if (this.boxes && box) {
            this.boxes.removeMarker(box);
            this.boxes.redraw();
        }
    }

    this.addBox = function(box) {
        if (!this.boxes) {
            this.boxes = new OpenLayers.Layer.Boxes("Boxes", {
                            wrapDateLine : wrapDatelineDefault
                        });
            if (!this.map) {
                this.initialBoxes = this.boxes;
            } else {
                this.initBoxes(this.boxes);
            }
        }
        this.boxes.addMarker(box);
        this.boxes.redraw();
    }


    this.createBox = function(id, north, west, south, east, text, params) {

        if(text.indexOf("base64:")==0) {
            text =             window.atob(text.substring(7));
        }

        var args = {
            "color" : "blue",
            "selectable" : true,
            "zoomToExtent" : false,
            "sticky": false
        };

        for(var i in params) {
            args[i] = params[i];
        }

        var bounds = createBounds(west, Math.max(south, -maxLatValue),
                east, Math.min(north, maxLatValue));
        var projBounds = this.transformLLBounds(bounds);
        box = new OpenLayers.Marker.Box(projBounds);
        box.sticky = args.sticky;
        var theMap = this;

        if (args["selectable"]) {
            box.events.register("click", box, function(e) {
                theMap.showMarkerPopup(box);
                OpenLayers.Event.stop(e);
            });
        }

        var lonlat =  new createLonLat(west,north);
        box.lonlat = this.transformLLPoint(lonlat);
        box.text = this.getPopupText(text);

        box.setBorder(args["color"], 1);
        box.ramaddaId = id;
        var attrs =   {
            fillColor: "red",
            fillOpacity:1.0,
            pointRadius : 5, 
            zIndex: 20,
        };

        if (args["zoomToExtent"]) {
            this.centerOnMarkers(bounds);
        }
        this.addBox(box);
        return box;
    }


    this.circleMarker = function(id, attrs) {
        myattrs = {pointRadius : 12, 
                   stroke: true,
                   strokeColor : "red",
                   strokeWidth : 2,
                   fill: false,};

        if(attrs)
            $.extend(myattrs, attrs);
        marker = this.findMarker(id);
        if(!marker) {
            return null;
        }
        return this.addPoint(id,marker.location, myattrs);
    }

    this.uncircleMarker = function(id) {
        feature = this.features[id];
        if(feature)
            this.circles.removeFeatures( [feature]);
    }

    this.addPoint = function(id, point, attrs, text) {
        //Check if we have a LonLat instead of a Point
        var location = point;
        if(typeof point.x  ==='undefined') {
            point = new OpenLayers.Geometry.Point(point.lon,point.lat);
        } else {
            location =  createLonLat(location.x, location.y);
        }

        var _this = this;
        if(this.circles == null) {
            this.circles =  new OpenLayers.Layer.Vector("Circles Layer");
            /*
            this.circles.events.on({
                    'featureselected': function(feature) {
                        feature  = feature.feature;
                        _this.showMarkerPopup(feature);
                    },
                   'featureunselected': function(feature) {
                   }
                   });*/
            if(this.map) {
                this.addVectorLayer(this.circles);
                /*
                this.map.addLayer(this.circles);
                var sf = new OpenLayers.Control.SelectFeature(this.circles,{
                        clickout: false, 
                        toggle: false,
                        multiple: false, 
                        hover: false,
                        toggleKey: "ctrlKey", 
                        multipleKey: "shiftKey", 
                        box: false
                    });

                this.map.addControl(sf);
                sf.activate();
                */
            }
        }


        var cstyle = OpenLayers.Util.extend( {},  OpenLayers.Feature.Vector.style['default']);
        $.extend(cstyle, {
                pointRadius : 5, 
                stroke: true,
                strokeColor : "red",
                strokeWidth : 0,
                strokeOpacity: 0.75,
                fill: true,
                fillColor: "blue",
                fillOpacity: 0.75}
            );
        if (attrs) {
            $.extend(cstyle, attrs);
            if(cstyle.pointRadius<=0)  cstyle.pointRadius = 1;
        }

        if(cstyle.fillColor == "" || cstyle.fillColor == "none") {
            cstyle.fillOpacity    = 0.0;
        }
        if(cstyle.strokeColor == "" || cstyle.strokeColor == "none") {
            cstyle.strokeOpacity    = 0.0;
        }
        var center = new OpenLayers.Geometry.Point(point.x, point.y);
        center.transform(this.displayProjection, this.sourceProjection);
        var feature = new OpenLayers.Feature.Vector(center, null, cstyle);

        feature.ramaddaId = id;
        feature.text = this.getPopupText(text, feature);
        feature.location =  location;
        this.features[id] = feature;
        this.circles.addFeatures( [feature]);
        return feature;
    }

    this.removePoint = function(point){
        this.circles.removeFeatures( [point]);
    }

    this.addRectangle = function(id, north, west, south, east, attrs,info) {
        var points = [ new OpenLayers.Geometry.Point(west, north),
                new OpenLayers.Geometry.Point(west, south),
                new OpenLayers.Geometry.Point(east, south),
                new OpenLayers.Geometry.Point(east, north),
                new OpenLayers.Geometry.Point(west, north) ];
        return this.addPolygon(id, points, attrs,info);
    }


    this.addLine = function(id, lat1, lon1, lat2, lon2, attrs, info) {
        var points = [ new OpenLayers.Geometry.Point(lon1, lat1),
                       new OpenLayers.Geometry.Point(lon2, lat2) ];
        return this.addPolygon(id, points, attrs,info);
    }

    this.addLines = function(id, attrs, values,info) {
        var points = [];
        for(var i=0;i<values.length;i+=2) {
            points.push(new OpenLayers.Geometry.Point(values[i+1],values[i]));
        }
        return this.addPolygon(id, points, attrs,info);
    }

    this.removePolygon = function(line) {
        if (this.lines) {
            this.lines.removeAllFeatures();
            this.lines.removeFeatures([line]);
        }
    }

    var cnt = 0;

    this.addPolygon = function(id, points, attrs,marker) {
        var _this = this;

        for(var i =0;i<points.length;i++) {
            points[i].transform(this.displayProjection, this.sourceProjection);
        }

        var base_style = OpenLayers.Util.extend( {},
                OpenLayers.Feature.Vector.style['default']);
        var style = OpenLayers.Util.extend( {}, base_style);
        style.strokeColor = "blue";
        style.strokeWidth = 1;
        if (attrs) {
            for (key in attrs) {
                style[key] = attrs[key];
            }
        }

        if (!this.lines) {
            this.lines = new OpenLayers.Layer.Vector("Lines", {style: base_style});
            this.addVectorLayer(this.lines);
        }

        var lineString = new OpenLayers.Geometry.LineString(points);
        var line = new OpenLayers.Feature.Vector(lineString, null, style);
        /*
         * line.events.register("click", line, function (e) { alert("box
         * click"); _this.showMarkerPopup(box); OpenLayers.Event.stop(evt); });
         */
        line.markerPopup = marker;
        line.ramaddaId = id;
        line.location = new OpenLayers.LonLat(points[0].x,points[0].y);
        var visible = this.isLayerVisible(line.ramaddaId);
        if(visible) {
            line.style.display = 'inline';
        } else {
            line.style.display = 'none';
        }


        this.lines.addFeatures( [ line ]);
        return line;
    }

    this.showMarkerPopup = function(marker) {
        if(this.entryClickHandler && window[this.entryClickHandler]) {
            if(!window[this.entryClickHandler](this,marker)) {
                return;
            }
        }

        if (this.currentPopup) {
            this.map.removePopup(this.currentPopup);
            this.currentPopup.destroy();
        }

        
        var id = marker.ramaddaId;
        if(!id)
            id  = marker.id;
        this.hiliteBox(id);
        var theMap = this;
        if(marker.inputProps) {
            marker.text = this.getPopupText(marker.inputProps.text);
        }

        var markertext = marker.text;
        // set marker text as the location
        var location = marker.location;
        if(typeof location.lon === 'undefined') {
            location =  createLonLat(location.x, location.y);
        }
        if (!markertext || markertext == "") {
            //            marker.location = this.transformProjPoint(marker.lonlat);
            if(location.lat == location.lat) {
                markertext = "Lon: " + location.lat + "<br>" + "Lat: " + location.lon;
            }
        }


        var projPoint = this.transformLLPoint(location);
        popup = new OpenLayers.Popup.FramedCloud("popup", projPoint,
                null, markertext, null, true, function() {
                    theMap.onPopupClose()
                });

        if(marker.inputProps && marker.inputProps.minSizeX) {
            popup.minSize =  new OpenLayers.Size(marker.inputProps.minSizeX, marker.inputProps.minSizeY);
        }

        marker.popup = popup;
        popup.marker = marker;
        this.map.addPopup(popup);
        this.currentPopup = popup;


        if(marker.inputProps && marker.inputProps.chartType) {
            this.popupChart(marker.inputProps);
        }

    }

    this.popupChart = function(props) {
        var displayManager = getOrCreateDisplayManager(props.divId,{},true);
        var pointDataProps = {entryId:props.entryId};
        var title = props.title;
        if(!title) title = "Chart";
        var chartProps = {"title":title,
                          "layoutHere":true,
                          "divid":props.divId,
                          "entryId":props.entryId,
                          "fields":props.fields,
                          "vAxisMinValue":props.vAxisMinValue,
                          "vAxisMaxValue":props.vAxisMaxValue,
                          "data":new  PointData(title,  null,null,getRamadda().getRoot()+"/entry/show?entryid=" + props.entryId +"&output=points.product&product=points.json&numpoints=1000",pointDataProps)};
        displayManager.createDisplay(props.chartType,chartProps);
    },
    this.removeMarker = function(marker) {
        if (this.markers) {
            //            this.markers.removeMarker(marker);            
            this.markers.removeFeatures([marker]);
        }
    }

}

function formatLocationValue(value) {
   return number_format(value, 3, ".", "");
}


    OpenLayers.Control.Click = OpenLayers.Class(OpenLayers.Control, {
            defaultHandlerOptions : {
                'single' : true,
                'double' : false,
                'pixelTolerance' : 0,
                'stopSingle' : false,
                'stopDouble' : false
            },

            initialize : function(options) {
                this.handlerOptions = OpenLayers.Util.extend( {},
                                                              this.defaultHandlerOptions);
                OpenLayers.Control.prototype.initialize.apply(this, arguments);
                this.handler = new OpenLayers.Handler.Click(this, {
                        'click' : this.trigger
                    }, this.handlerOptions);
            },
            setLatLonZoomFld : function(lonFld, latFld, zoomFld, listener) {
                this.lonFldId = lonFld;
                this.latFldId = latFld;
                this.zoomFldId = zoomFld;
                this.clickListener = listener;
            },

            setTheMap : function(map) {
                this.theMap = map;
            },

            trigger : function(e) {
                var xy = this.theMap.getMap().getLonLatFromViewPortPx(e.xy);
                var lonlat = this.theMap.transformProjPoint(xy)
                if (!this.lonFldId) {
                    this.lonFldId = "lonfld";
                    this.latFldId = "latfld";
                    this.zoomFldId = "zoomfld";
                }
                lonFld = GuiUtils.getDomObject(this.lonFldId);
                latFld = GuiUtils.getDomObject(this.latFldId);
                zoomFld = GuiUtils.getDomObject(this.zoomFldId);
                if (latFld && lonFld) {
                    latFld.obj.value = formatLocationValue(lonlat.lat);
                    lonFld.obj.value = formatLocationValue(lonlat.lon);
                }
                if (zoomFld) {
                    zoomFld.obj.value = this.theMap.getMap().getZoom();
                }
                this.theMap.setSelectionMarker(lonlat.lon, lonlat.lat);

                if(this.clickListener!=null) {
                    this.clickListener.handleClick(this, lonlat.lon,lonlat.lat);
                }


            }
    
        });





var CUSTOM_MAP = "CUSTOM";
var firstCustom = true;

var MapUtils = {
    mapRegionSelected: function(selectId, baseId) {
        var value  = $( "#" + selectId).val();
        if(value == null) {
            console.log("Error: No map region value");
            return;
        }
        if( value == "") {
            this.toggleMapWidget(baseId, false);
            return;
        }
        var toks = value.split(",");

        if(toks.length == 1) {
            if (toks[0] != CUSTOM_MAP) {
                return;
            } else {
                if (!firstCustom) {
                  this.setMapRegion(baseId, "", "", "", "", "");
                }
                firstCustom = false;
                this.toggleMapWidget(baseId, true);
                return;
            }
        }
        if(toks.length != 5) {
            return;
        }
        this.toggleMapWidget(baseId, false);
        this.setMapRegion(baseId, toks[0], toks[1], toks[2], toks[3], toks[4]);
    },


    setMapRegion: function(baseId, regionid, north, west, south, east) {
        $("#"+ baseId +"_regionid").val(regionid);
        $("#"+ baseId +"_north").val(north);
        $("#"+ baseId +"_west").val(west);
        $("#"+ baseId +"_south").val(south);
        $("#"+ baseId +"_east").val(east);

    },
    
    toggleMapWidget: function(baseId, onOrOff) {
        if (onOrOff) {
            // check if the map has been initialized
            var mapVar = window[baseId];
            if (mapVar && !mapVar.inited) {
                mapVar.initMap(true);
            }
            $("#"+ baseId +"_mapToggle").show();
        } else {
            $("#"+ baseId +"_mapToggle").hide();
        }
     }

}


var markerMap={};

function highlightMarkers(selector, mapVar, background1, background2,id) {
    $(selector).mouseenter(
                           function(){
                               if(background1)
                                   $(this).css('background',background1); 
                               if(!$(this).data('mapid')) 
                                   return;
                               if(mapVar.circleMarker($(this).data('mapid'),{strokeColor:'blue'})) {
                                   return;
                               }
                               if(id == null)
                                   return;
                               if(!Utils.isDefined($(this).data('latitude'))) {
                                   console.log("no lat");
                                   return;
                               }
                               attrs = {pointRadius : 12, 
                                        stroke: true,
                                        strokeColor : "blue",
                                        strokeWidth : 2,
                                        fill: false,};
                               point = mapVar.addPoint(id, new OpenLayers.LonLat($(this).data('longitude'), $(this).data('latitude')), 
                                                       attrs);
                               markerMap[id] = point;
                           });
    $(selector).mouseleave(
                           function(){
                               if(background2)
                                   $(this).css('background', background2);
                               if(!$(this).data('mapid')) 
                                   return;
                               if(id && markerMap[id]) {
                                   mapVar.removePoint(markerMap[id]);
                                   markerMap[id] = null;
                               }
                               mapVar.uncircleMarker($(this).data('mapid'));
                           });
}
