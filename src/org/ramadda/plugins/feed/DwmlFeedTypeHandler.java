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

package org.ramadda.plugins.feed;



import org.ramadda.repository.*;
import org.ramadda.repository.metadata.*;
import org.ramadda.repository.type.*;
import org.ramadda.util.AtomUtil;
import org.ramadda.util.HtmlUtils;
import org.ramadda.util.RssUtil;
import org.ramadda.util.TTLCache;
import org.ramadda.util.Utils;
import org.ramadda.util.WikiUtil;

import org.w3c.dom.*;

import ucar.unidata.util.DateUtil;
import ucar.unidata.util.IOUtil;
import ucar.unidata.util.Misc;
import ucar.unidata.util.StringUtil;
import ucar.unidata.xml.XmlUtil;

import java.net.URL;

import java.text.SimpleDateFormat;


import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;


/**
 */
public class DwmlFeedTypeHandler extends GenericTypeHandler {

    /** _more_          */
    private TTLCache<String, Weather> forecastCache = new TTLCache<String,
                                                          Weather>(5 * 60
                                                              * 1000);

    /** _more_          */
    private TTLCache<String, Weather> currentCache = new TTLCache<String,
                                                         Weather>(5 * 60
                                                             * 1000);



    /** _more_          */
    private static final String URL =
        "https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}&unit=0&lg=english&FcstType=dwml";

    /**
     * _more_
     *
     * @param repository _more_
     * @param entryNode _more_
     *
     * @throws Exception _more_
     */
    public DwmlFeedTypeHandler(Repository repository, Element entryNode)
            throws Exception {
        super(repository, entryNode);
    }


    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param parent _more_
     * @param newEntry _more_
     *
     * @throws Exception _more_
     */
    public void initializeEntryFromForm(Request request, Entry entry,
                                        Entry parent, boolean newEntry)
            throws Exception {
        super.initializeEntryFromForm(request, entry, parent, newEntry);
        if ( !Utils.stringDefined(entry.getName())) {
            Weather forecast = getForecast(entry);
            if ((forecast != null) && (forecast.location != null)) {
                entry.setName(forecast.location);
            }
        }
    }

