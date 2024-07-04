//import * as THREE from 'three';
function readJSONFile(filename, callback, errorback) {

    fetch(filename)
        .then(response => {
            //console.log(response);
            return response.json()
        }
        )
        .then(
            data => {
                //console.log(data);
                if (callback) callback(data);
            }
        )
        .catch(
            error => {
                console.log(error);
                if (errorback) errorback(error);
            }
        );
}


function deepMerge(defaultConfig, customConfig) {
    const mergedConfig = { ...defaultConfig }; // 浅拷贝默认配置对象  
    // 遍历自定义配置对象的所有属性  
    for (let key in customConfig) {
        if (customConfig.hasOwnProperty(key)) {
            // 如果当前属性是对象，则递归合并  
            if (typeof customConfig[key] === 'object' && customConfig[key] !== null && typeof mergedConfig[key] === 'object' && mergedConfig[key] !== null) {
                mergedConfig[key] = deepMerge(mergedConfig[key], customConfig[key]);
            } else {
                // 否则直接覆盖默认配置中的值  
                mergedConfig[key] = customConfig[key];
            }
        }
    }
    return mergedConfig;
}


function linearInterpolate(x0, y0, x1, y1, x) {
    // 检查 x 是否在 x0 和 x1 之间  
    if (x < Math.min(x0, x1) || x > Math.max(x0, x1)) {
        throw new Error('x is not between x0 and x1');
    }

    // 计算插值  
    let slope = (y1 - y0) / (x1 - x0); // 计算斜率  
    let y = y0 + slope * (x - x0); // 根据斜率计算 y 值  

    return y;
}

function interpolateColor(minColor, maxColor, minValue, maxValue, targetValue) {
    // 确保颜色值是数值类型  
    minColor = Number(minColor);
    maxColor = Number(maxColor);

    // 将颜色数值分解为RGB组件（这里假设是32位数值，每8位一个颜色通道）  
    function colorToRgb(color) {
        return [
            (color >> 16) & 0xFF, // 红色通道  
            (color >> 8) & 0xFF,  // 绿色通道  
            color & 0xFF          // 蓝色通道  
        ];
    }

    // 将RGB组件组合成颜色数值  
    function rgbToColor(rgb) {
        return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
    }

    // 线性插值函数  
    function lerp(a, b, t) {
        return a + t * (b - a);
    }

    // 将颜色数值分解为RGB数组  
    const minColorRgb = colorToRgb(minColor);
    const maxColorRgb = colorToRgb(maxColor);

    // 计算插值比例  
    const t = (targetValue - minValue) / (maxValue - minValue);

    // 对每个RGB通道进行插值  
    const interpolatedRgb = [
        Math.round(lerp(minColorRgb[0], maxColorRgb[0], t)),
        Math.round(lerp(minColorRgb[1], maxColorRgb[1], t)),
        Math.round(lerp(minColorRgb[2], maxColorRgb[2], t))
    ];

    // 将插值后的RGB数组组合成颜色数值  
    const interpolatedColor = rgbToColor(interpolatedRgb);

    // 转换为16进制字符串（如果需要的话，但题目要求返回16进制数值）  
    // const interpolatedColorHex = interpolatedColor.toString(16).padStart(6, '0');  

    // 返回插值颜色的16进制数值  
    return interpolatedColor;
}

export { readJSONFile,  deepMerge, linearInterpolate, interpolateColor }