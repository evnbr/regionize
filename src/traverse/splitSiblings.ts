import { TraverseHandler } from '../types';
import { isElement, isTextNode } from '../guards';
import { isAllWhitespace } from './stringUtils';
  

export interface SplitSiblingResult {
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
  original: SplitSiblingResult,
  canSplitBetween: TraverseHandler['canSplitBetween']
): SplitSiblingResult => {
  let proposed = original;

  while (proposed.added.length > 0) {
    const { added, remainders } = proposed;

    const prevEl = getLastContentNode(added);
    const nextEl = getFirstContentNode(remainders);
  
    if (!nextEl || !prevEl || !isElement(nextEl) || !isElement(prevEl)) {
      // Breaks that are not between two HTMLElements cannot be prevented
      return proposed;
    }
  
    if (canSplitBetween(prevEl, nextEl)) {
      return proposed;
    }
    
    // try removing the last node and adding it to the remainder
    const shifted = added.pop()!;
    proposed = {
      added: [...added],
      remainders: [shifted, ...remainders]
    };
  }

  // Couldn't add anything
  return proposed;
}
  