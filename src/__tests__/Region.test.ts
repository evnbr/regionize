import Region from '../Region';
import * as dom from './dom-test-helper';

const setMockHeight = (el: Element, fakeHeight: number) => {
  Object.defineProperty(el, 'offsetHeight', {
    get: jest.fn(() => {
      return fakeHeight;
    }),
    configurable: true,
  });
};

test('Region isEmpty works', () => {
  const div = dom.div();
  const textNode = dom.text('content');
  const region = new Region(div);

  expect(region.isEmpty()).toBe(true);

  region.append(textNode);

  expect(region.isEmpty()).toBe(false);
});

test('Region isReasonableSize works', () => {
  const div = dom.div();
  const region = new Region(div);

  Element.prototype.getBoundingClientRect = jest.fn(() => {
    return { width: 20, height: 20 } as DOMRect;
  });
  expect(region.isReasonableSize()).toBe(false);

  Element.prototype.getBoundingClientRect = jest.fn(() => {
    return { width: 120, height: 120 } as DOMRect;
  });
  expect(region.isReasonableSize()).toBe(true);
});

test('Region hasOverflowed works', () => {
  const div = dom.div();
  const region = new Region(div);

  setMockHeight(div, 100);

  setMockHeight(region.element.firstElementChild, 20);
  expect(region.hasOverflowed()).toBe(false);

  setMockHeight(region.element.firstElementChild, 100);
  expect(region.hasOverflowed()).toBe(true);

  setMockHeight(region.element.firstElementChild, 90);
  expect(region.hasOverflowed()).toBe(false);

  setMockHeight(region.element.firstElementChild, 120);
  expect(region.hasOverflowed()).toBe(true);
});

test('Region hasOverflowed throws on zero height', () => {
  const div = dom.div();
  const region = new Region(div);

  setMockHeight(div, 0);

  expect(() => {
    region.hasOverflowed();
  }).toThrow();
});
