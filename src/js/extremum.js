
export default class Extremum {

    //地理坐标极值
    minLon = 180
    maxLon = -180;
    minLat = 90
    maxLat = -90;
    //平面坐标极值
    minX = Number.POSITIVE_INFINITY;
    minY = Number.POSITIVE_INFINITY;
    maxX = Number.NEGATIVE_INFINITY;
    maxY = Number.NEGATIVE_INFINITY;

    compareCopy(source) {
        // debugger;
        if (source.maxX > this.maxX) this.maxX = source.maxX;
        if (source.maxY > this.maxY) this.maxY = source.maxY;
        if (source.minX < this.minX) this.minX = source.minX;
        if (source.minY < this.minY) this.minY = source.minY;
        if (source.maxLat > this.maxLat) this.maxLat = source.maxLat;
        if (source.maxLon > this.maxLon) this.maxLon = source.maxLon;
        if (source.minLat < this.minLat) this.minLat = source.minLat;
        if (source.minLon < this.minLon) this.minLon = source.minLon;
    }

}