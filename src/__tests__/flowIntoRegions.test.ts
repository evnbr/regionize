import { RegionGetter } from '../types';
import flowIntoRegions from '../flowIntoRegions';
import { h, div, span, p, section } from './dom-test-helper';

let time = 0;
(global as any).performance = {
  now: () => {
    time += 1;
    return time;
  },
};

let mockOverflow = (el: HTMLElement) => {
  return el.textContent!.length > 10;
};

const allText = (regions: any) =>
  regions
    .map((region: any) => region.element.textContent)
    .join('')
    .replace(/\s+/g, '');

const MockRegion = () => {
  const element = div();
  const content = div();
  element.append(content);
  element.classList.add('box');
  content.classList.add('content');
  const hasOverflowed = () => mockOverflow(content);
  const append = nodes => content.append(nodes);
  const instance = {
    append,
    element,
    isEmpty: () => false,
    hasOverflowed,
    isReasonableSize: true,
  };
  return instance;
};

test('Preserves content order (10char overflow)', async () => {
  const a = div('A content.', p('B content.', span('C content.')));

  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent!.length > 10;
  await flowIntoRegions(a, {
    createRegion: (createRegion as any) as RegionGetter,
  });

  expect(regions.length).toBe(3);
  expect(allText(regions)).toBe('Acontent.Bcontent.Ccontent.');
});

test('Splits a single div over many pages (10char overflow)', async () => {
  const content = div();
  content.textContent = 'A content. B content. C content.';

  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent!.length > 10;
  await flowIntoRegions(content, {
    createRegion: (createRegion as any) as RegionGetter,
  });

  expect(regions.length).toBe(5);
  expect(allText(regions)).toBe('Acontent.Bcontent.Ccontent.');
  expect(regions.map(region => region.hasOverflowed())).toEqual([
    false,
    false,
    false,
    false,
    false,
  ]);
});

test('Split elements over many pages (100char overflow)', async () => {
  const content = section();
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = p();
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent!.length > 100;
  await flowIntoRegions(content, {
    createRegion: (createRegion as any) as RegionGetter,
  });

  expect(regions.length).toBe(3);
  expect(allText(regions)).toBe(expectedText);
  expect(
    regions.map(region => region.element.textContent.length > 100),
  ).toEqual([false, false, false]);
});

//
test('Split elements over many pages (5children overflow)', async () => {
  const content = div();
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = p();
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  mockOverflow = el => {
    const count = (el.querySelectorAll('*') || []).length;
    return count > 5;
  };
  await flowIntoRegions(content, {
    createRegion: (createRegion as any) as RegionGetter,
  });

  expect(regions.length).toBe(5);
  expect(allText(regions)).toBe(expectedText);
});

test('Spreads elements over many pages without splitting any (100char overflow)', async () => {
  const content = h('section');
  let expectedText = '';
  for (let i = 0; i < 20; i += 1) {
    const e = p();
    const txt = `Paragraph ${i}`;
    e.textContent = txt;
    expectedText += txt.replace(/\s+/g, '');
    content.appendChild(e);
  }

  const canSplit = (el: HTMLElement) => !el.matches('p');
  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  mockOverflow = el => el.textContent!.length > 100;
  await flowIntoRegions(content, {
    createRegion: (createRegion as any) as RegionGetter,
    canSplit,
  });
  expect(regions.length).toBe(3);

  const endParagraphCount = regions
    .map(region => region.element.querySelectorAll('p').length)
    .reduce((a, b) => a + b);
  expect(endParagraphCount).toBe(20);

  expect(allText(regions)).toBe(expectedText);
  expect(
    regions.map(region => region.element.textContent.length > 100),
  ).toEqual([false, false, false]);
});

test("Shifts appropriate parent if can't split", async () => {
  const splittableWrap = h('aside');
  let expectedText = '';
  for (let i = 0; i < 5; i += 1) {
    const el = section(
      p(`Paragraph 1 in Section${i}`),
      p(`Paragraph 1 in Section${i}`),
    );
    expectedText += el.textContent.replace(/\s+/g, '');
    splittableWrap.append(el);
  }

  const regions: any[] = [];
  const createRegion = () => {
    const r = MockRegion();
    regions.push(r);
    return r;
  };

  const content = div(splittableWrap);
  mockOverflow = el => {
    const count = (el.querySelectorAll('*') || []).length;
    return count > 5;
  };
  await flowIntoRegions(content, {
    createRegion: (createRegion as any) as RegionGetter,
  });

  expect(regions.length).toBe(5);
  expect(allText(regions)).toBe(expectedText);
  const endParagraphCount = regions
    .map(region => region.element.querySelectorAll('p').length)
    .reduce((a, b) => a + b);
  expect(endParagraphCount).toBe(10);

  const endSectionCount = regions
    .map(region => region.element.querySelectorAll('section').length)
    .reduce((a, b) => a + b);
  expect(endSectionCount).toBe(5);

  const endAsideCount = regions
    .map(region => region.element.querySelectorAll('aside').length)
    .reduce((a, b) => a + b);
  expect(endAsideCount).toBe(5);
});

// test('Applies split classes', async () => {
//   const applyRulesStub = (a: HTMLElement, b: HTMLElement) => {
//     a.classList.add('toNext');
//     b.classList.add('fromPrev');
//   };

//   test('Split elements get classes from custom rule', () => {
//     const div = document.createElement('div');
//     const span = document.createElement('span');
//     const crumb = [div, span];
//     const newCrumb = clonePath(crumb, applyRulesStub);

//     expect(div.classList.contains('toNext')).toBe(true);
//     expect(span.classList.contains('toNext')).toBe(true);
//     expect(newCrumb[0].classList.contains('fromPrev')).toBe(true);
//     expect(newCrumb[1].classList.contains('fromPrev')).toBe(true);
//   });
// });

test('Throws Errors when missing required parameters', async () => {
  expect(
    (async () => {
      // @ts-ignore
      await flowIntoRegions(true);
    })(),
  ).rejects.toThrow();

  expect(
    (async () => {
      await flowIntoRegions(undefined, { createRegion: () => false } as any);
    })(),
  ).rejects.toThrow();

  expect(
    (async () => {
      await flowIntoRegions(document.createElement('div'), {
        createRegion: () => MockRegion(),
      } as any);
    })(),
  ).resolves.not.toThrow();
});
