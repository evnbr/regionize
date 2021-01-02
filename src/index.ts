import Region from './Region';
import FlowManager from './FlowManager';
import {
  RegionizeConfig,
  AppendResult,
} from './types';

const flowIntoRegions = async (
  content: HTMLElement,
  opts: Partial<RegionizeConfig>,
): Promise<void> => {
  if (!content) throw Error('content not specified');

  const flowManager = new FlowManager(opts);
  await flowManager.addAcrossRegions(content);
};

const addUntilOverflow = async (
  content: HTMLElement,
  container: HTMLElement,
  opts: Partial<RegionizeConfig>,
): Promise<AppendResult> => {
  if (!content) throw Error('content not specified');

  const region = new Region(container);
  const flowManager = new FlowManager(opts);
  return await flowManager.addElement(content, region);
};

export { Region, flowIntoRegions, addUntilOverflow };
