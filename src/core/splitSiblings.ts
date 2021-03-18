import { TraverseHandler } from '../types';
import { isElement, isTextNode } from '../util/domUtils';
import { isAllWhitespace } from '../util/stringUtils';
  

export interface SiblingSplitPoint {
  added: ChildNode[];
  remainders: ChildNode[];
}

// the first node that's either an element, or a textnode with content
const getFirstContentNode = (nodes: ChildNode[]): ChildNode | undefined => {
  return nodes.find((node) => {
    if (isTextNode(node) && node.nodeValue && !isAllWhitespace(node.nodeValue)) {
      return true;
    }
    if (isElement(node)) return true;
    return false;
  });
}

const getLastContentNode = (elements: ChildNode[]): ChildNode | undefined => {
  return getFirstContentNode([...elements].reverse());;
}

// The proposed SiblingSplitPoint will be the maximum amount of added siblings
// that fit before the region overflows, with the minimum remaunder. Therefore, if the
// proposal is not valid, the only direction to go is to try removing added nodes one by one.

export const findValidSplit = (
  original: SiblingSplitPoint,
  canSplitBetween: TraverseHandler['canSplitBetween']
): SiblingSplitPoint => {
  let splitPoint = original;

  while (splitPoint.added.length > 0) {
    const { added, remainders } = splitPoint;

    const prevEl = getLastContentNode(added);
    const nextEl = getFirstContentNode(remainders);
  
    if (!nextEl || !prevEl || !isElement(nextEl) || !isElement(prevEl)) {
      // If we are not between two HTMLElements, the split can be considered valid.
      // Plugins to prevent split can only run on elements. 
      return splitPoint;
    }
  
    if (canSplitBetween(prevEl, nextEl)) {
      return splitPoint;
    }
    
    // try removing the last node and adding it to the remainder
    const shifted = added.pop()!;
    splitPoint = {
      added: [...added],
      remainders: [shifted, ...remainders]
    };
  }

  // Proposed.added is empty. There is no way to add any of these
  // sibling nodes while fulfilling the relevant plugins. This
  // result will cause the parent element to also be removed.
  return splitPoint;
}
