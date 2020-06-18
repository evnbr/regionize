const overflowAttr = 'data-ignore-overflow';
// Walk up the tree to see if we are within
// an overflow-ignoring node
const isInsideOverflowIgnoringElement = (element: HTMLElement): boolean => {
  if (element.hasAttribute(overflowAttr)) return true;
  if (element.parentElement)
    return isInsideOverflowIgnoringElement(element.parentElement);
  return false;
};

export default isInsideOverflowIgnoringElement;
