import * as THREE from 'three';
import { geoMercator } from "d3-geo";
import Extemum from './extremum';

export default class Map_Base {

    constructor() {
        /**
         * d3-geo 
        projection(point) 把经纬度转换成为平面坐标  向左为x,向下为y, 所以拿到的 y要进行取反
        projection.invert(point) 把平面坐标转换为经纬度
        projection.scale([scale]) 缩放
         */
        this.projection = geoMercator()
            .center([104.0, 37.5])
            .scale(100)
            .translate([0, 0])
    }



    // 坐标转换，
    createPosition(lnglat) {
        let spherical = new THREE.Spherical
        spherical.radius = radius;
        const lng = lnglat[0]
        const lat = lnglat[1]
        const theta = (lng + 90) * (Math.PI / 180)
        const phi = (90 - lat) * (Math.PI / 180)
        spherical.phi = phi; // phi是方位面（水平面）内的角度，范围0~360度
        spherical.theta = theta; // theta是俯仰面（竖直面）内的角度，范围0~180度
        let position = new THREE.Vector3()
        position.setFromSpherical(spherical)
        return position
    }

    // 根据地理坐标生成多边形数据
    generatePolygon(polygonCoordinates) {
        const shapes = []
        const lines = []
       
        const extremumObject = new Extemum();

        polygonCoordinates.forEach((polygon) => {
            polygon.forEach((ring) => {
                const shape = new THREE.Shape()
                const points = [];
                for (let i = 0; i < ring.length; i++) {

                    if (ring[i][0]>extremumObject.maxLon) { extremumObject.maxLon = ring[i][0] }
                    if (ring[i][0]<extremumObject.minLon) { extremumObject.minLon = ring[i][0] }
                    if (ring[i][1]>extremumObject.maxLat) { extremumObject.maxLat = ring[i][1] }
                    if (ring[i][1]<extremumObject.minLat) { extremumObject.minLat = ring[i][1] }

                    const [x, y] = this.projection(ring[i])
                    if (x > extremumObject.maxX) { extremumObject.maxX = x }
                    if (x < extremumObject.minX) { extremumObject.minX = x }
                    if (-y > extremumObject.maxY) { extremumObject.maxY = -y }
                    if (-y < extremumObject.minY) { extremumObject.minY = -y }
                    if (i === 0) {
                        shape.moveTo(x, -y)
                    }
                    shape.lineTo(x, -y)
                    points.push(new THREE.Vector3(x, -y, 0))
                }

                if (points.length > 0) {
                    const lineGeometry = new THREE.BufferGeometry();
                    lineGeometry.setFromPoints(points);
                    lines.push(lineGeometry)
                    shapes.push(shape)
                }
            })
        })

        return { extremum:extremumObject, lines: lines, shapes: shapes  }
        
    }


}