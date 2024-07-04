import * as THREE from 'three';

import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import HeatMaterial from './js/heat_material.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MapControls } from 'three/addons/controls/MapControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

import Wave_Point_Builder from "./js/wave_point_builder.js"
import { deepMerge } from './tools/common_utils.js'
import Map_Base from './js/map_base.js'
import Extremum from './js/extremum.js';
import Center_Distance from './js/center_distance.js';

export default class THREE_MAP {

    _mapBase = new Map_Base();

    _scene;
    _renderer;
    _css2Renderer;
    _controller;

    _axesHelper;
    _gridHelper;
    _stats;

    _gui;

    _CD = new Center_Distance();      //当前的中心，中心点距离 
    _fromCD = new Center_Distance(); //来源的中心，中心点距离
    _toCD = new Center_Distance();   //目的的中心，中心点距离 

    _controling = 0;// 鼠标点击移动状态位,避免与鼠标点击事件冲突
    
    _clickBack = true; //要求click后，必须重置此位，否则不再响应点击事件

    _fitedSteps = 0;// 地图切换时过渡时已经完成的步骤

    _raycaster;
    _raycaster_params = {
        Line: { threshold: 0.01 }  // TODO 原来程值大的情况不能很好定位物理的问题未能重现
    };

    _size; //地图的大小
    
    _mapAddGroup;
    _extremumDrawBack;
    
    _htmlGroup = [];//css2object的集合
    _htmlLayer = 1
    _waveGroup = []//动画对象的集合
    _waveLayer = 3
    _pieGroup = []//圆饼对象的集合
    _pieLayer = 2

    _heatMapPlane
    _heatMapHeight = 20;  //地图大小 除以 此参数，得到 热力图高度

    _threeMapconfig = {

        controller: "map",
        helper: false, 
        dip: 0,  
        parentDom: {
            id: "threeMap",
            width: 800,
            height: 600
        },
        scale: 0.8,
        precision:  6,// 值越大，layz越大
        
        geoJson: {},
        
        mapCallback: null,
        mapOverCallback: null,
        backGround: {
            color: 0x000000,
            opacity: 0.85
        },
        polygonStyle: {
            lineStyle: { //内边框
                show: true,
                color: 0x2086e5
            },
            shapeStyle: { //面
                show: true,
                // opacity: 1,  //与热力图也有冲突
                depthSize: 15, //在当前地图最小间距的的倍数
                fillColor: 0x000000,
                overColor: 0x0000ff,
                extrudeColor: 0xff00ff
            }
        }
    }

 



    constructor(config) {
        if (!config) {
            console.error('config is required')
            return
        }        

        this.updateConfig(config)

        this._initOther()
    }


