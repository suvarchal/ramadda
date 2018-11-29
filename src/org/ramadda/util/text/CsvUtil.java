/*
* Copyright (c) 2008-2018 Geode Systems LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
* 
*     http://www.apache.org/licenses/LICENSE-2.0
* 
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

package org.ramadda.util.text;


import org.ramadda.util.Utils;

import ucar.unidata.util.IOUtil;
import ucar.unidata.util.Misc;
import ucar.unidata.util.StringUtil;


import ucar.unidata.xml.XmlUtil;

import java.io.*;

import java.text.DateFormat;

import java.text.DecimalFormat;
import java.text.SimpleDateFormat;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;

import java.util.regex.*;


/**
 *
 * @author Jeff McWhirter
 */

public class CsvUtil {


    /** a hack for debugging */
    private String theLine;

    /** _more_ */
    private List<String> args;

    /** _more_ */
    private OutputStream outputStream = System.out;

    /** _more_ */
    private File destDir = new File(".");

    /** _more_ */
    private TextReader textReader;

    /** _more_ */
    private File outputFile;

    /** _more_ */
    private boolean installPlugin = false;

    private boolean nukeDb = false;

    private Processor.DbXml dbXml;

    /** _more_ */
    private boolean okToRun = true;

    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception _more_
     */
    public CsvUtil(String[] args) throws Exception {
        this.args = new ArrayList<String>();
        for (String arg : args) {
            this.args.add(arg);
        }
    }


    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception _more_
     */
    public CsvUtil(List<String> args) throws Exception {
        this.args = args;
    }

    /**
     * _more_
     *
     * @param args _more_
     * @param destDir _more_
     *
     * @throws Exception _more_
     */
    public CsvUtil(List<String> args, File destDir) throws Exception {
        this(args);
        this.destDir = destDir;
    }


    /**
     * _more_
     *
     * @param args _more_
     * @param out _more_
     * @param destDir _more_
     *
     * @throws Exception _more_
     */
    public CsvUtil(List<String> args, OutputStream out, File destDir)
            throws Exception {
        this(args, destDir);
        this.outputStream = out;
    }


    /**
     * _more_
     *
     * @return _more_
     */
    public boolean getOkToRun() {
        return okToRun;
    }

    /**
     * _more_
     */
    public void stopRunning() {
        okToRun = false;
        if (textReader != null) {
            textReader.stopRunning();
        }
    }


    /**
     * Set the DestDir property.
     *
     * @param value The new value for DestDir
     */
    public void setDestDir(File value) {
        destDir = value;
    }

    /**
     * Get the DestDir property.
     *
     * @return The DestDir
     */
    public File getDestDir() {
        destDir.mkdir();
        return destDir;
    }

    /**
     * _more_
     *
     * @param file _more_
     */
    public void setOutputFile(File file) {
        this.outputFile = file;
        if (file != null) {
            this.outputStream = null;
        }
    }

    /**
     * _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public OutputStream getOutputStream() throws Exception {
        if (this.outputStream == null) {
            this.outputStream = new FileOutputStream(this.outputFile);
        }

        return this.outputStream;
    }

    /**
     * _more_
     *
     * @param out _more_
     */
    public void setOutputStream(OutputStream out) {
        this.outputStream = out;
    }

    /**
     * _more_
     *
     * @param files _more_
     *
     * @throws Exception _more_
     */
    public void run(List<String> files) throws Exception {

        if (files == null) {
            files = new ArrayList<String>();
        }
        for (String arg : args) {
            //            System.err.println("arg:" + arg);
        }
        boolean   doConcat = false;
        boolean   doHeader = false;
        boolean   doRaw    = false;
        Hashtable dbProps  = new Hashtable<String, String>();

        //        boolean      doPoint       = true;
        boolean      doPoint       = false;

        String       iterateColumn = null;
        List<String> iterateValues = new ArrayList<String>();

        String       prepend       = null;
        //        System.err.println("file:" + outputFile +" out:" + outputStream + " " + System.out);
        textReader = new TextReader(destDir, outputFile, outputStream);

        List<String> extra = new ArrayList<String>();
        for (int i = 0; i < args.size(); i++) {
            String arg = args.get(i);

            if (arg.equals("-help")) {
                usage("");

                return;
            }

            if (arg.equals("-concat")) {
                doConcat = true;

                continue;
            }



            if (arg.equals("-header")) {
                doHeader = true;

                continue;
            }


            if (arg.equals("-raw")) {
                doRaw = true;


                continue;
            }

            if (arg.equals("-pointheader")) {
                doHeader = true;
                doPoint  = true;

                continue;
            }

            if (arg.startsWith("-iter")) {
                iterateColumn = args.get(++i);
                iterateValues = StringUtil.split(args.get(++i), ",");

                continue;
            }
            extra.add(arg);
        }

        parseArgs(extra, textReader, files);

        if (doConcat) {
            concat(files, getOutputStream());
        } else if (doHeader) {
            //            System.err.println("files:" + files + " os:" + outputStream.getClass());
            header(files, textReader, doPoint);
        } else if (doRaw) {
            raw(files, textReader);
        } else {
            if (files.size() == 0) {
                files.add("stdin");
            }

            Filter.PatternFilter iteratePattern = null;
            if (iterateColumn == null) {
                iterateValues.add("dummy");
            } else {
                iteratePattern = new Filter.PatternFilter(iterateColumn, "");
                textReader.getFilter().addFilter(iteratePattern);
            }


            for (int i = 0; i < iterateValues.size(); i++) {
                String pattern = iterateValues.get(i);
                if (iteratePattern != null) {
                    iteratePattern.setPattern(pattern);
                }
                for (String file : files) {
                    textReader.getProcessor().reset();
                    InputStream is;
                    if (file.equals("stdin")) {
                        is = System.in;
                    } else {
                        is = new BufferedInputStream(
                            new FileInputStream(file));
                    }
                    process(textReader.cloneMe(is, file, outputFile,
                            outputStream));
                }
            }
        }


    }


