import {
  AppendStatus,
  AppendResult,
  OverflowDetector,
  TraverseHandler,
} from '../types';

import { isTextNode, isContentElement, isElement } from '../guards';
import { addTextNodeWithoutSplit, addTextUntilOverflow } from './addTextNode';
import { findValidSplit, SiblingSplitPoint } from './splitSiblings';
import { isSplit, setIsSplit, isInsideIgnoreOverflow } from '../attributeHelper';

const cloneWithoutChildren = <T extends Node>(el: T) => el.cloneNode(false) as T;
const cloneWithChildren = <T extends Node>(el: T) => el.cloneNode(true) as T;

export class Traverser {
  handler: TraverseHandler;

  constructor(handler: TraverseHandler) {
    this.handler = handler;
  }

  private applySplitRules(original: HTMLElement, remainder: HTMLElement) {

    const cloneWithRules = (el: HTMLElement): HTMLElement => {
      const clone = cloneWithChildren(el); // could be th > h3 > span;
      this.applySplitRules(el, clone);
      return clone;  
    };

    setIsSplit(remainder);
    this.handler.onSplit(
      original,
      remainder,
      cloneWithRules,
    );
  }

  private canSplitInside(element: HTMLElement, region: OverflowDetector): boolean {
    if (!this.handler.canSplitInside(element)) {
      return false;
    }
    if (element === region.element) {
      return true;
    }
    if (element.parentElement) {
      return this.canSplitInside(element.parentElement, region);
    }
    return true;
  }

  private shouldTraverseChildren(element: HTMLElement): boolean {
    if (this.handler.shouldTraverse(element)) {
      // The caller has indicated the region size could change as a result of traversing the elements,
      // for example if an image needs to be loaded and measured, or if a footnote would be added
      // that eats into the available space for content,
      // If so, checking for overflow is not accurate.
      return true;
    }
    return false;
  }

  // TODO: Can we conect to progress estimator?
  // private async ensureImageLoaded(img: HTMLImageElement) {
  //   this.emitProgress('imageLoading');
  //   const waitTime = await ensureImageLoaded(img);
  //   this.estimator?.addWaitTime(waitTime);
  //   this.emitProgress('inProgress');
  // }

  private async addText(textNode: Text, parent: HTMLElement, region: OverflowDetector) {
    const shouldSplitText = this.canSplitInside(parent, region) && !isInsideIgnoreOverflow(parent);

    if (shouldSplitText) {
      return await addTextUntilOverflow(textNode, parent, region.hasOverflowed);
    } else {
      return await addTextNodeWithoutSplit(textNode, parent, region.hasOverflowed);
    }
  }

  private async addChild(
    child: Text | HTMLElement,
    parent: HTMLElement,
    region: OverflowDetector,
  ): Promise<AppendResult> {
    if (isTextNode(child)) {
      return await this.addText(child, parent, region);
    }
    return this.addElement(child, parent, region);
  }

  private splitSiblings(proposed: SiblingSplitPoint): SiblingSplitPoint {
    const siblings = findValidSplit(proposed, this.handler.canSplitBetween.bind(this.handler));

    for (let sib of siblings.remainders) {
      if (isElement(sib)) {
        // TODO: safely remove recursively
        // TODO: potentially called twice because child may already hace been removed.
        sib.remove();
        this.handler.onAddCancel(sib);
      }
    }

    return siblings;
  }

  private async traverseChildren(
    element: HTMLElement,
    region: OverflowDetector,
  ): Promise<AppendResult> {

    // ignore scripts, comments, etc when iterating
    const remainingChildren = [...element.childNodes]
      .filter((c): c is (HTMLElement | Text) => {
        return isContentElement(c) || isTextNode(c);
      });
    
    element.innerHTML = ''; // Clear children

    if (region.hasOverflowed() && !isInsideIgnoreOverflow(element)) {
      // Doesn't fit when empty
      return this.cancelAndCreateNoneResult(element, remainingChildren);
    }

    while (remainingChildren.length > 0) {
      // pop the first child off
      const child = remainingChildren.shift()!;

      let childResult = await this.addChild(child, element, region);

      switch (childResult.status) {
        case AppendStatus.ADDED_NONE:
          const siblings = this.splitSiblings({
            added: [...element.childNodes],
            remainders: [child]
          });
          const overflowingChildren = [...siblings.remainders, ...remainingChildren];

          if (element.childNodes.length == 0) {
            // Element seemed to fit when empty, but failed to add any portion of its
            // first child. Reject entirely and restart in the next region.
            return this.cancelAndCreateNoneResult(element, overflowingChildren);
          }
          return this.createRemainderResult(element, overflowingChildren);

        case AppendStatus.ADDED_PARTIAL:
          return this.createRemainderResult(element, [childResult.remainder, ...remainingChildren]);

        case AppendStatus.ADDED_ALL:
          // Move on to the next sibling
          continue;  
      }
    }

    // Successfully added all children
    return {
      status: AppendStatus.ADDED_ALL,
    };
  }

  async addElement(
    element: HTMLElement,
    parentEl: HTMLElement | undefined,
    region: OverflowDetector,
  ): Promise<AppendResult> {

    if (!isSplit(element)) {
      // Only apply at the beginning of element, not when inserting the remainder.
      // TODO: log progress if this is an image.
      await this.handler.onAddStart(element);
    }

    const parent = parentEl ?? region;
    parent.append(element);

    const hasOverflowed = region.hasOverflowed();

    if (hasOverflowed && !this.canSplitInside(element, region)) {

      // If we can't clear and traverse children, we already know it doesn't fit.
      return this.cancelAndCreateNoneResult(element);
    }

    if (hasOverflowed || this.shouldTraverseChildren(element)) {
      const childrenResult = await this.traverseChildren(element, region);
      if (childrenResult.status !== AppendStatus.ADDED_ALL) {
        return childrenResult;
      }
    }

    // Success, we finished adding this entire element without overflowing the region.
    await this.handler.onAddFinish(element);

    return {
      status: AppendStatus.ADDED_ALL,
    };
  }

  private createRemainderResult(original: HTMLElement, contents: Node[]): AppendResult {
    const remainder = cloneWithoutChildren(original);
    remainder.append(...contents);

    this.applySplitRules(original, remainder);

    return {
      status: AppendStatus.ADDED_PARTIAL,
      remainder: remainder,
    };
  }

  private cancelAndCreateNoneResult(element: HTMLElement, contentsToRestore?: Node[]): AppendResult {
    element.remove();

    if (contentsToRestore) {
      element.append(...contentsToRestore);
    }

    this.handler.onAddCancel(element);

    return {
      status: AppendStatus.ADDED_NONE,
    };
  }

}