    _initOther() {

        this._scene = new THREE.Scene()

        this._camera = new THREE.PerspectiveCamera(
            30,  //视野角度（FOV）
            this._threeMapconfig.parentDom.width / this._threeMapconfig.parentDom.height, //长度和宽度比 默认采用浏览器  返回以像素为单位的窗口的内部宽度和高度
            0.01,  //近截面（near）
            1000  //远截面（far）
        )

        this._renderer = new THREE.WebGLRenderer(
            {
                antialias: true,
                logarithmicDepthBuffer: true // this._threeMapconfig.hasHeatMap?false:true, //解决深度冲突，  如要两个面完全重合，其作用不大
            }
        )
        this._renderer.setSize(this._threeMapconfig.parentDom.width, this._threeMapconfig.parentDom.height)
        this._renderer.setPixelRatio(window.devicePixelRatio);
        this._renderer.setClearColor(this._threeMapconfig.backGround.color, this._threeMapconfig.backGround.opacity); //设置背景颜色

        
        // 强制修改父容器的属性
        document.getElementById(this._threeMapconfig.parentDom.id).style.position = 'relative'
        if (this._threeMapconfig.parentDom.id) {
            document.getElementById(this._threeMapconfig.parentDom.id).appendChild(this._renderer.domElement)
        } else {
        }

        this._css2Renderer = new CSS2DRenderer();
        this._css2Renderer.setSize(this._threeMapconfig.parentDom.width, this._threeMapconfig.parentDom.height);
        this._css2Renderer.render(this._scene, this._camera);
        document.getElementById(this._threeMapconfig.parentDom.id).appendChild(this._css2Renderer.domElement);
        this._css2Renderer.domElement.style.position = 'absolute';
        this._css2Renderer.domElement.style.top = '0';
        this._css2Renderer.domElement.style.pointerEvents = 'none';
        this._css2Renderer.domElement.style.zIndex = 2;

        if (this._threeMapconfig.helper) {            
            this._axesHelper = new THREE.AxesHelper(200);
            this._scene.add(this._axesHelper);
            this._gridHelper = new THREE.GridHelper(100, 100);
            // gridHelper沿着x轴旋转90度
            this._gridHelper.rotateX(Math.PI / 2);
            this._scene.add(this._gridHelper)
            //创建stats对象
            this._stats = new Stats();
            this._stats.domElement.style.position = 'absolute';
            this._stats.domElement.style.top = '0';
            document.getElementById(this._threeMapconfig.parentDom.id).appendChild(this._stats.domElement);
        }

        this._initRaycaster()

        this._init_controller()

        this._waveMarkerBuilder = new Wave_Point_Builder();

        // this.drawMap(this._threeMapconfig.geoJson);

        this._animate()
          
    }

