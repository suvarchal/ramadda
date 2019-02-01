var OUTPUT_JSON = "json";
var OUTPUT_CSV = "default.csv";
var OUTPUT_ZIP = "zip.tree";
var OUTPUT_EXPORT = "zip.export";
var OUTPUTS = [{
    id: OUTPUT_ZIP,
    name: "Download Zip"
}, {
    id: OUTPUT_EXPORT,
    name: "Export"
}, {
    id: OUTPUT_JSON,
    name: "JSON"
}, {
    id: OUTPUT_CSV,
    name: "CSV"
}];

function getRamadda(h) {
    if (!h) {
        h = ramaddaBaseUrl
    }
    var g = h.split(";");
    var c = null;
    if (g.length > 1) {
        h = g[0].trim();
        c = g[1].trim()
    }
    var a = null;
    var f = new RegExp("^(.*)\\((.+)\\).*$");
    var b = f.exec(h);
    if (b) {
        h = b[1].trim();
        a = b[2]
    }
    if (h == "this") {
        return getGlobalRamadda()
    }
    if (window.globalRamaddas == null) {
        window.globalRamaddas = {}
    }
    var d = window.globalRamaddas[h];
    if (d != null) {
        return d
    }
    var e = window[h];
    if (e == null) {
        e = window[h + "Repository"]
    }
    if (e) {
        d = new Object();
        e.call(d, c, a)
    }
    if (d == null) {
        d = new Ramadda(h);
        if (c != null) {
            d.name = c
        }
    }
    addRepository(d);
    return d
}

function addRepository(a) {
    if (window.globalRamaddas == null) {
        window.globalRamaddas = {}
    }
    window.globalRamaddas[a.repositoryRoot] = a
}

function getGlobalRamadda() {
    return getRamadda(ramaddaBaseUrl)
}

function Repository(c) {
    var a = null;
    var b = c.match("^(http.?://[^/]+)/");
    if (b && b.length > 0) {
        a = b[1]
    } else {}
    RamaddaUtil.defineMembers(this, {
        repositoryRoot: c,
        baseEntry: null,
        hostname: a,
        name: null,
        getSearchMessage: function() {
            return "Searching " + this.getName()
        },
        getSearchLinks: function(d) {
            return null
        },
        getSearchUrl: function(d) {
            return null
        },
        getId: function() {
            return this.repositoryRoot
        },
        getIconUrl: function(d) {
            return ramaddaBaseUrl + "/icons/page.png"
        },
        getEntryTypes: function(d) {
            return new Array()
        },
        getEntryType: function(d) {
            return null
        },
        getMetadataCount: function(d, e) {
            return 0
        },
        getEntryUrl: function(e, d) {
            return null
        },
        getBaseEntry: function(d) {
            if (this.baseEntry != null) {
                return this.baseEntry
            }
        },
        getRoot: function() {
            return this.repositoryRoot
        },
        getHostname: function() {
            return this.hostname
        },
        canSearch: function() {
            return true
        },
        getName: function() {
            if (this.children) {
                return "Search all repositories"
            }
            if (this.name != null) {
                return this.name
            }
            if (this.repositoryRoot.indexOf("/") == 0) {
                return this.name = "This RAMADDA"
            }
            var d = this.repositoryRoot;
            var g = document.createElement("a");
            g.href = d;
            var e = g.hostname;
            var f = g.pathname;
            if (f == "/repository") {
                return e
            }
            return this.name = e + ": " + f
        }
    })
}

