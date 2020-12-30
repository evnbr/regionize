import { ElementCloner, FlowOptions } from './types';
import { isTextNode, isUnloadedImage, isContentElement } from './typeGuards';

import {
  addTextNode,
  addSplittableText,
  TextLayoutResult,
} from './addTextNode';
import tryInNextRegion from './tryInNextRegion';
import ignoreOverflow from './ignoreOverflow';
import clonePath from './clonePath';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import tableRowRule from './tableRowRule';
import ProgressEstimator from './ProgressEstimator';
import Region from './Region';

const noop = () => {};
const always = () => true;
const never = () => false;

// flow content through Regions.
// the caller is responsible for creating each region and maintaining
// a list of references to each one, nothing is returned
const flowIntoRegions = async ({
  content,
  createRegion,
  applySplit = noop,
  canSplit = always,
  beforeAdd = async () => noop(),
  afterAdd = async () => noop(),
  shouldTraverse = never,
  onProgress: emitProgress = noop,
}: FlowOptions) => {
  if (!content) throw Error('content not specified');
  if (!createRegion) throw Error('createRegion not specified');

  // estimate
  const estimator = new ProgressEstimator(content.querySelectorAll('*').length);

  // currentRegion should hold the only state that persists during traversal.
  let currentRegion = createRegion();

  const hasOverflowed = () => currentRegion.hasOverflowed();
  const canSplitCurrent = () => canSplit(currentRegion.currentElement);
  const ignoreCurrentOverflow = () =>
    ignoreOverflow(currentRegion.currentElement);

  const splitRules = (
    original: HTMLElement,
    clone: HTMLElement,
    nextChild?: HTMLElement,
    deepClone?: ElementCloner,
  ) => {
    if (original.tagName === 'OL') {
      orderedListRule(original, clone, nextChild);
    }
    if (original.tagName === 'TR' && nextChild && deepClone) {
      tableRowRule(original, clone, nextChild, deepClone);
    }
    applySplit(original, clone, nextChild, deepClone);
  };

  const continueInNextRegion = (): Region => {
    const prevRegion = currentRegion;
    currentRegion = createRegion();

    const newPath = clonePath(prevRegion.path, splitRules);
    currentRegion.setPath(newPath);
    return currentRegion;
  };

  const continuedParent = (): HTMLElement => {
    continueInNextRegion();
    return currentRegion.currentElement;
  };

  const addText = async (textNode: Text, isSplittable: boolean) => {
    const el = currentRegion.currentElement;
    let textLayout: TextLayoutResult;

    if (isSplittable) {
      // Add the text word by word, adding pages as needed
      textLayout = await addSplittableText(
        textNode,
        el,
        continuedParent,
        hasOverflowed,
      );
      if (!textLayout.completed && currentRegion.path.length > 1) {
        tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
        textLayout = await addSplittableText(
          textNode,
          el,
          continuedParent,
          hasOverflowed,
        );
      }
    } else {
      // Add the text as a block, trying a new page if needed
      textLayout = await addTextNode(
        textNode,
        currentRegion.currentElement,
        hasOverflowed,
      );
      if (!textLayout.completed && !ignoreCurrentOverflow()) {
        tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
        textLayout = await addTextNode(
          textNode,
          currentRegion.currentElement,
          hasOverflowed,
        );
      }
    }

    // Something went wrong. Insert the text anyways, ignoring overflow,
    // and move onto the next region.
    if (!textLayout.completed) {
      currentRegion.currentElement.appendChild(textNode);
      if (!ignoreCurrentOverflow() && canSplitCurrent()) {
        currentRegion.suppressErrors = true;
        continueInNextRegion();
      }
    }
  };

  const shouldTraverseChildren = (element: HTMLElement): boolean => {
    if (hasOverflowed()) return true;
    if (element.querySelector('img')) return true;
    if (shouldTraverse(element)) return true;
    return false;
  };

  const addElement = async (element: HTMLElement): Promise<void> => {
    // Ensure images are loaded before testing for overflow
    if (isUnloadedImage(element)) {
      emitProgress({
        state: 'imageLoading',
        estimatedProgress: estimator.percentComplete,
      });
      const waitTime = await ensureImageLoaded(element);
      estimator.addWaitTime(waitTime);
      emitProgress({
        state: 'inProgress',
        estimatedProgress: estimator.percentComplete,
      });
    }

    // Transforms before adding
    await beforeAdd(element, continueInNextRegion);

    // Append element and push onto the the stack
    currentRegion.currentElement.appendChild(element);
    currentRegion.path.push(element);

    if (shouldTraverseChildren(element)) {
      // Only if the region overflowed, the content contains
      // an image, or the caller has requested a custom traversal.
      await clearAndAddChildren(element);
    }

    // We're done: Pop off the stack and do any cleanup
    const addedElement = currentRegion.path.pop()!;
    await afterAdd(addedElement, continueInNextRegion);
    estimator.increment();
    emitProgress({
      state: 'inProgress',
      estimatedProgress: estimator.percentComplete,
    });
  };

  const clearAndAddChildren = async (element: HTMLElement) => {
    const childNodes = [...element.childNodes];
    element.innerHTML = '';

    if (hasOverflowed() && !ignoreCurrentOverflow() && canSplitCurrent()) {
      // Overflows when empty
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
    }

    const shouldSplit = canSplit(element) && !ignoreOverflow(element);

    for (const child of childNodes) {
      if (isTextNode(child)) {
        await addText(child, shouldSplit);
      } else if (isContentElement(child)) {
        await addElement(child);
      } else {
        // Skip comments and unknown nodes
      }
    }
  };

  await addElement(content);

  emitProgress({ state: 'done', estimatedProgress: 1 });
};

export default flowIntoRegions;
