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

package org.ramadda.util;


import org.ramadda.util.HtmlUtils;

import org.w3c.dom.*;

import ucar.unidata.util.IOUtil;
import ucar.unidata.util.StringUtil;
import ucar.unidata.xml.XmlUtil;

import java.io.*;

import java.util.ArrayList;
import java.util.Collections;

import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;





/**
 *     Class description
 *
 *
 *     @version        $version$, Tue, Oct 27, '15
 *     @author         Enter your name here...
 */
public class Place {

    /** _more_ */
    private static final Object MUTEX = new Object();

    /** _more_ */
    public static final String RESOURCE_ROOT =
        "/org/ramadda/repository/resources/geo";


    /** _more_ */
    public static final Resource[] RESOURCES = {
        //name,id,fips,lat,lon,opt state index
        new Resource(RESOURCE_ROOT + "/states.txt", new int[] { 1, 0, 2, 3,
                4 }, ""),
        new Resource(RESOURCE_ROOT + "/counties.txt", new int[] { 3, 1, 1, 10,
                11 }, ""),
        new Resource(RESOURCE_ROOT + "/subdivisions.txt", new int[] { 3, 1, 1,
                11, 12 }, ""),
        //new Resource(RESOURCE_ROOT +"/districts.txt",new int[]{},""),
        new Resource(RESOURCE_ROOT + "/places.txt", new int[] { 3, 1, 1, 12,
                13 }, ""),
        //#GEOID        NAME    UATYPE  POP10   HU10    ALAND   AWATER  ALAND_SQMI      AWATER_SQMI     INTPTLAT        INTPTLONG
        new Resource(RESOURCE_ROOT + "/urbanareas.txt", new int[] { 1, 0, 0,
                9, 10 }, "urban:"),
        //#GEOID        POP10   HU10    ALAND   AWATER  ALAND_SQMI      AWATER_SQMI     INTPTLAT        INTPTLONG
        new Resource(RESOURCE_ROOT + "/zipcodes.txt", new int[] { 0, 0, 0, 7,
                8 }, "zip:"),
        //#USPS GEOID   POP10   HU10    ALAND   AWATER  ALAND_SQMI      AWATER_SQMI     INTPTLAT        INTPTLONG
        new Resource(RESOURCE_ROOT + "/tracts.txt", new int[] { 1, 1, 1, 8,
                9 }, "")
    };

    //        { 0, 1, 0, 7, 8 }

    /**
     * Class description
     *
     *
     * @version        $version$, Tue, Jan 30, '18
     * @author         Enter your name here...
     */
    private static class Resource {

        /** _more_ */
        String base;

        /** _more_ */
        String file;
        //name,id,fips,lat,lon,opt state index

        /** _more_ */
        int[] indices;

        /** _more_ */
        String prefix;

        /**
         * _more_
         *
         * @param file _more_
         * @param indices _more_
         * @param prefix _more_
         */
        public Resource(String file, int[] indices, String prefix) {
            this.base    = new File(file).getName();
            this.file    = file;
            this.indices = indices;
            this.prefix  = prefix;
        }
    }


    /** _more_ */
    private static List<Place> places;

    /** _more_ */
    private static Hashtable<String, Place> placesMap = new Hashtable<String,
                                                            Place>();


    /** _more_ */
    private String from;

    /** _more_ */
    private String name;

    /** _more_ */
    private String id;

    /** _more_ */
    private String fips;

    /** _more_ */
    private double latitude = Double.NaN;

    /** _more_ */
    private double longitude = Double.NaN;


    /**
     * _more_
     */
    public Place() {}



    /**
     * _more_
     *
     * @param toks _more_
     * @param nameIndex _more_
     * @param idIndex _more_
     * @param fipsIndex _more_
     * @param latIndex _more_
     * @param lonIndex _more_
     */
    public void processLine(List<String> toks, int nameIndex, int idIndex,
                            int fipsIndex, int latIndex, int lonIndex) {
        if (fipsIndex >= toks.size()) {
            return;
        }
        String fips = toks.get(fipsIndex);
        setName(toks.get(nameIndex));
        setId(toks.get(idIndex));
        setFips(fips);
        setLatitude(Double.parseDouble(toks.get(latIndex).trim()));
        setLongitude(Double.parseDouble(toks.get(lonIndex).trim()));
        //        System.out.println(fips);
    }


    /**
     *  Set the Id property.
     *
     *  @param value The new value for Id
     */
    public void setId(String value) {
        id = value;
    }

