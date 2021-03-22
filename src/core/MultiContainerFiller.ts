import type { OverflowContainer } from './OverflowContainer';
import { TraverseHandler } from '../types';
import { AppendStatus } from './AppendResult';
import { isContentElement } from '../util/domUtils';
import { ContainerFiller } from './ContainerFiller';
import { ProgressEstimator, ProgressEvent } from './ProgressEstimator';

const noop = () => {};

// Wraps a single ContainerFiller with methods to continue adding content until
// none remains, continuously call getNextContainer
// when it runs out of room. Also emits progress events
// if you pass in progressCallback

export class MultiContainerFiller {
  private filler: ContainerFiller;

  private progressTracker: ProgressEstimator;

  private getNextContainer: () => OverflowContainer;

  constructor(
    handler: TraverseHandler,
    getNextContainer: () => OverflowContainer,
    progressCallback?: (e: ProgressEvent) => void,
  ) {
    this.filler = new ContainerFiller(handler);
    this.getNextContainer = getNextContainer.bind(this);
    this.progressTracker = new ProgressEstimator(progressCallback ?? noop);
  }

  // TODO: how do we get the progress events

  // Wraps with an estimator
  async addContent(content: HTMLElement): Promise<void> {
    this.progressTracker.begin(content.querySelectorAll('*').length);

    const firstRegion = this.getNextContainer();
    await this.addElementAcrossContainers(content, firstRegion);

    this.progressTracker.end();
  }

  // Keeps calling itself until there's no more content
  private async addElementAcrossContainers(
    content: HTMLElement,
    initialContainer: OverflowContainer,
  ): Promise<void> {
    const result = await this.filler.addContent(content, initialContainer);
    if (result.status === AppendStatus.ADDED_PARTIAL && isContentElement(result.remainder)) {
      const nextRegion = this.getNextContainer();
      await this.addElementAcrossContainers(result.remainder, nextRegion);
    }
  }
}