function RepositoryContainer(c, b) {
    this._id = "CONTAINER";
    var a;
    RamaddaUtil.inherit(this, a = new Repository(c));
    RamaddaUtil.defineMembers(this, {
        name: b,
        children: [],
        canSearch: function() {
            return false
        },
        getSearchMessage: function() {
            return "Searching " + this.children.length + " repositories"
        },
        addRepository: function(d) {
            this.children.push(d)
        },
        getEntryTypes: function(l) {
            if (this.entryTypes != null) {
                return this.entryTypes
            }
            this.entryTypes = [];
            var d = {};
            for (var h = 0; h < this.children.length; h++) {
                var g = this.children[h].getEntryTypes();
                if (g == null) {
                    continue
                }
                for (var f = 0; f < g.length; f++) {
                    var k = g[f];
                    if (d[k.getId()] == null) {
                        var e = {};
                        e = $.extend(e, k);
                        d[k.getId()] = e;
                        this.entryTypes.push(e)
                    } else {
                        d[k.getId()].entryCount += k.getEntryCount()
                    }
                }
            }
            return this.entryTypes
        }
    })
}

function Ramadda(b) {
    if (b == null) {
        b = ramaddaBaseUrl
    }
    var a;
    RamaddaUtil.inherit(this, a = new Repository(b));
    RamaddaUtil.defineMembers(this, {
        entryCache: {},
        entryTypes: null,
        entryTypeMap: {},
        canSearch: function() {
            return true
        },
        getJsonUrl: function(c) {
            return this.repositoryRoot + "/entry/show?entryid=" + c + "&output=json"
        },
        createEntriesFromJson: function(f) {
            var c = new Array();
            for (var d = 0; d < f.length; d++) {
                var g = f[d];
                g.baseUrl = this.getRoot();
                var e = new Entry(g);
                this.addEntry(e);
                c.push(e)
            }
            return c
        },
        getEntryType: function(c) {
            return this.entryTypeMap[c]
        },
        entryTypeCallPending: false,
        entryTypeCallbacks: null,
        getEntryTypes: function(g) {
            if (this.entryTypes != null) {
                return this.entryTypes
            }
            if (this.entryTypeCallPending) {
                var e = this.entryTypeCallbacks;
                if (e == null) {
                    e = []
                }
                e.push(g);
                this.entryTypeCallbacks = e;
                return this.entryTypes
            }
            var c = this;
            var d = this.repositoryRoot + "/entry/types";
            this.entryTypeCallPending = true;
            this.entryTypeCallbacks = null;
            var f = $.getJSON(d, function(l) {
                if (GuiUtils.isJsonError(l)) {
                    return
                }
                c.entryTypes = [];
                for (var h = 0; h < l.length; h++) {
                    var j = new EntryType(l[h]);
                    c.entryTypeMap[j.getId()] = j;
                    c.entryTypes.push(j)
                }
                if (g != null) {
                    g(c, c.entryTypes)
                }
                var k = c.entryTypeCallbacks;
                c.entryTypeCallPending = false;
                c.entryTypeCallbacks = null;
                if (k) {
                    for (var h = 0; h < k.length; h++) {
                        k[h](c, c.entryTypes)
                    }
                }
            }).done(function(i, j, h) {
                c.entryTypeCallPending = false
            }).always(function(i, j, h) {
                c.entryTypeCallPending = false
            }).fail(function(j, k, h) {
                c.entryTypeCallPending = false;
                var i = "";
                if (h && h.length > 0) {
                    i += ":  " + h
                }
                GuiUtils.handleError("An error has occurred reading entry types" + i, "URL: " + d, false)
            });
            return this.entryTypes
        },
        metadataCache: {},
        metadataCachePending: {},
        metadataCacheCallbacks: {},
        getMetadataCount: function(i, k) {
            var j = i.getType();
            var f = this.metadataCache[j];
            if (f != null) {
                k(i, f);
                return null
            }
            var d = this.metadataCachePending[j];
            if (d) {
                var h = this.metadataCacheCallbacks[j];
                if (h == null) {
                    h = []
                }
                h.push(k);
                this.metadataCacheCallbacks[j] = h;
                return null
            }
            this.metadataCacheCallbacks[j] = null;
            this.metadataCachePending[j] = true;
            var c = this.repositoryRoot + "/metadata/list?metadata_type=" + i.getType() + "&response=json";
            var g = this;
            var e = $.getJSON(c, function(n) {
                var m = g.metadataCacheCallbacks[j];
                g.metadataCachePending[j] = false;
                if (GuiUtils.isJsonError(n)) {
                    return
                }
                g.metadataCache[j] = n;
                k(i, n);
                if (m) {
                    for (var l = 0; l < m.length; l++) {
                        m[l](i, n)
                    }
                }
            }).fail(function(n, o, l) {
                g.metadataCachePending[j] = false;
                var m = o + ", " + l;
                GuiUtils.handleError("Error getting metadata count: " + m, c, false)
            });
            return null
        },
        getEntryUrl: function(e, c) {
            var f;
            if ((typeof e) == "string") {
                f = e
            } else {
                f = e.id
            }
            var d = this.getRoot() + "/entry/show?entryid=" + f;
            if (c != null) {
                if (!StringUtil.startsWith(c, "&")) {
                    d += "&"
                }
                d += c
            }
            return d
        },
        getEntryDownloadUrl: function(e, c) {
            var f;
            if ((typeof e) == "string") {
                f = e
            } else {
                f = e.id
            }
            var d = this.getRoot() + "/entry/get?entryid=" + f;
            if (c != null) {
                if (!StringUtil.startsWith(c, "&")) {
                    d += "&"
                }
                d += c
            }
            return d
        },
        getSearchLinks: function(c) {
            var e = [];
            for (var d = 0; d < OUTPUTS.length; d++) {
                e.push(HtmlUtil.href(this.getSearchUrl(c, OUTPUTS[d].id), OUTPUTS[d].name))
            }
            return e
        },
        getUrlRoot: function() {
            return this.repositoryRoot
        },
        getSearchUrl: function(h, c, j) {
            var d = this.repositoryRoot + "/search/do?output=" + c;
            for (var f = 0; f < h.types.length; f++) {
                var g = h.types[f];
                d += "&type=" + g
            }
            if (h.parent != null && h.parent.length > 0) {
                d += "&group=" + h.parent
            }
            if (h.provider != null && h.provider.length > 0) {
                d += "&provider=" + h.provider
            }
            if (h.text != null && h.text.length > 0) {
                d += "&text=" + h.text
            }
            if (h.name != null && h.name.length > 0) {
                d += "&name=" + h.name
            }
            if (h.startDate && h.startDate.length > 0) {
                d += "&starttime=" + h.startDate
            }
            if (h.entries && h.entries.length > 0) {
                d += "&entries=" + h.entries
            }
            if (h.orderBy == "name") {
                d += "&orderby=name&ascending=true"
            }
            if (h.endDate && h.endDate.length > 0) {
                d += "&endtime=" + h.endDate
            }
            if (h.getAreaContains()) {
                d += "&areamode=contains"
            }
            if (!isNaN(h.getNorth())) {
                d += "&maxlatitude=" + h.getNorth()
            }
            if (!isNaN(h.getWest())) {
                d += "&minlongitude=" + h.getWest()
            }
            if (!isNaN(h.getSouth())) {
                d += "&minlatitude=" + h.getSouth()
            }
            if (!isNaN(h.getEast())) {
                d += "&maxlongitude=" + h.getEast()
            }
            for (var f = 0; f < h.metadata.length; f++) {
                var e = h.metadata[f];
                d += "&metadata.attr1." + e.type + "=" + e.value
            }
            d += "&max=" + h.getMax();
            d += "&skip=" + h.getSkip();
            d += h.getExtra();
            return d
        },
        addEntry: function(c) {
            this.entryCache[c.getId()] = c
        },
        getEntry: function(k, j) {
            var g = this.entryCache[k];
            if (g != null) {
                return g
            }
            if (window.globalRamaddas) {
                for (var d = 0; d < window.globalRamaddas.length; d++) {
                    var c = window.globalRamaddas[d];
                    var g = c.entryCache[k];
                    if (g != null) {
                        return g
                    }
                }
            }
            if (j == null) {
                return null
            }
            var f = this;
            var e = this.getJsonUrl(k);
            var h = $.getJSON(e, function(i) {
                if (GuiUtils.isJsonError(i)) {
                    return
                }
                var m = createEntriesFromJson(i, f);
                var l = null;
                if (m.length > 0) {
                    l = m[0]
                }
                j(l, m)
            }).fail(function(m, n, i) {
                var l = n + ", " + i;
                GuiUtils.handleError("Error getting entry information: " + l, e, false)
            });
            return null
        }
    })
}

