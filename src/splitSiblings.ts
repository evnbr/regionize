import { RegionizeConfig } from './types';
import { isElement } from './guards';
  

export interface SplitSiblingResult {
  added: ChildNode[];
  remainders: ChildNode[];
}

const getFirstElement = (elements: ChildNode[]): HTMLElement | undefined => {
  // the first HTMLElement in a list of child nodes (ignoring text/comment nodes)
  return elements.find(isElement);
}

const getLastElement = (elements: ChildNode[]): HTMLElement | undefined => {
  // the last HTMLElement in a list of child nodes (ignoring text/comment nodes)
  return [...elements].reverse().find(isElement);;
}

export const findValidSplit = (
  original: SplitSiblingResult,
  canSplitBetween: RegionizeConfig["canSplitBetween"]
): SplitSiblingResult => {
  let proposed = original;

  while (proposed.added.length > 0) {
    const { added, remainders } = proposed;

    const prevEl = getLastElement(added);
    const nextEl = getFirstElement(remainders);
  
    if (!nextEl || !prevEl) {
      return proposed;
    }
  
    if (canSplitBetween(prevEl, nextEl)) {
      return proposed;
    }
    
    // try overflowing one more node 
    const shifted = added.pop()!;
    proposed = {
      added: [...added],
      remainders: [shifted, ...remainders]
    };
  }

  return proposed;
}
  