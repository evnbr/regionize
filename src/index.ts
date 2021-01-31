import { PluginManager } from './plugins/PluginManager';
import { Region } from './Region';
import { Traverser } from './Traverser';
import { OverflowDetector, AppendResult, ProgressEvent, Plugin } from './types';


export interface Options {
  getNextContainer: () => OverflowDetector;
  onProgress: (e: ProgressEvent) => void;
  plugins: Plugin[];
}


const flowIntoRegions = async (content: HTMLElement, opts: Partial<Options>): Promise<void> => {
  if (!content) throw Error('Content not specified');
  if (!opts.getNextContainer) throw Error('getNextContainer not specified');

  const handler = new PluginManager(opts.plugins ?? []);
  const traverser = new Traverser(handler);

  if (opts.onProgress) traverser.progressCallback = opts.onProgress;

  await traverser.addAcrossRegions(content, opts.getNextContainer);
};

const addUntilOverflow = async (
  content: HTMLElement,
  container: HTMLElement,
  opts: Partial<Options>,
): Promise<AppendResult> => {
  if (!content) throw Error('Content not specified');

  const region = new Region(container);
  
  const handler = new PluginManager(opts.plugins ?? []);
  const traverser = new Traverser(handler);

  if (opts.onProgress) traverser.progressCallback = opts.onProgress;

  return await traverser.addElement(content, undefined, region);
};

export { Region, flowIntoRegions, addUntilOverflow };
