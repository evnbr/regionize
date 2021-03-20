import { TraverseHandler } from '../types';
import { AppendStatus, AppendResult } from './AppendResult';
import { OverflowContainer } from './OverflowContainer';
import { isTextNode, isContentElement, isElement } from '../util/domUtils';
import { appendTextAsBlock, appendTextByWord } from './appendText';
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

  // ------------------------------
  //
  // Public API
  //

  async addContent(content: HTMLElement, container: OverflowContainer): Promise<AppendResult> {
    this.currentContainer = container;
    return this.appendElement(content, undefined);
  }

  // ------------------------------
  //
  // Convenience methods for interacting with traversehandler
  //

  private applySplitRules(original: HTMLElement, remainder: HTMLElement): void {

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

  // ------------------------------
  //
  // Measuring height
  //
  private startManagingHeightIfNeeded(element: HTMLElement): void {
    const minHeight = this.handler.getMinHeight(element); // TODO: clearer shouldManageHeight call
    if (minHeight !== undefined) {
      if (this.currentMeasuredParent !== undefined) {
        // TODO: Are there real scenarios to manage the height of multiple nested elements?
        throw Error(`Can't start managing the height of ${element} while already managing the height of ${this.currentContainer.element}`);
      }
      this.currentMeasuredParent = new HeightManagedElement(element, minHeight);
    }
  }

  private endManagingHeightIfNeeded(element: HTMLElement): void  {
    if (this.currentMeasuredParent?.element === element) {
      this.currentMeasuredParent = undefined;
    }
  }

  private measuredParentCanSplit(): boolean {
    return this.currentMeasuredParent?.canSplitAtCurrentHeights() ?? true;
  }

  // ------------------------------
  //
  // Appending
  //

  private async appendText(textNode: Text, parent: HTMLElement): Promise<AppendResult> {
    const shouldSplitText = this.canSplitInside(parent) && !isInsideIgnoreOverflow(parent);

    const doesFit = () => !this.currentContainer.hasOverflowed();
    const canSplit = () =>  this.measuredParentCanSplit();

    if (!shouldSplitText) { // No need to add by word
      return await appendTextAsBlock(textNode, parent, doesFit);
    }
    
    // Add text word by word
    return await appendTextByWord(textNode, parent, doesFit, canSplit);
  }

  private async appendElement(element: HTMLElement, parentEl: HTMLElement | undefined): Promise<AppendResult> {

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

  private async addChildrenThatFit(element: HTMLElement): Promise<AppendResult> {
    const remainingChildren = [...element.childNodes]
      .filter((c): c is (HTMLElement | Text) => {
        // Ignore scripts, comments, etc when iterating
        return isContentElement(c) || isTextNode(c);
      });
    
    (element as any).replaceChildren(); // Clear children. TODO why doesn't ts know about

    if (this.currentContainer.hasOverflowed() && !isInsideIgnoreOverflow(element)) {
      // Doesn't fit when empty
      const result = await this.cancelAndCreateNoneResult(element, remainingChildren); 
      return result;
    }

    while (remainingChildren.length > 0) {
      // Add from the front of the list
      const child = remainingChildren.shift()!;

      const childResult = isTextNode(child)
        ? await this.appendText(child, element)
        : await this.appendElement(child, element);

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

  private async backupToValidSiblingSplit(proposed: SiblingSplitPoint): Promise<SiblingSplitPoint> {
    // First back up untl canSplitBetween is true (ie keepTogether)
    let siblings = findValidSplit(
      proposed,
      (el, next) => this.handler.canSplitBetween(el, next)
    );

    // Then backup further until measuredParentCanSplit is true (ie orphans/widows)
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

  // ------------------------------
  //
  // Creating remainders and results
  //

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


  private async cancelAndRemove(node: ChildNode): Promise<void> {
    if (isElement(node)) {
      // TODO: what order?
      const descendants = [...node.querySelectorAll("*")] as HTMLElement[];
      for (let child of descendants) {
        await this.handler.onAddCancel(child);
      }
      await this.handler.onAddCancel(node);
    }
    node.remove();
  }
}
