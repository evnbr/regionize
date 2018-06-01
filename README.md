# Regionize

[![Build Status](https://travis-ci.org/evnbr/regionize.svg?branch=master)](https://travis-ci.org/evnbr/regionize)
[![codecov](https://codecov.io/gh/evnbr/regionize/branch/master/graph/badge.svg)](https://codecov.io/gh/evnbr/regionize)

A bare-bones library to flow HTML through multiple regions,
like [CSS Regions](http://alistapart.com/blog/post/css-regions-considered-harmful).

The user is responsible for providing the next element when content
overflows— the library assumes provided elements are empty, already in the document, and
have an intrinsic height.

Powers [bindery.js](https://evanbrooks.info/bindery/).

## Usage

### Create a region

```js
new Region(
  element // HTML Element
);
```

### Start a flow

```js
await flowIntoRegions(
  content,    // HTML Element
  makeRegion, // Function that returns a new Region
  applySplit, // Function to apply extra styling after splitting
  canSplit,   // Function to determine if its okay to split element
  beforeAdd,  // Function called before element is added
  afterAdd    // Function called after element is added
);
```


## Example
```js
import { Region, flowIntoRegions } from 'regionize';

const makeRegion = () => {
  const div = document.createElement('div');
  div.style.height = '200px'; // Region must have size
  div.style.width = '200px';
  document.body.appendChild(div); // Region must be in DOM
  return new Region(el); // Instantiate a region with an HTML Element
}

const applySplit = (el, clone) => {
  // For example, the second part of a paragraph
  // that was split between pages shouldn't be indented
  clone.style.textIndent = '0';
}
const canSplit = el => {
  // Keep figures from breaking across pages
  return !el.matches('figure');
}

const beforeAdd = () => {};
const afterAdd = () => {};

const render = async (content) => {
  const content = document.querySelector('#content');
  await flowIntoRegions(content, makeRegion, applySplit, canSplit, beforeAdd, afterAdd);
  alert(`${document.body.childNodes.length} regions added!`);
}
render();
```