    // 初始化或更新控制器
    _init_controller() {
        if (this._controller){
            this._controller.dispose();
        }

        if (this._threeMapconfig.controller == "orbit"){
            this._controller = new OrbitControls(this._camera, this._renderer.domElement)           
        }else{
            this._controller = new MapControls(this._camera, this._renderer.domElement)
            this._controller.screenSpacePanning = true;
        }  

        if(this._toCD.center){
            this._controller.target.set(this._toCD.center.x,this._toCD.center.y ,this._toCD.center.z);
        }
        

        this._controller.addEventListener('change',  (event) => {
            this._controling ++;
          });
        this._controller.addEventListener('start', (event) => {
            this._controling  =0;
            });
        
        this._controller.update();
    }
/*
    _gui_init() {
        this._gui = new GUI({ container: document.getElementById(this._threeMapconfig.parentDom.id) } );
                
        this._gui.domElement.style.position = "absolute"
        this._gui.domElement.style.top = "0";
        this._gui.domElement.style.right = "0";
        this._gui.title("所有参数");

        this._gui.add(this._threeMapconfig, 'controller',['map',"orbit"]).onChange((control) => {
            this._init_controller();
        });

        this._gui.add(this._threeMapconfig, 'helper').onChange((helper) => {
            if (helper) {
                this._axesHelper.visible = true;
                this._gridHelper.visible = true;
                this._stats.domElement.style.display = "block";
            } else {
                this._axesHelper.visible = false;
                this._gridHelper.visible = false;
                this._stats.domElement.style.display = "none";
            }
        });

        this._gui.add(this._threeMapconfig, 'dip').disable();
        
        const parentDom = this._gui.addFolder("parentDom");
        parentDom.add(this._threeMapconfig.parentDom, 'id').disable();
        parentDom.add(this._threeMapconfig.parentDom, 'width').disable();
        parentDom.add(this._threeMapconfig.parentDom, 'height').disable();
        this._gui.add(this._threeMapconfig, 'scale').disable();
        this._gui.add(this._threeMapconfig, 'precision').disable();
        // this._gui.add(this._threeMapconfig, 'geoJson').disable();
        // this._gui.add(this._threeMapconfig, 'mapCallback').disable();
        const background = this._gui.addFolder("backGround");
        background.addColor(this._threeMapconfig.backGround, 'color').onChange((color) => {
            this._renderer.setClearColor(color, this._threeMapconfig.backGround.opacity);
        });        
        background.add(this._threeMapconfig.backGround, 'opacity',0,1).onChange((opacity) => {
            this._renderer.setClearColor(this._threeMapconfig.backGround.color,opacity);
        });
        const polygonStyle=this._gui.addFolder("polygonStyle");
        const lineStyle = polygonStyle.addFolder("lineStyle");
        lineStyle.add(this._threeMapconfig.polygonStyle.lineStyle, 'show',[true,false]).onChange((show) => {
            this._mapGroup.forEach(obj => {
                obj.children.forEach(item => {
                    if(item.mapObject && item.mapObject=="mapLine"){
                        item.visible = show;
                    }
                })
            })
        });
        lineStyle.addColor(this._threeMapconfig.polygonStyle.lineStyle, 'color').onChange((color) => {
            this._mapGroup.forEach(obj => {
                obj.children.forEach(item => {
                    if(item.mapObject && item.mapObject=="mapLine"){
                        item.material.color.set(this._threeMapconfig.polygonStyle.lineStyle.color);
                    }
                })
            })
        });
        const shapeStyle = polygonStyle.addFolder("shapeStyle");
        shapeStyle.add(this._threeMapconfig.polygonStyle.shapeStyle, 'show',[true,false]).onChange((show) => {
            this._mapGroup.forEach(obj => {
                obj.children.forEach(item => {
                    if(item.mapObject && item.mapObject=="mapShape"){
                        item.visible = show;
                    }
                })
            })
        });
        shapeStyle.add(this._threeMapconfig.polygonStyle.shapeStyle, 'depthSize',0,50).disable();
        shapeStyle.addColor(this._threeMapconfig.polygonStyle.shapeStyle, 'fillColor').onChange((fillColor) => {
            this._mapGroup.forEach(obj => {
                obj.children.forEach(item => {
                    if(item.mapObject && item.mapObject=="mapShape"){
                        if(item.parent.mapProperties.fillColor){
                            item.material[1].color.set(item.parent.mapProperties.fillColor);
                        }else{
                            item.material[1].color.set(this._threeMapconfig.polygonStyle.shapeStyle.extrudeColor);
                        }
                    }
                })
            })
        });
        shapeStyle.addColor(this._threeMapconfig.polygonStyle.shapeStyle, 'overColor');
        shapeStyle.addColor(this._threeMapconfig.polygonStyle.shapeStyle, 'extrudeColor').onChange((extrudeColor) => {
            this._mapGroup.forEach(obj => {
                obj.children.forEach(item => {
                    if(item.mapObject && item.mapObject=="mapShape"){                       
                        item.material[1].color.set(this._threeMapconfig.polygonStyle.shapeStyle.extrudeColor);                                                
                    }
                })
            })
        });

    }

    */

