import { TraverseHandler } from '../types';
import { AppendStatus, AppendResult } from './AppendResult';
import { OverflowContainer } from './OverflowContainer';
import { isTextNode, isContentElement, isElement } from '../util/domUtils';
import { appendTextAsBlock, appendTextByWord } from './appendTextNode';
import { findValidSplit, SiblingSplitPoint } from './splitSiblings';
import { isSplit, setIsSplit, isInsideIgnoreOverflow } from '../attributeHelper';
import { HeightManagedElement } from './HeightManagedElement';

const cloneWithoutChildren = <T extends Node>(el: T) => el.cloneNode(false) as T;
const cloneWithChildren = <T extends Node>(el: T) => el.cloneNode(true) as T;

export class ContainerFiller {
  handler: TraverseHandler;
  private currentContainer!: OverflowContainer;
  private currentMeasuredParent?: HeightManagedElement;

  constructor(handler: TraverseHandler) {
    this.handler = handler;
  }

  async addContent(content: HTMLElement, container: OverflowContainer): Promise<AppendResult> {
    this.currentContainer = container;
    return this.appendElement(content, undefined);
  }

  private applySplitRules(original: HTMLElement, remainder: HTMLElement) {

    const cloneWithRules = (el: HTMLElement): HTMLElement => {
      const clone = cloneWithChildren(el); // could be th > h3 > span;
      this.applySplitRules(el, clone);
      return clone;  
    };

    setIsSplit(remainder);
    this.handler.onSplitFinish(original,remainder, cloneWithRules);
  }

  private canSplitInside(element: HTMLElement): boolean {
    if (!this.handler.canSplitInside(element)) {
      return false;
    }
    if (element === this.currentContainer.element) {
      return true;
    }
    if (element.parentElement) {
      return this.canSplitInside(element.parentElement);
    }
    return true;
  }

  private shouldTraverseChildren(element: HTMLElement): boolean {
    if (this.handler.canSkipTraverse(element)) {
      // The caller has asserted the region size cannot change as a result of traversing the elements,
      // for example if an image needs to be loaded and measured, or if a footnote would be added
      // that eats into the available space for content,
      return false;
    }
    return true;
  }

  // TODO: Can we conect to progress estimator?
  // private async ensureImageLoaded(img: HTMLImageElement) {
  //   this.emitProgress('imageLoading');
  //   const waitTime = await ensureImageLoaded(img);
  //   this.estimator?.addWaitTime(waitTime);
  //   this.emitProgress('inProgress');
  // }

  private measuredParentCanSplit(): boolean {
    if (this.currentMeasuredParent === undefined) {
      return true;
    }

    return this.currentMeasuredParent?.canSplitAtCurrentHeights();
  }

  private async appendText(textNode: Text, parent: HTMLElement) {
    const shouldSplitText = this.canSplitInside(parent) && !isInsideIgnoreOverflow(parent);

    const doesFit = () => {
      return !this.currentContainer.hasOverflowed();
    }

    if (!shouldSplitText) {
      // No need to add by word
      return await appendTextAsBlock(textNode, parent, doesFit);
    }

    const canSplit = () => {
      return this.measuredParentCanSplit();
    }
    
    // Add text word by word
    return await appendTextByWord(textNode, parent, doesFit, canSplit);
  }

  private async appendNode(
    child: Text | HTMLElement,
    parent: HTMLElement,
  ): Promise<AppendResult> {
    if (isTextNode(child)) {
      return this.appendText(child, parent);
    }
    return this.appendElement(child, parent);
  }

  private async backupToValidSiblingSplit(proposed: SiblingSplitPoint): Promise<SiblingSplitPoint> {
    // First back up untl we canSplitBetween (ie keep together)
    let siblings = findValidSplit(
      proposed,
      (el, next) => this.handler.canSplitBetween(el, next)
    );

    // Then backup further until measuredParentCanSplit (ie orphans/widows)
    if (siblings.added.length > 0 && !this.measuredParentCanSplit()) {
      console.error(`TODO: Back up incrementally. Removing all ${siblings.added.length} for now`);
      siblings = {
        added: [],
        remainders: [...siblings.added, ...siblings.remainders]
      }
    }

    // Let plugins clean up
    for (let node of siblings.remainders) {
      await this.cancelAndRemove(node);
    }

    return siblings;
  }

