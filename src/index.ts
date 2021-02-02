import { PluginManager } from './plugins/PluginManager';
import { Traverser, MultiContainerTraverser } from './traverse/Traverser';
import type { ProgressEvent }  from './traverse/ProgressEstimator';
import { OverflowDetector, AppendResult, Plugin } from './types';
import { Region } from './region/Region';


export interface FlowOptions {
  content: HTMLElement,
  getNextContainer: () => OverflowDetector;
  onProgress?: (e: ProgressEvent) => void;
  plugins?: Plugin[];
}

export async function addAcrossContainers (
  options: FlowOptions
): Promise<void> {
  if (!options.content) throw Error('Content not specified');
  if (!options.getNextContainer) throw Error('getNextContainer not specified');

  const handler = new PluginManager(options.plugins ?? []);
  const traverser = new MultiContainerTraverser(
    handler,
    options.getNextContainer,
    options.onProgress
  );

  await traverser.addAcrossContainers(options.content);
};


export interface Options {
  content: HTMLElement,
  container: HTMLElement;
  plugins?: Plugin[];
}

export async function addUntilOverflow(
  options: Options
): Promise<AppendResult> {
  const { content, container, plugins } = options;
  if (!content) throw Error('Content not specified');
  if (!container) throw Error('Container not specified');

  const region = new Region(container);
  const handler = new PluginManager(plugins ?? []);
  const traverser = new Traverser(handler);

  return await traverser.addElement(content, undefined, region);
};

export { Region };
export * as Plugins from './plugins/index';