function createEntriesFromJson(b, a) {
    if (a == null) {
        a = getGlobalRamadda()
    }
    return a.createEntriesFromJson(b)
}

function MetadataType(b, a, c) {
    $.extend(this, {
        type: b,
        label: a,
        value: c
    });
    $.extend(this, {
        getType: function() {
            return this.type
        },
        getLabel: function() {
            if (this.label != null) {
                return this.label
            }
            return this.type
        },
        getValue: function() {
            return this.value
        }
    })
}

function EntryTypeColumn(a) {
    $.extend(this, a);
    RamaddaUtil.defineMembers(this, {
        getName: function() {
            return this.name
        },
        getLabel: function() {
            return this.label
        },
        getType: function() {
            return this.type
        },
        getValues: function() {
            return this.values
        },
        getSuffix: function() {
            return this.suffix
        },
        getSearchArg: function() {
            return "search." + this.namespace + "." + this.name
        },
        getCanSearch: function() {
            return this.cansearch
        },
        getCanShow: function() {
            return this.canshow
        },
        isEnumeration: function() {
            return this.getType() == "enumeration" || this.getType() == "enumerationplus"
        },
        isUrl: function() {
            return this.getType() == "url"
        }
    })
}

function EntryType(d) {
    var c = d.columns;
    if (c == null) {
        c = []
    }
    var a = [];
    for (var b = 0; b < c.length; b++) {
        a.push(new EntryTypeColumn(c[b]))
    }
    d.columns = a;
    $.extend(this, d);
    RamaddaUtil.defineMembers(this, {
        getIsGroup: function() {
            return this.isgroup
        },
        getIcon: function() {
            return this.icon
        },
        getLabel: function() {
            return this.label
        },
        getId: function() {
            if (this.type != null) {
                return this.type
            }
            return this.id
        },
        getCategory: function() {
            return this.category
        },
        getEntryCount: function() {
            return this.entryCount
        },
        getColumns: function() {
            return this.columns
        }
    })
}
var xnt = 0;

