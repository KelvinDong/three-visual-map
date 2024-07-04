import * as THREE from 'three';
import h337 from 'heatmap.js'
import Map_Base from './map_base.js'

export default class HeatMaterial extends THREE.ShaderMaterial {

    _eWidth = 500;
    _eHeight = 500;
    _eMax= 0;
    _ePoints=[]
    constructor(options) {
        
        const base_options = {
            transparent: true,
            vertexShader: `
            varying vec2 vUv;
            uniform float Zscale;
            uniform sampler2D greyMap;
            void main() {
                vUv = uv;
                vec4 frgColor = texture2D(greyMap, uv);
                float height = Zscale * frgColor.a;
                vec3 transformed = vec3( position.x, position.y, height);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
            }
            `,
            fragmentShader:`
            #ifdef GL_ES
            precision highp float;
            #endif
            varying vec2 vUv;
            uniform sampler2D heatMap;
            uniform vec3 u_color;//基础颜色
            uniform float u_opacity; // 透明度
            void main() {
                //vec4 alphaColor = texture2D(heatMap, vUv);
                // gl_FragColor = alphaColor;
                gl_FragColor = vec4(u_color, u_opacity) * texture2D(heatMap, vUv);
            }
            `,
            uniforms: {
                'heatMap' : {
                    value: {value: undefined}
                },
                'greyMap' : {
                    value: {value: undefined}
                },
                Zscale: {value: options.z},
                u_color:{value: new THREE.Color('rgb(255, 255, 255)')
                },
                u_opacity:{
                    value:1.0
                }
            }
        }
        super(base_options);

        this._eHeight = options.height; //物体像素高
        this._eWidth = options.width; //物体像素高
        this._eSize = options.size; //物体three中的尺寸
        this._eCenter = options.center; //物体three中的中心位置
        this._eMax = 0;
        this._ePoints = [];

        this._mapBase = new Map_Base()

        this._prepareData(options.points);
        this._prepareCanvas();

        const texture = new THREE.Texture(this._eHeatmap._config.container.children[0]);
        texture.needsUpdate = true;
        const texture2 = new THREE.Texture(this._eGreymap._config.container.children[0]);
        texture2.needsUpdate = true;
        this.uniforms.heatMap.value = texture;
        this.side = THREE.DoubleSide; // 双面渲染
        this.uniforms.greyMap.value = texture2;

    }

    //let heatMapGeo = new THREE.PlaneGeometry(800, 800,100,300)

    _prepareData(points){

        // console.log(points)
        const topLeftPoint = new THREE.Vector2();
        topLeftPoint.x = this._eCenter.x - this._eSize.x / 2;
        topLeftPoint.y = this._eCenter.y + this._eSize.y / 2;
        const bottomRightPoint = new THREE.Vector2();
        bottomRightPoint.x = this._eCenter.x + this._eSize.x / 2;
        bottomRightPoint.y = this._eCenter.y - this._eSize.y / 2;
        // debugger
        const pointsMax = []
        // console.log(this._eWidth,this._eHeight)
        // console.log("左上：右下",topLeftPoint,bottomRightPoint)
        for (let i = 0; i < points.length; i++) {
            const [x, y] = this._mapBase.projection(points[i]) // three中的坐标
            
            const cx = Math.floor(Math.abs(x-topLeftPoint.x)/(this._eSize.x/this._eWidth)); //canvas中的坐标
            const cy = Math.floor(Math.abs(-y-topLeftPoint.y)/(this._eSize.y/this._eHeight))-1;
            // console.log(x,-y,cx,cy)

            if(pointsMax[cx]){
                //
            }else{
                pointsMax[cx] = []
            }

            if (pointsMax[cx][cy]) {
                pointsMax[cx][cy] += 1
            }else{
                pointsMax[cx][cy] = 1
            }        
        }
        // pointsMax[0] = []
        // pointsMax[0][0] = 1
        
        for (let i = 0; i < this._eWidth; i++){
            for(let j = 0; j < this._eHeight; j++){
                if(pointsMax[i] && pointsMax[i][j]){
                    this._eMax = Math.max(this._eMax,pointsMax[i][j]);
                    this._ePoints.push({
                        x: i,
                        y: j,
                        value: pointsMax[i][j]
                    })
                }
            }
        }
    //    console.log(this._ePoints)
    }

    _prepareCanvas() {

        const r = Math.max(this._eWidth, this._eHeight)/400

        const heatmapContainer = document.createElement('div');
        heatmapContainer.style.width = this._eWidth + 'px'
        heatmapContainer.style.height = this._eHeight + 'px'
        heatmapContainer.style.display = 'none'
        document.body.appendChild(heatmapContainer)
        this._eHeatmap = h337.create({
            container: heatmapContainer,
            radius: r, // 点的半径  
            // maxOpacity: 1, // 最大不透明度  
            // minOpacity: 0.05, // 最小不透明度  
            // scaleRadius: true, // 是否缩放半径  
            // useLocalExtrema: true, // 是否使用局部极值  
            // gridSize: 20, // 网格大小  
        });
        this._eHeatmap.setData({
            max: this._eMax,
            data: this._ePoints
        });

        const graymapContainer = document.createElement('div');
        graymapContainer.style.width = this._eWidth + 'px'
        graymapContainer.style.height = this._eHeight + 'px'
        graymapContainer.style.display = 'none'
        document.body.appendChild(graymapContainer)

        this._eGreymap = h337.create({
            container: graymapContainer,
            radius: r, // 点的半径  
            gradient: {
                '0': 'black',
                '1.0': 'white'
            }
        });
        this._eGreymap.setData({
            max: this._eMax,
            data: this._ePoints
        });

        heatmapContainer.parentNode.removeChild(heatmapContainer);
        graymapContainer.parentNode.removeChild(graymapContainer);
    }


    
}