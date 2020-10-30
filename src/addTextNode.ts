import { yieldIfNecessary } from './schedule';
import isInsideOverflowIgnoringElement from './ignoreOverflow';
import { AddedStatus, AddAttemptResult } from './types';
import { nextWordEnd, previousWordEnd } from './stringUtils';

type Checker = () => boolean;

// Try adding a text node in one go.
// Returns true if all the text fits, false if none fits.
const addTextNodeWithoutSplit = async (
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: Checker,
): Promise<AddAttemptResult> => {
  container.appendChild(textNode);
  const success = !hasOverflowed();
  if (!success) container.removeChild(textNode);
  await yieldIfNecessary();
  return { status: success ? AddedStatus.ALL : AddedStatus.NONE };
};

// Incrementally add words to the container until it just barely doesn't
// overflow. Returns a remainder textNode for remaining text.
const addTextUntilOverflow = async (
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: Checker,
): Promise<AddAttemptResult> => {
  const originalText = textNode.nodeValue ?? '';
  container.appendChild(textNode);

  if (!hasOverflowed() || isInsideOverflowIgnoringElement(container)) {
    // The whole thing fits
    return { status: AddedStatus.ALL };
  }

  // Clear the node
  let proposedEnd = 0;
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  while (!hasOverflowed() && proposedEnd < originalText.length) {
    // Reveal the next word
    proposedEnd = nextWordEnd(originalText, proposedEnd);

    if (proposedEnd < originalText.length) {
      textNode.nodeValue = originalText.substr(0, proposedEnd);
      await yieldIfNecessary();
    }
  }

  // Back out to word boundary
  const wordEnd = previousWordEnd(originalText, proposedEnd);
  const fittingText = originalText.substr(0, wordEnd);
  const isAllWhitespace = fittingText.trim() === '';

  if (wordEnd < 1 || isAllWhitespace) {
    // We didn't even add a complete word, don't add node
    textNode.nodeValue = originalText;
    container.removeChild(textNode);
    return { status: AddedStatus.NONE };
  }

  // trim text to word
  const overflowingText = originalText.substr(wordEnd);
  textNode.nodeValue = fittingText;

  // Create a new text node for the next flow box
  return {
    status: AddedStatus.PARTIAL,
    remainder: document.createTextNode(overflowingText),
  };
};

export { addTextNodeWithoutSplit, addTextUntilOverflow };
