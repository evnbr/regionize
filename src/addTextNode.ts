import { yieldIfNecessary } from './schedule';
import ignoreOverflow from './ignoreOverflow';
import { LayoutResult } from './types';

const createTextNode: (text: string) => Text = (document.createTextNode).bind(document);

type Checker = () => boolean;
type ElementGetter = () => HTMLElement;
// type AddTextResult = Promise<(boolean | Text)>;

// Try adding a text node in one go.
// Returns true if all the text fits, false if none fits.
const addTextNode = async (
  textNode: Text,
  parent: HTMLElement,
  hasOverflowed: Checker
): Promise<LayoutResult> => {
  parent.appendChild(textNode);
  const success = !hasOverflowed();
  if (!success) parent.removeChild(textNode);
  await yieldIfNecessary();
  return { completed: success };
};

const nextNonSpaceIndex = (text: string, startIndex: number): number => {
  let newIndex = startIndex + 1;
  while (newIndex < text.length && text.charAt(newIndex) !== ' ') newIndex += 1;
  return newIndex;
}

const previousNonSpaceIndex = (text: string, startIndex: number): number => {
  let newIndex = startIndex;
  if (text.charAt(newIndex) === ' ') newIndex -= 1;
  while (text.charAt(newIndex) !== ' ' && newIndex > 0) newIndex -= 1;
  return newIndex;
}

// Try adding a text node by incrementally adding words
// until it just barely doesnt overflow.
//
// Returns true if all the text fits, false if none fits,
// or new textnode containing the remainder text.
const addTextNodeUntilOverflow = async (
  textNode: Text,
  parent: HTMLElement,
  hasOverflowed: Checker
): Promise<LayoutResult> => {
  const originalText = textNode.nodeValue || "";
  parent.appendChild(textNode);

  if (!hasOverflowed() || ignoreOverflow(parent)) {
    return { completed: true };
  }

  // Add letter by letter until overflow
  let proposedEnd = 0;
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  while (!hasOverflowed() && proposedEnd < originalText.length) {
    proposedEnd = nextNonSpaceIndex(originalText, proposedEnd)

    if (proposedEnd < originalText.length) {
      // reveal more text
      textNode.nodeValue = originalText.substr(0, proposedEnd);
      await yieldIfNecessary();
    }
  }

  // Back out to word boundary
  const wordEnd = previousNonSpaceIndex(originalText, proposedEnd);

  if (wordEnd < 1) {
    // We didn't even add a complete word, don't add node
    textNode.nodeValue = originalText;
    parent.removeChild(textNode);
    return { completed: false };
  }

  // trim text to word
  const fittingText = originalText.substr(0, wordEnd);
  const overflowingText = originalText.substr(wordEnd);
  textNode.nodeValue = fittingText;

  // Create a new text node for the next flow box
  return {
    completed: true,
    remainder: createTextNode(overflowingText)
  };
};


// Fills text across multiple elements by requesting a continuation
// once the current element overflows
const addTextNodeAcrossParents = async (
  textNode: Text,
  parent: HTMLElement,
  nextParent: ElementGetter,
  hasOverflowed: Checker
): Promise<LayoutResult> => {
  const result = await addTextNodeUntilOverflow(textNode, parent, hasOverflowed);
  if (result.remainder) {
    const nextElement = nextParent();
    return addTextNodeAcrossParents(result.remainder, nextElement, nextParent, hasOverflowed);
  }
  return result;
};

export { addTextNode, addTextNodeUntilOverflow, addTextNodeAcrossParents };
