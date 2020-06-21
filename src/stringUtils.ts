const SPACE = ' ';

const nextWordEnd = (text: string, startIndex: number): number => {
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

const previousWordEnd = (text: string, startIndex: number): number => {
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

export { nextWordEnd, previousWordEnd };
