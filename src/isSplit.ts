const IS_SPLIT_ATTR = 'data-region-split';

const isSplitAcrossRegions = (el: Element) => {
  return el.hasAttribute(IS_SPLIT_ATTR);
};

const setIsSplitAcrossRegions = (el: Element, newVal = true) => {
  if (newVal) {
    el.setAttribute(IS_SPLIT_ATTR, 'true');
  } else {
    el.removeAttribute(IS_SPLIT_ATTR);
  }
};

export { isSplitAcrossRegions, setIsSplitAcrossRegions };