function Entry(d) {
    if (d.repositoryId == null) {
        d.repositoryId = d.baseUrl
    }
    if (d.repositoryId == null) {
        d.repositoryId = ramaddaBaseUrl
    }
    var c = -9999;
    if (d.typeObject) {
        d.type = new EntryType(d.typeObject)
    } else {
        if (d.type) {
            var e = {
                id: d.type,
                name: d.typeName != null ? d.typeName : d.type
            };
            d.type = new EntryType(e)
        }
    }
    $.extend(this, {
        id: null,
        name: null,
        description: null,
        bbox: null,
        geometry: null,
        services: [],
        properties: [],
        childrenEntries: null,
        startDate: null,
        endDate: null
    });
    RamaddaUtil.inherit(this, d);
    this.domId = Utils.cleanId(this.id);
    this.startDate = Utils.parseDate(d.startDate);
    this.endDate = Utils.parseDate(d.endDate);
    if (this.endDate.getTime() < this.startDate.getTime()) {
        var b = this.startDate;
        this.startDate = this.endDate;
        this.endDate = b
    }
    this.attributes = [];
    this.metadata = [];
    for (var a = 0; a < this.properties.length; a++) {
        var f = this.properties[a];
        if (f.type == "attribute") {
            this.attributes.push(f)
        } else {
            this.metadata.push(f)
        }
    }
    RamaddaUtil.defineMembers(this, {
        getId: function() {
            return this.id
        },
        getIdForDom: function() {
            return this.domId
        },
        getFullId: function() {
            return this.getRamadda().getRoot() + "," + this.id
        },
        getDisplayName: function() {
            if (this.displayName) {
                return this.displayName
            }
            return this.getName()
        },
        getStartDate: function() {
            return this.startDate
        },
        getEndDate: function() {
            return this.endDate
        },
        getIsGroup: function() {
            return this.isGroup
        },
        getChildrenEntries: function(m, g) {
            if (this.childrenEntries != null) {
                return this.childrenEntries
            }
            var k = this;
            var i = new EntrySearchSettings({
                parent: this.getId()
            });
            var h = this.getRamadda().getSearchUrl(i, OUTPUT_JSON);
            var h = this.getRamadda().getJsonUrl(this.getId()) + "&justchildren=true";
            if (g != null) {
                h += "&" + g
            }
            var j = {
                entryListChanged: function(n) {
                    m(n.getEntries())
                }
            };
            var l = new EntryList(this.getRamadda(), h, j, true);
            return null
        },
        getType: function() {
            if (this.typeObject != null) {}
            return this.type
        },
        getThumbnail: function() {
            if (!this.metadata) {
                return null
            }
            for (var h = 0; h < this.metadata.length; h++) {
                var g = this.metadata[h];
                if (g.type == "content.thumbnail" && Utils.stringDefined(g.attr1)) {
                    return this.getRamadda().getRoot() + "/metadata/view/" + g.attr1 + "?element=1&entryid=" + this.getId() + "&metadata_id=" + g.id
                }
            }
            return null
        },
        getMetadata: function() {
            return this.metadata
        },
        getRamadda: function() {
            return getRamadda(this.repositoryId)
        },
        getLocationLabel: function() {
            return "n: " + this.getNorth() + " w:" + this.getWest() + " s:" + this.getSouth() + " e:" + this.getEast()
        },
        getServices: function() {
            return this.services
        },
        getService: function(h) {
            for (var g = 0; g < this.services.length; g++) {
                if (this.services[g].relType == h) {
                    return this.services[g]
                }
            }
            return null
        },
        goodLoc: function(g) {
            return !isNaN(g) && g != c
        },
        hasBounds: function() {
            return this.goodLoc(this.getNorth()) && this.goodLoc(this.getWest()) && this.goodLoc(this.getSouth()) && this.goodLoc(this.getEast())
        },
        hasLocation: function() {
            return this.goodLoc(this.getNorth())
        },
        getNorth: function() {
            if (this.bbox) {
                return this.bbox[3]
            }
            if (this.geometry) {
                return this.geometry.coordinates[1]
            }
            return c
        },
        getWest: function() {
            if (this.bbox) {
                return this.bbox[0]
            }
            if (this.geometry) {
                return this.geometry.coordinates[0]
            }
            return c
        },
        getSouth: function() {
            if (this.bbox) {
                return this.bbox[1]
            }
            if (this.geometry) {
                return this.geometry.coordinates[1]
            }
            return c
        },
        getEast: function() {
            if (this.bbox) {
                return this.bbox[2]
            }
            if (this.geometry) {
                return this.geometry.coordinates[0]
            }
            return c
        },
        getLatitude: function() {
            if (this.geometry) {
                return this.geometry.coordinates[1]
            }
            return this.getNorth()
        },
        getLongitude: function() {
            if (this.geometry) {
                return this.geometry.coordinates[0]
            }
            return this.getWest()
        },
        getIconUrl: function() {
            if (this.icon == null) {
                return this.getRamadda().getIconUrl(this)
            }
            if (this.icon.match("^http.*")) {
                return this.icon
            }
            var h;
            var g = this.getRamadda().getHostname();
            if (g) {
                h = g + this.icon
            } else {
                h = this.icon
            }
            return h
        },
        getIconImage: function(g) {
            return HtmlUtil.image(this.getIconUrl(), g)
        },
        getColumns: function() {
            if (this.type.getColumns() == null) {
                return new Array()
            }
            return this.type.getColumns()
        },
        getAttributes: function() {
            return this.attributes
        },
        getAttribute: function(h) {
            for (var j = 0; j < this.attributes.length; j++) {
                var g = this.attributes[j];
                if (g.id == h) {
                    return g
                }
            }
            return null
        },
        getAttributeValue: function(h) {
            var g = this.getAttribute(h);
            if (g == null) {
                return null
            }
            return g.value
        },
        getAttributeNames: function() {
            var j = [];
            for (var h = 0; h < this.attributes.length; h++) {
                var g = this.attributes[h];
                j.push(g.id)
            }
            return j
        },
        getAttributeLabels: function() {
            var j = [];
            for (var h = 0; h < this.attributes.length; h++) {
                var g = this.attributes[h];
                if (g.label) {
                    j.push(g.label)
                } else {
                    j.push(g.id)
                }
            }
            return j
        },
        getName: function() {
            if (this.name == null || this.name == "") {
                return "no name"
            }
            return this.name
        },
        getDescription: function(g) {
            if (this.description == null) {
                return g
            }
            return this.description
        },
        getFilesize: function() {
            var g = parseInt(this.filesize);
            if (g == g) {
                return g
            }
            return 0
        },
        getFormattedFilesize: function() {
            return GuiUtils.size_format(this.getFilesize())
        },
        getEntryUrl: function(g) {
            if (this.remoteUrl) {
                return this.remoteUrl
            }
            return this.getRamadda().getEntryUrl(this, g)
        },
        getFilename: function() {
            return this.filename
        },
        isImage: function() {
            if (this.url && this.url.search(/(\.png|\.jpg|\.jpeg|\.gif)/i) >= 0) {
                return true
            }
            return this.hasResource() && this.getFilename().search(/(\.png|\.jpg|\.jpeg|\.gif)/i) >= 0
        },
        hasResource: function() {
            return this.getFilename() != null
        },
        getResourceUrl: function() {
            if (this.url) {
                return this.url
            }
            var g = this.getRamadda().getRoot() + "/entry/get";
            if (this.getFilename() != null) {
                g += "/" + this.getFilename()
            }
            return g + "?entryid=" + this.id
        },
        getLink: function(g) {
            if (!g) {
                g = this.getName()
            }
            return HtmlUtil.tag("a", ["href", this.getEntryUrl()], g)
        },
        getResourceLink: function(g) {
            if (!g) {
                g = this.getName()
            }
            return HtmlUtil.tag("a", ["href", this.getResourceUrl()], g)
        },
        toString: function() {
            return "entry:" + this.getName()
        }
    })
}

