const SPACE = ' ';

export const isAllWhitespace = (text: string) => text.trim().length === 0;

export const indexOfNextWordEnd = (text: string, startIndex: number): number => {
  let newIndex = startIndex + 1;

  // If we started on a space character, first advance to the word itself
  while (newIndex < text.length && text.charAt(newIndex) === SPACE) {
    newIndex += 1;
  }

  // Then, keep advancing, to the next space character
  while (newIndex < text.length && text.charAt(newIndex) !== SPACE) {
    newIndex += 1;
  }
  return newIndex;
};

export const indexOfPreviousWordEnd = (text: string, startIndex: number): number => {
  let newIndex = startIndex;
  if (text.charAt(newIndex) === SPACE) {
    newIndex -= 1;
  }

  // Back up through the word until we hit the previous space
  while (text.charAt(newIndex) !== SPACE && newIndex > 0) {
    newIndex -= 1;
  }

  return newIndex;
};
