import copy from "rollup-plugin-copy";
import image from '@rollup/plugin-image';
import terser from '@rollup/plugin-terser';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: "src/three_visual_map.js",
    output: [
      {
        file: "dist/three-visual-map.esm.js",
        format: "esm",
        name: "three-visual-map"
      },
      {
        file: "dist/three-visual-map.cjs.js",
        format: "cjs",
        name: "three-visual-map"
      },
      {
        file: "dist/three-visual-map.umd.js",
        format: "umd",
        name: "three-visual-map"
      }
    ],
    plugins: [
      nodeResolve(), // 查找和打包node_modules中的第三方模块
      image(),
      terser(),
      commonjs(),
    ]
  },
  {
    input: "src/tools/common_utils.js",
    output: [
      {
        file: "dist/tools/common_utils.esm.js",
        format: "esm",
        name: "common_utils"
      },
      {
        file: "dist/tools/common_utils.cjs.js",
        format: "cjs",
        name: "common_utils"
      },
      {
        file: "dist/tools/common_utils.umd.js",
        format: "umd",
        name: "common_utils"
      }
    ],
    plugins: [
      nodeResolve(), // 查找和打包node_modules中的第三方模块
      image(),
      terser(),
      commonjs(),
      //原来用于copy文件README.md和package.json，之后发现npm publish会自动copy，所以注释掉了
      // copy({
      //   targets: [
      //     { src: 'package.json', dest: 'dist' }
      //   ],
      //   verbose: true})
    ]
  }
];