function EntryList(c, b, d, a) {
    $.extend(this, {
        repository: c,
        url: b,
        listener: d,
        haveLoaded: false,
        entries: [],
        map: {},
        getRepository: function() {
            return this.repository
        },
        setEntries: function(e) {
            this.entries = e;
            this.haveLoaded = true
        },
        getEntry: function(f) {
            var e = this.map[f];
            if (e != null) {
                return e
            }
            return this.getRepository().getEntry(f)
        },
        getEntries: function() {
            return this.entries
        },
        createEntries: function(h, g) {
            this.entries = createEntriesFromJson(h, this.getRepository());
            for (var e = 0; e < this.entries.length; e++) {
                var f = this.entries[e];
                this.map[f.getId()] = f
            }
            if (g == null) {
                g = this.listener
            }
            if (g && g.entryListChanged) {
                g.entryListChanged(this)
            }
        },
        doSearch: function(e) {
            if (e == null) {
                e = this.listener
            }
            var g = this;
            var f = $.getJSON(this.url, function(i, h, j) {
                if (GuiUtils.isJsonError(i)) {
                    return
                }
                g.haveLoaded = true;
                g.createEntries(i, e)
            }).fail(function(i, j, h) {
                GuiUtils.handleError("An error occurred doing search: " + h, g.url, true);
                console.log("listener:" + e.handleSearchError);
                if (e.handleSearchError) {
                    e.handleSearchError(g.url, h)
                }
            })
        }
    });
    if (a) {
        this.doSearch()
    }
}

