import {
  RegionizeOptions,
  RegionizeDelegate,
  AddedStatus,
  AddAttemptResult,
  RegionizeProgressEventName,
} from './types';
import { isTextNode, isUnloadedImage, isContentElement } from './typeGuards';

import { addTextNodeWithoutSplit, addTextUntilOverflow } from './addTextNode';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import { isSplit, setIsSplit } from './isSplit';
import tableRowRule from './tableRowRule';
import ProgressEstimator from './ProgressEstimator';
import Region from './Region';

const noop = () => {};
const always = () => true;
const never = () => false;

const cloneShallow = <T extends Node>(el: T) => el.cloneNode(false) as T;
const cloneWithChildren = <T extends Node>(el: T) => el.cloneNode(true) as T;

class RegionFlowManager {
  // the only state that persists during traversal.
  estimator?: ProgressEstimator;

  // delegated to the caller, ie Bindery.js
  callbackDelegate: RegionizeDelegate;

  constructor(opts: RegionizeOptions) {
    if (!opts.createRegion) throw Error('createRegion not specified');

    this.callbackDelegate = {
      createRegion: opts.createRegion,
      shouldTraverse: opts.shouldTraverse ?? never,
      onProgress: opts.onProgress ?? noop,
      onDidSplit: opts.onDidSplit ?? noop,
      canSplit: opts.canSplit ?? always,
      onWillAdd: opts.onWillAdd ?? (async () => noop()),
      onDidAdd: opts.onDidAdd ?? (async () => noop()),
    };
  }

  private emitProgress(eventName: RegionizeProgressEventName) {
    if (!this.estimator) return;
    if (eventName === 'done') {
      this.estimator.end();
      this.callbackDelegate.onProgress({
        state: eventName,
        estimatedProgress: 1,
        totalTime: this.estimator.totalTime,
        imageWaitTime: this.estimator.timeWaiting,
      });
    } else {
      this.callbackDelegate.onProgress({
        state: eventName,
        estimatedProgress: this.estimator.getPercentComplete(),
      });
    }
  }

  private applySplitRules(original: HTMLElement, remainder: HTMLElement) {
    if (original.matches('ol')) {
      orderedListRule(original, remainder);
    }
    if (original.matches('tr')) {
      tableRowRule(original, remainder, this.deepCloneWithRules.bind(this));
    }
    setIsSplit(remainder);
    this.callbackDelegate.onDidSplit(
      original,
      remainder,
      remainder.firstElementChild as HTMLElement,
      this.deepCloneWithRules,
    );
  }

  private deepCloneWithRules(el: HTMLElement): HTMLElement {
    const clone = cloneWithChildren(el); // could be th > h3 > span;
    this.applySplitRules(el, clone);
    return clone;
  }

