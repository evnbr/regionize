import type { Plugin } from '../types';

export const preferMinHeight = (selector: string): Plugin => ({
  selector,
  canSplitInside: (el) => {
    return true;
    // return el.height >= preferredSize * 2
  },
});

// const isFittingAmountTooSmall = (el) => {
//   // just move to next page
//   return el.fittingHeight < rule.preferredHeight;
// }

// const isRemainderAmountTooSmall = (el) => {
//   // likely enough left over for next page
//   const estRemainderHeight = el.totalHeight - el.fittingHeight;
//   return estRemainderHeight < rule.preferredHeight;
// }

// if has preferred min height

// on add start, measure the element. if it is greater than min * 2, stash the size in X
// and mark it as a measured element.

// when checking for doesFit
// - check if theres a measuredAncestor. if so, apply the following
// - check if region has overflowed
//   - if not overflowing, check measuredAncestor isRemainderAmountTooSmall
//     - if remainderTooSmall, consider it overflowing. back up a step and move to next page.
//     - else, everything is fine. keep adding to this page.
//   - if isOverflowing
//     - check measuredAncestor isFittingAmountTooSmall
//        - if fittingTooSmall, none of it fits. move to next page
//        - else, consider as a partial fit. move to next page