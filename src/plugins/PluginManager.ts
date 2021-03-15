import { ensureImageLoaded } from './ensureImageLoaded';
import { Plugin, TraverseEvent, TraverseHandler } from '../types';
  
const DEFAULT_PLUGINS = [
  ensureImageLoaded(),
];

async function runInSequence<T>(
  asyncFns: Array<(arg: T) => Promise<any>>,
  arg: T,
) {
  for (let f of asyncFns) await f(arg);
}

// A class that exposes a consistent interface
// over a list of plugins, combining the results as
// appropriate
export class PluginManager implements TraverseHandler {
  private plugins: Plugin[];

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

  // Defaults false, unless any plugin returns true
  shouldTraverse(el: HTMLElement): boolean {
    return this
      .handlersFor(TraverseEvent.shouldTraverse, el)
      .some(should => should(el));
  }

  // Runs all plugins synchronously
  onSplit(
    el: HTMLElement,
    remainder: HTMLElement,
    cloneWithRules: (el: HTMLElement) => HTMLElement
  ) {
    const fns = this.handlersFor(TraverseEvent.onSplit, el);
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