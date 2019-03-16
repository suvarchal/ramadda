/**
Copyright 2008-2019 Geode Systems LLC
*/


var DISPLAY_NOTEBOOK = "notebook";
addGlobalDisplayType({
    type: DISPLAY_NOTEBOOK,
    label: "Notebook",
    requiresData: false,
    category: "Misc"
});

function RamaddaNotebookDisplay(displayManager, id, properties) {
    var ID_NOTEBOOK = "notebook";
    var ID_IMPORTS = "imports";
    var ID_CELLS = "cells";
    var ID_CELLS_BOTTOM = "cellsbottom";
    var ID_INPUTS = "inputs";
    var ID_OUTPUTS = "outputs";
    var ID_CONSOLE = "console";
    var ID_CONSOLE_CONTAINER = "consolecontainer";
    var ID_CONSOLE_OUTPUT = "consoleout";
    var ID_CELL = "cell";
    var ID_MENU = "menu";
    this.properties = properties||{};
    let SUPER = new RamaddaDisplay(displayManager, id, DISPLAY_NOTEBOOK, properties);
    RamaddaUtil.inherit(this, SUPER);
    addRamaddaDisplay(this);
    RamaddaUtil.defineMembers(this, {
            runOnLoad: this.getProperty("runOnLoad",true),
                displayMode: this.getProperty("displayMode",false),
                showConsole:this.getProperty("showConsole",true),
                layout: this.getProperty("layout","horizontal"),
                columns: this.getProperty("columns",1),
                });

    RamaddaUtil.defineMembers(this, {
        cells: [],
        cellCount: 0,
        fetchedNotebook: false,
        currentEntries: {},
        globals: {},
        baseEntries: {},
        initDisplay: async function() {
            this.createUI();
            var imports = HtmlUtils.div(["id", this.getDomId(ID_IMPORTS)]);
            var contents = imports + HtmlUtils.div([ATTR_CLASS, "display-notebook-cells", ATTR_ID, this.getDomId(ID_CELLS)], "&nbsp;&nbsp;Loading...") +
                HtmlUtils.div([ATTR_ID, this.getDomId(ID_CELLS_BOTTOM)]);
            var popup = HtmlUtils.div(["class", "ramadda-popup", ATTR_ID, this.getDomId(ID_MENU)]);
            contents = HtmlUtils.div([ATTR_ID, this.getDomId(ID_NOTEBOOK)], popup + contents);
            this.setContents(contents);
            this.makeCellLayout();
            this.jq(ID_NOTEBOOK).hover(() => {}, () => {
                this.jq(ID_MENU).hide()
            });
            if (!this.fetchedNotebook) {
                if (!this.fetchingNotebook) {
                    this.fetchingNotebook = true;
                    /*                    await Utils.importJS("https://alpha.iodide.app/pyodide-0.8.2/pyodide.js");
                    languagePluginLoader.then(() => {
                            // pyodide is now ready to use...
                            console.log(pyodide.runPython('import sys\nsys.version'));
                        },()=>console.log("error"));
                    */
                    await Utils.importJS(ramaddaBaseHtdocs + "/lib/ace/src-min/ace.js");
                    await Utils.importJS(ramaddaBaseUrl + "/lib/showdown.min.js"); 
                    var imports = "<link rel='preload' href='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/fonts/KaTeX_Main-Regular.woff2' as='font' type='font/woff2' crossorigin='anonymous'>\n<link rel='preload' href='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/fonts/KaTeX_Math-Italic.woff2' as='font' type='font/woff2' crossorigin='anonymous'>\n<link rel='preload' href='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/fonts/KaTeX_Size2-Regular.woff2' as='font' type='font/woff2' crossorigin='anonymous'>\n<link rel='preload' href='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/fonts/KaTeX_Size4-Regular.woff2' as='font' type='font/woff2' crossorigin='anonymous'/>\n<link rel='stylesheet' href='https://fonts.googleapis.com/css?family=Lato:300,400,700,700i'>\n<link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/katex.min.css' crossorigin='anonymous'>\n<link rel='stylesheet' href='static/index.css'><script defer src='https://cdn.jsdelivr.net/npm/katex@0.10.1/dist/katex.min.js' crossorigin='anonymous'></script>";
                    $(imports).appendTo("head");                    
                    setTimeout(() => this.fetchNotebook(1), 10);
                }
            } else {
                this.layoutCells();
            }
        },
        fetchNotebook: async function(cnt) {
            if (!window["ace"]) {
                if (cnt > 50) {
                    alert("Could not load ace.js");
                    return;
                }
                setTimeout(() => this.fetchNotebook(cnt + 1), cnt * 10);
                return;
            }
            var dttm = new Date().getTime();
            ace.config.set('basePath', ramaddaBaseUrl + "/htdocs_v" + dttm + "/lib/ace/src-min");
            let _this = this;
            this.fetchedNotebook = true;
            await this.getEntry(this.getProperty("entryId", ""), entry => {
                this.baseEntry = entry;
            });
            await this.baseEntry.getRoot(entry => {
                this.rootEntry = entry;
            });
            var id = this.getProperty("entryId", "");
            var url = ramaddaBaseUrl + "/getnotebook?entryid=" + id;
            url += "&notebookId=" + this.getProperty("notebookId", "default_notebook");
            var jqxhr = $.getJSON(url, function(data) {
                _this.loadJson(data);
            }).fail(function() {
                var props = {
                    showInput: true,
                }
                this.addCell("init cell", props, false).run();
                this.cells[0].focus();
            });

        },
        addGlobal: function(name, value) {
            this.globals[name] = value;
        },
        getBaseEntry: function() {
            return this.baseEntry;
        },
        getRootEntry: function() {
            return this.rootEntry;
        },
        getPopup: function() {
            return this.jq(ID_MENU);
        },
        loadJson: async function(data) {
            if (data.error) {
                this.setContents(_this.getMessage("Failed to load notebook: " + data.error));
                return;
            }
            if (!Utils.isDefined(this.properties.runOnLoad) && Utils.isDefined(data.runOnLoad)) {
                this.runOnLoad = data.runOnLoad;
            }
            if (!Utils.isDefined(this.properties.displayMode) && Utils.isDefined(data.displayMode)) {
                this.displayMode = data.displayMode;
            }
            if (!Utils.isDefined(this.properties.showConsole) && Utils.isDefined(data.showConsole)) {
                this.showConsole = data.showConsole;
            }
            if (!Utils.isDefined(this.properties.columns) && Utils.isDefined(data.columns)) {
                this.columns = data.columns;
            }
            if (!Utils.isDefined(this.properties.layout) && Utils.isDefined(data.layout)) {
                this.layout = data.layout;
            }

            if (Utils.isDefined(data.currentEntries)) {
                for (a in data.currentEntries) {
                    var obj = {};
                    if (this.currentEntries[a]) continue;
                    obj.name = a;
                    obj.entryId = data.currentEntries[a].entryId;
                    try {
                        await this.getEntry(obj.entryId, e => obj.entry = e);
                        this.currentEntries[a] = obj;
                    } catch (e) {}
                }
            }
            if (Utils.isDefined(data.cells)) {
                this.cells = [];
                data.cells.map(cell => this.addCell(cell.outputHtml, cell, true));
                this.layoutCells();
            }
            if (this.cells.length == 0) {
                var props = {
                    showInput: true,
                }
                this.addCell("%%wiki\n", props, false);
                this.layoutCells();
                this.cells[0].focus();
            }

            if (this.runOnLoad) {
                this.runAll();
            }
        },
        addEntry: async function(name, entryId) {
            var entry;
            await this.getEntry(entryId, e => entry = e);
            this.currentEntries[name] = {
                entryId: entryId,
                entry: entry
            };
        },
        getCurrentEntries: function() {
            return this.currentEntries;
        },
        clearEntries: function() {
            this.currentEntries = {};
            for (a in this.baseEntries)
                this.currentEntries[a] = this.baseEntries[a];
        },
        saveNotebook: function(output) {
            var json = this.getJson(output);
            json = JSON.stringify(json, null, 2);
            var args = {
                entryid: this.getProperty("entryId", ""),
                notebookId: this.getProperty("notebookId", "default_notebook"),
                notebook: json
            };
            var url = ramaddaBaseUrl + "/savenotebook";
            $.post(url, args, (result) =>{
                if (result.error) {
                    alert("Error saving notebook: " + result.error);
                    return;
                }
                if (result.result != "ok") {
                    alert("Error saving notebook: " + result.result);
                    return;
                }
                if(!this.getShowConsole()) {
                    alert("Notebook saved");
                } else {
                    this.log("Notebook saved","info","nb");
                }
            });
        },
        showInput: function() {
            if (this.displayMode && !this.user)
                return false;
            return true;
        },
        getJson: function(output) {
            var obj = {
                cells: [],
                currentEntries: {},
                runOnLoad: this.runOnLoad,
                displayMode: this.displayMode,
                showConsole: this.showConsole,
                layout: this.layout,
                columns: this.columns,
            };
            for (var name in this.currentEntries) {
                var e = this.currentEntries[name];
                obj.currentEntries[name] = {
                    entryId: e.entryId
                };
            }
            this.cells.map(cell => obj.cells.push(cell.getJson(output)));
            return obj;
        },
        initConsole: function() {
            if(!this.showInput()) {
                return;
            }
            let _this =this;
            this.console = this.jq(ID_CONSOLE_OUTPUT);
            this.jq(ID_CONSOLE).find(".ramadda-image-link").click(function(){
                    var what = $(this).attr("what");
                    if(what == "clear") {
                        _this.console.html("");
                    }
                });

         },
        getShowConsole: function() {
                return this.showInput() && this.showConsole;
         },
        makeConsole: function() {
            this.console = null;
            if(!this.getShowConsole()) {
                return "";
            }
            var contents = this.jq(ID_CONSOLE_OUTPUT).html();
            this.jq(ID_CELLS_BOTTOM).html("");
            var consoleToolbar = HtmlUtils.div([],
                                               HtmlUtils.leftRight("",
                                                                   HtmlUtils.span(["class","ramadda-image-link","title","Clear","what","clear"],
                                                                                 HtmlUtils.image(Utils.getIcon("clear.png")))));
            return  HtmlUtils.div(["id", this.getDomId(ID_CONSOLE),"class","display-notebook-console"],
                                        consoleToolbar+
                                  HtmlUtils.div(["class","display-notebook-console-output", "id", this.getDomId(ID_CONSOLE_OUTPUT)],contents||""));
        },

        makeCellLayout: function() {
            var html = "";
            var consoleContainer = HtmlUtils.div(["id",this.getDomId(ID_CONSOLE_CONTAINER)]);
            if (this.showInput() && this.layout == "horizontal") {
                var left = HtmlUtils.div(["id", this.getDomId(ID_INPUTS)]);
                var right = HtmlUtils.div(["id", this.getDomId(ID_OUTPUTS)]);
                var center = HtmlUtils.div([], "");
                left +=consoleContainer;
                html = "<table width=100%><tr valign=top><td width=50%>" + left + "</td><td style='border-left:1px #ccc solid;' width=1>" + center + "</td><td width=49%>" + right + "</td></tr></table>";
            } else {
                this.jq(ID_CELLS_BOTTOM).html(consoleContainer);
            }
            this.jq(ID_CELLS).html(html);
        },
         log:function(msg, type, from,div) {
                var icon = "";
                var clazz = "display-notebook-console-item";
                if(type == "error") {
                    clazz+= " display-notebook-console-item-error";
                    icon = HtmlUtils.image(Utils.getIcon("cross-octagon.png"));
                    if(div) {
                        div.append(msg);
                    }
                } else if(type == "output") {
                    clazz+= " display-notebook-console-item-output";
                    icon = HtmlUtils.image(Utils.getIcon("arrow-000-small.png"));
                } else if(type == "info") {
                    clazz+= " display-notebook-console-item-info";
                    icon = HtmlUtils.image(Utils.getIcon("information.png"));
                }
                if(!this.console) return;
                if(!from) from = "";
                else from = HtmlUtils.div(["class","display-notebook-console-from"],from);
                var block = HtmlUtils.div(["style","margin-left:5px;"],msg);
                var html = "<table width=100%><tr valign=top><td width=10>" + icon+"</td><td>" +
                                         block +
                                         "</td><td width=10>" +
                                         from +
                                         "</td></tr></table>";
                var item =  HtmlUtils.div(["class",clazz],html);
                this.console.append(item);
                //200 is defined in display.css
                var height = this.console.prop('scrollHeight');
                if(height>200)
                    this.console.scrollTop(height-200);
        },
        layoutCells: function() {
            for (var i = 0; i < this.cells.length; i++) {
                var cell = this.cells[i];
                cell.prepareToLayout();
            }
            this.makeCellLayout();
            if (this.showInput() && this.layout == "horizontal") {
                var left = "";
                var right = "";
                var id;
                for (var i = 0; i < this.cells.length; i++) {
                    var cell = this.cells[i];
                    id = cell.id;
                    cell.index = i + 1;
                    left += HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_cellinput"], "");
                    left += "\n";
                    right += HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_celloutput"], "");
                }
                this.jq(ID_INPUTS).html(left);
                this.jq(ID_OUTPUTS).html(right);
            } else {
                var html = "<div class=row style='padding:0px;margin:0px;'>";
                var clazz = HtmlUtils.getBootstrapClass(this.columns);
                var colCnt = 0;
                for (var i = 0; i < this.cells.length; i++) {
                    var cell = this.cells[i];
                    cell.index = i + 1;
                    html += HtmlUtils.openTag("div", ["class", clazz]);
                    html += HtmlUtils.openTag("div", ["style", "max-width:100%;overflow-x:auto;padding:0px;margin:px;"]);
                    html += HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_cellinput"], "");
                    html += HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_celloutput"], "");
                    html += HtmlUtils.closeTag("div");
                    html += HtmlUtils.closeTag("div");
                    html += "\n";
                    colCnt++;
                    if (colCnt >= this.columns) {
                        colCnt = 0;
                        html += HtmlUtils.closeTag("div");
                        html += "<div class=row style='padding:0px;margin:0px;'>";
                    }
                };
                html += HtmlUtils.closeTag("div");
                this.jq(ID_CELLS).append(html);
            }
            for (var i = 0; i < this.cells.length; i++) {
                var cell = this.cells[i];
                cell.createCell();
            };
            this.jq(ID_CONSOLE_CONTAINER).html(this.makeConsole());
            this.initConsole();
        },
        addCell: function(content, props, layoutLater) {
            cell = this.createCell(content, props);
            this.cells.push(cell);
            if (!layoutLater) {
                if (this.showInput() && this.layout == "horizontal") {
                    this.jq(ID_INPUTS).append(HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_cellinput"], ""));
                    this.jq(ID_OUTPUTS).append(HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_celloutput"], ""));
                } else {
                    this.jq(ID_CELLS).append(HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_cellinput"], ""));
                    this.jq(ID_CELLS).append(HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cell.id + "_celloutput"], ""));
                }
                cell.createCell();
            }
            return cell;
        },
        createCell: function(content, props) {
            if (!props) props = {
                showInput: true
            };
            var cellId = this.getId() + "_" + this.cellCount;
            //Override any saved id
            props.id = cellId;
            this.cellCount++;
            this.jq(ID_CELLS).append(HtmlUtils.div([ATTR_CLASS, "display-notebook-cell", ATTR_ID, cellId], ""));
            var cell = new RamaddaNotebookCell(this, cellId, content, props);
            return cell;
        },
        clearOutput: function() {
            this.cells.map(cell => cell.clearOutput());
        },
        getIndex: function(cell) {
            var idx = 0;
            for (var i = 0; i < this.cells.length; i++) {
                if (cell.id == this.cells[i].id) {
                    idx = i;
                    break;
                }
            }
            return idx;
        },
        moveCellUp: function(cell) {
            var cells = [];
            var newCell = null;
            var idx = this.getIndex(cell);
            if (idx == 0) return;
            this.cells.splice(idx, 1);
            this.cells.splice(idx - 1, 0, cell);
            this.layoutCells();
            cell.focus();
        },
        moveCellDown: function(cell) {
            var cells = [];
            var newCell = null;
            var idx = this.getIndex(cell);
            if (idx == this.cells.length - 1) return;
            this.cells.splice(idx, 1);
            this.cells.splice(idx + 1, 0, cell);
            this.layoutCells();
            cell.focus();
        },

        newCellAbove: function(cell) {
            var cells = [];
            var newCell = null;
            for (var i = 0; i < this.cells.length; i++) {
                if (cell.id == this.cells[i].id) {
                    newCell = this.createCell("%%wiki\n", {
                        showInput: true,
                        showHeader: false
                    });
                    cells.push(newCell);
                }
                cells.push(this.cells[i]);
            }
            this.cells = cells;
            this.layoutCells();
            newCell.focus();
        },

        newCellBelow: function(cell) {
            var cells = [];
            var newCell = null;
            for (var i = 0; i < this.cells.length; i++) {
                cells.push(this.cells[i]);
                if (cell.id == this.cells[i].id) {
                    newCell = this.createCell("%%wiki\n", {
                        showInput: true,
                        showHeader: false
                    });
                    cells.push(newCell);
                }
            }
            this.cells = cells;
            this.layoutCells();
            newCell.focus();
        },
        deleteCell: function(cell) {
            cell.jq(ID_CELL).remove();
            var cells = [];
            this.cells.map(c => {
                if (cell.id != c.id) {
                    cells.push(c);
                }
            });
            this.cells = cells;
            if (this.cells.length == 0) {
                this.addCell("", null);
            }
        },
        cellValues: {},
        setCellValue: function(name, value) {
            this.cellValues[name] = value;
        },
        getCellValues: function() {
            return this.cellValues;
        },
        convertInput: function(input) {
            for (name in this.cellValues) {
                var re = new RegExp("\\$\\{" + name + "\\}", "g");
                input = input.replace(re, this.cellValues[name]);
            }
            return input;
        },
        runAll: async function() {
            var ok = true;
            this.cellValues = {};
            for (var i = 0; i < this.cells.length; i++) {
                var cell = this.cells[i];
                cell.hasRun = false;
            }
            for (var i = 0; i < this.cells.length; i++) {
                var cell = this.cells[i];
                if (!cell.runFirst) continue;
                await this.runCell(cell).then(result => ok = result);
            }
            if (!ok) return;
            for (var i = 0; i < this.cells.length; i++) {
                var cell = this.cells[i];
                if (cell.runFirst) continue;
                await this.runCell(cell).then(result => ok = result);
            }
        },
        runCell: async function(cell) {
            if (cell.hasRun) return true;
            await cell.run(result => ok = result);
            if (!ok) return false;
            var raw = cell.getRawOutput();
            if (raw) {
                raw = raw.trim();
                if (Utils.stringDefined(cell.cellName)) {
                    this.cellValues[cell.cellName] = raw;
                }
            }
            return true;
        },
        toggleAll: function(on) {
            this.cells.map(cell => {
                cell.showInput = on;
                cell.applyStyle();
            });
        },

    });
}


function skulptRead(x) {
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
        throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}


function NotebookState(cell, div) {
    this.id = HtmlUtils.getUniqueId();
    this.cell = cell;
    this.notebook = cell.notebook;
    $.extend(this, {
        entries: {},
        div: div,
        stopFlag: false,
        prefix: null,
        result: null,
        getStop: function() {
            return this.stopFlag;
        },
        getCell: function() {
            return this.cell;
        },
        setValue: function(name, value) {
            this.notebook.setCellValue(name, value);
        },
        makeData: async function(entry) {
            if (!entry)
                await this.getCurrentEntry(e => entry = e);
            if ((typeof entry) == "string") {
                await this.notebook.getEntry(entry, e => entry = e);
            }
            var jsonUrl = this.notebook.getPointUrl(entry);
            if (jsonUrl == null) {
                this.writeError("Not a point type:" + entry.getName());
                return null;
            }
            var pointDataProps = {
                entry: entry,
                entryId: entry.getId()
            };
            return new PointData(entry.getName(), null, null, jsonUrl, pointDataProps);
        },
        log: function(msg,type) { 
            this.getNotebook().log(msg,type,"js");
        },
        getNotebook: function() {
            return this.notebook;
        },

        clear: function() {
            this.cell.clearOutput();
        },

        save: function(output) {
            this.notebook.saveNotebook(output);
            return "notebook saved";
        },

        clearEntries: function() {
            this.clearEntries();
        },

        ls: async function(entry) {
            var div = new Div();
            if (!entry)
                await this.getCurrentEntry(e => entry = e);
            this.call.getEntryHeading(entry, div);
            this.write(div.toString());
        },

        lsEntries: function() {
            var h = "";
            var entries = this.currentEntries;
            for (var name in entries) {
                var e = entries[name];
                h += name + "=" + e.entry.getName() + "<br>";
            }
            this.write(h);
        },

        stop: function() {
            this.stopFlag = true;
        },
        setGlobal: function(name, value) {
            this.cell.notebook.addGlobal(name, value);
        },
        setEntry: function(name, entryId) {
            this.cell.notebook.addEntry(name, entryId);
        },
        getEntry: async function(entryId, callback) {
            await this.cell.notebook.getEntry(e => entry = e);
            return Utils.call(callback, entry);
        },
        wiki: async function(s, entry, callback) {
            var write = false;
            if (!callback)
                callback = h => this.write(h);
            if (entry == null)
                await this.cell.getCurrentEntry(e => entry = e);
            if ((typeof entry) != "string") entry = entry.getId();
            await GuiUtils.loadHtml(ramaddaBaseUrl + "/wikify?doImports=false&entryid=" + entry + "&text=" + encodeURIComponent(s),
                callback);
        },
        write: function(s) {
            if (this.prefix == null) {
                this.prefix = s;
            } else {
                this.prefix += s;
            }
        },

        linechart: async function(entry, props) {
            if (!entry)
                await this.cell.getCurrentEntry(e => entry = e);
            this.cell.createDisplay(this, entry, DISPLAY_LINECHART, props);
        },

        help: function() {
            return "Enter an expression, e.g.:<pre>1+2</pre> or wrap you code in brackets:<pre>{\nvar x=1+2;\nreturn x;\n}</pre>" +
                "functions:<br>nbHelp() : print this help<br>nbClear() : clear the output<br>nbCell : this cell<br>nbNotebook: this notebook<br>" +
                "nbLs(): list current entry; nbLs(parent): list parent; nbLs(root): list root" +
                "nbLinechart(entry): create a linechart, defaults to current entry" +
                "nbNotebook.addCell('wiki:some wiki text'): add a new cell with the given output<br>" +
                "nbSave(includeOutput): save the notebook<br>nbWrite(html) : add some output<br>nbStop(): stop running";
        }
    });
}


var notebookStates = {};

function RamaddaNotebookCell(notebook, id, content, props) {
    this.notebook = notebook;

    var ID_CELL = "cell";
    var ID_HEADER = "header";
    var ID_CELLNAME = "cellname";
    var ID_INPUT = "input";
    var ID_INPUT_TOOLBAR = "inputtoolbar";
    var ID_OUTPUT = "output";
    var ID_MESSAGE = "message";
    var ID_BUTTON_MENU = "menubutton";
    var ID_BUTTON_RUN = "runbutton";
    var ID_BUTTON_TOGGLE = "togglebutton";
    var ID_MENU = "menu";
    var ID_CELLNAME_INPUT = "cellnameinput";
    var ID_SHOWHEADER_INPUT = "showheader";
    var ID_SHOWEDIT = "showedit";
    var ID_RUN_ON_LOAD = "runonload";
    var ID_DISPLAY_MODE = "displaymode";
    var ID_LAYOUT_TYPE = "layouttype";
    var ID_SHOWCONSOLE = "showconsole";
    var ID_LAYOUT_COLUMNS = "layoutcolumns";
    var ID_RUNFIRST = "runfirst";
    var ID_SHOW_OUTPUT = "showoutput";

    let SUPER = new DisplayThing(id, {});
    RamaddaUtil.inherit(this, SUPER);

    RamaddaUtil.defineMembers(this, {
        id: id,
        inputRows: 1,
        index: 0,
        content: content,
        outputHtml: "",
        showInput: false,
        showHeader: false,
        cellName: "",
        runFirst: false,
        showOutput: true,
    });

    if (props) {
        $.extend(this, props);
    }
    RamaddaUtil.defineMembers(this, {
        getJson: function(output) {
            var obj = {
                id: this.id,
                inputRows: this.inputRows,
                content: this.getInputText(),
                showInput: this.showInput,
                showHeader: this.showHeader,
                runFirst: this.runFirst,
                showOutput: this.showOutput,
                cellName: this.cellName,
            };
            if (this.currentEntry)
                obj.currentEntryId = this.currentEntry.getId();
            if (output)
                obj.outputHtml = this.outputHtml;
            return obj;
        },
        createCell: function() {
            if (this.content == null) {
                this.content = "%% wiki";
            }
            this.editId = addHandler(this);
            addHandler(this, this.editId + "_entryid");
            addHandler(this, this.editId + "_wikilink");
            var _this = this;
            var buttons =
                this.makeButton(ID_BUTTON_MENU, icon_menu, "Show menu", "showmenu") +
                this.makeButton(ID_BUTTON_RUN, Utils.getIcon("run.png"), "Run", "run") +
                this.makeButton(ID_BUTTON_RUN, Utils.getIcon("runall.png"), "Run all", "runall");

            var header = HtmlUtils.div([ATTR_CLASS, "display-notebook-header", ATTR_ID, this.getDomId(ID_HEADER), "tabindex", "0", "title", "Click to toggle input\nShift-click to clear output"], "&nbsp;" + buttons + "&nbsp;" + HtmlUtils.span(["id", this.getDomId(ID_CELLNAME)], this.cellName));
            var content = this.content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            var input = HtmlUtils.div([ATTR_CLASS, "display-notebook-input ace_editor", ATTR_ID, this.getDomId(ID_INPUT)], content);
            var inputToolbar = HtmlUtils.div(["id", this.getDomId(ID_INPUT_TOOLBAR)], "");

            input = HtmlUtils.div(["class", "display-notebook-input-container"], inputToolbar + input);
            var output = HtmlUtils.div([ATTR_CLASS, "display-notebook-output", ATTR_ID, this.getDomId(ID_OUTPUT)], this.outputHtml);
            output = HtmlUtils.div(["class", "display-notebook-output-container"], output);
            var menu = HtmlUtils.div(["id", this.getDomId(ID_MENU), "class", "ramadda-popup"], "");
            var html = header + input;
            html = HtmlUtils.div(["id", this.getDomId(ID_CELL)], html);
            $("#" + this.id + "_cellinput").html(html);
            $("#" + this.id + "_celloutput").html(output);
            var url = ramaddaBaseUrl + "/wikitoolbar?entryid=" + this.entryId + "&handler=" + this.editId;
            url += "&extrahelp=" + ramaddaBaseUrl + "/userguide/notebook.html|Notebook Help";
            GuiUtils.loadHtml(url, h => {
                this.inputToolbar = h;
                this.jq(ID_INPUT_TOOLBAR).html(h);
                $("#" + this.editId + "_prefix").html(HtmlUtils.span(["id", this.getDomId("toolbar_notebook"),
                    "style", "border-right:1px #ccc solid;",
                    "class", "ramadda-menubar-button"
                ], "Notebook"));
                this.jq("toolbar_notebook").click(() => this.showNotebookMenu());

            });
            this.header = this.jq(ID_HEADER);
            this.header.click((e) => {
                if (e.shiftKey)
                    this.processCommand("clear");
                else {
                    this.hidePopup();
                    this.processCommand("toggle");
                }

            });

            this.editor = HtmlUtils.initAceEditor("", this.getDomId(ID_INPUT));


            this.menuButton = this.jq(ID_BUTTON_MENU);
            this.toggleButton = this.jq(ID_BUTTON_TOGGLE);
            this.cell = this.jq(ID_CELL);
            this.input = this.jq(ID_INPUT);
            this.output = this.jq(ID_OUTPUT);
            this.inputContainer = this.cell.find(".display-notebook-input-container");
            this.inputMenu = this.cell.find(".display-notebook-input-container");
            this.applyStyle();
            this.header.find(".display-notebook-menu-button").click(function(e) {
                _this.processCommand($(this).attr("what"));
                e.stopPropagation();
            });

            this.calculateInputHeight();
            this.input.focus(() => this.hidePopup());
            this.input.click(() => this.hidePopup());
            this.output.click(() => this.hidePopup());
            //            this.input.on('input selectionchange propertychange', ()=>this.calculateInputHeight());
            var moveFunc = (e) => {
                var key = e.key;
                if (key == 'v' && e.ctrlKey) {
                    this.notebook.moveCellDown(_this);
                    return;
                }
                if (key == 6 && e.ctrlKey) {
                    this.notebook.moveCellUp(_this);
                    return;
                }

            };
            this.input.keydown(moveFunc);
            this.header.keydown(moveFunc);
            this.input.keypress(function(e) {
                var key = e.key;
                if (key == 'Enter') {
                    if (e.shiftKey) {
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        _this.run();
                    } else if (e.ctrlKey) {
                        if (e.preventDefault) {
                            e.preventDefault();
                        }
                        _this.notebook.runAll();
                    }
                }

            });
        },
        selectClick(type, id, entryId, value) {
            if (type == "entryid") {
                this.insertText(entryId);
            } else {
                this.insertText("[[" + entryId + "|" + value + "]]");
            }
            this.input.focus();
        },
        insertTags: function(tagOpen, tagClose, sampleText) {
            var id = this.getDomId(ID_INPUT);
            var textComp = GuiUtils.getDomObject(id);
            insertTagsInner(id, textComp.obj, tagOpen, tagClose, sampleText);
            this.calculateInputHeight();
        },
        insertText: function(value) {
            var id = this.getDomId(ID_INPUT);
            var textComp = GuiUtils.getDomObject(id);
            insertAtCursor(id, textComp.obj, value);
            this.calculateInputHeight();
        },
        showNotebookMenu: function() {
            var link = this.jq("toolbar_notebook");
            this.makeMenu(link, "left bottom");
        },
        makeButton: function(id, icon, title, command) {
            if (!command) command = "noop";
            return HtmlUtils.div(["what", command, "title", title, "class", "display-notebook-menu-button", "id", this.getDomId(id)], HtmlUtils.image(icon, []));
        },
        makeMenu: function(src, at) {
            if (!src) {
                src = this.input;
            }
            if (!src.is(":visible")) {
                src = this.header;
            }
            if (!src.is(":visible")) {
                src = this.output;
            }
            if (!at) at = "left top";
            let _this = this;
            var space = "&nbsp;&nbsp;";
            var line = "<div style='border-top:1px #ccc solid;margin-top:4px;margin-bottom:4px;'></div>"
            var menu = "";
            menu += HtmlUtils.input(ID_CELLNAME_INPUT, _this.cellName, ["placeholder", "Cell name", "style", "width:100%;", "id", _this.getDomId(ID_CELLNAME_INPUT)]);
            menu += "<br>";
            menu += "<table  width=100%> ";
            menu += "<tr><td align=right><b>New cell:</b>&nbsp;</td><td>";
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "newabove"], "Above") + space;
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "newbelow"], "Below");
            menu += "</td></tr>"
            menu += "<tr><td align=right><b>Move:</b>&nbsp;</td><td>";
            menu += HtmlUtils.div(["title", "ctrl-^", "class", "ramadda-link", "what", "moveup"], "Up") + space;
            menu += HtmlUtils.div(["title", "ctrl-v", "class", "ramadda-link", "what", "movedown"], "Down");
            menu += "</td></tr>"

            menu += "</table>";

            menu += line;
            menu += HtmlUtils.div(["title", "ctrl-return", "class", "ramadda-link", "what", "hideall"], "Hide all inputs");
            menu += "<br>"
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "clearall"], "Clear all outputs");
            menu += "<br>";
            var cols = this.notebook.columns;
            var colId = _this.getDomId(ID_LAYOUT_COLUMNS);
            menu += "<b>Layout:</b> ";
            menu += HtmlUtils.checkbox(_this.getDomId(ID_LAYOUT_TYPE), [], _this.notebook.layout == "horizontal") + " Horizontal" + "<br>";
            //            menu += "Columns: ";
            //            menu += HtmlUtils.input(colId, this.notebook.columns, ["size", "3", "id", _this.getDomId(ID_LAYOUT_COLUMNS)]);
            menu += line;

            menu += HtmlUtils.checkbox(_this.getDomId(ID_SHOW_OUTPUT), [], _this.showOutput) + " Output enabled" + "<br>";
            menu += HtmlUtils.checkbox(_this.getDomId(ID_SHOWCONSOLE), [], _this.notebook.showConsole) + " Show console" + "<br>";

            menu += HtmlUtils.checkbox(_this.getDomId(ID_RUNFIRST), [], _this.runFirst) + " Run first" + "<br>";
            menu += HtmlUtils.checkbox(_this.getDomId(ID_RUN_ON_LOAD), [], _this.notebook.runOnLoad) + " Run on load" + "<br>";
            menu += HtmlUtils.div(["title", "Don't show the left side and input for anonymous users"], HtmlUtils.checkbox(_this.getDomId(ID_DISPLAY_MODE), [], _this.notebook.displayMode) + " Display mode" + "<br>");

            menu += line;
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "savewithout"], "Save notebook") + "<br>";
            menu += line;
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "delete"], "Delete") + "<br>";
            menu += HtmlUtils.div(["class", "ramadda-link", "what", "help"], "Help") + "<br>";
            menu = HtmlUtils.div(["class", "display-notebook-menu"], menu);


            var popup = this.getPopup();
            this.dialogShown = true;
            popup.html(HtmlUtils.div(["class", "ramadda-popup-inner"], menu));
            popup.show();
            popup.position({
                of: src,
                my: "left top",
                at: at,
                collision: "fit fit"
            });
            _this.jq(ID_SHOWHEADER_INPUT).focus();

            _this.jq(ID_SHOWCONSOLE).change(function(e) {
                    _this.notebook.showConsole = _this.jq(ID_SHOWCONSOLE).is(':checked');
                    _this.hidePopup();
                    _this.notebook.layoutCells();
                });


            _this.jq(ID_SHOWHEADER_INPUT).change(function(e) {
                _this.showHeader = _this.jq(ID_SHOWHEADER_INPUT).is(':checked');
                _this.applyStyle();
            });


            _this.jq(ID_RUNFIRST).change(function(e) {
                _this.runFirst = _this.jq(ID_RUNFIRST).is(':checked');
            });

            _this.jq(ID_SHOW_OUTPUT).change(function(e) {
                _this.showOutput = _this.jq(ID_SHOW_OUTPUT).is(':checked');
                _this.applyStyle();
            });
            _this.jq(ID_RUN_ON_LOAD).change(function(e) {
                _this.notebook.runOnLoad = _this.jq(ID_RUN_ON_LOAD).is(':checked');
            });
            _this.jq(ID_DISPLAY_MODE).change(function(e) {
                _this.notebook.displayMode = _this.jq(ID_DISPLAY_MODE).is(':checked');
            });
            _this.jq(ID_SHOWEDIT).change(function(e) {
                _this.showInput = _this.jq(ID_SHOWEDIT).is(':checked');
                _this.applyStyle();
            });

            _this.jq(ID_LAYOUT_TYPE).change(function(e) {
                if (_this.jq(ID_LAYOUT_TYPE).is(':checked')) {
                    _this.notebook.layout = "horizontal";
                } else {
                    _this.notebook.layout = "vertical";
                }
                _this.hidePopup();
                _this.notebook.layoutCells();
            });
            _this.jq(ID_LAYOUT_COLUMNS).keypress(function(e) {
                var keyCode = e.keyCode || e.which;
                if (keyCode != 13) {
                    return;
                }
                var cols = parseInt(_this.jq(ID_LAYOUT_COLUMNS).val());
                if (isNaN(cols)) {
                    _this.jq(ID_LAYOUT_COLUMNS).val("bad:" + _this.jq(ID_LAYOUT_COLUMNS).val());
                    return;
                }
                _this.hidePopup();
            });
            _this.jq(ID_CELLNAME_INPUT).keypress(function(e) {
                var keyCode = e.keyCode || e.which;
                if (keyCode == 13) {
                    _this.hidePopup();
                    return;
                }
            });
            popup.find(".ramadda-link").click(function() {
                var what = $(this).attr("what");
                _this.processCommand(what);
            });
        },
        hidePopup: function() {
            var popup = this.getPopup();
            if (popup && this.dialogShown) {
                var cols = parseInt(this.jq(ID_LAYOUT_COLUMNS).val());
                this.cellName = this.jq(ID_CELLNAME_INPUT).val();
                this.jq(ID_CELLNAME).html(this.cellName);
                popup.hide();
                this.applyStyle();

                if (!isNaN(cols) && this.notebook.columns != cols) {
                    this.notebook.columns = cols;
                    this.notebook.layoutCells();
                }
            }
            this.dialogShown = false;
        },
        processCommand: function(command) {
            if (command == "showmenu") {
                this.makeMenu();
                return;
            } else if (command == "toggle") {
                this.showInput = !this.showInput;
                this.applyStyle(true);
            } else if (command == "showthis") {
                this.showInput = true;
                this.applyStyle();
            } else if (command == "hidethis") {
                this.showInput = false;
                this.applyStyle();
            } else if (command == "showall") {
                this.notebook.toggleAll(true);
            } else if (command == "hideall") {
                this.notebook.toggleAll(false);
            } else if (command == "run") {
                this.notebook.runCell(this);
            } else if (command == "runall") {
                this.notebook.runAll();
            } else if (command == "clear") {
                this.clearOutput();
            } else if (command == "clearall") {
                this.notebook.clearOutput();
            } else if (command == "moveup") {
                this.notebook.moveCellUp(this);
            } else if (command == "movedown") {
                this.notebook.moveCellDown(this);
            } else if (command == "newabove") {
                this.notebook.newCellAbove(this);
            } else if (command == "newbelow") {
                this.notebook.newCellBelow(this);
            } else if (command == "savewith") {
                this.notebook.saveNotebook(true);
            } else if (command == "savewithout") {
                this.notebook.saveNotebook(false);
            } else if (command == "help") {
                var win = window.open(ramaddaBaseUrl + "/userguide/notebook.html", '_blank');
                win.focus();
            } else if (command == "delete") {
                this.askDelete();
                return;
            } else {
                console.log("unknown command:" + command);
            }
            this.hidePopup();
        },
        shouldShowInput: function() {
            return this.showInput && this.notebook.showInput();
        },
        applyStyle: function(fromUser) {
            if (this.shouldShowInput()) {
                this.jq(ID_INPUT_TOOLBAR).css("display", "block");
                this.inputContainer.show(400, () => this.editor.resize());
                this.showHeader = true;
            } else {
                this.jq(ID_INPUT_TOOLBAR).css("display", "none");
                this.inputContainer.hide(fromUser ? 200 : 0);
                this.showHeader = false;
            }
            this.showHeader = this.notebook.showInput();
            if (this.showHeader) {
                this.header.css("display", "block");
            } else {
                this.header.css("display", "none");
            }
            if (this.showOutput) {
                this.output.css("display", "block");
            } else {
                this.output.css("display", "none");
            }
        },
        getPopup: function() {
            return this.notebook.getPopup();
        },
        askDelete: function() {
            let _this = this;
            var menu = "";
            menu += "Are you sure you want to delete this cell?<br>";
            menu += HtmlUtils.span(["class", "ramadda-link", "what", "yes"], "Yes");
            menu += HtmlUtils.span(["style", "margin-left:50px;", "class", "ramadda-link", "what", "cancel"], "No");
            var popup = this.getPopup();

            popup.html(HtmlUtils.div(["class", "ramadda-popup-inner"], menu));
            popup.show();
            var src = this.input;
            if (!src.is(":visible")) {
                src = this.output;
            }
            if (!src.is(":visible")) {
                src = this.header;
            }
            popup.position({
                of: src,
                my: "left top",
                at: "left top",
                collision: "fit fit"
            });
            popup.find(".ramadda-link").click(function() {
                var what = $(this).attr("what");
                _this.hidePopup();
                if (what == "yes") {
                    _this.notebook.deleteCell(_this);
                }
            });


        },
        run: async function(callback) {
            if (this.running) return Utils.call(callback, true);
            this.running = true;
            try {
                var ok = true;
                await this.runInner().then(r => ok = r);
                if (!ok) {
                    this.running = false;
                    return Utils.call(callback, false);
                }
                this.outputUpdated();
            } catch (e) {
                this.running = false;
                this.writeOutput("An error occurred:" + e.toString());
                console.log("error:" + e.toString());
                console.log(e.stack);
                return Utils.call(callback, false);
            }
            this.running = false;
            return Utils.call(callback, true);
        },
        prepareToLayout: function() {
            this.content = this.getInputText();
        },
        getInputText: function() {
            if (!this.editor) return this.content;
            return this.editor.getValue();
        },
        runInner: async function() {
            var value = this.getInputText();
            value = value.trim();
            var help = "More information <a target=_help href='" + ramaddaBaseUrl + "/userguide/notebook.html'>here</a>";
            value = value.replace(/{cellname}/g, this.cellName);
            value = value.replace(/{help}/g, help);
            value = this.notebook.convertInput(value);
            var type = "wiki";
            var chunks = [];
            var chunk = "";
            var commands = value.split("\n");
            var ok = true;
            for (var i = 0; i < commands.length; i++) {
                if (!ok) break;
                var command = commands[i];
                var _command = command.trim();
                if (_command.startsWith("//")) continue;
                if (_command.startsWith("%%")) {
                    var rest = _command.substring(2).trim();
                    var newType;
                    var index = rest.indexOf(" ");
                    if (index < 0) {
                        newType = rest;
                        rest = "";
                    } else {
                        newType = rest.substring(0, index).trim();
                        rest = rest.substring(index);
                    }
                    if (chunk != "") {
                        chunks.push({
                            content: chunk,
                            type: type,
                            div: new Div(),
                            ok: true
                        });
                    }
                    chunk = rest;
                    if (chunk != "") chunk += "\n";
                    type = newType;
                    continue;
                }
                chunk = chunk + command + "\n";
            }

            if (chunk != "") {
                chunks.push({
                    content: chunk,
                    type: type,
                    div: new Div(),
                    ok: true
                });
            }


            var result = "";
            for (var i = 0; i < chunks.length; i++) {
                result += chunks[i].div.toString() + "\n";
            }
            this.output.html(result);
            this.rawOutput = "";
            for (var i = 0; i < chunks.length; i++) {
                var chunk = chunks[i];
                await this.processChunk(chunk);
                if (!chunk.ok) {
                    return false;
                }
            }
            Utils.initContent("#" + this.getDomId(ID_OUTPUT));
            return ok;
        },
        writeOutput: function(h) {
            if (!this.output) {
                err = new Error();
                console.log("no output:" + err.stack);
                return;
            }
            this.output.html(h);
            this.outputUpdated();
        },
        outputUpdated: function() {
            this.outputHtml = this.jq(ID_OUTPUT).html();
        },
        getRawOutput: function() {
            return this.rawOutput;
        },
        focus: function() {
            this.input.focus();
        },
        clearOutput: function() {
            this.output.html("");
            this.outputHtml = "";
        },
        processHtml: async function(chunk) {
            this.rawOutput += chunk.content + "\n";
            chunk.div.set(chunk.content);
        },
        processCss: async function(chunk) {
            var css = HtmlUtils.tag("style", ["type", "text/css"], chunk.content);
            this.rawOutput += css + "\n";
            chunk.div.set(css);
        },
       handleError: function(chunk, error,from) {
            chunk.ok = false;
            this.notebook.log(error,"error",from,chunk.div);
        },
        processFetch: async function(chunk) {
            var lines = chunk.content.split("\n");
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line == "") continue;
                var origLine = line;
                var error = null;
                var url;
                var msgExtra ="";
                if (line.startsWith("js:")) {
                    url = line.substring(3).trim();
                    await Utils.importJS(url,
                        () => {},
                                         (jqxhr, settings, exception) => error = "Error fetching " + origLine + " " + exception,true);
                } else if (line.startsWith("css:")) {
                    url = line.substring(4).trim();
                    await Utils.importCSS(url,
                        null,
                                          (jqxhr, settings, exception) => error = "Error fetching " + origLine + " " + exception,true);
                } else if (line.startsWith("html:")) {
                    url = line.substring(5).trim();
                    await Utils.importText(url, h => chunk.div.append(h), (jqxhr, settings, exception) => error = "Error fetching " + origLine + " " + exception);
                } else if (line.startsWith("text:") || line.startsWith("json:")) {
                    line = line.substring(5).trim();
                    var v = null;
                    //check if we have a var
                    var indexEquals = line.indexOf("=");
                    var indexHttp = line.indexOf("http");
                    var indexSlash = line.indexOf("/");
                    if (indexEquals > 0) {
                        var index = indexHttp >= 0 ? indexHttp : indexSlash;
                        //begins with /
                        if (indexSlash >= 0 && indexSlash < indexHttp) index = indexSlash;
                        if (indexEquals < index) {
                            v = line.substring(0, indexEquals).trim();
                            msgExtra = " (var "+ v+")";
                            line = line.substring(indexEquals + 1).trim();
                        }
                    }
                    url = line;
                    var results = null;
                    await Utils.importText(url, h => results = h, (jqxhr, settings, err) => error = "Error fetching " + origLine + " error:" + err?err.toString():"");
                    if (results) {
                        console.log("got results");
                        if(line.startsWith("json:")) {
                            console.log("turning it into json");
                            results = JSON.parse(results);
                        }
                        if (v) {
                            console.log("adding global:" + (typeof results));
                            this.notebook.addGlobal(v, results);
                        } else {
                            if(line.startsWith("json:")) {
                                results = JSON.stringify(results,null,4);
                            }
                            chunk.div.append(HtmlUtils.pre(["style","max-width:100%;overflow-x:auto;"], results));
                        }
                    }
                } else {
                    error =  "Unknown fetch:" + line;
                }
                if (error) {
                    this.handleError(chunk, error,"io");
                    return;
                } else {
                    this.notebook.log("Loaded: " + url +msgExtra,"output","io");
                }
            }
        },
       processMd: async function(chunk) {
        //            await Utils.importJS(ramaddaBaseUrl + "/lib/katex/lib/katex/katex.min.css");
         //            await Utils.importJS(ramaddaBaseUrl + "/lib/katex/lib/katex/katex.min.js");

            this.rawOutput += chunk.content + "\n";
            var o = "";
            var tex = null;
            var lines = chunk.content.split("\n");
            var texs=[];
            for(var i=0;i<lines.length;i++) {
                var line = lines[i];
                var _line = line.trim();
                if(_line.startsWith("$$")) {
                    if(tex!=null) {
                        try {
                        var html = katex.renderToString(tex, {
                                throwOnError: true
                            });
                        o+="tex:"  + texs.length+":\n";
                        texs.push(html);
                        } catch(e) {
                            o+="Error parsing tex:" + e+"<pre>" + tex+"</pre>";
                        }
                        tex = null;
                    }  else {
                        tex = "";
                    }
                } else if(tex!=null) {
                    tex +=line+"\n";
                } else {
                    o+=line +"\n";
                }
            }

            var converter = new showdown.Converter();
            var html = converter.makeHtml(o);
            for(var i=0;i<texs.length;i++) {
                html = html.replace("tex:"  + i+":", texs[i]);
            }
            chunk.div.set(html);
        },
        processPy: async function(chunk) {
            await Utils.importJS(ramaddaBaseUrl + "/lib/skulpt.min.js");
            await Utils.importJS(ramaddaBaseUrl + "/lib/skulpt-stdlib.js");
            var output = "";
            var outf = function(t) {
                if (t.trim() != "") {
                    //                   console.log("Out:" + t.trim()+":");
                    output += t.trim() + "<br>"
                }
            }
            Sk.configure({
                output: outf,
                read: skulptRead
            });
            //            (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = 'mycanvas';
            var myPromise = Sk.misceval.asyncToPromise(function() {
                return Sk.importMainWithBody("<stdin>", false, chunk.content, true);
            });
            myPromise.then(function(mod) {
                    //                    console.log('success');
                },
                function(err) {
                    output += "Error:" + err.toString();
                    console.log(err.toString());
                });
            chunk.div.set(output);
        },
        processWiki: async function(chunk) {
            this.rawOutput += chunk.content + "\n";
            var id = this.notebook.getProperty("entryId", "");
            await this.getCurrentEntry(e => entry = e);
            if (entry) id = entry.getId();
            let _this = this;
            let divId = HtmlUtils.getUniqueId();
            var wikiCallback = function(html) {
                var h = HtmlUtils.div(["id", divId, "style"], html);
                chunk.div.set(h);
            }
            var wiki = "{{group showMenu=false}}\n" + chunk.content;
            await GuiUtils.loadHtml(ramaddaBaseUrl + "/wikify?doImports=false&entryid=" + id + "&text=" + encodeURIComponent(chunk.content),
                wikiCallback);
        },
        processSh: async function(chunk) {
            var r = "";
            var lines = chunk.content.split("\n");
            var commands = [];
            for (var i = 0; i < lines.length; i++) {
                var fullLine = lines[i].trim();
                if (fullLine == "") continue;
                var cmds = fullLine.split(";");
                for (var cmdIdx = 0; cmdIdx < cmds.length; cmdIdx++) {
                    var line = cmds[cmdIdx].trim();
                    if (line == "" || line.startsWith("#") || line.startsWith("//")) continue;
                    var toks = line.split(" ");

                    var command = toks[0].trim();
                    var proc = null;
                    var extra = null;
                    if (this["processCommand_" + command]) {
                        proc = this["processCommand_" + command];
                    } else {
                        proc = this.processCommand_help;
                        extra = "Unknown command: <i>" + command + "</i>";
                    }
                    var div = new Div("");
                    commands.push({
                        proc: proc,
                        line: line,
                        toks: toks,
                        extra: extra,
                        div: div
                    });
                    r += div.set("");
                }
            }
            let _this = this;
            chunk.div.set(r);
            var i = 0;
            for (i = 0; i < commands.length; i++) {
                var cmd = commands[i];
                if (cmd.extra) {
                    cmd.div.append(extra);
                }
                await cmd.proc.call(_this, cmd.line, cmd.toks, cmd.div, cmd.extra);
            }
        },
         processJs: async function(chunk, global) {
            try {
                await this.getCurrentEntry(e => {
                    current = e
                });
                var state = new NotebookState(this, chunk.div);
                notebookStates[state.id] = state;
                var notebookEntries = this.notebook.getCurrentEntries();
                for (name in notebookEntries) {
                    state.entries[name] = notebookEntries[name].entry;
                }
                var jsSet = "";
                state.entries["current"] = current;
                state.entries["parent"] = this.parentEntry;
                state.entries["base"] = this.notebook.getBaseEntry();
                state.entries["root"] = this.notebook.getRootEntry();

                var stateJS = "notebookStates['" + state.id + "']";
                var topLines = 0;
                topLines++;
                jsSet += "state= " + stateJS + ";\n";
                for (name in state.entries) {
                    var e = state.entries[name];
                    topLines++;
                    jsSet += name + "= state.entries['" + name + "'];\n"
                }
                for (name in this.notebook.globals) {
                    topLines++;
                    jsSet += name + "= state.getNotebook().globals['" + name + "'];\n";
                }
                nbCell = this;
                nbNotebook = this.notebook;
                var js = chunk.content.trim();
                var lines = js.split("\n");
                if(!global) {
                if (lines.length == 1 && !js.startsWith("return ") && !js.startsWith("{")) {
                    js = "return " + js;
                }
                if (lines.length > 1 || js.startsWith("return ") || js.startsWith("{")) {
                    js = "async function nbFunc() {\n" + jsSet + "\n" + js + "\n}";
                }
                eval(js);
                await nbFunc().then(r => {
                    state.result = r;
                });
                } else {
                    state.result = eval(js);
                    console.log("r: "+state.result);

                }
                if (state.getStop()) {
                    chunk.ok = false;
                }
                var html = "";
                if (Utils.stringDefined(state.prefix)) html += state.prefix;
                if (state.result) {
                    var type = typeof state.result;
                    if(type !="object" && type!="function") {
                        html += state.result;
                        this.rawOutput += html + "\n";
                    } else {
                        //                        this.outputObject = state.result;
                    }
                }
                chunk.div.append(html);
            } catch (e) {
                chunk.ok = false;
                var lines = chunk.content.split("\n");
                var line = lines[e.lineNumber - topLines-3];
                this.notebook.log("Error: " + e.message + "<br>&gt;" +(line?line:""),"error","js",chunk.div);
            }
            notebookStates[state.id] = null;
        },
        processChunk: async function(chunk) {
            for (name in this.notebook.globals) {
                chunk.content = chunk.content.replace("${" + name + "}", this.notebook.globals[name]);
            }
            if (chunk.type == "html") {
                await this.processHtml(chunk);
            } else if (chunk.type == "wiki") {
                await this.processWiki(chunk);
            } else if (chunk.type == "css") {
                await this.processCss(chunk);
            } else if (chunk.type == "fetch") {
                await this.processFetch(chunk);
            } else if (chunk.type == "raw") {
                this.rawOutput += chunk.content + "\n";
            } else if (chunk.type == "js") {
                await this.processJs(chunk);
            } else if (chunk.type == "jsglobal") {
                await this.processJs(chunk,true);
            } else if (chunk.type == "sh") {
                await this.processSh(chunk);
            } else if (chunk.type == "md") {
                await this.processMd(chunk);
            } else if (chunk.type == "py") {
                await this.processPy(chunk);
            } else {
                chunk.div.set("Unknown type:" + chunk.type);
            }
        },



        calculateInputHeight: function() {
            this.content = this.getInputText();
            if (!this.content) return;
            var lines = this.content.split("\n");
            if (lines.length != this.inputRows) {
                this.inputRows = lines.length;
                this.input.attr("rows", Math.max(1, this.inputRows));
            }
        },

        writeStatusMessage: function(v) {
            var msg = this.jq(ID_MESSAGE);
            if (!v) {
                msg.hide();
                msg.html("");
            } else {
                msg.show();
                msg.position({
                    of: this.getOutput(),
                    my: "left top",
                    at: "left+4 top+4",
                    collision: "none none"
                });
                msg.html(v);
            }
        },
        handleControlKey: function(event) {
            var k = event.which;
        },
        getOutput: function() {
            return this.jq(ID_OUTPUT);
        },
        getInput: function() {
            return this.jq(ID_INPUT);
        },
        writeResult: function(html) {
            this.writeStatusMessage(null);
            html = HtmlUtils.div([ATTR_CLASS, "display-notebook-result"], html);
            var output = this.jq(ID_OUTPUT);
            output.append(html);
            output.animate({
                scrollTop: output.prop("scrollHeight")
            }, 1000);
            this.currentOutput = output.html();
            this.currentInput = this.getInputText();
        },
        writeError: function(msg) {
            this.writeStatusMessage(msg);
            //                this.writeResult(msg);
        },
        header: function(msg) {
            return HtmlUtils.div([ATTR_CLASS, "display-notebook-header"], msg);
        },
        processCommand_help: function(line, toks, div, callback, prefix) {
            if (div == null) div = new Div();
            var help = "";
            if (prefix != null) help += prefix;
            help += "<pre>pwd, ls, cd</pre>";
            return div.append(help);
        },
        entries: {},

        selectEntry: function(entryId) {
            var cnt = 1;
            var entries = this.notebook.getCurrentEntries();
            while (entries["entry" + cnt]) {
                cnt++;
            }
            var id = prompt("Set an ID", "entry" + cnt);
            if (id == null || id.trim() == "") return;
            this.notebook.addEntry(id, entryId);
        },
        setId: function(entryId) {
            var cursor = this.editor.getCursorPosition();
            this.editor.insert(entryId);
            //            this.editor.selection.moveTo(cursor.row, cursor.column);
            //            this.editor.focus();
        },
        cdEntry: function(entryId) {
            var div = new Div("");
            this.currentEntry = this.entries[entryId];
            notebookState.entries["current"] = this.currentEntry;
            this.output.html(div.toString());
            this.processCommand_pwd("pwd", [], div);
            this.outputUpdated();
        },
        addToToolbar: function(id, entry, toolbarItems) {
            var call = "getHandler('" + id + "').setId('" + entry.getId() + "')";
            var icon = HtmlUtils.image(ramaddaBaseUrl + "/icons/setid.png", ["border", 0, ATTR_TITLE, "Set ID in Input"]);
            toolbarItems.unshift(HtmlUtils.tag(TAG_A, ["onclick", call], icon));
            var call = "getHandler('" + id + "').selectEntry('" + entry.getId() + "')";
            var icon = HtmlUtils.image(ramaddaBaseUrl + "/icons/circle-check.png", ["border", 0, ATTR_TITLE, "Select Entry"]);
            toolbarItems.unshift(HtmlUtils.tag(TAG_A, ["onclick", call], icon));
        },
        getEntryPrefix: function(id, entry) {
            this.entries[entry.getId()] = entry;
            var call = "getHandler('" + id + "').cdEntry('" + entry.getId() + "')";
            return HtmlUtils.div(["style", "padding-right:4px;", "title", "cd to entry", "onclick", call, "class", "ramadda-link"], HtmlUtils.image(ramaddaBaseUrl + "/icons/go.png"));
        },
        displayEntries: function(entries, div) {
            if (div == null) div = new Div();
            this.currentEntries = entries;
            if (entries == null || entries.length == 0) {
                return div.msg("No children");
            }
            var handlerId = addHandler(this);
            var html = this.notebook.getEntriesTree(entries, {
                handlerId: handlerId,
                showIndex: false,
                suffix: "_shell_" + (this.uniqueCnt++)
            });
            div.set(HtmlUtils.div(["style", "max-height:200px;overflow-y:auto;"], html));
            this.outputUpdated();
        },
        getEntryFromArgs: function(args, dflt) {
            var currentEntries = this.currentEntries;
            if (currentEntries == null) {
                return dflt;
            }
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg.match("^\d+$")) {
                    var index = parseInt(arg);
                    break;
                }
                if (arg == "-entry") {
                    i++;
                    var index = parseInt(args[i]) - 1;
                    if (index < 0 || index >= currentEntries) {
                        this.writeError("Bad entry index:" + index + " should be between 1 and " + currentEntries.length);
                        return;
                    }
                    return currentEntries[index];
                }
            }
            return dflt;
        },
        setCurrentEntry: async function(entry) {
            this.currentEntry = entry;
            this.parentEntry = null;
            if (this.currentEntry)
                await this.currentEntry.getParentEntry(entry => {
                    this.parentEntry = entry;
                });
        },
        getCurrentEntry: async function(callback) {
            if (this.currentEntry == null) {
                await this.setCurrentEntry(this.notebook.getBaseEntry());
            }
            if (this.currentEntry == null) {
                if (Utils.isDefined(dflt)) return dflt;
                this.rootEntry = new Entry({
                    id: ramaddaBaseEntry,
                    name: "Root",
                    type: "group"
                });
                this.currentEntry = this.rootEntry;
            }
            return Utils.call(callback, this.currentEntry);
        },
        createDisplay: async function(state, entry, displayType, displayProps) {
            if (!entry) await this.getCurrentEntry(e => entry = e);
            if ((typeof entry) == "string") {
                await this.notebook.getEntry(entry, e => entry = e);
            }

            if (!state.displayManager) {
                var divId = HtmlUtils.getUniqueId();
                state.div.append(HtmlUtils.div(["id", divId], ""));
                state.displayManager = new DisplayManager(divId, {
                    "showMap": false,
                    "showMenu": false,
                    "showTitle": false,
                    "layoutType": "table",
                    "layoutColumns": 1,
                    "defaultMapLayer": "osm",
                    "entryId": ""
                });
            }

            var divId = HtmlUtils.getUniqueId();
            state.div.append(HtmlUtils.div(["id", divId], "DIV"));
            var props = {
                layoutHere: true,
                divid: divId,
                showMenu: true,
                sourceEntry: entry,
                entryId: entry.getId(),
                showTitle: true,
                showDetails: true,
                title: entry.getName(),
            };

            if (displayProps) {
                $.extend(props, displayProps);
            }
            if (!props.data && displayType != DISPLAY_ENTRYLIST) {
                var jsonUrl = this.notebook.getPointUrl(entry);
                if (jsonUrl == null) {
                    this.writeError("Not a point type:" + entry.getName());
                    return;
                }
                if (jsonUrl == null) {
                    jsonUrl = this.getPointUrl(entry);
                }
                var pointDataProps = {
                    entry: entry,
                    entryId: entry.getId()
                };
                props.data = new PointData(entry.getName(), null, null, jsonUrl, pointDataProps);
            }
            state.displayManager.createDisplay(displayType, props);
        },
        createPointDisplay: async function(toks, displayType) {
            await this.getCurrentEntry(e => current = e);
            var entry = this.getEntryFromArgs(toks, currentEntry);
            var jsonUrl = this.notebook.getPointUrl(entry);
            if (jsonUrl == null) {
                this.writeError("Not a point type:" + entry.getName());
                return;
            }
            this.notebook.createDisplay(entry.getId(), displayType, jsonUrl);
        },
        processCommand_table: function(line, toks) {
            this.createPointDisplay(toks, DISPLAY_TABLE);
        },
        processCommand_linechart: function(line, toks) {
            this.createPointDisplay(toks, DISPLAY_LINECHART);
        },

        processCommand_barchart: function(line, toks) {
            this.createPointDisplay(toks, DISPLAY_BARCHART);
        },
        processCommand_bartable: function(line, toks) {
            this.createPointDisplay(toks, DISPLAY_BARTABLE);
        },
        processCommand_hello: function(line, toks) {
            this.writeResult("Hello, how are you?");
        },
        processCommand_scatterplot: function(line, toks) {
            this.createPointDisplay(toks, DISPLAY_SCATTERPLOT)
        },
        processCommand_blog: function(line, toks) {
            this.getLayoutManager().publish('blogentry');
        },
        getEntryHeading: function(entry, div) {
            var entries = [entry];
            var handlerId = addHandler(this);
            var html = this.notebook.getEntriesTree(entries, {
                handlerId: handlerId,
                showIndex: false,
                suffix: "_shell_" + (this.uniqueCnt++)
            });
            div.set(HtmlUtils.div(["style", "max-height:200px;overflow-y:auto;"], html));
            return div;
            //            var icon = entry.getIconImage([ATTR_TITLE, "View entry"]);
            //            return "&gt; "+ icon +" " +entry.getName();
        },
        processCommand_pwd: async function(line, toks, div) {
            if (div == null) div = new Div();
            await this.getCurrentEntry(e => entry = e);
            return this.getEntryHeading(entry, div);
        },
        processCommand_set: async function(line, toks, div) {
            if (div == null) div = new Div();
            if (toks.length < 2) {
                div.append("Error: usage: set &lt;name&gt; &lt;value&gt;");
                return;
            }
            var name = toks[1];
            if (toks.length == 2) {
                var v = this.notebook.globals[name];
                if (v) {
                    div.append(v);
                } else {
                    div.append("Unknown: " + name);
                }
            } else {
                var v = Utils.join(toks, " ", 2);
                v = v.replace(/\"/g, "");
                this.notebook.addGlobal(name, v);
            }
        },
        processCommand_clearEntries: function(line, toks, div) {
            this.notebook.clearEntries();
            div.set("Entries cleared");
        },
        processCommand_printEntries: async function(line, toks, div) {
            var h = "";
            await this.getCurrentEntry(e => current = e);
            h += "current" + "=" + current.getName() + "<br>";
            var entries = this.notebook.getCurrentEntries();
            for (var name in entries) {
                var e = entries[name];
                h += name + "=" + e.entry.getName() + "<br>";
            }
            if (h == "") h = "No entries";
            div.set(h);
        },
        processCommand_echo: async function(line, toks, div) {
            line = line.replace(/^echo */, "");
            div.set(line);
        },
        processCommand_print: async function(line, toks, div) {
            line = line.replace(/^print */, "");
            div.set(line);
        },

        processCommand_info: async function(line, toks, div) {
            await this.getCurrentEntry(e => entry = e);
            div.append("current:" + entry.getName() + " id:" + entry.getId() + "<br>");
        },
        processCommand_cd: async function(line, toks, div) {
            if (div == null) div = new Div();
            if (toks.length <= 1) {
                await this.setCurrentEntry(this.notebook.getBaseEntry());
                return;
                //                return this.getEntryHeading(this.currentEntry, div);
            }
            var arg = Utils.join(toks, " ", 1).trim();
            if (arg.startsWith("/")) {
                await this.getCurrentEntry(e => entry = e);
                var root;
                await entry.getRoot(e => {
                    root = e
                });
                this.setCurrentEntry(root);
            }
            var dirs = arg.split("/");
            await this.getCurrentEntry(e => entry = e);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                if (dir == "") continue;
                if (dir == "..") {
                    if (!this.parentEntry) {
                        div.msg("No parent entry");
                        break;
                    }
                    await this.setCurrentEntry(this.parentEntry);
                } else {
                    await this.currentEntry.getChildrenEntries(c => children = c);
                    var child = null;
                    var startsWith = false;
                    var endsWith = false;
                    if (dir.endsWith("*")) {
                        dir = dir.substring(0, dir.length - 1);
                        startsWith = true;
                    }
                    if (dir.startsWith("*")) {
                        dir = dir.substring(1);
                        endsWith = true;
                    }
                    for (var childIdx = 0; childIdx < children.length; childIdx++) {
                        var name = children[childIdx].getName();
                        if (startsWith && endsWith) {
                            if (name.includes(dir)) {
                                child = children[childIdx];
                                break;
                            }
                        } else if (startsWith) {
                            if (name.startsWith(dir)) {
                                child = children[childIdx];
                                break;
                            }
                        } else if (endsWith) {
                            if (name.endsWith(dir)) {
                                child = children[childIdx];
                                break;
                            }
                        }
                        if (children[childIdx].getName() == dir) {
                            child = children[childIdx];
                            break;
                        }
                    }
                    if (!child) {
                        div.msg("No entry:" + dir);
                        break;
                    }
                    await this.setCurrentEntry(child);
                }
            }
        },
        processCommand_ls: async function(line, toks, div) {
            if (div == null) div = new Div();
            div.set("Listing entries...");
            await this.getCurrentEntry(e => entry = e);
            await entry.getChildrenEntries(children => {
                this.displayEntries(children, div)
            }, "");
        },
        entryListChanged: function(entryList) {
            var entries = entryList.getEntries();
            if (entries.length == 0) {
                this.writeStatusMessage("Sorry, nothing found");
            } else {
                this.displayEntries(entries);
            }
        },
        processCommand_search: function(line, toks, div) {
            var text = "";
            for (var i = 1; i < toks.length; i++) text += toks[i] + " ";
            text = text.trim();
            var searchSettings = new EntrySearchSettings({
                text: text,
            });
            var repository = this.getRamadda();
            this.writeStatusMessage("Searching...");
            var jsonUrl = repository.getSearchUrl(searchSettings, OUTPUT_JSON);
            this.entryList = new EntryList(repository, jsonUrl, this, true);
            //                this.writeResult(line);
        },
        processCommand_clear: function(line, toks, div) {
            this.clearOutput();
        },
        processCommand_save: function(line, toks, div) {
            this.notebook.saveNotebook();
        },

    });

}