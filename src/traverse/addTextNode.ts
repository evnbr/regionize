import { yieldIfNeeded } from './schedule';
import { isInsideIgnoreOverflow } from '../attributeHelper';
import { AppendStatus, AppendResult } from '../types';
import { indexOfNextWordEnd, indexOfPreviousWordEnd, isAllWhitespace } from './stringUtils';

// Try adding a text node in one go.
// Returns true if all the text fits, false if none fits.
export async function addTextNodeWithoutSplit(
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: () => boolean,
): Promise<AppendResult> {
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
export async function addTextUntilOverflow(
  textNode: Text,
  container: HTMLElement,
  hasOverflowed: () => boolean,
): Promise<AppendResult> {
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

  // Trimmed string is substantial: apply it to this node
  textNode.nodeValue = fittingText;

  // Create a new text node for the next region
  const overflowingText = originalText.substr(wordEnd);

  return {
    status: AppendStatus.ADDED_PARTIAL,
    remainder: document.createTextNode(overflowingText),
  };
};