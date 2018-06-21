import { isTextNode, isUnloadedImage, isContentElement } from './nodeTypes';
import { addTextNode, addTextNodeAcrossParents } from './addTextNode';
import tryInNextRegion from './tryInNextRegion';
import ignoreOverflow from './ignoreOverflow';
import clonePath from './clonePath';
import ensureImageLoaded from './ensureImageLoaded';
import orderedListRule from './orderedListRule';
import tableRowRule from './tableRowRule';

const noop = () => {};
const always = () => true;
const never = () => false;

// flow content through FlowBoxes.
// This function is not book-specific,
// the caller is responsible for managing
// and creating boxes.
const flowIntoRegions = async (opts) => {
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

  const splitRules = (prev, clone, next, deepClone) => {
    if (prev.tagName === 'OL') orderedListRule(prev, clone, next, deepClone);
    if (prev.tagName === 'TR') tableRowRule(prev, clone, next, deepClone);
    applySplit(prev, clone, next, deepClone);
  };

  const continueInNextRegion = () => {
    const oldBox = currentRegion;
    currentRegion = createRegion();

    const newPath = clonePath(oldBox.path, splitRules);
    currentRegion.setPath(newPath);
    return currentRegion;
  };

  const continuedParent = () => {
    continueInNextRegion();
    return currentRegion.currentElement;
  };

  const addTextWithoutChecks = (textNode, parent) => {
    parent.appendChild(textNode);
    if (!ignoreCurrentOverflow() && canSplitCurrent()) {
      currentRegion.suppressErrors = true;
      continueInNextRegion();
    }
  };

  const addSplittableTextNode = async (textNode) => {
    const el = currentRegion.currentElement;
    let hasAdded = await addTextNodeAcrossParents(textNode, el, continuedParent, hasOverflowed);
    if (!hasAdded && currentRegion.path.length > 1) {
      // retry 1
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
      hasAdded = await addTextNodeAcrossParents(textNode, el, continuedParent, hasOverflowed);
    }
    if (!hasAdded) {
      // retry 2
      addTextWithoutChecks(textNode, currentRegion.currentElement);
    }
  };

  const addWholeTextNode = async (textNode) => {
    let hasAdded = await addTextNode(textNode, currentRegion.currentElement, hasOverflowed);
    if (!hasAdded && !ignoreCurrentOverflow()) {
      // retry 1
      tryInNextRegion(currentRegion, continueInNextRegion, canSplit);
      hasAdded = await addTextNode(textNode, currentRegion.currentElement, hasOverflowed);
    }
    if (!hasAdded) {
      // retry 2
      addTextWithoutChecks(textNode, currentRegion.currentElement);
    }
  };

  // No need to traverse every node if fifts AND
  // none of the contents could change size.
  // Images and custom rules could cause the size to change
  const canSkipTraversal = (element) => {
    const containsImage = element.querySelector('img');
    return !containsImage && !shouldTraverse(element);
  };

  let safeAddElementNode;

  // Adds an element node by clearing its childNodes, then inserting them
  // one by one recursively until they overflow the region
  const addElementNode = async (element) => {
    // Insert element
    currentRegion.currentElement.appendChild(element);
    currentRegion.path.push(element);

    if (canSkipTraversal(element)) {
      // console.log('maybe short circuit');
      if (!hasOverflowed()) {
        // console.log('did short circuit');
        return currentRegion.path.pop();
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
        await safeAddElementNode(child);
      } else {
        // Skip comments and unknown nodes
      }
    }
    return currentRegion.path.pop();
  };

  safeAddElementNode = async (element) => {
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
