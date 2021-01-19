import { indexOfNextWordEnd, indexOfPreviousWordEnd } from '../stringUtils';

const simple = 'This is sample text.';
const multiSpace = 'This    is   sample text.';

describe('indexOfNextWordEnd', () => {
  test('Works for simple text', () => {
    expect(indexOfNextWordEnd(simple, 0)).toBe(4);
    expect(indexOfNextWordEnd(simple, 2)).toBe(4);
    expect(indexOfNextWordEnd(simple, 3)).toBe(7);
    expect(indexOfNextWordEnd(simple, 4)).toBe(7);
    expect(indexOfNextWordEnd(simple, 11)).toBe(14);
  });
  test('Works when multiple spaces', () => {
    expect(indexOfNextWordEnd(multiSpace, 0)).toBe(4);
    expect(indexOfNextWordEnd(multiSpace, 2)).toBe(4);
    expect(indexOfNextWordEnd(multiSpace, 4)).toBe(10);
    expect(indexOfNextWordEnd(multiSpace, 7)).toBe(10);
  });
});

describe('indexOfPreviousWordEnd', () => {
  test('Works for simple text', () => {
    expect(indexOfPreviousWordEnd(simple, 0)).toBe(0);
    expect(indexOfPreviousWordEnd(simple, 3)).toBe(0);
    expect(indexOfPreviousWordEnd(simple, 5)).toBe(4);
    expect(indexOfPreviousWordEnd(simple, 11)).toBe(7);
  });
});
