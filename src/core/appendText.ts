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
    status: success ? AppendStatus.ADDED_ALL : AppendStatus.ADDED_NONE,
  };
}

function finishAndCreateResult(
  textNode: Text,
  originalText: string,
  endIndex: number,
): AppendResult {
  const proposedValue = originalText.substr(0, endIndex);

  if (endIndex === 0 || isAllWhitespace(proposedValue)) {
    // We didn't even add a complete word, don't add node
    textNode.nodeValue = originalText;
    textNode.remove();
    return { status: AppendStatus.ADDED_NONE };
  }

  // proposedValue is substantial, update the node
  textNode.nodeValue = proposedValue;

  if (proposedValue === originalText) {
    // The whole thing fits. This path should be impossible to hit.
    return { status: AppendStatus.ADDED_ALL };
  }

  // Create a new text node for all the text that didn't fit
  const overflowingText = originalText.substr(endIndex);

  return {
    status: AppendStatus.ADDED_PARTIAL,
    remainder: document.createTextNode(overflowingText),
  };
}

export async function removeTextByWord(
  textNode: Text,
  originalText: string,
  canSplit: () => boolean,
  prevProposedEnd: number | undefined,
): Promise<AppendResult> {
  let proposedEnd = prevProposedEnd ?? originalText.length;

  if (isAllWhitespace(originalText.substr(0, proposedEnd))) {
    finishAndCreateResult(textNode, originalText, proposedEnd);
  }

  // Ensure dom is updated before first measurement
  textNode.nodeValue = originalText.substr(0, proposedEnd);

  while (proposedEnd > 0 && !canSplit()) {
    proposedEnd = indexOfPreviousWordEnd(originalText, proposedEnd);
    // Need to really update dom for each measurement
    textNode.nodeValue = originalText.substr(0, proposedEnd);
    await yieldIfNeeded();
  }

  return finishAndCreateResult(textNode, originalText, proposedEnd);
}

// Incrementally add words to the container until it just barely doesn't
// overflow. Returns a remainder textNode for remaining text.
async function appendTextByWordUntilOverflow(
  textNode: Text,
  originalText: string,
  doesFit: () => boolean,
): Promise<AppendResult> {
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

  // doesFit is no longer true, back out to last word boundary where
  // presumably it was still true
  proposedEnd = indexOfPreviousWordEnd(originalText, proposedEnd);

  return finishAndCreateResult(textNode, originalText, proposedEnd);
}

// Add the maximum number of words that fit while canSplit is true.
export async function appendTextByWord(
  textNode: Text,
  container: HTMLElement,
  doesFit: () => boolean,
  canSplit: () => boolean,
): Promise<AppendResult> {
  container.appendChild(textNode);

  if (doesFit() || isInsideIgnoreOverflow(container)) {
    // The whole thing fits, no adding incrementall isn't necessary.
    return { status: AppendStatus.ADDED_ALL };
  }

  const originalText = textNode.nodeValue ?? '';

  const maximumFittingResult = await appendTextByWordUntilOverflow(
    textNode,
    originalText,
    doesFit,
  );
  if (maximumFittingResult.status === AppendStatus.ADDED_NONE) {
    return maximumFittingResult;
  }

  const proposedEnd = textNode.nodeValue!.length;

  return removeTextByWord(
    textNode,
    originalText,
    canSplit,
    proposedEnd,
  );
}
