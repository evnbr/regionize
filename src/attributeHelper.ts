// ------
//
// Utils

// Actually add/remove atribute rather than set boolean strng
const toggleAttr = (el: Element, attr: string, newVal = true) => {
  if (newVal) {
    el.setAttribute(attr, 'true');
  }
  else {
    el.removeAttribute(attr);
  }
};

// ------
//
// Is Split

const IS_SPLIT_ATTR = 'data-region-split';

export const isSplit = (el: Element) => {
  return el.hasAttribute(IS_SPLIT_ATTR);
};

export const setIsSplit = (el: Element, newVal = true) => {
  toggleAttr(el, IS_SPLIT_ATTR, newVal);
};

// ------
//
// Is Region

const IS_REGION_ATTR = 'data-region';

export const isRegion = (el: Element) => {
  return el.hasAttribute(IS_REGION_ATTR);
};

export const setIsRegion = (el: Element, newVal = true) => {
  toggleAttr(el, IS_REGION_ATTR, newVal);
};

// Walk up the dom, checking parents against the callback,
// until one returns true or we hit a region boundary
const isInsideElementMatching = (el: Element, cb: ((el: Element) => boolean)): boolean => {
  if (isRegion(el)) {
    return false;
  }

  if (cb(el)) {
    return true;
  }

  if (el.parentElement) {
    return isInsideElementMatching(el.parentElement, cb);
  }

  return false;
};

// ------
//
// Ignore Overflow

const IGNORE_OVERFLOW_ATTR = 'data-ignore-overflow';

export const isIgnoreOverflow = (el: Element) => {
  return el.hasAttribute(IGNORE_OVERFLOW_ATTR);
};

export const setIgnoreOverflow = (el: Element, newVal = true) => {
  toggleAttr(el, IGNORE_OVERFLOW_ATTR, newVal);
};

export const isInsideIgnoreOverflow = (element: HTMLElement): boolean => {
  return isInsideElementMatching(element, isIgnoreOverflow);
};
