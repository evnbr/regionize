const IS_REGION_ATTR = 'data-region';
const IS_SPLIT_ATTR = 'data-region-split';
const IGNORE_OVERFLOW_ATTER = 'data-ignore-overflow';

// ---

// Utils

// Util to add/remove atribute rather than set boolean strng
const toggleAttr = (el: Element, attr: string, newVal = true) => {
  if (newVal) {
    el.setAttribute(attr, 'true');
  } else {
    el.removeAttribute(attr);
  }
}

// Walk up the dom, checking parents, until we hit a region boundary
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
}

// ---

// Is Split
export const isSplit = (el: Element) => {
  return el.hasAttribute(IS_SPLIT_ATTR);
};

export const setIsSplit = (el: Element, newVal = true) => {
  toggleAttr(el, IS_SPLIT_ATTR, newVal);
};

// ---

// Is Region

export const isRegion = (el: Element) => {
  return el.hasAttribute(IS_REGION_ATTR);
};

export const setIsRegion = (el: Element, newVal = true) => {
  toggleAttr(el, IS_REGION_ATTR, newVal);
};

// ---

// Ignore Overflow

export const isIgnoreOverflow = (el: Element) => {
  return el.hasAttribute(IGNORE_OVERFLOW_ATTER);
};

export const setIgnoreOverflow = (el: Element, newVal = true) => {
  toggleAttr(el, IGNORE_OVERFLOW_ATTER, newVal);
};

export const isInsideIgnoreOverflow = (element: HTMLElement): boolean => {
  return isInsideElementMatching(element, isIgnoreOverflow);
};
