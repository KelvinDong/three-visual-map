
import * as THREE from 'three'
import aa from '../../assets/breath_green.png';
// 雪碧图动画控制类
// 标准图片尺寸为 120 * 120
// 单个瓦片默认显示时长75ms


export default class Wave_Point_Builder {
_   
    constructor(spritePng, tilesHoriz=23, tilesVert=1, numTiles=23, tileDispDuration=75) {
        //debugger
        const textureLoader = new THREE.TextureLoader();

        if (spritePng){
            this._texture = textureLoader.load(spritePng);
        }else{
            this._texture = textureLoader.load(aa);
        }

        //横向瓦片数
        this._tilesHorizontal = tilesHoriz;
        //纵向瓦片数
        this._tilesVertical = tilesVert;
        //瓦片数
        this._numberOfTiles = numTiles;
        //纵向横向重复平铺
        this._texture.wrapS = this._texture.wrapT = THREE.RepeatWrapping;
        //纵向和横向的重复次数
        //如果设置等于1，则纹理不会重复
        // 如果设置为 大于0小于1 的值，纹理会被放大
        // 如果设置为 小于0 的值，那么会产生纹理的镜像
        // 如果设置为 大于1 的值，纹理会重复平铺
        this._texture.repeat.set(1 / this._tilesHorizontal, 1 / this._tilesVertical);

        //单个瓦片显示时间
        this._tileDisplayDuration = tileDispDuration;

        this._currentDisplayTime = 0;

        this._currentTile = 0;

        this._waveMaterial = new THREE.MeshBasicMaterial({  
            map: this._texture,  
            transparent: true // 如果雪碧图中有透明部分，设置这个选项为true  
        });  
    }

    animate (milliSec=20) { //增加的毫秒数
        // 当前显示时间累加
        this._currentDisplayTime += milliSec;
        while (this._currentDisplayTime > this._tileDisplayDuration) {
            this._currentDisplayTime -= this._tileDisplayDuration;
            
            //显示下一张图
            this._currentTile++;
            //如果是最后一张图，则回到第一张图
            if (this._currentTile == this._numberOfTiles)
                this._currentTile = 0;
            //当前显示的列
            var currentColumn = this._currentTile % this._tilesHorizontal;
            this._texture.offset.x = currentColumn / this._tilesHorizontal;
            //当前显示的行
            var currentRow = Math.floor(this._currentTile / this._tilesHorizontal);
            this._texture.offset.y = currentRow / this._tilesVertical;
        }
    }

    create(r = 0.08){
        const geometry = new THREE.CircleGeometry( r, 32 );
        const point = new THREE.Mesh(geometry, this._waveMaterial );
        return point;
    }
}