    /**
     * Merge each row in the given files out. e.g., if file1 has
     *  1,2,3
     *  4,5,6
     * and file2 has
     * 8,9,10
     * 11,12,13
     * the result would be
     * 1,2,3,8,9,10
     * 4,5,6,11,12,13
     * Gotta figure out how to handle different numbers of rows
     *
     * @param files files
     * @param out output
     *
     * @throws Exception On badness
     */
    public void concat(List<String> files, OutputStream out)
            throws Exception {
        PrintWriter          writer    = new PrintWriter(out);
        String               delimiter = ",";
        List<BufferedReader> readers   = new ArrayList<BufferedReader>();
        for (String file : files) {
            readers.add(
                new BufferedReader(
                    new InputStreamReader(new FileInputStream(file))));
        }
        while (true) {
            int nullCnt = 0;
            for (int i = 0; i < readers.size(); i++) {
                BufferedReader br   = readers.get(i);
                String         line = br.readLine();
                if (line == null) {
                    nullCnt++;

                    continue;
                }
                if (i > 0) {
                    writer.print(delimiter);
                }
                writer.print(line);
                writer.flush();
            }
            if (nullCnt == readers.size()) {
                break;
            }
            writer.println("");
        }

    }


    /**
     * _more_
     *
     * @return _more_
     */
    public List<String> getNewFiles() {
        return textReader.getFiles();
    }

    /**
     * _more_
     *
     * @param files _more_
     * @param out _more_
     * @param info _more_
     * @param asPoint _more_
     *
     * @throws Exception _more_
     */
    public void header(List<String> files, TextReader info, boolean asPoint)
            throws Exception {
        PrintWriter writer    = info.getWriter();
        String      delimiter = info.getDelimiter();
        if (delimiter == null) {
            delimiter = ",";
        }
        List<BufferedReader> readers = new ArrayList<BufferedReader>();
        for (String file : files) {
            readers.add(
                new BufferedReader(
                    new InputStreamReader(new FileInputStream(file))));
        }
        for (BufferedReader br : readers) {
            String line = new TextReader(br).readLine();
            if (line == null) {
                continue;
            }
            List<String> cols = Utils.tokenizeColumns(line, delimiter);
            if (asPoint) {
                writer.println("skiplines=1");
                writer.print("fields=");
            }
            for (int i = 0; i < cols.size(); i++) {
                String col = cols.get(i).trim();
                col = col.replaceAll("\n", " ");
                if (asPoint) {
                    if (i > 0) {
                        writer.print(", ");
                    }
                    String label =
                        Utils.makeLabel(col.replaceAll("\\([^\\)]+\\)", ""));
                    String unit = StringUtil.findPattern(col,
                                      ".*?\\(([^\\)]+)\\).*");
                    //                    System.err.println ("COL:" + col +" unit: " + unit);
                    StringBuffer attrs = new StringBuffer();
                    attrs.append("label=\"" + label + "\" ");
                    if (unit != null) {
                        attrs.append("unit=\"" + unit + "\" ");

                    }
                    String id = label.replaceAll(
                                    "\\([^\\)]+\\)", "").replaceAll(
                                    "-", "_").trim().toLowerCase().replaceAll(
                                    " ", "_").replaceAll(":", "_");
                    id = id.replaceAll("/+", "_");
                    id = id.replaceAll("\\.", "_");
                    id = id.replaceAll("_+_", "_");
                    id = id.replaceAll("_+$", "");
                    id = id.replaceAll("^_+", "");
                    if (id.indexOf("date") >= 0) {
                        attrs.append("type=\"date\" format=\"\" ");
                    }

                    writer.print(id + "[" + attrs + "] ");
                } else {
                    writer.println("#" + i + " " + col);
                }
            }
            if (asPoint) {
                writer.println("");
            }
        }
        writer.flush();
        writer.close();
    }
    //            System.err.println("files:" + files + " os:" + outputStream.getClass());


