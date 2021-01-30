import { Region } from './Region';
import { Traverser } from './Traverser';
import { RegionizeConfig, AppendResult } from './types';

const flowIntoRegions = async (
  content: HTMLElement,
  opts: Partial<RegionizeConfig>,
): Promise<void> => {
  if (!content) throw Error('Content not specified');

  const t = new Traverser(opts);
  await t.addAcrossRegions(content);
};

const addUntilOverflow = async (
  content: HTMLElement,
  container: HTMLElement,
  opts: Partial<RegionizeConfig>,
): Promise<AppendResult> => {
  if (!content) throw Error('Content not specified');

  const region = new Region(container);
  const t = new Traverser(opts);
  return await t.addElement(content, undefined, region);
};

export { Region, flowIntoRegions, addUntilOverflow };
