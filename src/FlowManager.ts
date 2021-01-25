import {
  RegionizeConfig,
  AppendStatus,
  AppendResult,
  ProgressEventName,
  OverflowDetectingContainer
} from './types';

import {
  isTextNode,
  isUnloadedImage,
  isContentElement,
  isElement
} from './guards';

import {
  addTextNodeWithoutSplit,
  addTextUntilOverflow
} from './addTextNode';

import { findValidSplit, SplitSiblingResult } from './splitSiblings';

import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import { isSplit, setIsSplit, isInsideIgnoreOverflow } from './attributeHelper';
import tableRowRule from './tableRowRule';
import ProgressEstimator from './ProgressEstimator';

const noop = () => {};
const asyncNoop = (async () => noop());
const always = () => true;
const never = () => false;

const createRegionFallback = () => {
  throw Error('createRegion not specified');
}

const cloneWithoutChildren = <T extends Node>(el: T) => el.cloneNode(false) as T;
const cloneWithChildren = <T extends Node>(el: T) => el.cloneNode(true) as T;

class FlowManager {
  estimator?: ProgressEstimator; // initialized in addAcrossRegions
  config: RegionizeConfig;

  constructor(opts: Partial<RegionizeConfig>) {
    this.config = {
      getNextContainer: opts.getNextContainer ?? createRegionFallback,
      shouldTraverse: opts.shouldTraverse ?? never,
      canSplit: opts.canSplit ?? always,
      canSplitBetween: opts.canSplitBetween ?? always,
      onProgress: opts.onProgress ?? noop,
      onSplit: opts.onSplit ?? noop,
      onAddStart: opts.onAddStart ?? asyncNoop,
      onAddCancel: opts.onAddCancel ?? asyncNoop,
      onAddFinish: opts.onAddFinish ?? asyncNoop,
    };

    // Validate
    Object.keys(opts).forEach((key) => {
      if (key in this.config === false) {
        console.warn(`Unknown RegionizeConfig option "${key}"`);
      }
    })
  }

  private emitProgress(eventName: ProgressEventName) {
    if (!this.estimator) return;
    if (eventName === 'done') {
      this.estimator.end();
      this.config.onProgress({
        state: eventName,
        estimatedProgress: 1,
        totalTime: this.estimator.totalTime,
        imageWaitTime: this.estimator.timeWaiting,
      });
    } else {
      this.config.onProgress({
        state: eventName,
        estimatedProgress: this.estimator.getPercentComplete(),
      });
    }
  }

  private applySplitRules(original: HTMLElement, remainder: HTMLElement) {

    const cloneWithRules = (el: HTMLElement): HTMLElement => {
      const clone = cloneWithChildren(el); // could be th > h3 > span;
      this.applySplitRules(el, clone);
      return clone;  
    };

    if (original.matches('ol')) {
      orderedListRule(original, remainder);
    }
    if (original.matches('tr')) {
      tableRowRule(original, remainder, cloneWithRules);
    }
    setIsSplit(remainder);
    this.config.onSplit(
      original,
      remainder,
      remainder.firstElementChild as HTMLElement,
      cloneWithRules,
    );
  }

  private canSplit(element: HTMLElement, region: OverflowDetectingContainer): boolean {
    if (!this.config.canSplit(element)) {
      return false;
    }
    if (element === region.element) {
      return true;
    }
    if (element.parentElement) {
      return this.canSplit(element.parentElement, region);
    }
    return true;
  }

  private shouldTraverseChildren(element: HTMLElement): boolean {
    if (element.querySelector('img')) {
      // Since ensureImageLoaded() is only called when traversing, the size of the image may not be known yet.
      // Checking for overflow will not accurate, so traverse to be safe.
      // TODO: Could optimize this to instead call ensureImageLoaded earlier?
      return true;
    }
    if (this.config.shouldTraverse(element)) {
      // The caller has indicated the region size could change as a result of traversing the elements,
      // for example if a footnote would be added that eats into the available space for content.
      // If so, checking for overflow is not accurate.
      return true;
    }
    return false;
  }

  private async ensureImageLoaded(img: HTMLImageElement) {
    this.emitProgress('imageLoading');
    const waitTime = await ensureImageLoaded(img);
    this.estimator?.addWaitTime(waitTime);
    this.emitProgress('inProgress');
  }

  private async addText(textNode: Text, parent: HTMLElement, region: OverflowDetectingContainer) {
    const shouldSplitText = this.canSplit(parent, region) && !isInsideIgnoreOverflow(parent);

    if (shouldSplitText) {
      return await addTextUntilOverflow(textNode, parent, region.hasOverflowed);
    } else {
      return await addTextNodeWithoutSplit(textNode, parent, region.hasOverflowed);
    }
  }

  private async addChild(
    child: Text | HTMLElement,
    parent: HTMLElement,
    region: OverflowDetectingContainer,
  ): Promise<AppendResult> {
    if (isTextNode(child)) {
      return await this.addText(child, parent, region);
    }
    return this.addElement(child, parent, region);
  }

  private splitSiblings(proposed: SplitSiblingResult): SplitSiblingResult {
    const siblings = findValidSplit(proposed, this.config.canSplitBetween);

    for (let sib of siblings.remainders) {
      if (isElement(sib)) {
        // TODO: safely remove recursively
        // TODO: called twice because child may already hace been removed.
        sib.remove();
        this.config.onAddCancel(sib);
        // console.log(sib);
      }
    }

    return siblings;
  }

  private async traverseChildren(
    element: HTMLElement,
    region: OverflowDetectingContainer,
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
      // pop the first child off. TODO: should we use shift()?
      const child = remainingChildren.shift()!;

      let childResult = await this.addChild(child, element, region);

      switch (childResult.status) {
        case AppendStatus.ADDED_NONE:
          const siblings = this.splitSiblings({ added: [...element.childNodes], remainders: [child] });
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
    region: OverflowDetectingContainer,
  ): Promise<AppendResult> {

    if (isUnloadedImage(element)) {
      // Measurements aren't valid yet
      await this.ensureImageLoaded(element);
    }

    if (!isSplit(element)) {
      // Only apply at the beginning of element, not when inserting the remainder.
      await this.config.onAddStart(element);
    }

    const parent = parentEl ?? region;
    parent.append(element);

    const hasOverflowed = region.hasOverflowed();

    if (hasOverflowed && !this.canSplit(element, region)) {
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
    await this.config.onAddFinish(element);
    this.estimator?.incrementAddedCount();
    this.emitProgress('inProgress');

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

    this.config.onAddCancel(element);

    return {
      status: AppendStatus.ADDED_NONE,
    };
  }


  // Wraps addElementAcrossRegions with an estimator for convenience
  async addAcrossRegions(content: HTMLElement): Promise<void> {
    this.estimator = new ProgressEstimator(
      content.querySelectorAll('*').length,
    );

    const firstRegion = this.config.getNextContainer();
    await this.addElementAcrossRegions(content, firstRegion);

    this.emitProgress('done');
  }

  // Keeps calling itself until there's no more content
  private async addElementAcrossRegions(
    content: HTMLElement,
    initialRegion: OverflowDetectingContainer,
  ) {
    const result = await this.addElement(content, undefined, initialRegion);
    if (result.status == AppendStatus.ADDED_PARTIAL && isContentElement(result.remainder)) {
      const nextRegion = this.config.getNextContainer();
      await this.addElementAcrossRegions(result.remainder, nextRegion);
    }
  }
}



export default FlowManager;
