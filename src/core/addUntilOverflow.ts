import { PluginManager } from './PluginManager';
import { ContainerFiller } from './ContainerFiller';
import { Plugin } from '../types';
import type { AppendResult } from './AppendResult';

import { OverflowContainerElement } from './OverflowContainer';
import { missingInputError } from '../util/domUtils';

export interface AddUntilOptions {
  content: HTMLElement,
  container: HTMLElement;
  plugins?: Plugin[];
}

// Public API for adding content and returning a remainder
export async function addUntilOverflow({
  content,
  container,
  plugins
}: AddUntilOptions): Promise<AppendResult> {
  if (!content) throw missingInputError('content');
  if (!container) throw missingInputError('container');

  const handler = new PluginManager(plugins ?? []);
  const filler = new ContainerFiller(handler);
  return await filler.addContent(
    content,
    new OverflowContainerElement(container)
  );
};
