const IS_SPLIT_ATTR = 'data-region-split';

const isSplit = (el: Element) => {
  return el.hasAttribute(IS_SPLIT_ATTR);
};

const setIsSplit = (el: Element, newVal = true) => {
  if (newVal) {
    el.setAttribute(IS_SPLIT_ATTR, 'true');
  } else {
    el.removeAttribute(IS_SPLIT_ATTR);
  }
};

export { isSplit, setIsSplit };
