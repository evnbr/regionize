import { PluginManager } from './plugins/PluginManager';
import { Traverser } from './traverse/Traverser';
import { MultiContainerTraverser } from './traverse/MultiContainerTraverser';
import type { ProgressEvent }  from './traverse/ProgressEstimator';
import { OverflowDetector, AppendResult, Plugin } from './types';
import { Region } from './region/Region';

const missingInputError = (name: string) => {
  return new Error(`Regionize: Required option '${name}' not specified`);
}

export interface AddAcrossOptions {
  content: HTMLElement,
  getNextContainer: () => OverflowDetector;
  onProgress?: (e: ProgressEvent) => void;
  plugins?: Plugin[];
}

export async function addAcrossContainers (
  { content, getNextContainer, plugins, onProgress }: AddAcrossOptions
): Promise<void> {

  if (!content) throw missingInputError('content');
  if (!getNextContainer) throw missingInputError('getNextContainer');

  const handler = new PluginManager(plugins ?? []);
  const traverser = new MultiContainerTraverser(handler, getNextContainer, onProgress);

  await traverser.addAcrossContainers(content);
};


export interface Options {
  content: HTMLElement,
  container: HTMLElement;
  plugins?: Plugin[];
}

export async function addUntilOverflow(
  { content, container, plugins }: Options
): Promise<AppendResult> {
  if (!content) throw missingInputError('content');
  if (!container) throw missingInputError('container');

  const region = new Region(container);
  const handler = new PluginManager(plugins ?? []);
  const traverser = new Traverser(handler);

  return await traverser.addElement(content, undefined, region);
};

export { Region };
export * as Plugins from './plugins/index';
