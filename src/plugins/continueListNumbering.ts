import { isSplit } from '../attributeHelper';
import type { Plugin } from '../types';

export const continueListNumbering = (): Plugin => ({
  selector: 'ol',
  onSplitFinish: (original: HTMLElement, remainder: HTMLElement) => {
    // restart numbering
    let prevStart = 1; // null is implicitly 1, not 0

    if (original.hasAttribute('start')) {
      // the OL doesn't start from 1 either
      prevStart = parseInt(original.getAttribute('start')!, 10);
    }

    let prevCountItemsAdded = original.children.length;
    const nextChild = remainder.firstElementChild;
    if (nextChild && nextChild.tagName === 'LI' && isSplit(nextChild)) {
      // the last list item didn't fully fit, some remainder
      // will be added to the next region. the remainder should
      // not have an incremented item number.
      prevCountItemsAdded -= 1;
    }
    const newStart = prevStart + prevCountItemsAdded;
    remainder.setAttribute('start', `${newStart}`);
  },
});
