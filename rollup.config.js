import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import minify from 'rollup-plugin-babel-minify';

import pkg from './package.json';


const extend = (a, b) => Object.assign({}, a, b);

const baseConfig = {
  input: 'src/index.js',
};

const baseOutput = {
  name: 'Regionize',
  banner: `/* 📖 Regionize v${pkg.version} */`,
};

export default [
  // browser-friendly UMD build
  extend(baseConfig, {
    output: extend(baseOutput, {
      file: pkg.browser,
      format: 'umd',
      sourcemap: true,
    }),
    plugins: [
      resolve(),
      commonjs(),
    ],
  }),

  // minified browser-friendly build
  extend(baseConfig, {
    output: extend(baseOutput, {
      file: 'dist/regionize.min.js',
      format: 'iife',
      sourcemap: true,
    }),
    plugins: [
      resolve(),
      commonjs(),
      minify({
        comments: false,
      }),
    ],
  }),

  // CommonJS (for Node) and ES module (for bundlers) build.
  extend(baseConfig, {
    output: [
      extend(baseOutput, { file: pkg.main, format: 'cjs' }),
      extend(baseOutput, { file: pkg.module, format: 'es' }),
    ],
    plugins: [
      resolve(),
    ],
  }),
];