    //实现两个功能：//1、鼠标在地图上移动，突显当前所在子地图；2、子地图和地图外点击，实现地图上下钻。
    _initRaycaster() {

        this._raycaster = new THREE.Raycaster()
        this._raycaster.params = this._raycaster_params;

        const onMouseMove = (event) => {
            if (this._fitedSteps > 0) return;
            const mouse = new THREE.Vector2()
            mouse.x = ((event.clientX - this._renderer.domElement.getBoundingClientRect().left) / this._threeMapconfig.parentDom.width) * 2 - 1
            mouse.y = -((event.clientY - this._renderer.domElement.getBoundingClientRect().top) / this._threeMapconfig.parentDom.height) * 2 + 1
            // 通过摄像机和鼠标位置更新射线
            this._raycaster.setFromCamera(mouse, this._camera)
            // 算出射线 与当场景相交的对象有那些
            const intersects = this._raycaster.intersectObjects(this._scene.children, true)
            //先恢复上一次的颜色
            if (this._overMap) {
                this._overMap.object.parent.children.forEach(brotherObj => {
                    // debugger;
                    if(brotherObj.mapObject == 'mapShape'){
                        if (brotherObj.parent.mapProperties.fillColor){
                            brotherObj.material[0].color.set(brotherObj.parent.mapProperties.fillColor);
                        }else{
                            brotherObj.material[0].color.set(this._threeMapconfig.polygonStyle.shapeStyle.fillColor);
                        }
                        
                    }
                })
                this._overMap = null;
            }
            if (intersects.length > 0) {
                for (let i = 0; i < intersects.length; i++) {
                    const topObject = intersects[i];
                    if(topObject.object.mapObject &&　topObject.object.mapObject == 'mapShape'){
                        for (let j = 0; j < topObject.object.parent.children.length; j++) {
                            const brotherObj = topObject.object.parent.children[j];
                            if(brotherObj.mapObject == 'mapShape'){                                
                                brotherObj.material[0].color.set(this._threeMapconfig.polygonStyle.shapeStyle.overColor);
                            }
                        }
                        this._overMap = topObject;
                        break;    
                    }
                }
            }
            if (this._threeMapconfig.mapOverCallback){
                this._threeMapconfig.mapOverCallback(this._overMap?this._overMap.object.parent.mapProperties:null)
            }
        }
        this._renderer.domElement.addEventListener('mousemove', onMouseMove, false)

        //3、*** 地图下钻事件 */
        const onMouseClick = (event) => {
            
            if ( !this._clickBack ||this._controling > 2) {
                return
            }
            const mouse = new THREE.Vector2()
            mouse.x = ((event.clientX - this._renderer.domElement.getBoundingClientRect().left) / this._threeMapconfig.parentDom.width) * 2 - 1
            mouse.y = -((event.clientY - this._renderer.domElement.getBoundingClientRect().top) / this._threeMapconfig.parentDom.height) * 2 + 1
            // 通过摄像机和鼠标位置更新射线
            this._raycaster.setFromCamera(mouse, this._camera)
            // 算出射线 与当场景相交的对象有那些
            const intersects = this._raycaster.intersectObjects(this._scene.children, true)
            if (intersects.length > 0) {
                for (let i = 0; i < intersects.length; i++) {
                    const topObject = intersects[i];
                    if(topObject.object.mapObject &&　topObject.object.mapObject == 'mapShape'){
                        if (this._threeMapconfig.mapCallback) {
                            this._clickBack = false;
                            this._threeMapconfig.mapCallback(topObject.object.parent.mapProperties)
                            break;
                        }
                    }
                }
            } else {
                if (this._threeMapconfig.mapCallback) {
                    this._clickBack = false;
                    this._threeMapconfig.mapCallback()
                }
            }
        }

        this._renderer.domElement.addEventListener('click', onMouseClick, false)
    }

    resetClickBack() {
        this._clickBack = true;
    }

    _renderWhole() {
        this._renderer.render(this._scene, this._camera)
        this._css2Renderer.render(this._scene, this._camera)
    }

    _sinValueFordegree(degree) {
        return Math.sin(THREE.MathUtils.degToRad(degree));
    }

    _animate() {
        requestAnimationFrame(this._animate.bind(this));
        const totalTurns = 10


        //地图切换
        if (this._fromCD.center) {
            this._fitedSteps++;
            if (this._fitedSteps > totalTurns) {
                // 恢复初始值
                this._fitedSteps = 0;
                this._fromCD.center = null;
                //删除原有地图
                if (this._mapGroup) {
                    this._mapGroup.forEach(obj => {
                        this._scene.remove(obj);
                    })
                }
                this._mapGroup = this._mapAddGroup;
            } else {
                this._CD.center.set(this._fromCD.center.x + (this._toCD.center.x - this._fromCD.center.x) / totalTurns * this._fitedSteps,
                    this._fromCD.center.y + (this._toCD.center.y - this._fromCD.center.y) / totalTurns * this._fitedSteps,
                    this._fromCD.center.z + (this._toCD.center.z - this._fromCD.center.z) / totalTurns * this._fitedSteps);
                this._CD.distance = (this._fromCD.distance + (this._toCD.distance - this._fromCD.distance) / totalTurns * this._fitedSteps);

                this._camera.position.set(this._CD.center.x,
                    this._CD.center.y - this._CD.distance * Math.sin(THREE.MathUtils.degToRad(this._threeMapconfig.dip)),
                    this._CD.center.z + this._CD.distance * Math.cos(THREE.MathUtils.degToRad(this._threeMapconfig.dip)));
                this._camera.lookAt(this._CD.center);
            }
        }

        this._renderWhole();

        if (this._stats) this._stats.update();

        if (this._waveMarkerBuilder) {
            this._waveMarkerBuilder.animate(50); //值越大越快
        }
    }

