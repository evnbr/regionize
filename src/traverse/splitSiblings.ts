import { TraverseHandler } from '../types';
import { isElement, isTextNode } from '../guards';
import { isAllWhitespace } from './stringUtils';
  

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

  // Couldn't add anything, proposed.added is empty
  return splitPoint;
}