    /**
     * _more_
     *
     * @param entry _more_
     * @param getForecast _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    private Weather getWeather(Entry entry, boolean getForecast)
            throws Exception {
        Weather forecast = forecastCache.get(entry.getId());
        Weather current  = currentCache.get(entry.getId());
        if ((forecast == null) || (current == null)) {
            String url =
                URL.replace("${lat}",
                            "" + entry.getLatitude()).replace("${lon}",
                                "" + entry.getLongitude());
            String  xml  = Utils.readUrl(url);
            Element root = XmlUtil.getRoot(xml);
            Element forecastNode =
                XmlUtil.findElement(XmlUtil.getElements(root, "data"),
                                    "type", "forecast");
            if (forecastNode == null) {
                return null;
            }
            forecast = new Weather(forecastNode);
            forecastCache.put(entry.getId(), forecast);

            Element currentNode =
                XmlUtil.findElement(XmlUtil.getElements(root, "data"),
                                    "type", "current observations");
            if (currentNode != null) {
                current = new Weather(currentNode);
                currentCache.put(entry.getId(), current);
            }
        }

        return getForecast
               ? forecast
               : current;
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
    private Weather getForecast(Entry entry) throws Exception {
        return getWeather(entry, true);
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
    private Weather getCurrent(Entry entry) throws Exception {
        return getWeather(entry, false);
    }


    /**
     * _more_
     *
     * @param wikiUtil _more_
     * @param request _more_
     * @param originalEntry _more_
     * @param entry _more_
     * @param tag _more_
     * @param props _more_
     *
     * @return _more_
     *
     * @throws Exception _more_
     */
    @Override
    public String getWikiInclude(WikiUtil wikiUtil, Request request,
                                 Entry originalEntry, Entry entry,
                                 String tag, Hashtable props)
            throws Exception {

        StringBuilder sb = new StringBuilder();
        boolean addHeader = !Misc.equals(props.get("addHeader"),"false");
        if (tag.equals("nws.current")) {
            addCurrent(request, entry, sb,addHeader);
        } else if (tag.equals("nws.forecast")) {
            addForecast(request, entry, sb);
            addDetails(request, entry, sb,addHeader);
        } else if (tag.equals("nws.details")) {
            addDetails(request, entry, sb,addHeader);
        } else if (tag.equals("nws.all")) {
            addCurrent(request, entry, sb,addHeader);
            addForecast(request, entry, sb);
            addDetails(request, entry, sb,addHeader);
        } else {
            return super.getWikiInclude(wikiUtil, request, originalEntry,
                                        entry, tag, props);
        }

        return sb.toString();
    }




    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param sb _more_
     *
     * @throws Exception _more_
     */
    private void addCurrent(Request request, Entry entry, Appendable sb, boolean addHeader)
            throws Exception {
        Weather current = getCurrent(entry);
        if ((current != null) && (current.times.size() > 0)) {
            Weather.Time time = current.times.get(0);
            if(addHeader) {
                sb.append(HtmlUtils.b("Current conditions at"));
                sb.append(
                          HtmlUtils.div(
                                        current.location,
                                        " style=\"font-size:16px;color:#135897;\" "));
                sb.append("<p>");
            }
            sb.append("<table border=0 cellspacing=0 cellpadding=0>\n");
            sb.append("<tr valign=top>");
            if (time.icon != null) {
                sb.append(
                    HtmlUtils.td(
                        HtmlUtils.div(
                            HtmlUtils.img(time.icon, time.words),
                            "style=\" margin:5px;  font-weight: bold;\" ")));
            }
            sb.append(HtmlUtils.open("td"));
            sb.append(
                HtmlUtils.open(
                    "div", " style=\"margin-left:5px; margin-right:40px;\""));
            if (time.weather != null) {
                sb.append(HtmlUtils.div(time.weather, "style=\" \" "));
            }
            if (time.apparent != null) {
                sb.append(
                    HtmlUtils.div(
                        time.apparent + "&deg;&nbsp;F",
                        "style=\" font-size:30px; font-weight: bold;\" "));
            }
            sb.append(HtmlUtils.close("div"));
            sb.append(HtmlUtils.close("td"));

            sb.append(HtmlUtils.open("td"));
            sb.append("<table>");
            String style1 =
                " style=\"  margin-right:5px; font-weight: bold;\"  ";
            String style2 = " style=\"  margin-left:8px; \"  ";
            if (time.humidity != null) {
                HtmlUtils.row(
                    sb,
                    HtmlUtils.td("Humidity", " align=right " + style1)
                    + HtmlUtils.td(HtmlUtils.div(time.humidity, style2)));
            }
            if (time.sustained != null) {
                HtmlUtils.row(sb, HtmlUtils.td("Wind Speed", " align=right "
                        + style1) + HtmlUtils.td(HtmlUtils.div(time.sustained
                            + " G " + time.gust + " MPH", style2)));
            }

            if (time.pressure != null) {
                HtmlUtils.row(sb, HtmlUtils.td("Barometer", "  align=right  "
                        + style1) + HtmlUtils.td(HtmlUtils.div(time.pressure
                            + " in", style2)));
            }

            if (time.dewpoint != null) {
                HtmlUtils.row(sb, HtmlUtils.td("Dew Point", "  align=right "
                        + style1) + HtmlUtils.td(HtmlUtils.div(time.dewpoint
                            + " in", style2)));
            }

            sb.append("</table>");
            sb.append(HtmlUtils.close("td"));

            sb.append("</tr>");
            sb.append("</table>\n");
            sb.append("<p>");
        }

    }

    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param sb _more_
     *
     * @throws Exception _more_
     */
    private void addForecast(Request request, Entry entry, Appendable sb)
            throws Exception {
        Weather forecast = getForecast(entry);
        if (forecast == null) {
            sb.append("No forecast defined");

            return;
        }
        sb.append("<div style=\"width:100%;overflow-x:auto;\">\n");
        sb.append("<table border=0 cellspacing=0 cellpadding=0>\n");
        sb.append("<tr valign=bottom>");
        for (Weather.Time time : forecast.times) {
            sb.append(
                HtmlUtils.td(
                    time.label,
                    "align=center style=\" margin:5px;  font-weight: bold;\" "));
        }
        sb.append("</tr>");
        sb.append("<tr>");
        String td;
        for (Weather.Time time : forecast.times) {
            if (time.icon == null) {
                td = "";
            } else {
                td = HtmlUtils.div(
                    HtmlUtils.img(time.icon, time.words),
                    "style=\" margin:5px;  font-weight: bold;\" ");
            }
            sb.append(HtmlUtils.td(td, " align=center "));
        }
        sb.append("</tr>");
        sb.append("<tr valign=top >");
        for (Weather.Time time : forecast.times) {
            if (time.weather == null) {
                td = "";
            } else {
                td = HtmlUtils.div(time.weather, "style=\"margin:5px; \" ");
            }
            sb.append(HtmlUtils.td(td, " align=center "));
        }
        sb.append("</tr>");

        sb.append("<tr>");
        for (Weather.Time time : forecast.times) {
            if (time.max != null) {
                td = HtmlUtils.div("High: " + time.max + "F",
                                   " style=\"margin:5px; color:red;\" ");
            } else if (time.min != null) {
                td = HtmlUtils.div("Low: " + time.min + "F",
                                   "style=\"margin:5px; color:blue;\" ");
            } else {
                td = "";
            }
            sb.append(HtmlUtils.td(td, " align=center "));
        }
        sb.append("</tr>");

        sb.append("</table>\n");
        sb.append("</div>");
    }


