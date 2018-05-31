import flowIntoRegions from './flowIntoRegions';

let time = 0;
global.performance = { now: () => {
  time += 1;
  return time;
} };

const noop = () => {};
const mockDoc = document;
const mockEl = (name = 'div') => mockDoc.createElement(name);
let mockOverflow = el => el.textContent.length > 10;

const allText = regions => regions
  .map(region => region.content.textContent)
  .join('').replace(/\s+/g, '');

const MockRegion = () => {
  const element = mockEl();
  const content = mockEl();
  element.classList.add('box');
  content.classList.add('content');
  const hasOverflowed = () => mockOverflow(content);
  const path = [];
  const instance = {
    path,
    element,
    content,
    get currentElement() {
      return instance.path.length < 1 ? content : instance.path[instance.path.length - 1];
    },
    setPath: (newPath) => {
      instance.path = newPath;
      if (newPath.length > 0) content.appendChild(newPath[0]);
    },
    hasOverflowed,
    isReasonableSize: true,
  };
  return instance;
};


test('Preserves content order (10char overflow)', async () => {
  const a = mockEl('div');
  const b = mockEl('p');
  const c = mockEl('span');
  a.textContent = 'A content.';
  b.textContent = 'B content.';
  c.textContent = 'C content.';
  a.appendChild(b);
  b.appendChild(c);

  const canSplit = () => true;
  const regions = [];
  const createRegion = () => {
    const r = MockRegion(mockEl('div'));
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent.length > 10;
  await flowIntoRegions(a, createRegion, noop, canSplit, noop, noop);

  expect(regions.length).toBe(3);
  expect(allText(regions)).toBe('Acontent.Bcontent.Ccontent.');
});

test('Splits a single div over many pages (10char overflow)', async () => {
  const content = mockEl();
  content.textContent = 'A content. B content. C content.';

  const canSplit = () => true;
  const regions = [];
  const createRegion = () => {
    const r = MockRegion(mockEl('div'));
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent.length > 10;
  await flowIntoRegions(content, createRegion, noop, canSplit, noop, noop);

  expect(regions.length).toBe(5);
  expect(allText(regions)).toBe('Acontent.Bcontent.Ccontent.');
  expect(regions.map(region => region.hasOverflowed()))
    .toEqual([false, false, false, false, false]);
});

test('Split elements over many pages (100char overflow)', async () => {
  const content = mockEl('section');
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = mockEl('p');
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const canSplit = () => true;
  const regions = [];
  const createRegion = () => {
    const r = MockRegion(mockEl('div'));
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent.length > 100;
  await flowIntoRegions(content, createRegion, noop, canSplit, noop, noop);

  expect(regions.length).toBe(3);
  expect(allText(regions)).toBe(expectedText);
  expect(regions.map(region => region.element.textContent.length > 100))
    .toEqual([false, false, false]);
});
//
test('Split elements over many pages (5children overflow)', async () => {
  const content = mockEl('div');
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = mockEl('p');
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const canSplit = () => true;
  const regions = [];
  const createRegion = () => {
    const r = MockRegion(mockEl('div'));
    regions.push(r);
    return r;
  };

  mockOverflow = (el) => {
    const count = (el.querySelectorAll('*') || []).length;
    return count > 5;
  };
  await flowIntoRegions(content, createRegion, noop, canSplit, noop, noop);

  expect(regions.length).toBe(5);
  expect(allText(regions)).toBe(expectedText);
});

test('Spreads elements over many pages without splitting any (100char overflow)', async () => {
  const content = mockEl('section');
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = mockEl('p');
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const canSplit = el => !el.matches('p');
  const regions = [];
  const createRegion = () => {
    const r = MockRegion(mockEl('div'));
    regions.push(r);
    return r;
  };


  mockOverflow = el => el.textContent.length > 100;
  await flowIntoRegions(content, createRegion, noop, canSplit, noop, noop);
  expect(regions.length).toBe(3);

  const endParagraphCount = regions
    .map(region => region.content.querySelectorAll('p').length)
    .reduce((a, b) => a + b);
  expect(endParagraphCount).toBe(20);

  expect(allText(regions)).toBe(expectedText);
  expect(regions.map(region => region.element.textContent.length > 100))
    .toEqual([false, false, false]);
});
