import { isSplit } from './isSplit';

const preserveNumbering = (
  original: HTMLElement,
  remainder: HTMLElement,
): void => {
  // restart numbering
  let prevStart = 1; // null is implicitly 1, not 0

  if (original.hasAttribute('start')) {
    // the OL doesn't start from 1 either
    prevStart = parseInt(original.getAttribute('start')!, 10);
  }
  const nextChild = remainder.firstElementChild;
  if (nextChild && nextChild.tagName === 'LI' && isSplit(nextChild)) {
    // the next list item is a continuation
    prevStart -= 1;
  }
  const prevCount = original.children.length;
  const newStart = prevStart + prevCount;
  remainder.setAttribute('start', `${newStart}`);
};

export default preserveNumbering;