  private async cancelAndRemove(node: ChildNode) {
    if (isElement(node)) {
      // TODO: safely remove recursively
      // TODO: potentially called twice because child may already hace been removed.
      await this.handler.onAddCancel(node);
    }
    node.remove();
  }

  private startManagingHeightIfNeeded(element: HTMLElement) {
    const minHeight = this.handler.getMinHeight(element); // TODO: clearer shouldManageHeight call
    if (minHeight !== undefined) {
      if (this.currentMeasuredParent !== undefined) {
        // TODO: Are there real scenarios to manage the height of multiple nested elements?
        throw Error(`Can't start managing the height of ${element} while already managing the height of ${this.currentContainer.element}`);
      }
      this.currentMeasuredParent = new HeightManagedElement(element, minHeight);
    }
  }

  private endManagingHeightIfNeeded(element: HTMLElement) {
    if (this.currentMeasuredParent?.element === element) {
      this.currentMeasuredParent = undefined;
    }
  }

  private async addChildrenThatFit(element: HTMLElement): Promise<AppendResult> {
    // ignore scripts, comments, etc when iterating
    const remainingChildren = [...element.childNodes]
      .filter((c): c is (HTMLElement | Text) => {
        return isContentElement(c) || isTextNode(c);
      });
    
    (element as any).replaceChildren(); // Clear children

    if (this.currentContainer.hasOverflowed() && !isInsideIgnoreOverflow(element)) { // TODO: Or, ancestor too short
      // Doesn't fit when empty 
      const result = await this.cancelAndCreateNoneResult(element, remainingChildren); 
      return result;
    }

    while (remainingChildren.length > 0) {
      // pop the first child off
      const child = remainingChildren.shift()!;

      let childResult = await this.appendNode(child, element);

      switch (childResult.status) {
        case AppendStatus.ADDED_NONE:
          const proposedSiblings = {
            added: [...element.childNodes],
            remainders: [child]
          };
          const validSiblings = await this.backupToValidSiblingSplit(proposedSiblings);

          const overflowingChildren = [...validSiblings.remainders, ...remainingChildren];

          if (element.childNodes.length === 0) {
            // element is empty, don't add at all
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

  private async appendElement(
    element: HTMLElement,
    parentEl: HTMLElement | undefined
  ): Promise<AppendResult> {

    if (!isSplit(element)) {
      // Only apply at the beginning of element, not when inserting the remainder.
      // TODO: log progress if this is an image.
      await this.handler.onAddStart(element);
    }

    const parent = parentEl ?? this.currentContainer;
    parent.append(element);

    const hasOverflowed = this.currentContainer.hasOverflowed();

    if (hasOverflowed && !this.canSplitInside(element)) { // TODO: OR is ancestor fitting amount too small.

      // If we can't clear and traverse children, we already know it doesn't fit.
      return this.cancelAndCreateNoneResult(element);
    }

    if (hasOverflowed || this.shouldTraverseChildren(element)) {
      this.startManagingHeightIfNeeded(element);
      const childrenResult = await this.addChildrenThatFit(element);
      this.endManagingHeightIfNeeded(element);

      if (childrenResult.status !== AppendStatus.ADDED_ALL) {
        return childrenResult;
      }
    }

    // Success, we finished adding this entire element without overflowing the container.
    await this.handler.onAddFinish(element);

    return {
      status: AppendStatus.ADDED_ALL,
    };
  }

  private createRemainderResult(original: HTMLElement, overflowingNodes: Node[]): AppendResult {
    const remainder = cloneWithoutChildren(original);
    remainder.append(...overflowingNodes);

    this.applySplitRules(original, remainder);

    return {
      status: AppendStatus.ADDED_PARTIAL,
      remainder: remainder,
    };
  }

  private async cancelAndCreateNoneResult(element: HTMLElement, contentsToRestore?: Node[]): Promise<AppendResult> {
    await this.cancelAndRemove(element);

    if (contentsToRestore) {
      element.append(...contentsToRestore);
    }

    return { status: AppendStatus.ADDED_NONE };
  }

}
