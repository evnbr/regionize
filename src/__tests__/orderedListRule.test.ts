import { RegionGetter } from '../types';
import flowIntoRegions from '../flowIntoRegions';
import { ol, li } from './dom-test-helper';
import MockRegion from './MockRegion';

describe('Ordered Lists', () => {
  test('Numbering continues on next page', async () => {
    const list = ol(li('item 1'), li('item 2'), li('item 3'));

    const regions: MockRegion[] = [];
    const createRegion = () => {
      const r = new MockRegion(el => el.querySelectorAll('li').length > 1);
      regions.push(r);
      return r;
    };

    await flowIntoRegions(list, {
      createRegion: (createRegion as any) as RegionGetter,
    });

    expect(regions.length).toBe(3);
    expect(regions[0].element.textContent).toBe('item 1');
    expect(regions[1].element.textContent).toBe('item 2');
    expect(regions[2].element.textContent).toBe('item 3');

    expect(regions[0].element.querySelector('ol')!.getAttribute('start')).toBe(
      null,
    );
    expect(regions[1].element.querySelector('ol')!.getAttribute('start')).toBe(
      '2',
    ); // null is implicitly 1, not 0
    expect(regions[2].element.querySelector('ol')!.getAttribute('start')).toBe(
      '3',
    );
  });

  test('Numbering is not incremented when a single list element continues on next page(s)', async () => {
    const list = ol(li('item 1 that is long,'), li('li2'));

    const regions: MockRegion[] = [];
    const createRegion = () => {
      const r = new MockRegion(el => el.textContent.length > 10);
      regions.push(r);
      return r;
    };

    await flowIntoRegions(list, {
      createRegion: (createRegion as any) as RegionGetter,
    });

    expect(regions.length).toBe(3);
    expect(regions[0].element.textContent.trim()).toBe('item 1');
    expect(regions[1].element.textContent.trim()).toBe('that is');
    expect(regions[2].element.textContent.trim()).toBe('long,li2');

    expect(regions[0].element.querySelector('ol')!.getAttribute('start')).toBe(
      null,
    );
    expect(regions[1].element.querySelector('ol')!.getAttribute('start')).toBe(
      '1',
    );
    expect(regions[1].element.querySelector('ol')!.getAttribute('start')).toBe(
      '1',
    );
  });
  //   test('Numbering starts from previous start value', () => {
  //     const ol = document.createElement('ol');
  //     ol.setAttribute('start', '5');
  //     ol.appendChild(document.createElement('li'));
  //     ol.appendChild(document.createElement('li'));
  //     const crumb = [ol];
  //     const newCrumb = clonePath(crumb, applyRulesStub);
  //     expect(newCrumb[0].getAttribute('start')).toBe('7');
  // });
});