    /**
     *     _more_
     *
     *     @param files _more_
     *     @param out _more_
     *     @param info _more_
     *     @param asPoint _more_
     *
     *     @throws Exception _more_
     */
    public void raw(List<String> files, TextReader info) throws Exception {
        int         numLines = info.getMaxRows();
        PrintWriter writer   = info.getWriter();
        String      prepend  = info.getPrepend();
        for (String file : files) {
            int                  lineCnt = 0;
            List<BufferedReader> readers = new ArrayList<BufferedReader>();
            if (info.getPrepend() != null) {
                readers.add(
                    new BufferedReader(
                        new InputStreamReader(
                            new ByteArrayInputStream(
                                info.getPrepend().getBytes()))));
            }

            readers.add(
                new BufferedReader(
                    new InputStreamReader(new FileInputStream(file))));
            for (BufferedReader br : readers) {
                while (lineCnt < numLines) {
                    String line = br.readLine();
                    if (line == null) {
                        break;
                    }
                    writer.println(line);
                    lineCnt++;
                }
                br.close();
            }

        }
        writer.flush();
        writer.close();
    }






    /**
     * _more_
     *
     * @param props _more_
     * @param colId _more_
     * @param prop _more_
     * @param dflt _more_
     *
     * @return _more_
     */
    public static String getDbProp(Hashtable<String, String> props,
                                   String colId, String prop, String dflt) {
        String value = props.get("-" + colId + "." + prop);
        if (value == null) {
            value = props.get(colId + "." + prop);
        }
        if (value != null) {
            return value;
        }

        return dflt;
    }


    public static boolean getDbProp(Hashtable<String, String> props,
                                   String colId, String prop, boolean dflt) {
        String value = getDbProp(props, colId, prop, (String)null);
        if (value == null) {
            return dflt;
        }
        return value.equals("true");
    }









    /**
     * Run through the csv file in the TextReader
     *
     * @param textReader Holds input, output, skip, delimiter, etc
     *
     * @throws Exception On badness
     */
    public void process(TextReader textReader) throws Exception {
        int rowIdx      = 0;
        int visitedRows = 0;
        int cnt         = 0;
        while (okToRun) {
            String line = textReader.readLine();
            if (line == null) {
                break;
            }

            //            System.out.println("line:" +line);
            if (line.length() > 1000) {
                //                System.err.println("Whoa:" +line);
            }
            theLine = line;
            rowIdx++;


            if (rowIdx <= textReader.getSkip()) {
                System.err.println("CsvUtil.skipping header");
                textReader.addHeaderLine(line);

                continue;
            }

            if ((textReader.getFilter() != null)
                    && !textReader.getFilter().lineOk(textReader, line)) {
                //                System.err.println("CsvUtil.filter not ok");
                continue;
            }

            if (textReader.getDelimiter() == null) {

                String delimiter = ",";
                //Check for the bad separator
                int i1 = line.indexOf(",");
                int i2 = line.indexOf("|");
                if ((i2 >= 0) && ((i1 < 0) || (i2 < i1))) {
                    delimiter = "|";
                }
                //                System.err.println("CsvUtil.delimiter is null new one is:" + delimiter);
                textReader.setDelimiter(delimiter);
            }


            Row row = new Row(line, textReader.getDelimiter());
            if ((textReader.getFilter() != null)
                    && !textReader.getFilter().rowOk(textReader, row)) {
                //                System.err.println("CsvUtil.row not ok");
                continue;
            }

            if (visitedRows == 0) {
                textReader.setHeader(row.getValues());
            }

            visitedRows++;
            if ((textReader.getMaxRows() >= 0)
                    && (visitedRows > textReader.getMaxRows())) {
                //                System.err.println("CsvUtil.maxed out");
                break;
            }

            if (textReader.getProcessor() != null) {
                //                System.err.println("CsvUtil.calling processor");
                row = textReader.getProcessor().processRow(textReader, row,
                        line);
            } else {
                System.err.println("CsvUtil.calling writing ***** ");
                textReader.getWriter().println(
                    columnsToString(
                        row.getValues(), textReader.getOutputDelimiter()));
                textReader.getWriter().flush();
            }

            textReader.incrRow();
        }

        if (okToRun) {
            if (textReader.getProcessor() != null) {
                textReader.getProcessor().finish(textReader, null);
            }
        }
        textReader.flush();
    }


