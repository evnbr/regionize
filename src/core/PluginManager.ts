import { ensureImageLoaded } from '../plugins/ensureImageLoaded';
import { Plugin, TraverseEvent, TraverseHandler } from '../types';
import { runInSequence } from '../util/asyncUtils';
  
const DEFAULT_PLUGINS = [
  ensureImageLoaded(),
];

// A class that exposes a consistent interface
// over a list of plugins, combining the results as
// appropriate
export class PluginManager implements TraverseHandler {
  private readonly plugins: Plugin[];

  constructor(plugins: Plugin[]) {
    this.plugins = [...DEFAULT_PLUGINS, ...plugins];
  }

  private handlersFor<Ev extends TraverseEvent>(
    eventName: Ev,
    el: HTMLElement
  ): TraverseHandler[Ev][] {
    return this.plugins
      .filter(p => p[eventName] && (!p.selector || el.matches(p.selector)))
      .map(p => p[eventName] as TraverseHandler[Ev]);
  }

  // Defaults true, unless any plugin returns false
  canSplitInside(el: HTMLElement): boolean {
    return this
      .handlersFor(TraverseEvent.canSplitInside, el)
      .every(can => can(el));
  }

  // Defaults true, unless any plugin returns false
  canSplitBetween(el: HTMLElement, next: HTMLElement): boolean {
    return this
      .handlersFor(TraverseEvent.canSplitBetween, el)
      .every(can => can(el, next));
  }

  // Defaults false if no plugins. If there are plugins, returns true if all plugin returns true
  canSkipTraverse(el: HTMLElement): boolean {
    const handlers = this.handlersFor(TraverseEvent.canSkipTraverse, el);
    return handlers.length > 0
      ? handlers.every(canSkip => canSkip(el)) 
      : false;
  }

  // Defaults undefined if no plugins. If there are plugins, return the largest height requirement.
  getMinHeight(el: HTMLElement): number | undefined {
    const heights = this.handlersFor(TraverseEvent.getMinHeight, el)
      .map(f => f(el))
      .filter((h: number | undefined): h is number => h !== undefined);
    return heights.length > 0 ? Math.max(...heights) : undefined;
  }

  // Runs each sequentially
  onSplitFinish(
    el: HTMLElement,
    remainder: HTMLElement,
    cloneWithRules: (el: HTMLElement) => HTMLElement
  ) {
    const fns = this.handlersFor(TraverseEvent.onSplitFinish, el);
    for (let fn of fns) fn(el, remainder, cloneWithRules);
  }

  async onAddStart(el: HTMLElement) {
    await runInSequence(this.handlersFor(TraverseEvent.onAddStart, el), el);
  }

  async onAddFinish(el: HTMLElement) {
    await runInSequence(this.handlersFor(TraverseEvent.onAddFinish, el), el);
  }

  async onAddCancel(el: HTMLElement) {
    await runInSequence(this.handlersFor(TraverseEvent.onAddCancel, el), el);
  }
}