    //返回场景中地图物体的边界
    getMapBoundingClientRect() {
        return this._extremumDrawBack;
    }

    updateConfig(config) {
        this._threeMapconfig = deepMerge(this._threeMapconfig, config)

        if (this._threeMapconfig.dip > 70) {
            this._threeMapconfig.dip = 70;
        }
    }

    drawMap(inputData) {

        this._threeMapconfig.geoJson = inputData;
        
        this._mapAddGroup = []

        // 地图边界的极值，包括经纬度和threejs坐标
        this._extremumDrawBack = new Extremum();

        //准备子地图所需要的数据
        const subMapsParas = []
        inputData.properties.districts.forEach(district => {
            const drawBack = this._mapBase.generatePolygon(district.geometry.coordinates) //{ extremum:extremumObject, lines: lines, shapes: shapes  }
            drawBack.mapProperties = district.properties
            if (drawBack.lines.length > 0) {          
                this._extremumDrawBack.compareCopy(drawBack.extremum)
                subMapsParas.push(drawBack)
            }
        })
        //准备主地图的数据
        const pDrawBack = this._mapBase.generatePolygon(inputData.geometry.coordinates);
        if (pDrawBack.lines.length) {
            this._extremumDrawBack.compareCopy(pDrawBack.extremum)
        }

        //地图大小
        this._size = new THREE.Vector3(
            (this._extremumDrawBack.maxX - this._extremumDrawBack.minX)/ (this._threeMapconfig.scale), 
            (this._extremumDrawBack.maxY - this._extremumDrawBack.minY)/ (this._threeMapconfig.scale), 
             0); 
        
        //地图中心，后面会根据倾角重新计算
        this._toCD.center = new THREE.Vector3((this._extremumDrawBack.maxX + this._extremumDrawBack.minX) / 2, (this._extremumDrawBack.maxY + this._extremumDrawBack.minY) / 2, 0);; // 获取边界框的中心点 
        //z轴距离,用于拉开距离
        this._threeMapconfig.layerZ = Math.min(this._size.x, this._size.y) / (Math.max(this._threeMapconfig.parentDom.width,this._threeMapconfig.parentDom.height)/this._threeMapconfig.precision);
        //修改射线检测参数
        this._raycaster_params.Line.threshold = this._threeMapconfig.layerZ;

        //主地图的绘制
        const parentMap = new THREE.Object3D();
        parentMap.mapProperties = inputData.properties
        parentMap.mapObject = "mainMapGroup";
        //没有子地图，才需要绘制主地图
        if (subMapsParas.length === 0) {
            // if(this._threeMapconfig.polygonStyle.shapeStyle.show){
                pDrawBack.shapes.forEach(shape => {
                    const geometry = new THREE.ExtrudeGeometry(
                        shape,
                        {
                            depth: this._threeMapconfig.layerZ * this._threeMapconfig.polygonStyle.shapeStyle.depthSize,
                            bevelEnabled: false, //无倒角/斜角
                        }
                    )
                    const extrudeMaterials = [new THREE.MeshBasicMaterial({
                        color: this._threeMapconfig.polygonStyle.shapeStyle.fillColor,
                    }), new THREE.MeshBasicMaterial({
                        color: this._threeMapconfig.polygonStyle.shapeStyle.extrudeColor,
                    })]
                    const mesh = new THREE.Mesh(geometry, extrudeMaterials)
                    mesh.mapObject = "mapShape"
                    mesh.visible = this._threeMapconfig.polygonStyle.shapeStyle.show;
                    mesh.position.set(0, 0, -this._threeMapconfig.layerZ * this._threeMapconfig.polygonStyle.shapeStyle.depthSize)
                    parentMap.add(mesh)
                })
            // }
            // if (this._threeMapconfig.polygonStyle.lineStyle.show) {
                pDrawBack.lines.forEach(lineGeometry => {
                    const frame = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({
                        color: this._threeMapconfig.polygonStyle.lineStyle.color
                    }));
                    frame.mapObject = "mapLine"
                    frame.visible = this._threeMapconfig.polygonStyle.lineStyle.show;
                    parentMap.position.set(0, 0, this._threeMapconfig.layerZ * 2)
                    parentMap.add(frame)
                })
            // }
            
        }        
        this._mapAddGroup.push(parentMap);
        this._scene.add(parentMap);


