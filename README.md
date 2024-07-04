# three-visual-map

## 安装使用

## 参数说明

## 二次开发
### package.json

	"scripts": {
    "test": "jest",
    "build": "rollup --config rollup.config.js ", // 用于打包
    "example": "vite --force"   // 用于启动开发测试环境
  }

### 目录结构
1. assets目录，用于存放静态资源。包中使用的静态资源，最终会打包进js文件中。
2. docs目录，用于存放文档。
3. examples目录，用于存放示例,也可以作为开发的测试。
	1. data目录，存放示例数据。
4. python目录，用于存放python脚本。
	1. thinning_algorithm.py用于对地图数据进行精简。
	1. china_data目录，存放原始的中国省市区县地图数据。
5. src目录，用于存放源代码。

### 待完善功能
- 默认还是不要开启动画。
- 地壳贴图
- 边界流光
- resize 缩小时，three图没有跟着变化的问题。
- 接口d.ts文件
- readme及其徽章等
- 打包第三方，如果优化，减少大小