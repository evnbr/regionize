import { flowIntoRegions } from '../index';
import { OverflowDetector } from '../types';
import { h, div, span, p, section } from './dom-test-helper';
import OverflowSimulator from './OverflowSimulator';

let time = 0;
(global as any).performance = {
  now: () => {
    time += 1;
    return time;
  },
};

const allText = (regions: any) =>
  regions
    .map((region: any) => region.element.textContent)
    .join('')
    .replace(/\s+/g, '');

test('Preserves content order (10char overflow)', async () => {
  const a = div('A content.', p('B content.', span('C content.')));

  const regions: OverflowDetector[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => el.textContent!.length > 10);
    regions.push(r);
    return r;
  };

  await flowIntoRegions(a, { getNextContainer });

  expect(regions.length).toBe(3);
  expect(allText(regions)).toBe('Acontent.Bcontent.Ccontent.');
});

test('Splits a single div over many pages (10char overflow)', async () => {
  const content = div();
  content.textContent = 'A content. B content. C content.';

  const regions: OverflowSimulator[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => el.textContent!.length > 10);
    regions.push(r);
    return r;
  };

  await flowIntoRegions(content, { getNextContainer });

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

  const regions: OverflowDetector[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => el.textContent!.length > 100);
    regions.push(r);
    return r;
  };

  await flowIntoRegions(content, { getNextContainer });

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

  const regions: OverflowDetector[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => {
      const count = (el.querySelectorAll('*') || []).length;
      return count > 5;
    });
    regions.push(r);
    return r;
  };

  await flowIntoRegions(content, { getNextContainer });

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
  const regions: OverflowDetector[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => el.textContent!.length > 100);
    regions.push(r);
    return r;
  };

  await flowIntoRegions(content, { getNextContainer, plugins: [{ canSplit }] });
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

  const regions: OverflowDetector[] = [];
  const getNextContainer = () => {
    const r = new OverflowSimulator(el => {
      const count = (el.querySelectorAll('*') || []).length;
      return count > 5;
    });
    regions.push(r);
    return r;
  };

  const content = div(splittableWrap);
  await flowIntoRegions(content, { getNextContainer });

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
        getNextContainer: () => {
          return new OverflowSimulator(() => true);
        },
      } as any);
    })(),
  ).resolves.not.toThrow();
});
