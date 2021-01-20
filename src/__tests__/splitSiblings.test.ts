import { findValidSplit } from '../splitSiblings';
import * as dom from './dom-test-helper';


describe('findValidSplit', () => {
  test('No change if every split is valid', () => {
    const proposed = {
      added: [dom.div(), dom.div(), dom.div()],
      remainders: [dom.div()]
    };
    const result = findValidSplit(proposed, () => true);
    expect(result.added.length).toBe(3);
    expect(result.remainders.length).toBe(1);
  });

  test('All overflows if every split is invalid', () => {
    const proposed = {
      added: [dom.div(), dom.div(), dom.div()],
      remainders: [dom.div()]
    };
    const result = findValidSplit(proposed, () => false);

    expect(result.added.length).toBe(0);
    expect(result.remainders.length).toBe(4);
  });

  test('Shifts 1 when no text', () => {
    const proposed = {
      added: [dom.h2(), dom.p(), dom.h2()],
      remainders: [dom.p()]
    };
    const result = findValidSplit(proposed, (a, b) => {
      if (a.matches('h2')) return false;
      return true;
    })
    expect(result.added.length).toBe(2);
    expect(result.remainders.length).toBe(2);
  });

  test('Callback skips over blank text nodes', () => {
    const proposed = {
      added: [
        dom.h2(),
        dom.p(),
        dom.h2(),
        dom.text(' '),
        dom.text('  \n  \t')
      ],
      remainders: [dom.p()]
    };
    const result = findValidSplit(proposed, (a, b) => {
      if (a.matches('h2')) return false;
      return true;
    })
    expect(result.added.length).toBe(2);
    expect(result.remainders.length).toBe(4);
  });

  test('Callback fails when text between', () => {
    const proposed = {
      added: [
        dom.h2(),
        dom.p(),
        dom.h2(),
        dom.text('hello\n there'),
        dom.text(' '),
      ],
      remainders: [dom.p()]
    };
    const result = findValidSplit(proposed, (a, b) => {
      if (a.matches('h2')) return false;
      return true;
    })
    expect(result.added.length).toBe(5);
    expect(result.remainders.length).toBe(1);
  });

  test('Shifts 2 elements', () => {
    const proposed = {
      added: [
        dom.h2(),
        dom.p(),
        dom.h2(),
        dom.text(' '),
        dom.p(),
        dom.text(' '),
      ],
      remainders: [
        dom.p(),
        dom.p()]
    };
    const result = findValidSplit(proposed, (a, b) => {
      if (a.matches('h2')) return false;
      if (a.matches('p') && b.matches('p')) return false;
      return true;
    })
    expect(result.added.length).toBe(2);
    expect(result.remainders.length).toBe(6);
  });
});

describe('indexOfPreviousWordEnd', () => {
});
