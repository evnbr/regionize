import { ElementCloner, ElementChecker, RuleApplier, RegionMaker } from './types';

import { isTextNode, isUnloadedImage, isContentElement } from './typeGuards';
import { addTextNode, addTextNodeAcrossParents } from './addTextNode';
import tryInNextRegion from './tryInNextRegion';
import ignoreOverflow from './ignoreOverflow';
import clonePath from './clonePath';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import tableRowRule from './tableRowRule';
import Region from './Region';

type AddElementResult = Promise<HTMLElement>;

interface FlowOptions {
  content: HTMLElement,
  createRegion: RegionMaker,
  applySplit?: RuleApplier,
  canSplit?: ElementChecker,
  shouldTraverse?: ElementChecker,
  beforeAdd?: (el: HTMLElement, next: RegionMaker) => void,
  afterAdd?: (el: HTMLElement, next: RegionMaker) => void,
  didWaitFor?: (t: number) => void,
}

const noop = () => {};
const always = () => true;
const never = () => false;

// flow content through FlowBoxes.
// This function is not book-specific,
// the caller is responsible for managing
// and creating regions.
const flowIntoRegions = async (opts: FlowOptions) => {
  // required options
  const content = opts.content;
  const createRegion = opts.createRegion;
  if (!content) throw Error('content not specified');
  if (!createRegion) throw Error('createRegion not specified');

  // optional
  const applySplit = opts.applySplit || noop;
  const canSplit = opts.canSplit || always;
  const beforeAdd = opts.beforeAdd || noop;
  const afterAdd = opts.afterAdd || noop;
  const didWaitFor = opts.didWaitFor || noop;
  const shouldTraverse = opts.shouldTraverse || never;

  // ____
  // Begin
  let currentRegion = createRegion();
  const hasOverflowed = () => currentRegion.hasOverflowed();
  const canSplitCurrent = () => canSplit(currentRegion.currentElement);
  const ignoreCurrentOverflow = () => ignoreOverflow(currentRegion.currentElement);

  const splitRules = (
    prev: HTMLElement,
    clone: HTMLElement,
    nextChild?: HTMLElement,
    deepClone?: ElementCloner
  ) => {
    if (prev.tagName === 'OL') {
      orderedListRule(prev, clone, nextChild, deepClone);
    }
    if (prev.tagName === 'TR' && nextChild && deepClone) {
      tableRowRule(prev, clone, nextChild, deepClone);
    }
    applySplit(prev, clone, nextChild, deepClone);
  };

  const continueInNextRegion = (): Region => {
    const oldBox = currentRegion;
    currentRegion = createRegion();

    const newPath = clonePath(oldBox.path, splitRules);
    currentRegion.setPath(newPath);
    return currentRegion;
  };

  const continuedParent = (): HTMLElement => {
    continueInNextRegion();
    return currentRegion.currentElement;
  };

  const addTextWithoutChecks = (textNode: Text, parent: HTMLElement) => {
    parent.appendChild(textNode);
    if (!ignoreCurrentOverflow() && canSplitCurrent()) {
      currentRegion.suppressErrors = true;
      continueInNextRegion();
    }
  };

  const addSplittableTextNode = async (textNode: Text) => {
    const el = currentRegion.currentElement;
    let result = await addTextNodeAcrossParents(textNode, el, continuedParent, hasOverflowed);
    if (!result.completed && currentRegion.path.length > 1) {
      // retry 1
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
      result = await addTextNodeAcrossParents(textNode, el, continuedParent, hasOverflowed);
    }
    if (!result.completed) {
      // retry 2
      addTextWithoutChecks(textNode, currentRegion.currentElement);
    }
  };

  const addWholeTextNode = async (textNode: Text) => {
    let result = await addTextNode(textNode, currentRegion.currentElement, hasOverflowed);
    if (!result.completed && !ignoreCurrentOverflow()) {
      // retry 1
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
      result = await addTextNode(textNode, currentRegion.currentElement, hasOverflowed);
    }
    if (!result.completed) {
      // retry 2
      addTextWithoutChecks(textNode, currentRegion.currentElement);
    }
  };

  // No need to traverse every node if fifts AND
  // none of the contents could change size.
  // Images and custom rules could cause the size to change
  const canSkipTraversal = (element: HTMLElement) => {
    const containsImage = element.querySelector('img');
    return !containsImage && !shouldTraverse(element);
  };

  let safeAddElementNode: (el: HTMLElement) => Promise<void>;

  // Adds an element node by clearing its childNodes, then inserting them
  // one by one recursively until they overflow the region
  const addElementNode = async (element: HTMLElement): AddElementResult => {
    // Insert element
    currentRegion.currentElement.appendChild(element);
    currentRegion.path.push(element);

    if (canSkipTraversal(element)) {
      if (!hasOverflowed()) {
        // Short circuit
        return currentRegion.path.pop()!;
      }
    }

    // Clear element
    const childNodes = [...element.childNodes];
    element.innerHTML = '';

    // Overflows when empty
    if (hasOverflowed() && !ignoreCurrentOverflow() && canSplitCurrent()) {
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
    }

    const shouldSplit = canSplit(element) && !ignoreOverflow(element);

    for (const child of childNodes) {
      if (isTextNode(child)) {
        await (shouldSplit ? addSplittableTextNode : addWholeTextNode)(child);
      } else if (isContentElement(child)) {
        await safeAddElementNode(child as HTMLElement);
      } else {
        // Skip comments and unknown nodes
      }
    }
    return currentRegion.path.pop()!;
  };

  safeAddElementNode = async (element: HTMLElement): Promise<void> => {
    // Ensure images are loaded before measuring
    if (isUnloadedImage(element)) {
      const waitTime = await ensureImageLoaded(element);
      didWaitFor(waitTime);
    }

    // Transforms before adding
    beforeAdd(element, continueInNextRegion);

    const addedElement = await addElementNode(element);

    // Transforms after adding
    afterAdd(addedElement, continueInNextRegion);
  };

  return safeAddElementNode(content);
};

export default flowIntoRegions;
