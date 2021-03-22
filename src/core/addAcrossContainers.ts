import { PluginManager } from './PluginManager';
import { MultiContainerFiller } from './MultiContainerFiller';
import type { OverflowContainer } from './OverflowContainer';
import type { ProgressEvent } from './ProgressEstimator';
import { Plugin } from '../types';
import { missingInputError } from '../util/domUtils';

export interface AddAcrossOptions {
  content: HTMLElement,
  getNextContainer: () => OverflowContainer;
  onProgress?: (e: ProgressEvent) => void;
  plugins?: Plugin[];
}

// Public API for adding content and
// containers until there is no remainder
export async function addAcrossContainers({
  content,
  getNextContainer,
  plugins,
  onProgress,
}: AddAcrossOptions): Promise<void> {
  if (!content) throw missingInputError('content');
  if (!getNextContainer) throw missingInputError('getNextContainer');

  const handler = new PluginManager(plugins ?? []);
  const filler = new MultiContainerFiller(handler, getNextContainer, onProgress);

  await filler.addContent(content);
}
