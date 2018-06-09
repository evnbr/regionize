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

```
npm install --save regionize
```

### Create a region

```js
import { Region } from 'regionize';

...

const box = new Region(
  element // HTML Element
);
```

### Start a flow

```js
import { flowIntoRegions } from 'regionize';

...

await flowIntoRegions({
  // required
  content,       // HTML Element
  createRegion,  // () => Region;

  // optional
  canSplit,
  applySplit,
  shouldTraverse,
  beforeAdd,
  afterAdd,
});
```

### Flow options

#### content `HTMLElement`;

#### createRegion `() => Region`;
Called every time the previous region overflows. This method must always
return a new Region created from an element. The region
must have an intrinsic size when empty, and must already
be added to the DOM.

#### canSplit `(elmt: HTMLElement) => Bool`;
By default, canSplit returns true, so a single element may be split between page.
Return false if the element should not be split between two pages,
for example if it is an image or figure. This
means the element will be shifted to the next page instead.

#### applySplit `(elmt: HTMLElement, clone: HTMLElement) => null`;
Elements are cloned when they split between pages. Use this method
to apply extra styling after splitting. For example, only the true
start of a paragraph should be indented.

#### shouldTraverse `(elmt: HTMLElement) => Bool`;
By default, shouldTraverse returns false, so nodes are added in chunks when
possible. Return true if the content region could change size as a result of
traversal. For example, bindery.js will true if the region contains a footnote.

#### beforeAdd `(elmt: HTMLElement, nextPage: Function) => null`;
Called before an element is added to a region. For example,
bindery.js uses this opportunity to call nextPage() if this element
should start on a new page.

#### afterAdd `(elmt: HTMLElement, nextPage: Function) => null`;
Called after element is added to a region.


## Example
```js
import { Region, flowIntoRegions } from 'regionize';

const createRegion = () => {
  const div = document.createElement('div');
  div.style.height = '200px'; // Region must have size
  div.style.width = '200px';
  document.body.appendChild(div); // Region must be in DOM
  return new Region(el); // Instantiate a region with an HTML Element
}

// The second part of a paragraph that flows
// between pages shouldn't be indented
const applySplit = (el, clone) => clone.style.textIndent = '0';

// Keep figures from breaking across pages
const canSplit = el => !el.matches('figure');

const render = async () => {
  const content = document.querySelector('#content');
  await flowIntoRegions({ content, createRegion, canSplit, applySplit });
}
render();
```
