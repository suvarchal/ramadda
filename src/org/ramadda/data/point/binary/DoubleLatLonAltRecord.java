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

package org.ramadda.data.point.binary;


import org.ramadda.data.record.*;

import java.io.*;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;





/** This is generated code from generate.tcl. Do not edit it! */
public class DoubleLatLonAltRecord extends org.ramadda.data.point
    .PointRecord {

    /** _more_ */
    public static final int ATTR_FIRST =
        org.ramadda.data.point.PointRecord.ATTR_LAST;

    /** _more_ */
    public static final List<RecordField> FIELDS =
        new ArrayList<RecordField>();

    /** _more_ */
    public static final int ATTR_LATITUDE = ATTR_FIRST + 1;

    /** _more_ */
    public static final RecordField RECORDATTR_LATITUDE;

    /** _more_ */
    public static final int ATTR_LONGITUDE = ATTR_FIRST + 2;

    /** _more_ */
    public static final RecordField RECORDATTR_LONGITUDE;

    /** _more_ */
    public static final int ATTR_ALTITUDE = ATTR_FIRST + 3;

    /** _more_ */
    public static final RecordField RECORDATTR_ALTITUDE;

    /** _more_ */
    public static final int ATTR_LAST = ATTR_FIRST + 4;


    static {
        FIELDS.add(RECORDATTR_LATITUDE = new RecordField("latitude",
                "latitude", "", ATTR_LATITUDE, "", "double", "double", 0,
                SEARCHABLE_NO, CHARTABLE_NO));
        RECORDATTR_LATITUDE.setValueGetter(new ValueGetter() {
            public double getValue(Record record, RecordField field,
                                   VisitInfo visitInfo) {
                return (double) ((DoubleLatLonAltRecord) record).latitude;
            }
            public String getStringValue(Record record, RecordField field,
                                         VisitInfo visitInfo) {
                return "" + ((DoubleLatLonAltRecord) record).latitude;
            }
        });
        FIELDS.add(RECORDATTR_LONGITUDE = new RecordField("longitude",
                "longitude", "", ATTR_LONGITUDE, "", "double", "double", 0,
                SEARCHABLE_NO, CHARTABLE_NO));
        RECORDATTR_LONGITUDE.setValueGetter(new ValueGetter() {
            public double getValue(Record record, RecordField field,
                                   VisitInfo visitInfo) {
                return (double) ((DoubleLatLonAltRecord) record).longitude;
            }
            public String getStringValue(Record record, RecordField field,
                                         VisitInfo visitInfo) {
                return "" + ((DoubleLatLonAltRecord) record).longitude;
            }
        });
        FIELDS.add(RECORDATTR_ALTITUDE = new RecordField("altitude",
                "altitude", "", ATTR_ALTITUDE, "", "double", "double", 0,
                SEARCHABLE_NO, CHARTABLE_NO));
        RECORDATTR_ALTITUDE.setValueGetter(new ValueGetter() {
            public double getValue(Record record, RecordField field,
                                   VisitInfo visitInfo) {
                return (double) ((DoubleLatLonAltRecord) record).altitude;
            }
            public String getStringValue(Record record, RecordField field,
                                         VisitInfo visitInfo) {
                return "" + ((DoubleLatLonAltRecord) record).altitude;
            }
        });

    }


    /** _more_ */
    double latitude;

    /** _more_ */
    double longitude;

    /** _more_ */
    double altitude;


    /**
     * _more_
     *
     * @param that _more_
     */
    public DoubleLatLonAltRecord(DoubleLatLonAltRecord that) {
        super(that);
        this.latitude  = that.latitude;
        this.longitude = that.longitude;
        this.altitude  = that.altitude;


    }



    /**
     * _more_
     *
     * @param file _more_
     */
    public DoubleLatLonAltRecord(RecordFile file) {
        super(file);
    }



    /**
     * _more_
     *
     * @param file _more_
     * @param bigEndian _more_
     */
    public DoubleLatLonAltRecord(RecordFile file, boolean bigEndian) {
        super(file, bigEndian);
    }



    /**
     * _more_
     *
     * @return _more_
     */
    public int getLastAttribute() {
        return ATTR_LAST;
    }



    /**
     * _more_
     *
     * @param object _more_
     *
     * @return _more_
     */
    public boolean equals(Object object) {
        if ( !super.equals(object)) {
            System.err.println("bad super");

            return false;
        }
        if ( !(object instanceof DoubleLatLonAltRecord)) {
            return false;
        }
        DoubleLatLonAltRecord that = (DoubleLatLonAltRecord) object;
        if (this.latitude != that.latitude) {
            System.err.println("bad latitude");

            return false;
        }
        if (this.longitude != that.longitude) {
            System.err.println("bad longitude");

            return false;
        }
        if (this.altitude != that.altitude) {
            System.err.println("bad altitude");

            return false;
        }

        return true;
    }




    /**
     * _more_
     *
     * @param fields _more_
     */
    protected void addFields(List<RecordField> fields) {
        super.addFields(fields);
        fields.addAll(FIELDS);
    }



    /**
     * _more_
     *
     * @param attrId _more_
     *
     * @return _more_
     */
    public double getValue(int attrId) {
        if (attrId == ATTR_LATITUDE) {
            return latitude;
        }
        if (attrId == ATTR_LONGITUDE) {
            return longitude;
        }
        if (attrId == ATTR_ALTITUDE) {
            return altitude;
        }

        return super.getValue(attrId);

    }



    /**
     * _more_
     *
     * @return _more_
     */
    public int getRecordSize() {
        return super.getRecordSize() + 24;
    }



    /**
     * _more_
     *
     * @param recordIO _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public ReadStatus read(RecordIO recordIO) throws Exception {
        DataInputStream dis    = recordIO.getDataInputStream();
        ReadStatus      status = super.read(recordIO);
        if (status != ReadStatus.OK) {
            return status;
        }
        latitude  = readDouble(dis);
        longitude = readDouble(dis);
        altitude  = readDouble(dis);


        return ReadStatus.OK;
    }



    /**
     * _more_
     *
     * @param recordIO _more_
     *
     * @throws IOException _more_
     */
    public void write(RecordIO recordIO) throws IOException {
        DataOutputStream dos = recordIO.getDataOutputStream();
        super.write(recordIO);
        writeDouble(dos, latitude);
        writeDouble(dos, longitude);
        writeDouble(dos, altitude);

    }



    /**
     * _more_
     *
     * @param visitInfo _more_
     * @param pw _more_
     *
     * @return _more_
     */
    public int doPrintCsv(VisitInfo visitInfo, PrintWriter pw) {
        boolean includeVector = visitInfo.getProperty(PROP_INCLUDEVECTOR,
                                    false);
        int superCnt = super.doPrintCsv(visitInfo, pw);
        int myCnt    = 0;
        if (superCnt > 0) {
            pw.print(',');
        }
        pw.print(latitude);
        myCnt++;
        pw.print(',');
        pw.print(longitude);
        myCnt++;
        pw.print(',');
        pw.print(altitude);
        myCnt++;

        return myCnt + superCnt;

    }



    /**
     * _more_
     *
     * @param visitInfo _more_
     * @param pw _more_
     *
     * @return _more_
     */
    public int doPrintCsvHeader(VisitInfo visitInfo, PrintWriter pw) {
        int superCnt = super.doPrintCsvHeader(visitInfo, pw);
        int myCnt    = 0;
        boolean includeVector = visitInfo.getProperty(PROP_INCLUDEVECTOR,
                                    false);
        if (superCnt > 0) {
            pw.print(',');
        }
        RECORDATTR_LATITUDE.printCsvHeader(visitInfo, pw);
        myCnt++;
        pw.print(',');
        RECORDATTR_LONGITUDE.printCsvHeader(visitInfo, pw);
        myCnt++;
        pw.print(',');
        RECORDATTR_ALTITUDE.printCsvHeader(visitInfo, pw);
        myCnt++;

        return myCnt + superCnt;

    }



    /**
     * _more_
     *
     * @param buff _more_
     *
     * @throws Exception _more_
     */
    public void print(Appendable buff) throws Exception {
        super.print(buff);
        buff.append(" latitude: " + latitude + " \n");
        buff.append(" longitude: " + longitude + " \n");
        buff.append(" altitude: " + altitude + " \n");

    }



    /**
     * _more_
     *
     * @return _more_
     */
    public double getLatitude() {
        return latitude;
    }


    /**
     * _more_
     *
     * @param newValue _more_
     */
    public void setLatitude(double newValue) {
        latitude = newValue;
    }


    /**
     * _more_
     *
     * @return _more_
     */
    public double getLongitude() {
        return longitude;
    }


    /**
     * _more_
     *
     * @param newValue _more_
     */
    public void setLongitude(double newValue) {
        longitude = newValue;
    }


    /**
     * _more_
     *
     * @return _more_
     */
    public double getAltitude() {
        return altitude;
    }


    /**
     * _more_
     *
     * @param newValue _more_
     */
    public void setAltitude(double newValue) {
        altitude = newValue;
    }



}