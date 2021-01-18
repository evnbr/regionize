const IS_REGION_ATTR = 'data-region';
const IS_SPLIT_ATTR = 'data-region-split';

// Util to add/remove atribute rather than set boolean strng
const toggleAttr = (el: HTMLElement, attr: string, newVal = true) => {
  if (newVal) {
    el.setAttribute(attr, 'true');
  } else {
    el.removeAttribute(attr);
  }
}

// Util to walk up the dom, checking parents, until we hit a region boundary
const isInside = (el: HTMLElement, cb: ((el: HTMLElement) => boolean)): boolean => {
  if (isRegion(el)) {
    return false;
  }

  if (cb(el)) {
    return true;
  }

  if (el.parentElement) {
    return isInside(el.parentElement, cb);
  }

  return false;
}

// export const isInsideSplit = (el: HTMLElement) => {
//   return isInside(el, isSplit);
// };

export const isSplit = (el: HTMLElement) => {
  return el.hasAttribute(IS_SPLIT_ATTR);
};
export const setIsSplit = (el: HTMLElement, newVal = true) => {
  toggleAttr(el, IS_SPLIT_ATTR, newVal);
};

export const isRegion = (el: HTMLElement) => {
  return el.hasAttribute(IS_REGION_ATTR);
};
export const setIsRegion = (el: HTMLElement, newVal = true) => {
  toggleAttr(el, IS_REGION_ATTR, newVal);
};