    /** _more_ */
    static int xcnt = 0;


    /**
     * _more_
     *
     * @param cols _more_
     * @param delimiter _more_
     *
     * @return _more_
     */
    public static String columnsToString(List cols, String delimiter) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < cols.size(); i++) {
            String s = cols.get(i).toString();
            if (i > 0) {
                sb.append(delimiter);
            }
            boolean needToQuote = false;
            if (s.indexOf("\n") >= 0) {
                needToQuote = true;
            } else if (s.indexOf(delimiter) >= 0) {
                needToQuote = true;
            }

            if (s.indexOf("\"") >= 0) {
                s           = s.replaceAll("\"", "\"\"");
                needToQuote = true;
            }

            if (needToQuote) {
                sb.append('"');
                sb.append(s);
                sb.append('"');
            } else {
                sb.append(s);
            }
        }

        return sb.toString();

    }


    public static String cleanColumnValue(String s) {
        return cleanColumnValue(s,",");
    }

    public static String cleanColumnValue(String s, String delimiter) {
        boolean needToQuote = false;
        if (s.indexOf("\n") >= 0) {
            needToQuote = true;
        } else if (s.indexOf(delimiter) >= 0) {
            needToQuote = true;
        }
        
        if (s.indexOf("\"") >= 0) {
            s           = s.replaceAll("\"", "\"\"");
            needToQuote = true;
        }

        if (needToQuote) {
            return '"' + s +'"';
        } 
        return s;
    }


    /**
     * _more_
     *
     * @param msg _more_
     *
     * @throws Exception _more_
     */
    public void usage(String msg) throws Exception {
        PrintWriter pw = new PrintWriter(getOutputStream());
        if (msg.length() > 0) {
            pw.println(msg);
        }
        pw.println(
            "CsvUtil"
            + "\n\t-columns <comma separated list of columns #s. 0-based>"
            + "\n\t-pattern <col #> <regexp pattern>\n\t\"<column=~<value>\" pattern search"
            + "\n\t<-gt|-ge|-lt|-le> <col #> <value>\n\t-skip <how many lines to skip>"
            + "\n\t-cut <one or more rows. -1 to the end>"
            + "\n\t-include <start row> <end row (-1 for end)>"
            + "\n\t-explode <col #>   make separate files based on value of column"
            + "\n\t-unfurl <col to get new column header#> <col with value> <unique col>  <other columns>   unfurl"
            + "\n\t-decimate <skip factor>   only include every <skip factor> row"
            + "\n\t-copy <col #> <name>"
            + "\n\t-delete <col #>" + "\n\t-add <col #> <value>"
            + "\n\t-insert <col #> <comma separated values> "
            + "\n\t-case <lower|upper|camel> <col #> "
            + "\n\t-addcell <row #>  <col #>  <value> "
            + "\n\t-deletecell <row #> <col #>  "
            + "\n\t-setwrite <col #s> <row #s> <value> write the value into the cell"
            + "\n\t-tolower <col #> "
            + "\n\t-prepend  <text> add the text to the beginning of the file. use _nl_ to insert newlines"
            + "\n\t-pad <col #> <pad string> pad out or cut columns to achieve the count"
            + "\n\t-change <col #> <pattern> <substitution string>"
            + "\n\t-map <col #> \"new columns name\" \"value newvalue ...\" change values in column to new values"
            + "\n\t-combine \"col #s\" <delimiter> <new column name> (combine columns with the delimiter. deleting columns)"
            + "\n\t-combineinplace \"col #s\" <delimiter> <new column name> (combine columns with the delimiter.)"
            + "\n\t-new \"col #s\"  <delimiter> (create a new column from the given columns)"
            + "\n\t-operator \"col #s\"  \"new col name\" operator (apply the operator (+,-,*,/) to the given columns and create new one)"
            + "\n\t-format <decimal format, e.g. '#'>\n\t-unique <columns> (pass through unique values)"
            + "\n\t-percent <columns to add>"
            + "\n\t-geocode <col idx> <csv file> <name idx> <lat idx> <lon idx>"
            + "\n\t-geocodeaddress <col indices> <suffix> "
            + "\n\t-denormalize <col idx>  <csv file>  read the id,value from file and substitute the value in the dest file col idx"
            + "\n\t-count (show count)" + "\n\t-maxrows <max rows to print>"
            + "\n\t-skipline <pattern> (skip any line that matches the pattern)"
            + "\n\t-changeline <from> <to> (change the line))"
            + "\n\t-prune <number of leading bytes to remove>"
            + "\n\t-strict (be strict on columns. any rows that are not the size of the other rows are dropped)"
            + "\n\t-flag (be strict on columns. any rows that are not the size of the other rows are shown)"
            + "\n\t-delimiter (specify an alternative delimiter)"
            + "\n\t-print (print to stdout)"
            + "\n\t-raw (print the file raw)" + "\n\t-record (print records)"
            + "\n\t-rotate" + "\n\t-flip"
            + "\n\t-concat\n\t*.csv - one or more csv files"
            + "\n\t-header (print the first line)"
            + "\n\t-pointheader (generate the RAMADDA point properties)"
            + "\n\t-addheader (add the RAMADDA point properties)"
            + "\n\t-db <props> (generate the RAMADDA db xml from the header)"
            + "\n\tdb props are a set of name value pairs:"
            + "\n\t\ttable.id new_id table.name new_name table.cansearch <true|false> (dflt can search) table.canlist <true|false> (dflt can list) <column name>.type <string|enumeration|double|int|date> <column name>.format <yyyy mm dd format for dates> "
            + "\n\t\t<column name>.id <new id for column> <column name>.label <new label> "
            + "\n\t\t<column name>.canlist <true|false> <column name>.cansearch <true|false> "
            + "\n\t\t-install <true|false> (install the new db table) -nukedb <true|false> (delete any prior created dbs>"
            + "\n\t-run <name of process directory>");
        pw.flush();
    }

    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception On badness
     */
    public static void main(String[] args) throws Exception {
        CsvUtil csvUtil = new CsvUtil(args);
        csvUtil.run(null);
        System.exit(0);
    }





    /**
     * _more_
     *
     * @param args _more_
     * @param info _more_
     * @param files _more_
     *
     * @throws Exception _more_
     */
    public void parseArgs(List<String> args, TextReader info,
                          List<String> files)
            throws Exception {


        //        System.err.println("ARGS:" + args);
        boolean            addFiles      = files.size() == 0;
        boolean            trim          = false;
        boolean            printFields   = false;

        Filter.FilterGroup subFilter     = null;
        Filter.FilterGroup filterToAddTo = null;
        //info.getFilter();

        for (int i = 0; i < args.size(); i++) {
            String arg = args.get(i);
            if (arg.equals("-format")) {
                info.setFormat(args.get(++i));

                continue;
            }

            if (arg.equals("-skip")) {
                info.setSkip(Integer.parseInt(args.get(++i)));

                continue;
            }


            if (arg.equals("-skipline")) {
                info.setSkipPattern(args.get(++i));

                continue;
            }

            if (arg.equals("-changeline")) {
                info.setChangeString(args.get(++i), args.get(++i));

                continue;
            }

            if (arg.equals("-maxrows")) {
                info.setMaxRows(Integer.parseInt(args.get(++i)));

                continue;
            }

            if (arg.equals("-prune")) {
                info.setPruneBytes(Integer.parseInt(args.get(++i)));

                continue;
            }

            if (arg.equals("-prefix")) {
                new PrintWriter(getOutputStream()).println(args.get(++i));

                continue;
            }


            if (arg.equals("-decimate")) {
                int skip = Integer.parseInt(args.get(++i));
                info.getFilter().addFilter(new Filter.Decimate(skip));

                continue;
            }

            if (arg.equals("-db")) {
                Hashtable<String, String> props = parseProps(args.get(++i));
                this.installPlugin = Misc.equals(props.get("-install"),
                        "true") || Misc.equals(props.get("install"), "true");
                this.nukeDb = Misc.equals(props.get("-nukedb"),
                        "true") || Misc.equals(props.get("nukedb"), "true");
                info.getProcessor().addProcessor(dbXml=new Processor.DbXml(props));
                continue;
            }


            if (arg.equals("-unfurl")) {
                int          idx1 = Integer.parseInt(args.get(++i));
                int          idx2 = Integer.parseInt(args.get(++i));
                int          idx3 = Integer.parseInt(args.get(++i));
                List<String> cols = getCols(args.get(++i));
                info.getProcessor().addProcessor(new Processor.Unfurler(idx1,
                        idx2, idx3, cols));

                continue;
            }

            if (arg.equals("-sort")) {
                int idx = Integer.parseInt(args.get(++i));
                info.getProcessor().addProcessor(new Processor.Sorter(idx));

                continue;
            }

            if (arg.equals("-mergerows")) {
                List<String> toks    = getCols(args.get(++i));
                int[]        indices = new int[toks.size()];
                for (int tokIdx = 0; tokIdx < toks.size(); tokIdx++) {
                    indices[tokIdx] = Integer.parseInt(toks.get(tokIdx));
                }
                info.getProcessor().addProcessor(
                    new Processor.Summer(indices));

                continue;
            }


            if (arg.equals("-unique")) {
                List<String> toks = getCols(args.get(++i));
                info.getProcessor().addProcessor(new Filter.Unique(toks));

                continue;
            }

            if (arg.equals("-count")) {
                info.getProcessor().addProcessor(new Processor.Counter());

                continue;
            }

            if (arg.equals("-strict")) {
                info.getProcessor().addProcessor(new Processor.Counter(true));

                continue;
            }

            if (arg.equals("-flag")) {
                info.getProcessor().addProcessor(new Processor.Counter(true,
                        true));

                continue;
            }

            if (arg.equals("-sum")) {
                info.getProcessor().addProcessor(
                    new Processor.RowOperator(Processor.RowOperator.OP_SUM));

                continue;
            }

            if (arg.equals("-rotate")) {
                info.getProcessor().addProcessor(new Processor.Rotator());

                continue;
            }

            if (arg.equals("-flip")) {
                info.getProcessor().addProcessor(new Processor.Flipper());

                continue;
            }

            if (arg.equals("-delimiter")) {
                info.setDelimiter(args.get(++i));

                continue;
            }

            if (arg.equals("-outputdelimiter")) {
                String s = args.get(++i);
                if (s.equals("tab")) {
                    s = "\t";
                }
                info.setOutputDelimiter(s);

                continue;
            }

            if (arg.equals("-cut") || arg.equals("-include")) {
                String r = args.get(++i);
                info.getFilter().addFilter(new Filter.Cutter(getCols(r),
                        arg.equals("-cut")));

                continue;
            }

            if (arg.equals("-max")) {
                info.getProcessor().addProcessor(
                    new Processor.RowOperator(Processor.RowOperator.OP_MAX));

                continue;
            }

            if (arg.equals("-min")) {
                info.getProcessor().addProcessor(
                    new Processor.RowOperator(Processor.RowOperator.OP_MIN));

                continue;
            }

            if (arg.equals("-average")) {
                info.getProcessor().addProcessor(
                    new Processor.RowOperator(
                        Processor.RowOperator.OP_AVERAGE));

                continue;
            }
            if (arg.equals("-processor")) {
                i++;
                Class c = Misc.findClass(args.get(i));
                info.getProcessor().addProcessor((Processor) c.newInstance());

                continue;
            }

            if (arg.equals("-fields")) {
                printFields = true;

                continue;
            }

            if (arg.equals("-trim")) {
                trim = true;

                continue;
            }

            if (arg.equals("-output")) {
                String out = args.get(++i);
                this.outputStream = new FileOutputStream(out);
                info.setWriter(new PrintWriter(this.outputStream));
                info.getProcessor().addProcessor(
                    new Processor.Printer(printFields, trim));

                continue;

            }

            if (arg.equals("-print")) {
                info.getProcessor().addProcessor(
                    new Processor.Printer(printFields, trim));

                continue;
            }

            if (arg.equals("-table")) {
                info.getProcessor().addProcessor(new Processor.Html());

                continue;
            }


            if (arg.equals("-dump")) {
                info.getProcessor().addProcessor(
                    new Processor.Printer(printFields, trim));

                continue;
            }

            if (arg.equals("-record")) {
                info.getProcessor().addProcessor(new Processor.Prettifier());

                continue;
            }

            if (arg.equals("-template")) {
                i++;
                String template = args.get(i);
                if (new File(template).exists()) {
                    template = IOUtil.readContents(new File(template));
                }
                info.getProcessor().addProcessor(
                    new Processor.Printer(template));

                continue;
            }

            if (arg.equals("-columns")) {
                i++;
                List<String> cols = getCols(args.get(i));
                info.setSelector(new Converter.ColumnSelector(cols));
                info.getProcessor().addProcessor(info.getSelector());

                continue;
            }

            /*
            if (arg.equals("-addrange")) {
                i++;
                List<String> cols = getCols(args.get(i));
                i++;
                int from = new Integer(args.get(i)).intValue();
                i++;
                int to  = new Integer(args.get(i)).intValue();
                info.getProcessor().addProcessor(new Converter.AddRange(cols,from,to));
                continue;
            }
            */

            if (arg.equals("-addheader")) {
                info.getProcessor().addProcessor(
                    new Converter.HeaderMaker(parseProps(args.get(++i))));

                continue;
            }

            if (arg.equals("-prepend")) {
                i++;
                String text = args.get(i);
                text = text.replaceAll("_nl_", "\n");
                textReader.setPrepend(text);

                continue;
            }



            if (arg.equals("-percent")) {
                i++;
                List<String> cols = getCols(args.get(i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnPercenter(cols));

                continue;
            }



            if (arg.equals("-sumrow")) {
                info.getProcessor().addProcessor(
                    new Converter.ColumnOperator());

                continue;
            }

            if (arg.equals("-pad")) {
                i++;
                int count = new Integer(args.get(i)).intValue();
                i++;
                String pad = args.get(i);
                info.getProcessor().addProcessor(new Converter.Padder(count,
                        pad));

                continue;
            }


            if (arg.equals("-explode")) {
                i++;
                String col = args.get(i);
                info.getProcessor().addProcessor(
                    new Processor.Exploder(Integer.parseInt(col)));

                continue;
            }

            if (arg.equals("-geocode")) {
                String col      = args.get(++i);
                String filename = args.get(++i);
                info.getProcessor().addProcessor(new Converter.Geocoder(col,
                        filename, Integer.parseInt(args.get(++i)),
                        Integer.parseInt(args.get(++i)),
                        Integer.parseInt(args.get(++i)), false));

                continue;
            }

            if (arg.equals("-geocodeaddress")) {
                List<String> cols = getCols(args.get(++i));
                String suffix = args.get(++i);
                info.getProcessor().addProcessor(new Converter.Geocoder(cols, suffix));

                continue;
            }

            if (arg.equals("-geocodedb")) {
                String col      = args.get(++i);
                String filename = args.get(++i);
                info.getProcessor().addProcessor(new Converter.Geocoder(col,
                        filename, Integer.parseInt(args.get(++i)),
                        Integer.parseInt(args.get(++i)),
                        Integer.parseInt(args.get(++i)), true));

                continue;
            }

            if (arg.equals("-change")) {
                i++;
                List<String> cols = getCols(args.get(i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnChanger(
                        cols, args.get(++i), args.get(++i)));

                continue;
            }

            if (arg.equals("-map")) {
                i++;
                List<String> cols = getCols(args.get(i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnMapper(
                        cols, args.get(++i),
                        Utils.parseCommandLine(args.get(++i))));

                continue;
            }


            if (arg.equals("-tcl")) {
                i++;
                info.getProcessor().addProcessor(
                    new Processor.TclWrapper(args.get(i)));

                continue;
            }

            if (arg.equals("-split")) {
                info.getProcessor().addProcessor(
                    new Converter.ColumnSplitter(
                        args.get(++i), args.get(++i)));

                continue;
            }

            if (arg.equals("-delete")) {
                i++;
                List<String> cols = getCols(args.get(i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnDeleter(cols));

                continue;
            }

            if (arg.equals("-add")) {
                info.getProcessor().addProcessor(
                    new Converter.ColumnAdder(args.get(++i), args.get(++i)));

                continue;
            }

            if (arg.equals("-copy")) {
                info.getProcessor().addProcessor(
                    new Converter.ColumnCopier(args.get(++i), args.get(++i)));

                continue;
            }

            if (arg.equals("-new")) {
                List<String> idxs = getCols(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnNewer(idxs, args.get(++i)));

                continue;
            }

            if (arg.equals("-operator")) {
                List<String> idxs = getCols(args.get(++i));
                String       name = args.get(++i);
                String       op   = args.get(++i);
                info.getProcessor().addProcessor(
                    new Converter.ColumnMathOperator(idxs, name, op));

                continue;
            }

            if (arg.equals("-case")) {
                String       action = args.get(++i);
                List<String> idxs   = getCols(args.get(++i));
                info.getProcessor().addProcessor(new Converter.Case(idxs,
                        action));

                continue;
            }


            if (arg.equals("-insert")) {
                int col = Integer.parseInt(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnInserter(col, args.get(++i)));

                continue;
            }



            if (arg.equals("-addcell")) {
                int row = Integer.parseInt(args.get(++i));
                int col = Integer.parseInt(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnNudger(row, col, args.get(++i)));

                continue;
            }

            if (arg.equals("-deletecell")) {
                int row = Integer.parseInt(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnUnNudger(
                        row, getCols(args.get(++i))));

                continue;
            }

            if (arg.equals("-set")) {
                List<String> cols = getCols(args.get(++i));
                List<String> rows = getCols(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.ColumnSetter(cols, rows, args.get(++i)));

                continue;
            }

            /*
            if (arg.equals("-addrow")) {
                int row = Integer.parseInt(args.get(++i));
                info.getProcessor().addProcessor(
                    new Converter.RowInserter(
                        row, args.get(++i)));

                continue;
                }*/


            if (arg.equals("-combine")) {
                List<String> cols      = getCols(args.get(++i));
                String       separator = args.get(++i);
                String       name      = args.get(++i);
                info.getProcessor().addProcessor(
                    new Converter.ColumnConcatter(
                        cols, separator, name, false));

                continue;
            }


            if (arg.equals("-combineinplace")) {
                List<String> cols      = getCols(args.get(++i));
                String       separator = args.get(++i);
                String       name      = args.get(++i);
                info.getProcessor().addProcessor(
                    new Converter.ColumnConcatter(
                        cols, separator, name, true));

                continue;
            }

            if (arg.equals("-denormalize")) {
                int    col1 = Integer.parseInt(args.get(++i));
                String file = args.get(++i);
                info.getProcessor().addProcessor(
                    new Converter.Denormalizer(file, col1));

                continue;
            }


            if (arg.equals("-or")) {
                filterToAddTo = new Filter.FilterGroup(false);
                info.getProcessor().addProcessor(filterToAddTo);

                continue;
            }

            if (arg.equals("-and")) {
                filterToAddTo = new Filter.FilterGroup(true);
                info.getProcessor().addProcessor(filterToAddTo);

                continue;
            }

            if (arg.equals("-pattern")) {
                String col     = args.get(++i);
                String pattern = args.get(++i);
                handlePattern(info, filterToAddTo,
                              new Filter.PatternFilter(col, pattern));

                continue;
            }

            if (arg.equals("-lt")) {
                handlePattern(info, filterToAddTo,
                              new Filter.ValueFilter(args.get(++i),
                                  Filter.ValueFilter.OP_LT,
                                  Double.parseDouble(args.get(++i))));

                continue;
            }

            if (arg.equals("-gt")) {
                handlePattern(info, filterToAddTo,
                              new Filter.ValueFilter(args.get(++i),
                                  Filter.ValueFilter.OP_GT,
                                  Double.parseDouble(args.get(++i))));

                continue;
            }


            if (arg.equals("-defined")) {
                handlePattern(info, filterToAddTo,
                              new Filter.ValueFilter(args.get(++i),
                                  Filter.ValueFilter.OP_DEFINED, 0));

                continue;
            }
            if (arg.startsWith("-")) {
                throw new IllegalArgumentException("Unknown arg:" + arg);
            }

            int idx;

            idx = arg.indexOf("!=");
            if (idx >= 0) {
                handlePattern(info, filterToAddTo,
                              new Filter.PatternFilter(arg.substring(0,
                                  idx).trim(), arg.substring(idx + 2).trim(),
                                      true));

                continue;
            }


            idx = arg.indexOf("=~");
            if (idx >= 0) {
                handlePattern(info, filterToAddTo,
                              new Filter.PatternFilter(arg.substring(0,
                                  idx).trim(), arg.substring(idx
                                  + 2).trim()));

                continue;
            }


            boolean didone = false;
            for (String op : new String[] { "<=", ">=", "<", ">", "=" }) {
                idx = arg.indexOf(op);
                if (idx >= 0) {
                    handlePattern(
                        info, filterToAddTo,
                        new Filter.ValueFilter(
                            arg.substring(0, idx).trim(),
                            Filter.ValueFilter.getOperator(op),
                            Double.parseDouble(
                                arg.substring(idx + op.length()).trim())));
                    didone = true;

                    break;
                }
            }
            if (didone) {
                continue;
            }

            if (addFiles) {
                files.add(arg);
            }
        }

    }

    /**
     * _more_
     *
     * @param s _more_
     *
     * @return _more_
     */
    private List<String> getCols(String s) {
        if (true) {
            return StringUtil.split(s, ",", true, true);
        }

        List<String> cols = new ArrayList<String>();
        for (String tok : StringUtil.split(s, ",", true, true)) {
            if ((tok.indexOf("-") >= 0) && !tok.startsWith("-")) {
                int from = new Integer(StringUtil.split(tok, "-", true,
                               true).get(0)).intValue();
                int to = new Integer(StringUtil.split(tok, "-", true,
                             true).get(1)).intValue();
                for (int i = from; i <= to; i++) {
                    cols.add("" + i);
                }

                continue;
            }
            cols.add(tok);
        }

        return cols;
    }


    /**
     * _more_
     *
     * @param info _more_
     * @param filterToAddTo _more_
     * @param converter _more_
     */
    private void handlePattern(TextReader info,
                               Filter.FilterGroup filterToAddTo,
                               Filter converter) {
        if (filterToAddTo != null) {
            filterToAddTo.addFilter(converter);
        } else {
            info.getProcessor().addProcessor(converter);
        }
    }

    /**
     * _more_
     *
     * @param s _more_
     *
     * @return _more_
     */
    private Hashtable<String, String> parseProps(String s) {
        List<String>              toks  = Utils.parseCommandLine(s);
        Hashtable<String, String> props = new Hashtable<String, String>();
        for (int j = 0; j < toks.size(); j += 2) {
            if (j >= toks.size() - 1) {
                throw new IllegalArgumentException(
                    "Error: Odd number of arguments:" + toks);
            }
            props.put(toks.get(j), toks.get(j + 1));
        }

        return props;
    }

    /**
     * _more_
     *
     * @return _more_
     */
    public boolean getInstallPlugin() {
        return installPlugin;
    }
 
   public boolean getNukeDb() {
        return nukeDb;
    }

    public String getDbId() {
        return dbXml.getTableId();
    }


}
