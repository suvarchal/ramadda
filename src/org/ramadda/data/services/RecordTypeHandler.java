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

package org.ramadda.data.services;


import org.ramadda.data.point.PointFile;
import org.ramadda.data.point.PointMetadataHarvester;
import org.ramadda.data.record.RecordFile;
import org.ramadda.data.record.RecordFileFactory;
import org.ramadda.data.record.RecordVisitorGroup;

import org.ramadda.data.record.VisitInfo;

import org.ramadda.data.record.filter.*;
import org.ramadda.data.services.PointEntry;

import org.ramadda.data.services.RecordEntry;

import org.ramadda.repository.*;
import org.ramadda.repository.map.*;
import org.ramadda.repository.metadata.*;
import org.ramadda.repository.output.*;
import org.ramadda.repository.type.*;

import org.ramadda.util.HtmlUtils;
import org.ramadda.util.Utils;
import org.ramadda.util.grid.LatLonGrid;



import org.w3c.dom.*;

import ucar.unidata.util.Misc;


import java.io.BufferedOutputStream;
import java.io.ByteArrayInputStream;
import java.io.DataOutputStream;


import java.io.File;
import java.io.FileOutputStream;

import java.lang.reflect.*;


import java.util.ArrayList;
import java.util.Date;
import java.util.Hashtable;
import java.util.Hashtable;
import java.util.List;


/**
 *
 *
 * @author Jeff McWhirter
 * @version $Revision: 1.3 $
 */
public abstract class RecordTypeHandler extends BlobTypeHandler implements RecordConstants {

    /** _more_ */
    public static final int IDX_RECORD_COUNT = 0;

    /** _more_ */
    public static final int IDX_PROPERTIES = 1;

    /** _more_ */
    public static final int IDX_LAST = IDX_PROPERTIES;

    /** _more_ */
    private RecordFileFactory recordFileFactory;

    /** _more_ */
    private RecordOutputHandler recordOutputHandler;


    /**
     * _more_
     *
     * @param repository _more_
     * @param type _more_
     * @param description _more_
     */
    public RecordTypeHandler(Repository repository, String type,
                             String description) {
        super(repository, type, description);
    }




    /**
     * _more_
     *
     * @param repository ramadda
     * @param node _more_
     * @throws Exception On badness
     */
    public RecordTypeHandler(Repository repository, Element node)
            throws Exception {
        super(repository, node);
    }

    /**
     * _more_
     *
     * @return _more_
     */
    public RecordOutputHandler getRecordOutputHandler() {
        if (recordOutputHandler == null) {
            try {
                recordOutputHandler = doMakeRecordOutputHandler();
            } catch (Exception exc) {
                throw new RuntimeException(exc);
            }
        }

        return recordOutputHandler;
    }


    /**
     * _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public RecordOutputHandler doMakeRecordOutputHandler() throws Exception {
        return new RecordOutputHandler(getRepository(), null);
    }


    /**
     * _more_
     *
     * @param request _more_
     * @param recordEntry _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public boolean includedInRequest(Request request, RecordEntry recordEntry)
            throws Exception {
        return true;
    }



    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param tabTitles _more_
     * @param tabContents _more_
     */
    public void addToInformationTabs(Request request, Entry entry,
                                     List<String> tabTitles,
                                     List<String> tabContents) {
        //        super.addToInformationTabs(request, entry, tabTitles, tabContents);
        try {
            RecordOutputHandler outputHandler = getRecordOutputHandler();
            if (outputHandler != null) {
                tabTitles.add(msg("File Format"));
                StringBuffer sb = new StringBuffer();
                RecordEntry recordEntry = outputHandler.doMakeEntry(request,
                                              entry);
                outputHandler.getFormHandler().getEntryMetadata(request,
                        recordEntry, sb);
                tabContents.add(sb.toString());
            }
        } catch (Exception exc) {
            throw new RuntimeException(exc);

        }
    }



    /**
     * _more_
     *
     * @param entry _more_
     * @param originalFile _more_
     *
     * @throws Exception _more_
     */
    public void initializeRecordEntry(Entry entry, File originalFile)
            throws Exception {

        if (anySuperTypesOfThisType()) {
            return;
        }
        Hashtable existingProperties = getRecordProperties(entry);
        if ((existingProperties != null) && (existingProperties.size() > 0)) {
            return;
        }

        //Look around for properties files that define
        //the crs, fields for text formats, etc.
        Hashtable properties =
            RecordFile.getPropertiesForFile(originalFile.toString(),
                                            PointFile.DFLT_PROPERTIES_FILE);


        //Make the properties string
        String   contents = makePropertiesString(properties);
        Object[] values   = entry.getTypeHandler().getEntryValues(entry);
        //Append the properties file contents
        if (values[IDX_PROPERTIES] != null) {
            values[IDX_PROPERTIES] = "\n" + contents;
        } else {
            values[IDX_PROPERTIES] = contents;
        }
    }

    /**
     * _more_
     *
     * @param properties _more_
     *
     * @return _more_
     */
    public String makePropertiesString(Hashtable properties) {
        StringBuffer sb = new StringBuffer();
        for (java.util.Enumeration keys = properties.keys();
                keys.hasMoreElements(); ) {
            Object key = keys.nextElement();
            sb.append(key);
            sb.append("=");
            sb.append(properties.get(key));
            sb.append("\n");
        }

        return sb.toString();
    }


    /**
     * _more_
     *
     * @param msg _more_
     */
    public void log(String msg) {
        getRepository().getLogManager().logInfo("RecordTypeHandler:" + msg);
    }


