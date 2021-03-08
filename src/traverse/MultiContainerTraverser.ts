import {
  AppendStatus,
  OverflowDetector,
  TraverseHandler,
} from '../types';

import { isContentElement } from '../guards';
import { Traverser } from './Traverser';
import { ProgressEstimator, ProgressEvent } from './ProgressEstimator';
  
const noop = () => {};

// Wraps a traverser with methods to continue adding content until
// none remains, continuously call getNextContainer
// when it runs out of room. Also emits progress events
// if you pass in progressCallback

export class MultiContainerTraverser {
  private traverser: Traverser
  private progressTracker: ProgressEstimator;
  private getNextContainer: () => OverflowDetector; 

  constructor(
    handler: TraverseHandler,
    getNextContainer: () => OverflowDetector,
    progressCallback?: (e: ProgressEvent) => void,
  ) {
    this.traverser = new Traverser(handler);
    this.getNextContainer = getNextContainer.bind(this);
    this.progressTracker = new ProgressEstimator(progressCallback ?? noop);
  }

  // TODO: how do we get the progress events

  // Wraps with an estimator
  async addAcrossContainers(content: HTMLElement): Promise<void> {
    this.progressTracker.begin(content.querySelectorAll('*').length);

    const firstRegion = this.getNextContainer();
    await this.addElementAcrossRegions(content, firstRegion);

    this.progressTracker.end();
  }

  // Keeps calling itself until there's no more content
  private async addElementAcrossRegions(
    content: HTMLElement,
    initialRegion: OverflowDetector,
  ): Promise<void> {
    const result = await this.traverser.addElement(content, undefined, initialRegion);
    if (result.status == AppendStatus.ADDED_PARTIAL && isContentElement(result.remainder)) {
      const nextRegion = this.getNextContainer();
      await this.addElementAcrossRegions(result.remainder, nextRegion);
    }
  }
}