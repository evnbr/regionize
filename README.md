# Regionize

⚠️ Note that the main branch is tracking a 1.0.0 refactor
which is in alpha and is still being stabilized. Documentation
has not been updated and refers to the 0.1.X version

[![npm](https://img.shields.io/npm/v/regionize.svg)](https://www.npmjs.com/package/regionize)
[![Build Status](https://travis-ci.com/evnbr/regionize.svg?branch=master)](https://travis-ci.com/evnbr/regionize)
[![codecov](https://codecov.io/gh/evnbr/regionize/branch/master/graph/badge.svg)](https://codecov.io/gh/evnbr/regionize)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/regionize.svg)

A bare-bones, asynchronous javascript library to flow HTML content across a
series of separate elements. It makes no attempt to handle the styling of
elements that break across regions.

Note that Regionize is inspired by the proposed [CSS Regions](http://alistapart.com/blog/post/css-regions-considered-harmful) spec, but does **not** attempt to polyfill that API.
Instead, it provides utilities to determine how much of an DOM tree and fit inside a statically-sized container, and how much overflows, in plain javascript.

Regionize powers [bindery.js](https://evanbrooks.info/bindery/).

## Usage

```
npm i -s regionize
```

TODO: docs