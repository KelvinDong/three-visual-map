import * as THREE from 'three';

export default class Center_Distance {

    distance = null;  // 照相机与中心点的距离 
    center = null;    // 地图的中心

    clone() {
        const new_object = new Center_Distance();
        new_object.distance = this.distance;
        new_object.center = this.center.clone();
        return new_object;
    }

}