    /**
     *  Get the Id property.
     *
     *  @return The Id
     */
    public String getId() {
        return id;
    }



    /**
     *  Set the Name property.
     *
     *  @param value The new value for Name
     */
    public void setName(String value) {
        name = value;
    }

    /**
     *  Get the Name property.
     *
     *  @return The Name
     */
    public String getName() {
        return name;
    }

    /**
     * _more_
     *
     * @return _more_
     */
    public String toString() {
        return from + " name:" + name + " id:" + id + " fips:" + fips
               + " lat:" + latitude + " lon:" + longitude;
    }

    /**
     * _more_
     *
     * @param from _more_
     *
     * @return _more_
     */
    public boolean isFrom(String from) {
        return this.from.equals(from);
    }

    /**
     *  Set the Fips property.
     *
     *  @param value The new value for Fips
     */
    public void setFips(String value) {
        fips = value;
    }

    /**
     *  Get the Fips property.
     *
     *  @return The Fips
     */
    public String getFips() {
        return fips;
    }


    /**
     *  Set the Latitude property.
     *
     *  @param value The new value for Latitude
     */
    public void setLatitude(double value) {
        latitude = value;
    }

    /**
     *  Get the Latitude property.
     *
     *  @return The Latitude
     */
    public double getLatitude() {
        return latitude;
    }

    /**
     *  Set the Longitude property.
     *
     *  @param value The new value for Longitude
     */
    public void setLongitude(double value) {
        longitude = value;
    }

    /**
     *  Get the Longitude property.
     *
     *  @return The Longitude
     */
    public double getLongitude() {
        return longitude;
    }


    /**
     * _more_
     *
     * @param from _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public static List<Place> getPlacesFrom(String from) throws Exception {
        List<Place> found = new ArrayList<Place>();
        for (Place place : getPlaces()) {
            if (place.isFrom(from)) {
                found.add(place);
            }
        }

        return found;
    }


    /**
     * _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public static List<Place> getPlaces() throws Exception {
        if (places == null) {
            synchronized (MUTEX) {
                if (places == null) {
                    List<Place> tmp = new ArrayList<Place>();
                    for (int i = 0; i < RESOURCES.length; i++) {
                        Resource resource = RESOURCES[i];
                        //                System.err.println("Reading:" + resource.file +" prefix:" + resource.prefix);
                        BufferedReader br = new BufferedReader(
                                                new InputStreamReader(
                                                    IOUtil.getInputStream(
                                                        resource.file,
                                                        Place.class)));
                        int    cnt     = 0;
                        String line    = null;
                        int[]  indices = resource.indices;
                        while ((line = br.readLine()) != null) {
                            cnt++;
                            if (line.startsWith("#")) {
                                continue;
                            }
                            Place place = new Place();
                            place.from = resource.base;
                            place.processLine(StringUtil.split(line, "\t",
                                    false, false), indices[0], indices[1],
                                        indices[2], indices[3], indices[4]);
                            if (indices.length >= 6) {
                                place.fips = place.fips.substring(indices[5]);
                            }
                            tmp.add(place);
                            for (String key :
                                    new String[] {
                                        resource.prefix + place.getFips() }) {
                                if (key == null) {
                                    continue;
                                }
                                placesMap.put(key, place);
                                placesMap.put(key.toLowerCase(), place);
                                placesMap.put(key.toUpperCase(), place);
                            }
                            for (String key :
                                    new String[] {
                                        resource.prefix + place.getId() }) {
                                if (key == null) {
                                    continue;
                                }
                                placesMap.put(key, place);
                                placesMap.put(key.toLowerCase(), place);
                                placesMap.put(key.toUpperCase(), place);
                            }



                        }
                    }
                    places = tmp;
                }
            }
        }

        return places;
    }


    /**
     * _more_
     *
     * @param id _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    public static Place getPlace(String id) throws Exception {
        getPlaces();
        Place place = placesMap.get(id);
        if (place != null) {
            return place;
        }
        id    = id.toLowerCase();
        place = placesMap.get(id);
        if (place != null) {
            return place;
        }
        place = placesMap.get("zip:" + id);
        if (place != null) {
            return place;
        }

        place = placesMap.get("urban:" + id);
        if (place != null) {
            return place;
        }


        return place;

    }


    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception _more_
     */
    public static void main(String[] args) throws Exception {
        for (String arg : args) {
            System.err.println("result:" + getPlace(arg));
        }
    }

}