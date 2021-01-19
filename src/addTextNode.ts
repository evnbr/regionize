import { yieldIfNeeded } from './schedule';
import { isInsideIgnoreOverflow } from './attributeHelper';
import { AppendStatus, AppendResult } from './types';
import { indexOfNextWordEnd, indexOfPreviousWordEnd, isAllWhitespace } from './stringUtils';

type Checker = () => boolean;

// Try adding a text node in one go.
// Returns true if all the text fits, false if none fits.
const addTextNodeWithoutSplit = async (
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: Checker,
): Promise<AppendResult> => {
  container.appendChild(textNode);
  const success = !hasOverflowed();
  if (!success) container.removeChild(textNode);
  await yieldIfNeeded();
  return {
    status: success ? AppendStatus.ADDED_ALL : AppendStatus.ADDED_NONE
  };
};

// Incrementally add words to the container until it just barely doesn't
// overflow. Returns a remainder textNode for remaining text.
const addTextUntilOverflow = async (
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: Checker,
): Promise<AppendResult> => {
  const originalText = textNode.nodeValue ?? '';
  container.appendChild(textNode);

  if (!hasOverflowed() || isInsideIgnoreOverflow(container)) {
    // The whole thing fits
    return { status: AppendStatus.ADDED_ALL };
  }

  // Clear the node
  let proposedEnd = 0;
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  while (!hasOverflowed() && proposedEnd < originalText.length) {
    // Reveal the next word
    proposedEnd = indexOfNextWordEnd(originalText, proposedEnd);

    if (proposedEnd < originalText.length) {
      textNode.nodeValue = originalText.substr(0, proposedEnd);
      await yieldIfNeeded();
    }
  }

  // Back out to word boundary
  const wordEnd = indexOfPreviousWordEnd(originalText, proposedEnd);
  const fittingText = originalText.substr(0, wordEnd);

  if (wordEnd < 1 || isAllWhitespace(fittingText)) {
    // We didn't even add a complete word, don't add node
    textNode.nodeValue = originalText;
    container.removeChild(textNode);
    return { status: AppendStatus.ADDED_NONE };
  }

  // trim text to word
  const overflowingText = originalText.substr(wordEnd);
  textNode.nodeValue = fittingText;

  // Create a new text node for the next flow box
  return {
    status: AppendStatus.ADDED_PARTIAL,
    remainder: document.createTextNode(overflowingText),
  };
};

export { addTextNodeWithoutSplit, addTextUntilOverflow };
