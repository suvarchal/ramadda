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

package org.ramadda.util.grid;


import org.ramadda.util.Utils;



import java.util.ArrayList;
import java.util.List;


/**
 * !!!!!!!!NOTE!!!!!!!
 * This file is copied from the UNAVCO SVN tree (I know I shouldn't do this
 * but I couldn't deal with yet another library from somewhere else).
 * SO: DO NOT EDIT THIS FILE HERE OR IF YOU DO MAKE SURE ITS CHECKED INTO
 * THE UNAVCO TREE
 */
public class IdwGrid extends LatLonGrid {

    /** _more_ */
    private double[][] weightedValueGrid;

    /** _more_ */
    private double[][] weightsGrid;

    /** _more_ */
    private double radius = 0.0;

    /** _more_ */
    private int numCells = 0;

    /** _more_          */
    private double power = 1.0;

    /** _more_          */
    private int minPoints = 1;

    /**
     * ctor
     *
     * @param width number of columns
     * @param height number of rows
     * @param north northern bounds
     * @param westc west bounds
     * @param west _more_
     * @param south southern bounds
     * @param east east bounds
     */
    public IdwGrid(int width, int height, double north, double west,
                   double south, double east) {
        super(width, height, north, west, south, east);
    }


    /**
     * _more_
     *
     * @param that _more_
     */
    public IdwGrid(IdwGrid that) {
        super(that);
        this.radius   = that.radius;
        this.numCells = that.numCells;
        if (that.weightsGrid != null) {
            weightsGrid = GridUtils.cloneArray(that.weightsGrid);
        }
        if (that.weightedValueGrid != null) {
            weightedValueGrid = GridUtils.cloneArray(that.weightedValueGrid);
        }
    }




    /**
     * _more_
     */
    public void resetGrid() {
        super.resetGrid();
        GridUtils.fill(getWeightsGrid(), 0);
        GridUtils.fill(getWeightedValueGrid(), Double.NaN);
    }


    /**
     * create if needed and return the grid
     *
     * @return the grid
     */
    public double[][] getWeightsGrid() {
        if (weightsGrid == null) {
            weightsGrid = new double[getHeight()][getWidth()];
        }

        return weightsGrid;
    }


    /**
     * _more_
     *
     * @return _more_
     */
    public double[][] getWeightedValueGrid() {
        if (weightedValueGrid == null) {
            weightedValueGrid = new double[getHeight()][getWidth()];
        }

        return weightedValueGrid;
    }

    /**
     * Class description
     *
     *
     * @version        $version$, Fri, Aug 23, '13
     * @author         Enter your name here...
     */
    private class Index {

        /** _more_ */
        boolean valid = true;

        /** _more_ */
        int x;

        /** _more_ */
        int y;

        /** _more_ */
        double longitude;

        /** _more_ */
        double latitude;

        /**
         * _more_
         *
         * @param y _more_
         * @param x _more_
         * @param lat _more_
         * @param lon _more_
         */
        public Index(int y, int x, double lat, double lon) {
            init(y, x, lat, lon);
        }

        /**
         * _more_
         *
         * @param y _more_
         * @param x _more_
         * @param lat _more_
         * @param lon _more_
         */
        public void init(int y, int x, double lat, double lon) {
            this.valid     = true;
            this.x         = x;
            this.y         = y;
            this.longitude = lon;
            this.latitude  = lat;
        }

        /**
         * _more_
         *
         * @param lon _more_
         * @param lat _more_
         *
         * @return _more_
         */
        public double distance(double lon, double lat) {
            double dx = (lon - this.longitude);
            double dy = (lat - this.latitude);

            return Math.sqrt(dx * dx + dy * dy);
        }

        /**
         * _more_
         *
         * @return _more_
         */
        public String toString() {
            if ( !valid) {
                return " NA ";
            }

            //            return "x:" + x +" y:" +  y +" lon:" + longitude +" lat:" + latitude;
            return "x:" + x + " y:" + y;
        }
    }

    /** _more_ */
    private List<Index> regionIndices = new ArrayList<Index>();

    /** _more_ */
    int cnt = 0;

    /**
     * _more_
     *
     * @return _more_
     */
    public int getCellIndexDelta() {
        int delta = Math.abs(numCells);
        if (radius > 0) {
            //|----|----|----|----|----|----|----|----|
            double cellsPerDegree = getWidth() / getGridWidth();
            delta = Math.abs((int) (radius * cellsPerDegree + 0.5));
            //            System.err.println("radius: " + radius + " cellsPerDegree:" + cellsPerDegree +" delta:" + delta);
        }

        return delta;
    }

