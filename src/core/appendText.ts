import { yieldIfNeeded } from '../util/asyncUtils';
import { isInsideIgnoreOverflow } from '../attributeHelper';
import { AppendStatus, AppendResult } from './AppendResult';
import { indexOfNextWordEnd, indexOfPreviousWordEnd, isAllWhitespace } from '../util/stringUtils';

// Try adding a text node in one go.
// Returns true if all the text fits, false if none fits.
export async function appendTextAsBlock(
  textNode: Text,
  container: HTMLElement,
  doesFit: () => boolean,
): Promise<AppendResult> {
  container.appendChild(textNode);
  const success = doesFit();
  if (!success) container.removeChild(textNode);
  await yieldIfNeeded();
  return {
    status: success ? AppendStatus.ADDED_ALL : AppendStatus.ADDED_NONE
  };
};

// Incrementally add words to the container until it just barely doesn't
// overflow. Returns a remainder textNode for remaining text.
export async function appendTextByWord(
  textNode: Text,
  container: HTMLElement,
  doesFit: () => boolean,
  canSplit: () => boolean,
): Promise<AppendResult> {
  const originalText = textNode.nodeValue ?? '';
  container.appendChild(textNode);

  if (doesFit() || isInsideIgnoreOverflow(container)) {
    // The whole thing fits
    return { status: AppendStatus.ADDED_ALL };
  }

  // Clear the node
  let proposedEnd = 0;
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  // While the text fits, add word-by-word
  while (proposedEnd < originalText.length && doesFit()) {
    proposedEnd = indexOfNextWordEnd(originalText, proposedEnd);

    if (proposedEnd < originalText.length) {
      textNode.nodeValue = originalText.substr(0, proposedEnd);
      await yieldIfNeeded();
    }
  }

  // doesFit is no longer true, back out to last word boundary
  proposedEnd = indexOfPreviousWordEnd(originalText, proposedEnd);
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  if (!isAllWhitespace(originalText.substr(0, proposedEnd))) {
    // keep backing up if needed to fulfill canSplit
    proposedEnd = await indexOfPreviousClosestValidSplit(textNode, proposedEnd, canSplit);
  }

  const fittingTextAtValidSplit = originalText.substr(0, proposedEnd);

  if (proposedEnd === 0 || isAllWhitespace(fittingTextAtValidSplit)) {
    // We didn't even add a complete word, don't add node
    textNode.nodeValue = originalText;
    container.removeChild(textNode);
    return { status: AppendStatus.ADDED_NONE };
  }

  // fittingText is substantial, update the node
  textNode.nodeValue = fittingTextAtValidSplit;

  // Create a new text node for all the text that didn't fit
  const overflowingText = originalText.substr(proposedEnd);

  return {
    status: AppendStatus.ADDED_PARTIAL,
    remainder: document.createTextNode(overflowingText),
  };
};

// Removes words until canSplit is true, ignoring doesFit since we're going backwards.
// Returns new endIndex.
export async function indexOfPreviousClosestValidSplit(
  textNode: Text,
  initialProposedEnd: number,
  canSplit: () => boolean,
): Promise<number> {
  let proposedEnd = initialProposedEnd;
  const originalText = textNode.nodeValue ?? '';

  while (proposedEnd > 0 && !canSplit() ) {
    proposedEnd = indexOfPreviousWordEnd(originalText, proposedEnd);
    textNode.nodeValue = originalText.substr(0, proposedEnd); // really update dom because canSplit will measure
    await yieldIfNeeded();
  }

  return proposedEnd;
}