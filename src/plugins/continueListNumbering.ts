import { isSplit } from '../attributeHelper';
import type { Plugin } from '../types';

export const continueListNumbering = (): Plugin => ({
  selector: 'ol',
  onSplit: (original: HTMLElement, remainder: HTMLElement) => {
    // restart numbering
    let prevStart = 1; // null is implicitly 1, not 0
  
    if (original.hasAttribute('start')) {
      // the OL doesn't start from 1 either
      prevStart = parseInt(original.getAttribute('start')!, 10);
    }
    const nextChild = remainder.firstElementChild;
    if (nextChild && nextChild.tagName === 'LI' && isSplit(nextChild)) {
      // this list item actually started in the previous region
      prevStart -= 1;
    }
    const prevCount = original.children.length;
    const newStart = prevStart + prevCount;
    remainder.setAttribute('start', `${newStart}`);
  }
});