    /**
     * _more_
     *
     * @param lon _more_
     * @param lat _more_
     * @param indices _more_
     * @param values _more_
     */
    private void findIndices(double lon, double lat, List<Index> indices,
                             double[][] values) {
        for (Index i : indices) {
            i.valid = false;
        }
        int    xIndex   = getLongitudeIndex(lon);
        int    yIndex   = getLatitudeIndex(lat);
        int    indexCnt = 0;
        int    width    = getWidth();
        int    height   = getHeight();
        int    delta    = getCellIndexDelta();
        double rdy      = lat - getLatitude(yIndex + delta);
        double radius   = Math.sqrt(rdy * rdy);
        for (int dx = -delta; dx <= delta; dx++) {
            int nx = xIndex + dx;
            for (int dy = -delta; dy <= delta; dy++) {
                int ny = yIndex + dy;
                if ( !((nx >= 0) && (nx < width) && (ny >= 0)
                        && (ny < height))) {
                    continue;
                }
                if ((values != null) && Double.isNaN(values[ny][nx])) {
                    continue;
                }
                double nlat = getLatitude(ny);
                double nlon = getLongitude(nx);
                double distance = Math.sqrt((nlat - lat) * (nlat - lat)
                                            + (nlon - lon) * (nlon - lon));
                if (distance > radius) {
                    continue;
                }
                if (indexCnt >= indices.size()) {
                    indices.add(new Index(ny, nx, nlat, nlon));
                } else {
                    indices.get(indexCnt).init(ny, nx, nlat, nlon);
                }
                indexCnt++;
            }
        }
    }


    /**
     * _more_
     *
     * @param lat _more_
     * @param lon _more_
     * @param value _more_
     */
    public void addValue(double lat, double lon, double value) {
        super.addValue(lat, lon, value);
        if (true) {
            return;
        }
        double[][] weights = getWeightsGrid();
        double[][] values  = getWeightedValueGrid();
        findIndices(lon, lat, regionIndices, null);
        if (cnt < 5) {
            int yIndex = getLatitudeIndex(lat);
            int xIndex = getLongitudeIndex(lon);
            //            System.err.println (yIndex + " " + xIndex +"  " + regionIndices);
        }

        for (Index index : regionIndices) {
            if ( !index.valid) {
                continue;
            }
            double weight = index.distance(lon, lat);
            //Check if we have a grid radius
            if (radius != 0) {
                if (weight < radius) {
                    continue;
                }
            }
            if (Double.isNaN(values[index.y][index.x])) {
                values[index.y][index.x] = weight * value;
            } else {
                values[index.y][index.x] += weight * value;
            }
            weights[index.y][index.x] += weight;
        }
    }

    /**
     * _more_
     */
    @Override
    public void doAverageValues() {
        super.doAverageValues();
        double[][] values         = getAverageGrid(Double.NaN);
        double[][] weightedValues = getWeightedValueGrid();
        int        height         = getHeight();
        int        width          = getWidth();
        int        cnt            = 0;
        for (int y = 0; y < height; y++) {
            double lat = getLatitude(y);
            for (int x = 0; x < width; x++) {
                double value = values[y][x];
                if ( !Double.isNaN(value)) {
                    weightedValues[y][x] = value;

                    continue;
                }
                double lon         = getLongitude(x);
                double numerator   = 0;
                double denominator = 0;
                findIndices(lon, lat, regionIndices, values);
                int pointCount = 0;
                for (Index index : regionIndices) {
                    if ( !index.valid) {
                        break;
                    }
                    pointCount++;
                }
                if (pointCount < minPoints) {
                    continue;
                }
                for (Index index : regionIndices) {
                    if ( !index.valid) {
                        break;
                    }
                    double z = values[index.y][index.x];
                    if (Double.isNaN(z)) {
                        continue;
                    }
                    double distance = index.distance(lon, lat);
                    if (distance == 0) {
                        continue;
                    }
                    double weight = Math.pow(distance, power);
                    numerator   += z / weight;
                    denominator += 1 / weight;
                }
                if (denominator == 0) {
                    continue;
                }
                weightedValues[y][x] = numerator / denominator;
            }
        }
    }


    /**
     *  Set the MinPoints property.
     *
     *  @param value The new value for MinPoints
     */
    public void setMinPoints(int value) {
        minPoints = value;
    }

    /**
     *  Get the MinPoints property.
     *
     *  @return The MinPoints
     */
    public int getMinPoints() {
        return minPoints;
    }


    /**
     *  Set the Power property.
     *
     *  @param value The new value for Power
     */
    public void setPower(double value) {
        power = value;
    }

    /**
     *  Get the Power property.
     *
     *  @return The Power
     */
    public double getPower() {
        return power;
    }


    /**
     *  Set the Radius property.
     *
     *  @param value The new value for Radius
     */
    public void setRadius(double value) {
        radius = value;
    }

    /**
     *  Get the Radius property.
     *
     *  @return The Radius
     */
    public double getRadius() {
        return radius;
    }




    /**
     * _more_
     *
     * @return _more_
     */
    public String toString() {
        return super.toString() + "  radius=" + radius + " num cells="
               + numCells;
    }


    /**
     *  Set the NumCells property.
     *
     *  @param value The new value for NumCells
     */
    public void setNumCells(int value) {
        numCells = value;
    }

    /**
     *  Get the NumCells property.
     *
     *  @return The NumCells
     */
    public int getNumCells() {
        return numCells;
    }




}
