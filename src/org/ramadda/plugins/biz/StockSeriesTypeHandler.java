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

package org.ramadda.plugins.biz;


import org.ramadda.data.services.PointTypeHandler;
import org.ramadda.repository.*;
import org.ramadda.repository.type.*;
import org.ramadda.util.Utils;

import org.w3c.dom.*;


/**
 * Reads yahoo stock ticker time series CSV
 */
public class StockSeriesTypeHandler extends PointTypeHandler {

    /** _more_ */
    public static final int IDX_SYMBOL = IDX_PROPERTIES + 1;

    /** _more_ */
    public static final String URL = "http://ichart.yahoo.com/table.csv?s=";

    /**
     * ctor
     *
     * @param repository _more_
     * @param entryNode _more_
     *
     * @throws Exception on badness
     */
    public StockSeriesTypeHandler(Repository repository, Element entryNode)
            throws Exception {
        super(repository, entryNode);
    }


    /**
     * Return the URL to the CSV file
     *
     *
     * @param request _more_
     * @param entry the entry
     *
     * @return URL
     *
     * @throws Exception on badness
     */
    @Override
    public String getPathForEntry(Request request, Entry entry)
            throws Exception {
        String symbol = entry.getValue(IDX_SYMBOL, (String) null);
        if ( !Utils.stringDefined(symbol)) {
            return null;
        }

        return URL + symbol;
    }



}