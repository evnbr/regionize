import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import babel from 'rollup-plugin-babel';

import pkg from './package.json';

const extend = (a, b) => Object.assign({}, a, b);

const baseConfig = {
  input: 'build/index.js',
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
    plugins: [resolve(), commonjs()],
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
      terser({
        mangle: {
          properties: { keep_quoted: true },
        },
      }),
    ],
  }),

  // CommonJS (for Node)
  extend(baseConfig, {
    output: extend(baseOutput, {
      file: pkg.main,
      format: 'cjs',
    }),
    plugins: [
      resolve(),
      commonjs(),
      babel({
        runtimeHelpers: true,
        exclude: 'node_modules/**',
      }),
    ],
  }),

  // ES module (for bundlers)
  extend(baseConfig, {
    output: extend(baseOutput, {
      file: pkg.module,
      format: 'es',
    }),
    plugins: [resolve()],
  }),
];
