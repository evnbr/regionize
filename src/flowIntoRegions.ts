import {
  FlowOptions,
  FlowCallbacks,
  AddedStatus,
  AddAttemptResult,
} from './types';
import { isTextNode, isUnloadedImage, isContentElement } from './typeGuards';

import { addTextNodeWithoutSplit, addTextUntilOverflow } from './addTextNode';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
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
  estimator: ProgressEstimator;

  // delegated to the caller, ie Bindery.js
  callbackDelegate: FlowCallbacks;

  constructor(opts: FlowOptions) {
    if (!opts.createRegion) throw Error('createRegion not specified');

    this.callbackDelegate = {
      createRegion: opts.createRegion,
      shouldTraverse: opts.shouldTraverse ?? never,
      onProgress: opts.onProgress ?? noop,
      applySplit: opts.applySplit ?? noop,
      canSplit: opts.canSplit ?? always,
      beforeAdd: opts.beforeAdd ?? (async () => noop()),
      afterAdd: opts.afterAdd ?? (async () => noop()),
    };

    this.estimator = new ProgressEstimator(
      opts.content.querySelectorAll('*').length,
    );
  }

  applySplitRules(
    original: HTMLElement,
    clone: HTMLElement,
    nextChild?: HTMLElement,
  ) {
    if (original.tagName === 'OL') {
      orderedListRule(original, clone, nextChild);
    }
    if (original.tagName === 'TR' && nextChild) {
      tableRowRule(original, clone, nextChild, this.deepCloneWithRules);
    }
    this.callbackDelegate.applySplit(
      original,
      clone,
      nextChild,
      this.deepCloneWithRules,
    );
  }

  deepCloneWithRules(el: HTMLElement): HTMLElement {
    const clone = cloneWithChildren(el); // could be th > h3 > span;
    this.applySplitRules(el, clone);
    return clone;
  }

  canSplit(element: HTMLElement, region: Region): boolean {
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

  shouldIgnoreOverflow(element: HTMLElement): boolean {
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

  shouldTraverseChildren(element: HTMLElement): boolean {
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

  createRegion(previousRegion?: Region) {
    const newRegion = this.callbackDelegate.createRegion();

    if (previousRegion) {
      previousRegion.nextRegion = newRegion;
      newRegion.previousRegion = previousRegion;
    }
    return newRegion;
  }

  async ensureImageLoaded(img: HTMLImageElement) {
    this.callbackDelegate.onProgress({
      state: 'imageLoading',
      estimatedProgress: this.estimator.getPercentComplete(),
    });

    const waitTime = await ensureImageLoaded(img);

    this.estimator.addWaitTime(waitTime);
    this.callbackDelegate.onProgress({
      state: 'inProgress',
      estimatedProgress: this.estimator.getPercentComplete(),
    });
  }

  async addText(textNode: Text, parent: HTMLElement, region: Region) {
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
  ): Promise<AddAttemptResult<HTMLElement>> {
    // Ensure images are loaded before adding and testing for overflow
    if (isUnloadedImage(element)) {
      await ensureImageLoaded(element);
    }

    // Transforms before adding/
    // TODO: be sure to only apply this once elements, now that this codepath is called for continuations too
    //
    // await this.callbackDelegate.beforeAdd(element, this.continueInNextRegion);

    // Append element and push onto the the stack
    const parent = parentEl ?? region;
    parent.append(element);
    // region.path.push(element);

    const hasOverflowed = region.hasOverflowed();
    if (hasOverflowed && !this.canSplit(element, region)) {
      // Can't actually traverse children, TODO clear this up.
      return {
        status: AddedStatus.NONE,
      };
    } else if (hasOverflowed || this.shouldTraverseChildren(element)) {
      // clear this element
      const remainingChildNodes = [...element.childNodes];
      element.innerHTML = '';

      if (region.hasOverflowed() && !this.shouldIgnoreOverflow(element)) {
        // still doesn't fit when empty.
        // make sure to\ restore the children before rejecting.
        element.append(...remainingChildNodes);
        return {
          status: AddedStatus.NONE,
        };
      }

      // Start adding children, returning early when we hit
      // an overflow.
      while (remainingChildNodes.length > 0) {
        const child = remainingChildNodes.shift()!;

        let childResult: AddAttemptResult<Node>;

        if (isTextNode(child)) {
          // Figure out how much text fits
          childResult = await this.addText(child, element, region);
        } else if (isContentElement(child)) {
          // Recursively add
          childResult = await this.addElement(child, region, element);
        } else {
          // Skip comments, script tags, and unknown nodes by reporting as success
          childResult = { status: AddedStatus.ALL };
        }

        if (childResult.status !== AddedStatus.ALL) {
          // Create a remainder element that can be added to the next region.

          // TODO: We may need to back out here? unclear why.
          // if we're traversing a non-splittable element.
          const remainder = cloneShallow(element);
          this.applySplitRules(element, remainder);

          if (childResult.status === AddedStatus.NONE) {
            remainder.append(child, ...remainingChildNodes);
          }
          if (childResult.remainder) {
            remainder.append(childResult.remainder, ...remainingChildNodes);
          }
          return {
            status: AddedStatus.PARTIAL,
            remainder: remainder,
          };
        }

        // Continue looping
      }
    }

    // We added this entire element without overflowing the region.
    // Pop it off the stack and do any cleanup, so we can contintue
    // to the next sibling.

    // const addedElement = region.path.pop()!;

    // await this.callbackDelegate.afterAdd(
    //   addedElement,
    //   this.continueInNextRegion,
    // );

    this.estimator.incrementAddedCount();
    this.callbackDelegate.onProgress({
      state: 'inProgress',
      estimatedProgress: this.estimator.getPercentComplete(),
    });

    return {
      status: AddedStatus.ALL,
    };
  }

  async addAcrossRegions(content: HTMLElement) {
    const firstRegion = this.createRegion();
    await this.addElementAcrossRegions(content, firstRegion);

    this.callbackDelegate.onProgress({ state: 'done', estimatedProgress: 1 });
  }

  async addElementAcrossRegions(content: HTMLElement, initialRegion: Region) {
    const result = await this.addElement(content, initialRegion);
    if (result.remainder) {
      const nextRegion = this.createRegion(initialRegion);
      await this.addElementAcrossRegions(result.remainder, nextRegion);
    }
  }
}

const flowIntoRegions = async (opts: FlowOptions) => {
  if (!opts.content) throw Error('content not specified');

  const flowManager = new RegionFlowManager(opts);
  await flowManager.addAcrossRegions(opts.content);
};

const addUntilOverflow = async (
  content: HTMLElement,
  region: Region,
  opts: FlowOptions,
): Promise<AddAttemptResult<HTMLElement>> => {
  if (!content) throw Error('content not specified');

  const flowManager = new RegionFlowManager(opts);
  return await flowManager.addElement(content, region);
};

export default flowIntoRegions;