  private canSplit(element: HTMLElement, region: Region): boolean {
    if (!this.callbackDelegate.canSplit(element)) {
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

  private shouldIgnoreOverflow(element: HTMLElement): boolean {
    // Walk up the tree to see if we are within
    // an overflow-ignoring node
    if (element.hasAttribute('data-ignore-overflow')) {
      return true;
    }
    if (element.parentElement) {
      return this.shouldIgnoreOverflow(element.parentElement);
    }
    return false;
  }

  private shouldTraverseChildren(element: HTMLElement): boolean {
    if (element.querySelector('img')) {
      // Since ensureImageLoaded() is only called when traversing, the size of the image may not be known yet. Checking for overflow
      // will not accurate, so traverse to be safe.
      // TODO: Could optimize this to instead call ensureImageLoaded earlier
      return true;
    }
    if (this.callbackDelegate.shouldTraverse(element)) {
      // The region size could change as a result of traversing the elements, for example if a footnote would
      // be added that eats into the available space for content. If so, checking for overflow is not accurate.
      return true;
    }
    return false;
  }

  private createRegion(previousRegion?: Region) {
    const newRegion = this.callbackDelegate.createRegion();

    if (previousRegion) {
      previousRegion.nextRegion = newRegion;
      newRegion.previousRegion = previousRegion;
    }
    return newRegion;
  }

  private async ensureImageLoaded(img: HTMLImageElement) {
    this.emitProgress('imageLoading');
    const waitTime = await ensureImageLoaded(img);
    this.estimator?.addWaitTime(waitTime);
    this.emitProgress('inProgress');
  }

  private async addText(textNode: Text, parent: HTMLElement, region: Region) {
    const shouldSplitText =
      this.callbackDelegate.canSplit(parent) &&
      !this.shouldIgnoreOverflow(parent);

    if (shouldSplitText) {
      return await addTextUntilOverflow(textNode, parent, () =>
        region.hasOverflowed(),
      );
    } else {
      return await addTextNodeWithoutSplit(textNode, parent, () =>
        region.hasOverflowed(),
      );
    }
  }

  async addElement(
    element: HTMLElement,
    region: Region,
    parentEl?: HTMLElement,
  ): Promise<AddAttemptResult> {
    // Ensure images are loaded before adding and testing for overflow
    if (isUnloadedImage(element)) {
      await this.ensureImageLoaded(element);
    }

    // Transforms before adding. Be sure to only apply this once elements,
    // as this codepath is called for continuations too
    if (!isSplit(element)) {
      await this.callbackDelegate.onWillAdd(element);
    }

    // Append element and push onto the the stack
    const parent = parentEl ?? region;
    parent.append(element);

    const hasOverflowed = region.hasOverflowed();
    if (hasOverflowed && !this.canSplit(element, region)) {
      // If we can't clear and traverse children, we already
      // know it doesn't fit.
      return { status: AddedStatus.NONE };
    }

    if (hasOverflowed || this.shouldTraverseChildren(element)) {
      // clear this element
      const remainingChildNodes = [...element.childNodes];
      element.innerHTML = '';

      if (region.hasOverflowed() && !this.shouldIgnoreOverflow(element)) {
        // If it doesn't fit when empty, make sure to restore
        // the children before rejecting.
        element.append(...remainingChildNodes);
        return {
          status: AddedStatus.NONE,
        };
      }

      // Start adding childNodes, when we overflow, assemble a cloned
      // element that contains the remainder childNodes and return.
      while (remainingChildNodes.length > 0) {
        const child = remainingChildNodes.shift()!;

        let childResult: AddAttemptResult;

        if (isTextNode(child)) {
          // Figure out how much text fits
          childResult = await this.addText(child, element, region);
        } else if (isContentElement(child)) {
          // Recursively add
          childResult = await this.addElement(child, region, element);
        } else {
          // Skip comments, script tags, and unknown nodes
          continue;
        }

        if (childResult.status === AddedStatus.ALL) {
          continue;
        }

        // If we reach here, not everything fit. Create a remainder element
        // that can be added to the next region.
        const remainder = cloneShallow(element);

        if (childResult.status === AddedStatus.NONE) {
          remainder.append(child, ...remainingChildNodes);
        }
        if (childResult.remainder) {
          remainder.append(childResult.remainder, ...remainingChildNodes);
        }

        this.applySplitRules(element, remainder);

        return {
          status: AddedStatus.PARTIAL,
          remainder: remainder,
        };
      }
    }

    // We added this entire element without overflowing the region.
    await this.callbackDelegate.onDidAdd(element);

    this.estimator?.incrementAddedCount();
    this.emitProgress('inProgress');

    return {
      status: AddedStatus.ALL,
    };
  }

  async addAcrossRegions(content: HTMLElement) {
    this.estimator = new ProgressEstimator(
      content.querySelectorAll('*').length,
    );

    const firstRegion = this.createRegion();
    await this.addElementAcrossRegions(content, firstRegion);

    this.emitProgress('done');
  }

  private async addElementAcrossRegions(
    content: HTMLElement,
    initialRegion: Region,
  ) {
    const result = await this.addElement(content, initialRegion);
    if (result.remainder && isContentElement(result.remainder)) {
      const nextRegion = this.createRegion(initialRegion);
      await this.addElementAcrossRegions(result.remainder, nextRegion);
    }
  }
}

const flowIntoRegions = async (
  content: HTMLElement,
  opts: RegionizeOptions,
) => {
  if (!content) throw Error('content not specified');

  const flowManager = new RegionFlowManager(opts);
  await flowManager.addAcrossRegions(content);
};

const addUntilOverflow = async (
  content: HTMLElement,
  region: Region,
  opts: RegionizeOptions,
): Promise<AddAttemptResult> => {
  if (!content) throw Error('content not specified');

  const flowManager = new RegionFlowManager(opts);
  return await flowManager.addElement(content, region);
};

export default flowIntoRegions;
