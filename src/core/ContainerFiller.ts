import { TraverseHandler } from '../types';
import { AppendStatus, AppendResult } from './AppendResult';
import { OverflowContainer } from './OverflowContainer';
import { isTextNode, isContentElement, isElement } from '../util/domUtils';
import { appendTextAsBlock, appendTextByWord, removeTextByWord } from './appendText';
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
    this.handler.onSplitFinish(original, remainder, cloneWithRules);
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
      // The caller has asserted the region size cannot change as a result of traversing the
      // elements, for example if an image needs to be loaded and measured, or if a footnote
      // would be added that eats into the available space for content,
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

  private endManagingHeightIfNeeded(element: HTMLElement): void {
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
    const canAddTextByWord = this.canSplitInside(parent) && !isInsideIgnoreOverflow(parent);

    const doesFit = () => !this.currentContainer.hasOverflowed();
    const canSplit = () => this.measuredParentCanSplit();

    if (!canAddTextByWord) {
      return await appendTextAsBlock(textNode, parent, doesFit);
    }

    return await appendTextByWord(textNode, parent, doesFit, canSplit);
  }

  private async removeText(textNode: Text, parent: HTMLElement): Promise<AppendResult> {
    const canRemoveTextByWord = this.canSplitInside(parent) && !isInsideIgnoreOverflow(parent);

    const canSplit = () => this.measuredParentCanSplit();

    if (!canRemoveTextByWord) {
      textNode.remove();
      return { status: AppendStatus.ADDED_NONE };
    }
    const originalStr = textNode.nodeValue!;
    return removeTextByWord(textNode, originalStr, canSplit, originalStr.length);
  }

  private async appendElement(
    element: HTMLElement,
    parentEl: HTMLElement | undefined,
  ): Promise<AppendResult> {
    if (!isSplit(element)) {
      // Only apply at the beginning of element, not when inserting the remainder.
      // TODO: log progress if this is an image.
      await this.handler.onAddStart(element);
    }

    const parent = parentEl ?? this.currentContainer;
    parent.append(element);

    const hasOverflowed = this.currentContainer.hasOverflowed();

    if (hasOverflowed && !this.canSplitInside(element)) {
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

  private async removeElement(
    element: HTMLElement,
  ): Promise<AppendResult> {
    if (!this.canSplitInside(element)) {
      // If we can't traverse children, we already know it doesn't fit.
      return this.cancelAndCreateNoneResult(element);
    }

    if (this.shouldTraverseChildren(element)) {
      console.warn('wip: removing recursiely');
      const result = await this.removeChildrenUntil(element, () => this.measuredParentCanSplit());
      if (result.status !== AppendStatus.ADDED_NONE) {
        return result;
      }
      // todo: properly restore if none?
    }

    return this.cancelAndCreateNoneResult(element);
  }

  private async removeChildrenUntil(
    element: HTMLElement,
    callback: () => Boolean,
  ): Promise<AppendResult> {
    const addedChildren = [...element.childNodes]
      .filter((c): c is (HTMLElement | Text) => {
        // Ignore scripts, comments, etc when iterating
        return isContentElement(c) || isTextNode(c);
      });
    const removedChildren = [];

    while (addedChildren.length > 0 && !callback()) {
      // Remove from the end of the list
      const child = addedChildren.pop()!;

      const childResult = isTextNode(child)
        ? await this.removeText(child, element)
        : await this.removeElement(child);

      // todo
      switch (childResult.status) {
        case AppendStatus.ADDED_NONE: {
          removedChildren.unshift(child);

          // Continue loop, keep removing
          break;
        }
        case AppendStatus.ADDED_PARTIAL: {
          // todo: this isnt quite right
          return this.createRemainderResult(element, [childResult.remainder, ...removedChildren]);
        }
        case AppendStatus.ADDED_ALL:
          return this.createRemainderResult(element, removedChildren);
        default:
          throw Error(`Unknown appendStatus ${(childResult as any).status}`);
      }
    }

    // Removed all children.
    return this.cancelAndCreateNoneResult(element, removedChildren);
    // return {
    //   status: AppendStatus.ADDED_NONE,
    // };
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
        case AppendStatus.ADDED_NONE: {
          const proposedSiblings = {
            added: [...element.childNodes],
            remainders: [child],
          };
          const validSiblings = await this.backupToValidSiblingSplit(element, proposedSiblings);
          const overflowingChildren = [...validSiblings.remainders, ...remainingChildren];

          if (element.childNodes.length === 0) {
            // element is empty, don't add at all
            return this.cancelAndCreateNoneResult(element, overflowingChildren);
          }

          return this.createRemainderResult(element, overflowingChildren);
        }
        case AppendStatus.ADDED_PARTIAL: {
          return this.createRemainderResult(element, [childResult.remainder, ...remainingChildren]);
        }
        case AppendStatus.ADDED_ALL:
          // Continue loop, keep adding
          break;
        default:
          throw Error(`Unknown appendStatus ${(childResult as any).status}`);
      }
    }

    // Successfully added all children
    return {
      status: AppendStatus.ADDED_ALL,
    };
  }

  private async backupToValidSiblingSplit(
    element: HTMLElement,
    proposed: SiblingSplitPoint,
  ): Promise<SiblingSplitPoint> {
    // First back up untl canSplitBetween is true (ie keepTogether)
    let siblings = findValidSplit(
      proposed,
      (el, next) => this.handler.canSplitBetween(el, next),
    );

    // Commit removal to dom & let plugins clean up
    for (const node of siblings.remainders) {
      await this.cancelAndRemove(node);
    }


    // Then backup further until measuredParentCanSplit is true (ie orphans/widows)
    // const removeResult = await this.removeChildrenUntil(
    //   element,
    //   () => this.measuredParentCanSplit(),
    // );

    // TODO: should removeChildrenUntil returb a siblingsplitpoint instead,
    // so this isnt so awkward?
    // console.log(`backup result`, removeResult, `for proposal, `, siblings);
    // switch (removeResult.status) {
    //   case AppendStatus.ADDED_ALL:
    //     return siblings;
    //   case AppendStatus.ADDED_PARTIAL:
    //     return {
    //       added: [...element.childNodes],
    //       remainders: [...removeResult.remainder.childNodes],
    //     };
    //   case AppendStatus.ADDED_NONE:
    //     return {
    //       added: [],
    //       remainders: [...element.childNodes],
    //     };
    //   default:
    //     throw Error(`Unknown appendStatus ${(removeResult as any).status}`);
    // }

    while (siblings.added.length > 0 && !this.measuredParentCanSplit()) {
      const { added, remainders } = siblings;

      // TODO: share code with findValidSplit?
      const shiftedNode = added.pop()! as (Text | HTMLElement);

      const removalResult = isTextNode(shiftedNode)
        ? await this.removeText(shiftedNode, element)
        : await this.removeElement(shiftedNode);

      if (removalResult.status === AppendStatus.ADDED_PARTIAL) {
        const fittingPortion = shiftedNode;
        const remainderPortion = removalResult.remainder;
        return {
          added: [...added, fittingPortion],
          remainders: [remainderPortion, ...remainders],
        };
      }

      await this.cancelAndRemove(shiftedNode);
      siblings = {
        added: [...added],
        remainders: [shiftedNode, ...remainders],
      };
    }

    return siblings;
  }

  // ------------------------------
  //
  // Creating remainders and results
  //

  private createRemainderResult(original: HTMLElement, remainderChildren: Node[]): AppendResult {
    const remainder = cloneWithoutChildren(original);
    remainder.append(...remainderChildren);

    this.applySplitRules(original, remainder);

    return {
      status: AppendStatus.ADDED_PARTIAL,
      remainder,
    };
  }

  private async cancelAndCreateNoneResult(
    element: HTMLElement,
    contentsToRestore?: Node[],
  ): Promise<AppendResult> {
    await this.cancelAndRemove(element);

    if (contentsToRestore) {
      element.append(...contentsToRestore);
    }

    return { status: AppendStatus.ADDED_NONE };
  }

  private async cancelAndRemove(node: ChildNode): Promise<void> {
    if (isElement(node)) {
      // TODO: Should probably define an order onAddCancel is called in
      const descendants = [...node.querySelectorAll('*')] as HTMLElement[];
      for (const child of descendants) {
        await this.handler.onAddCancel(child);
      }
      await this.handler.onAddCancel(node);
    }
    // Only remove the root node
    node.remove();
  }
}
