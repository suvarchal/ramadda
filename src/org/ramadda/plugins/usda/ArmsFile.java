/*
* Copyright (c) 2008-2019 Geode Systems LLC
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

package org.ramadda.plugins.usda;


import org.ramadda.data.point.*;
import org.ramadda.data.point.text.*;
import org.ramadda.data.record.*;


import org.ramadda.repository.RepositoryUtil;

import org.ramadda.util.Utils;
import org.ramadda.util.text.*;

import org.w3c.dom.Element;

import ucar.unidata.xml.XmlUtil;

import java.io.*;

import java.text.SimpleDateFormat;

import java.util.ArrayList;

import java.util.Date;
import java.util.List;

import java.util.TimeZone;


/**
 */
public class ArmsFile extends UsdaFile {


    /**
     * ctor
     *
     * @param filename _more_
     *
     * @throws IOException _more_
     */
    public ArmsFile(String filename) throws IOException {
        super(filename);
    }

    /**
     * _more_
     *
     * @return _more_
     */
    @Override
    public Processor.Unfurler doMakeUnfurler() {
        List<String> cols = new ArrayList<String>();
        cols.add("3");
        Processor.Unfurler unfurler = new Processor.Unfurler(15, cols, 10,
                                          new ArrayList<String>());
        unfurler.setUnitIndex(16);

        return unfurler;
    }




    /**
     * _more_
     *
     * @param args _more_
     *
     * @throws Exception _more_
     */
    public static void main(String[] args) throws Exception {
        PointFile.test(args, ArmsFile.class);
    }

}