        //再来处理子地图
        subMapsParas.forEach(subParas => {
            const subMap = new THREE.Object3D();
            subMap.mapProperties = subParas.mapProperties
            // debugger;
            subMap.mapObject = "subMapGroup";
            // if (this._threeMapconfig.polygonStyle.shapeStyle.show) {
                subParas.shapes.forEach(shape => {
                    const geometry = new THREE.ExtrudeGeometry(
                        shape,
                        {
                            depth: this._threeMapconfig.layerZ * this._threeMapconfig.polygonStyle.shapeStyle.depthSize,
                            bevelEnabled: false, //无倒角/斜角
                        }
                    )
                    //创建网格
                    // 准备一些材质
                    const extrudeMaterials = [new THREE.MeshBasicMaterial({
                        color: subMap.mapProperties.fillColor? subMap.mapProperties.fillColor : this._threeMapconfig.polygonStyle.shapeStyle.fillColor,
                        // transparent: true,
                        // opacity: this._threeMapconfig.polygonStyle.shapeStyle.opacity,
                    }), new THREE.MeshBasicMaterial({
                        color: this._threeMapconfig.polygonStyle.shapeStyle.extrudeColor,
                        // transparent: true,
                        // opacity: this._threeMapconfig.polygonStyle.shapeStyle.opacity,
                    })]
                    const mesh = new THREE.Mesh(geometry, extrudeMaterials)
                    mesh.mapObject = "mapShape";
                    mesh.visible = this._threeMapconfig.polygonStyle.shapeStyle.show;
                    mesh.position.set(0, 0, -this._threeMapconfig.layerZ * this._threeMapconfig.polygonStyle.shapeStyle.depthSize)
                    subMap.add(mesh)
                })
            // }
            // if (this._threeMapconfig.polygonStyle.lineStyle.show) {
                subParas.lines.forEach(lineGeometry => {
                    const frame = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({
                        color: this._threeMapconfig.polygonStyle.lineStyle.color
                    }));
                    frame.mapObject = "mapLine"
                    frame.visible = this._threeMapconfig.polygonStyle.lineStyle.show;
                    frame.position.set(0, 0, this._threeMapconfig.layerZ)
                    subMap.add(frame)
                })
            // }
            this._mapAddGroup.push(subMap);
            this._scene.add(subMap);
        });



        // 为倾角计算准备数据
        let maxYLine = this._size.y;
        let maxXLine = maxYLine * this._threeMapconfig.parentDom.width / this._threeMapconfig.parentDom.height;
        if (this._size.x / this._size.y > this._threeMapconfig.parentDom.width / this._threeMapconfig.parentDom.height) {
            maxXLine = this._size.x;
            maxYLine = maxXLine * this._threeMapconfig.parentDom.height / this._threeMapconfig.parentDom.width;
            this._onScreenWidth = this._threeMapconfig.parentDom.width;
            this._onScreenHight = this._onScreenWidth * this._size.y / this._size.x;
        } else {
            this._onScreenHight = this._threeMapconfig.parentDom.height;
            this._onScreenWidth = this._onScreenHight * this._size.x / this._size.y;
        }
        this._toCD.distance = (maxYLine / 2 * Math.cos(THREE.MathUtils.degToRad(this._threeMapconfig.dip))) / Math.tan(THREE.MathUtils.degToRad(this._camera.fov / 2));        
        //倾角情况下，重新计算 this._toCD
        if (this._threeMapconfig.dip > 0) {
            //以X和Y方向顶边计算，先不考虑纵横比
            const arfa = this._threeMapconfig.dip
            const theta = this._camera.fov
            //A = Y * （sin(90- θ/2- α）/ sin(θ))
            let A = this._size.y * this._sinValueFordegree(90 - theta / 2 - arfa) / this._sinValueFordegree(theta);
            //B = A * （sin(θ/2)/sin(90- α))
            let B = A * this._sinValueFordegree(theta / 2) / this._sinValueFordegree(90 - arfa);
            //D= A *（sin(90-θ/2+ α)/sin(90- α))
            let D = A * this._sinValueFordegree(90 - theta / 2 + arfa) / this._sinValueFordegree(90 - arfa)
            //Amore = D * sin(90)/sin(90- θ/2)
            const Amore = D / this._sinValueFordegree(90 - theta / 2)
            let iY = 2 * D * this._sinValueFordegree(theta / 2) / this._sinValueFordegree(90 - theta / 2)
            let iX = this._size.x * Amore / A

            //属于横向长条形，x方向顶边
            if (iX / iY > this._threeMapconfig.parentDom.width / this._threeMapconfig.parentDom.height) {
                //beta函数方程，采用逼近的算法
                let beta = this._camera.fov
                while (beta > 0) {
                    beta = beta - 0.5;
                    // A/Amore = sin(90-β/2)sin(90-α)/sin(90-β/2+α)
                    // X/iX = A/Amore
                    iX = this._size.x * this._sinValueFordegree(90 - beta / 2 + arfa) / (this._sinValueFordegree(90 - beta / 2) * this._sinValueFordegree(90 - arfa))
                    // D/(iYY/2) = sin(90-θ/2)/sin(θ)
                    const iYY = iX * this._threeMapconfig.parentDom.height / this._threeMapconfig.parentDom.width;
                    // D/(iYY/2) = sin(90-θ/2)/sin(θ/2)
                    D = this._sinValueFordegree(90 - theta / 2) / this._sinValueFordegree(theta / 2) * iYY / 2
                    //A/D=sin(90-α)/sin(90-β/2+ α)
                    A = this._sinValueFordegree(90 - arfa) / this._sinValueFordegree(90 - beta / 2 + arfa) * D
                    //B/D = sin(β/2)/sin(90-β/2+ α)
                    B = this._sinValueFordegree(beta / 2) / this._sinValueFordegree(90 - beta / 2 + arfa) * D
                    //A/Y= sin(90-α- β/2)/sin(β)
                    const Y = A * this._sinValueFordegree(beta) / this._sinValueFordegree(90 - arfa - beta / 2)
                    if (Y <= this._size.y) break;
                }
            } else {//属于纵向长条形，y方向顶边,            
            }
            const dY = this._size.y / 2 - B
            this._toCD.distance = D;
            this._toCD.center.set(this._toCD.center.x, this._toCD.center.y - dY, this._toCD.center.z);            
        }

        if(this._controller){
            this._controller.target.set(this._toCD.center.x,this._toCD.center.y ,this._toCD.center.z);
        }

        

        //准备摄像头移动的原始信息
        if (this._CD.center) {
            this._fromCD.center = this._CD.center.clone();
            this._fromCD.distance = this._CD.distance;
        } else {
            this._CD.center = this._toCD.center.clone();
            this._CD.distance = this._toCD.distance;

            this._fromCD.center = this._toCD.center.clone();
            this._fromCD.distance = this._toCD.distance;
        }

        //原地图仍显示，但位置要下移，以解决 面重叠 闪烁的问题。
        if (this._mapGroup) {
            this._mapGroup.forEach(obj => {
                obj.translateZ(-this._threeMapconfig.layerZ);
            })
        }
        

    }

    onWindowResize(config) {
        this.updateConfig(config)
        this._camera.aspect = this._threeMapconfig.parentDom.width / this._threeMapconfig.parentDom.height;
        this._camera.updateProjectionMatrix();
        this._renderer.setSize(this._threeMapconfig.parentDom.width, this._threeMapconfig.parentDom.height);
        this._css2Renderer.setSize(this._threeMapconfig.parentDom.width, this._threeMapconfig.parentDom.height);
    }

    drawTextLabel(textList, pointList, divModel) {
        for (let i = 0; i < textList.length; i++) {
            const [x, y] = this._mapBase.projection(pointList[i])
            const label = new CSS2DObject(textList[i]);
            label.position.set(x, -y, this._threeMapconfig.layerZ * this._htmlLayer);
            this._scene.add(label)
            this._htmlGroup.push(label)
        }

    }

    removeAllTextLabel() {
        if (this._htmlGroup) {
            this._htmlGroup.forEach(obj => {
                this._scene.remove(obj);
            })
            this._htmlGroup = [];
        }
    }

    drawWavePoint(pointList, r) {
        for (let i = 0; i < pointList.length; i++) {
            const [x, y] = this._mapBase.projection(pointList[i])
            const wave = this._waveMarkerBuilder.create(r)
            wave.position.set(x, -y, this._threeMapconfig.layerZ * this._waveLayer);
            this._scene.add(wave)
            this._waveGroup.push(wave)
        }

    }

    removeAllWavePoint() {
        if (this._waveGroup) {
            this._waveGroup.forEach(obj => {
                this._scene.remove(obj);
            })
            this._waveGroup= [];
        }
    }

    drawPiePoint(pointList, rList, cList) {

        for (let i = 0; i < pointList.length; i++) {
            const [x, y] = this._mapBase.projection(pointList[i])
            const geometry = new THREE.CircleGeometry(rList[i], 32);
            var material = new THREE.MeshBasicMaterial({ color: cList[i],transparent:true,opacity:1 });
            var pine = new THREE.Mesh(geometry, material);
            pine.position.set(x, -y, this._threeMapconfig.layerZ * this._pieLayer);
            this._scene.add(pine)
            this._pieGroup.push(pine)

        }
    }


    removeAllPiePoint() {
        if (this._pieGroup) {
            this._pieGroup.forEach(obj => {
                this._scene.remove(obj);
            })
            this._pieGroup= []
        }
    }

    removeHeatMap() {
        if (this._heatMapPlane) {
            this._scene.remove(this._heatMapPlane);
            this._heatMapPlane = null;
        }
    }

    drawHeatMap(pList) {

        const maxLine = Math.max(this._size.x, this._size.y, this._size.z);
        const heatMapMaterial = new HeatMaterial({
            points: pList,
            width: this._onScreenWidth,
            height: this._onScreenHight,
            size: this._size,
            center: this._toCD.center,
            z: maxLine / this._heatMapHeight
        })
        // debugger
        const heatMapGeo = new THREE.PlaneGeometry(this._size.x, this._size.y, this._onScreenWidth, this._onScreenHight)
        this._heatMapPlane = new THREE.Mesh(heatMapGeo, heatMapMaterial)
        this._heatMapPlane.position.set(this._toCD.center.x, this._toCD.center.y, this._threeMapconfig.layerZ);
        this._scene.add(this._heatMapPlane)
    
    }

}



