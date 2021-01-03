import { RegionizeConfig, AppendStatus, AppendResult, ProgressEventName, OverflowDetectingContainer } from './types';
import { isTextNode, isUnloadedImage, isContentElement } from './typeGuards';

import { addTextNodeWithoutSplit, addTextUntilOverflow } from './addTextNode';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import { isSplitAcrossRegions, setIsSplitAcrossRegions } from './isSplit';
import tableRowRule from './tableRowRule';
import ProgressEstimator from './ProgressEstimator';
import shouldIgnoreOverflow from './ignoreOverflow';

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
      onProgress: opts.onProgress ?? noop,
      onDidSplit: opts.onDidSplit ?? noop,
      onWillAdd: opts.onWillAdd ?? asyncNoop,
      onDidRemove: opts.onDidRemove ?? asyncNoop,
      onDidAdd: opts.onDidAdd ?? asyncNoop,
    };
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
    setIsSplitAcrossRegions(remainder);
    this.config.onDidSplit(
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
    const shouldSplitText = this.canSplit(parent, region) && !shouldIgnoreOverflow(parent);

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
    parentEl: HTMLElement | undefined,
    region: OverflowDetectingContainer,
  ): Promise<AppendResult> {
    // Ensure images are loaded before adding and testing for overflow
    if (isUnloadedImage(element)) {
      await this.ensureImageLoaded(element);
    }

    // Transforms before adding. Only applied once at the beginning of each
    // element, and not when inserting the remainder of the element.
    if (!isSplitAcrossRegions(element)) {
      await this.config.onWillAdd(element);
    }

    // Append element and push onto the the stack
    const parent = parentEl ?? region;
    parent.append(element);

    const hasOverflowed = region.hasOverflowed();
    if (hasOverflowed && !this.canSplit(element, region)) {
      // If we can't clear and traverse children, we already know it doesn't fit.
      // TODO: Should we explicitly remove it?
      return { status: AppendStatus.ADDED_NONE };
    }

    if (hasOverflowed || this.shouldTraverseChildren(element)) {
      // Clear the element. The child nodes will either
      // be added back to this element or added to a new remainder.
      const remainingChildNodes = [...element.childNodes];
      element.innerHTML = '';

      if (region.hasOverflowed() && !shouldIgnoreOverflow(element)) {
        // If it doesn't fit when empty, make sure to restore
        // the children before rejecting.
        element.remove();
        element.append(...remainingChildNodes);
        this.config.onDidRemove(element);

        return {
          status: AppendStatus.ADDED_NONE,
        };
      }

      // Start adding childNodes, when we overflow, assemble a cloned
      // element that contains the remainder childNodes and return.
      while (remainingChildNodes.length > 0) {
        // pop the first child off. TODO: should we use shift()?
        const child = remainingChildNodes.shift()!;

        let childResult: AppendResult;

        if (isTextNode(child)) {
          childResult = await this.addText(child, element, region);
        } else if (isContentElement(child)) {
          childResult = await this.addElement(child, element, region);
        } else {
          // Skip comments, script tags, and unknown nodes
          continue;
        }

        if (childResult.status === AppendStatus.ADDED_ALL) {
          continue;
        }

        if (
          childResult.status === AppendStatus.ADDED_NONE
          && element.childNodes.length == 0
        ) {
          // If we reach here, we know the element did fit when empty, but 
          // rejected when it contains any portion of its first child.
          // This should be treated the same as if it didn't fit when empty—
          // reject entirely and start in the next region.

          // Make sure to restore the children before rejecting.
          // TODO: keep in sync with line 176?
          element.remove();
          element.append(child, ...remainingChildNodes);
          this.config.onDidRemove(element);

          return {
            status: AppendStatus.ADDED_NONE,
          };
        }

        // If we reach here, at least part of the element has been added
        // successfully to the current region. Create a new remainder element
        // that can be added to the next region.
        const remainder = cloneWithoutChildren(element);

        if (childResult.status === AppendStatus.ADDED_NONE) {
          remainder.append(child, ...remainingChildNodes);
        }
        if (childResult.status === AppendStatus.ADDED_PARTIAL) {
          remainder.append(childResult.remainder, ...remainingChildNodes);
        }

        this.applySplitRules(element, remainder);

        return {
          status: AppendStatus.ADDED_PARTIAL,
          remainder: remainder,
        };
      }
    }

    // We finished adding this entire element without overflowing the region.

    await this.config.onDidAdd(element);
    this.estimator?.incrementAddedCount();
    this.emitProgress('inProgress');

    return {
      status: AppendStatus.ADDED_ALL,
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