    /**
     * _more_
     *
     * @param request _more_
     * @param entry _more_
     * @param sb _more_
     *
     * @throws Exception _more_
     */
    private void addDetails(Request request, Entry entry, Appendable sb,boolean addHeader)
            throws Exception {
        Weather forecast = getForecast(entry);
        if (forecast == null) {
            sb.append("No forecast defined");

            return;
        }
        if(addHeader) {
            sb.append(HtmlUtils.b("Detailed Forecast"));
        }
        HtmlUtils.open(sb, "div", HtmlUtils.style("border: 1px #ccc solid;"));
        sb.append("<table border=0 cellspacing=0 cellpadding=0>\n");
        boolean even = true;
        for (Weather.Time time : forecast.times) {
            String style = (even
                            ? HtmlUtils.style("background-color:#eff8fd")
                            : "");
            HtmlUtils.open(sb, "tr", " valign=top " + style);
            HtmlUtils.td(
                sb, HtmlUtils.div(
                    time.label, HtmlUtils.style(
                        "margin:5px;  font-weight: bold;")), "align=right ");
            HtmlUtils.td(
                sb,
                HtmlUtils.div(time.words, HtmlUtils.style("margin:5px;")),
                "align=left ");
            HtmlUtils.close(sb, "tr");
            even = !even;
        }
        HtmlUtils.close(sb, "table");
        HtmlUtils.close(sb, "div");
    }


    private void checkTimes(Request request,
                            Hashtable<String, Element> times, Element node,
                            Appendable sb)
            throws Exception {
        Element time = times.get(XmlUtil.getAttribute(node, "time-layout",
                           ""));
        if (time == null) {
            return;
        }
        times.remove(XmlUtil.getAttribute(node, "time-layout", ""));
        NodeList children = XmlUtil.getElements(time, "start-valid-time");
        sb.append("<tr>\n");
        for (int childIdx = 0; childIdx < children.getLength(); childIdx++) {
            Element timeNode = (Element) children.item(childIdx);
            sb.append("<td style=\"padding:10px;\" align=center>");
            sb.append(XmlUtil.getAttribute(timeNode, "period-name", ""));
            sb.append("</td>");
        }
    }

    /**
     * Class description
     *
     *
     * @version        $version$, Fri, Nov 16, '18
     * @author         Enter your name here...    
     */
    private static class Weather {

        /** _more_          */
        String location;

        /** _more_          */
        String moreWeather;

        /** _more_          */
        List<Time> times = new ArrayList<Time>();

        /** _more_          */
        Hashtable<String, List<Time>> keyMap = new Hashtable<String,
                                                   List<Time>>();

        /**
         * _more_
         *
         * @param node _more_
         *
         * @throws Exception _more_
         */
        public Weather(Element node) throws Exception {
            moreWeather = XmlUtil.getGrandChildText(node,
                    "moreWeatherInformation", (String) null);
            Element location = XmlUtil.findChild(node, "location");
            if (location != null) {
                this.location = XmlUtil.getGrandChildText(location,
                        "area-description",
                        XmlUtil.getGrandChildText(location, "description",
                            ""));
            }
            processTimes(node);
            processParams(node);
        }