function EntrySearchSettings(a) {
    $.extend(this, {
        types: [],
        parent: null,
        max: 50,
        skip: 0,
        metadata: [],
        extra: "",
        sortBy: "",
        entries: null,
        startDate: null,
        endDate: null,
        north: NaN,
        west: NaN,
        north: NaN,
        east: NaN,
        areaContains: false,
        getMax: function() {
            return this.max
        },
        getSkip: function() {
            return this.skip
        },
        toString: function() {
            return "n:" + this.north + " w:" + this.west + " s:" + this.south + " e:" + this.east
        },
        getAreaContains: function() {
            return this.areaContains
        },
        setAreaContains: function(b) {
            this.areaContains = b
        },
        getNorth: function() {
            return this.north
        },
        getSouth: function() {
            return this.south
        },
        getWest: function() {
            return this.west
        },
        getEast: function() {
            return this.east
        },
        setDateRange: function(c, b) {
            this.startDate = c;
            this.endDate = b
        },
        setBounds: function(e, b, d, c) {
            this.north = (e == null || e.toString().length == 0 ? NaN : parseFloat(e));
            this.west = (b == null || b.toString().length == 0 ? NaN : parseFloat(b));
            this.south = (d == null || d.toString().length == 0 ? NaN : parseFloat(d));
            this.east = (c == null || c.toString().length == 0 ? NaN : parseFloat(c))
        },
        getTypes: function() {
            return this.types
        },
        hasType: function(b) {
            return this.types.indexOf(b) >= 0
        },
        getExtra: function() {
            return this.extra
        },
        setExtra: function(b) {
            this.extra = b
        },
        clearAndAddType: function(b) {
            this.types = [];
            this.addType(b);
            return this
        },
        addType: function(b) {
            if (b == null || b.length == 0) {
                return
            }
            if (this.hasType(b)) {
                return
            }
            this.types.push(b);
            return this
        }
    });
    if (a != null) {
        $.extend(this, a)
    }
}

function EntryListHolder(b) {
    var a;
    RamaddaUtil.inherit(this, a = new EntryList(b, null));
    $.extend(this, {
        entryLists: [],
        addEntryList: function(c) {
            this.entryLists.push(c)
        },
        doSearch: function(d) {
            var g = this;
            if (d == null) {
                d = this.listener
            }
            for (var c = 0; c < this.entryLists.length; c++) {
                var f = this.entryLists[c];
                if (!f.getRepository().canSearch()) {
                    continue
                }
                var e = {
                    entryListChanged: function(h) {
                        if (d) {
                            d.entryListChanged(g, h)
                        }
                    }
                };
                f.doSearch(e)
            }
        },
        getEntry: function(f) {
            for (var c = 0; c < this.entryLists.length; c++) {
                var e = this.entryLists[c];
                var d = e.getEntry(f);
                if (d != null) {
                    return d
                }
            }
            return null
        },
        getEntries: function() {
            var c = [];
            for (var e = 0; e < this.entryLists.length; e++) {
                var f = this.entryLists[e].getEntries();
                for (var d = 0; d < f.length; d++) {
                    c.push(f[d])
                }
            }
            return c
        }
    })
};