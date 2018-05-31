# Regionize

[![Build Status](https://travis-ci.org/evnbr/regionize.svg?branch=master)](https://travis-ci.org/evnbr/regionize)
[![codecov](https://codecov.io/gh/evnbr/regionize/branch/master/graph/badge.svg)](https://codecov.io/gh/evnbr/regionize)

A bare-bones library to flow HTML through multiple regions,
like [CSS Regions](http://alistapart.com/blog/post/css-regions-considered-harmful).

The user is responsible for providing the next element when content
overflows— the library assumes provided elements are empty, already in the document, and
have an intrinsic height.

Powers [bindery.js](https://evanbrooks.info/bindery/).