    /**
     * _more_
     *
     * @param entry _more_
     *
     * @return _more_
     */
    public String getEntryCategory(Entry entry) {
        return getTypeProperty("entry.category", "");
    }

    /**
     * _more_
     *
     * @param entry _more_
     * @param originalEntry _more_
     *
     * @throws Exception On badness
     */
    @Override
    public void initializeCopiedEntry(Entry entry, Entry originalEntry)
            throws Exception {
        super.initializeCopiedEntry(entry, originalEntry);
        initializeNewEntry(null, entry);
    }


    /**
     * _more_
     *
     * @param entry _more_
     *
     * @return _more_
     *
     * @throws Exception On badness
     */
    public Hashtable getRecordProperties(Entry entry) throws Exception {
        Object[]  values = entry.getTypeHandler().getEntryValues(entry);
        String    propertiesString = (values[IDX_PROPERTIES] != null)
                                     ? values[IDX_PROPERTIES].toString()
                                     : "";

        String    typeProperties   = getRecordPropertiesFromType(entry);

        Hashtable p                = null;


        if (typeProperties != null) {
            if (p == null) {
                p = new Hashtable();
            }
            p.putAll(Utils.getProperties(typeProperties));
        }


        if (propertiesString != null) {
            if (p == null) {
                p = new Hashtable();
            }
            p.putAll(Utils.getProperties(propertiesString));
        }

        return p;
    }

    /**
     * _more_
     *
     * @param entry _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public String getRecordPropertiesFromType(Entry entry) throws Exception {
        return getTypeProperty("record.properties", (String) null);
    }


    /**
     * _more_
     *
     *
     * @param request _more_
     * @param entry _more_
     *
     * @return _more_
     *
     * @throws Exception On badness
     */
    public RecordFile doMakeRecordFile(Request request, Entry entry)
            throws Exception {
        Hashtable  properties = getRecordProperties(entry);
        RecordFile recordFile = doMakeRecordFile(entry, properties);
        if (recordFile == null) {
            return null;
        }
        //Explicitly set the properties to force a call to initProperties
        recordFile.setProperties(properties);

        return recordFile;
    }

    /**
     * _more_
     *
     * @param entry _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    private String getPathForRecordEntry(Entry entry) throws Exception {
        String path = getPathForEntry(null, entry);

        return path;
    }



    /**
     * _more_
     *
     * @param entry _more_
     * @param properties _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    private RecordFile doMakeRecordFile(Entry entry, Hashtable properties)
            throws Exception {
        String recordFileClass = getTypeProperty("record.file.class",
                                     (String) null);


        if (recordFileClass != null) {
            return doMakeRecordFile(entry, recordFileClass, properties);
        }


        return (RecordFile) getRecordFileFactory().doMakeRecordFile(
            getPathForRecordEntry(entry), properties);
    }


    /**
     * _more_
     *
     * @param entry _more_
     * @param className _more_
     * @param properties _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    private RecordFile doMakeRecordFile(Entry entry, String className,
                                        Hashtable properties)
            throws Exception {
        String path = getPathForRecordEntry(entry);
        if (path == null) {
            return null;
        }
        Class c = Misc.findClass(className);
        Constructor ctor = Misc.findConstructor(c, new Class[] { String.class,
                Hashtable.class });
        if (ctor != null) {
            return (RecordFile) ctor.newInstance(new Object[] { path,
                    properties });
        }
        ctor = Misc.findConstructor(c, new Class[] { String.class });

        if (ctor != null) {
            return (RecordFile) ctor.newInstance(new Object[] { path });
        }

        throw new IllegalArgumentException("Could not find constructor for "
                                           + className);
    }





    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param recordFile _more_
     * @param filters _more_
     */
    public void getFilters(Request request, Entry entry,
                           RecordFile recordFile,
                           List<RecordFilter> filters) {}

    /**
     * _more_
     *
     * @param path _more_
     * @param filename _more_
     *
     * @return _more_
     */
    @Override
    public boolean canHandleResource(String path, String filename) {
        try {
            boolean ok = getRecordFileFactory().canLoad(path);
            if (ok) {
                return true;
            }
        } catch (Exception exc) {
            //            return false;
        }

        return super.canHandleResource(path, filename);
    }



    /**
     * _more_
     *
     * @return _more_
     */
    public RecordFileFactory getRecordFileFactory() {
        if (recordFileFactory == null) {
            recordFileFactory = doMakeRecordFileFactory();
        }

        return recordFileFactory;
    }


    /**
     * _more_
     *
     * @return _more_
     */
    public RecordFileFactory doMakeRecordFileFactory() {
        return new RecordFileFactory();
    }


    /**
     * _more_
     *
     * @param path _more_
     *
     * @return _more_
     *
     * @throws Exception On badness
     */
    public boolean isRecordFile(String path) throws Exception {
        return getRecordFileFactory().canLoad(path);
    }



    /**
     * _more_
     *
     * @param s _more_
     *
     * @return _more_
     */
    public String macro(String s) {
        return "${" + s + "}";
    }

    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param services _more_
     *
     */
    @Override
    public void getServiceInfos(Request request, Entry entry,
                                List<ServiceInfo> services) {
        super.getServiceInfos(request, entry, services);
        getRecordOutputHandler().getServiceInfos(request, entry, services);
    }



    /**
     * _more_
     *
     *
     * @param request _more_
     * @param icon _more_
     *
     * @return _more_
     */
    public String getAbsoluteIconUrl(Request request, String icon) {
        return request.getAbsoluteUrl(getRepository().getIconUrl(icon));
    }


}