        /**
         * _more_
         *
         * @param dataNode _more_
         *
         * @throws Exception _more_
         */
        private void processParams(Element dataNode) throws Exception {

            Element params = XmlUtil.getElement(dataNode, "parameters");
            if (params == null) {
                return;
            }
            NodeList children = XmlUtil.getElements(params);
            for (int childIdx = 0; childIdx < children.getLength();
                    childIdx++) {
                Element node = (Element) children.item(childIdx);
                String  tag  = node.getTagName();
                String  key  = XmlUtil.getAttribute(node, "time-layout", "");
                if (key.equals("")) {
                    continue;
                }
                List<Time> times = keyMap.get(key);
                if (times == null) {
                    System.err.println("no key map:"
                                       + XmlUtil.toString(node));

                    continue;
                }
                if (tag.equals("conditions-icon")) {
                    NodeList children2 = XmlUtil.getElements(node,
                                             "icon-link");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).icon = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("wordedForecast")) {
                    NodeList children2 = XmlUtil.getElements(node, "text");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).words = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("weather")) {
                    NodeList children2 = XmlUtil.getElements(node,
                                             "weather-conditions");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        String summary = XmlUtil.getAttribute(child,
                                             "weather-summary",
                                             (String) null);
                        if (summary != null) {
                            times.get(i).weather = summary;
                        }
                    }
                } else if (tag.equals("probability-of-precipitation")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).precip = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("humidity")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).humidity = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("pressure")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).pressure = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("direction")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        times.get(i).direction = XmlUtil.getChildText(child);
                    }
                } else if (tag.equals("temperature")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    String   type = XmlUtil.getAttribute(node, "type", "");
                    boolean  max       = type.equals("maximum");
                    boolean  min       = type.equals("minimum");
                    boolean  apparent  = type.equals("apparent");
                    boolean  dewpoint  = type.equals("dew point");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        String  value = XmlUtil.getChildText(child);
                        if (max) {
                            times.get(i).max = value;
                        } else if (min) {
                            times.get(i).min = value;
                        } else if (apparent) {
                            times.get(i).apparent = value;
                        } else if (dewpoint) {
                            times.get(i).dewpoint = value;
                        }
                    }
                } else if (tag.equals("wind-speed")) {
                    NodeList children2 = XmlUtil.getElements(node, "value");
                    String   type = XmlUtil.getAttribute(node, "type", "");
                    boolean  gust      = type.equals("gust");
                    for (int i = 0; i < children2.getLength(); i++) {
                        Element child = (Element) children2.item(i);
                        String  value = XmlUtil.getChildText(child);
                        if (gust) {
                            times.get(i).gust = value;
                        } else {
                            times.get(i).sustained = value;
                        }
                    }
                }
            }

        }


        /**
         * _more_
         *
         * @param dataNode _more_
         *
         * @throws Exception _more_
         */
        private void processTimes(Element dataNode) throws Exception {
            SimpleDateFormat sdf =
                new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssX");
            Hashtable<Date, Time> timeMap = new Hashtable<Date, Time>();
            NodeList timeNodes = XmlUtil.getElements(dataNode, "time-layout");
            //            System.err.println(timeNodes);
            for (int childIdx = 0; childIdx < timeNodes.getLength();
                    childIdx++) {
                Element    timeLayoutNode =
                    (Element) timeNodes.item(childIdx);
                List<Time> timesForThisKey = new ArrayList<Time>();
                String key = XmlUtil.getGrandChildText(timeLayoutNode,
                                 "layout-key", "");
                keyMap.put(key, timesForThisKey);
                NodeList timesList = XmlUtil.getElements(timeLayoutNode,
                                         "start-valid-time");
                for (int i = 0; i < timesList.getLength(); i++) {
                    Element timeNode = (Element) timesList.item(i);
                    Date    dttm = sdf.parse(XmlUtil.getChildText(timeNode));
                    Time    time     = timeMap.get(dttm);
                    if (time == null) {
                        time = new Time(dttm,
                                        XmlUtil.getAttribute(timeNode,
                                            "period-name", ""));
                        timeMap.put(dttm, time);
                        times.add(time);
                    } else {
                        if ( !Utils.stringDefined(time.label)) {
                            time.label = XmlUtil.getAttribute(timeNode,
                                    "period-name", "");
                        }
                    }
                    timesForThisKey.add(time);
                }
            }
            Collections.sort(times);
        }


        /**
         * Class description
         *
         *
         * @version        $version$, Fri, Nov 16, '18
         * @author         Enter your name here...    
         */
        private class Time implements Comparable {

            /** _more_          */
            Date date;

            /** _more_          */
            String label;

            /** _more_          */
            String icon;

            /** _more_          */
            String words = "";

            /** _more_          */
            String weather;

            /** _more_          */
            String precip;

            /** _more_          */
            String max;

            /** _more_          */
            String min;

            /** _more_          */
            String apparent;

            /** _more_          */
            String dewpoint;

            /** _more_          */
            String humidity;

            /** _more_          */
            String direction;

            /** _more_          */
            String pressure;

            /** _more_          */
            String gust;

            /** _more_          */
            String sustained;

            /**
             * _more_
             *
             * @param date _more_
             * @param label _more_
             */
            public Time(Date date, String label) {
                this.date  = date;
                this.label = label;
            }

            /**
             * _more_
             *
             * @param o _more_
             *
             * @return _more_
             */
            public int compareTo(Object o) {
                Date date2 = ((Time) o).date;

                return -date2.compareTo(date);
            }

            /**
             * _more_
             *
             * @return _more_
             */
            public String toString() {
                return "time:" + label + " dttm: " + date;
            }
        }


    }

    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception _more_
     */
    public static void main(String[] args) throws Exception {
        String url =
            "https://forecast.weather.gov/MapClick.php?lat=40.0157&lon=-105.2792&unit=0&lg=english&FcstType=dwml";
        String  xml  = Utils.readUrl(url);
        Element root = XmlUtil.getRoot(xml);
        Element forecastNode = XmlUtil.findElement(XmlUtil.getElements(root,
                                   "data"), "type", "forecast");
        Weather forecast = new Weather(forecastNode);
    }

}
