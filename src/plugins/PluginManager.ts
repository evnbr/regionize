import { EnsureImageLoaded } from './EnsureImageLoaded';
import { PreserveListNumbering } from './PreserveListNumbering';
import { RegionizePlugin, TraverseHandler } from '../types';
  
const DEFAULT_PLUGINS = [
  EnsureImageLoaded,
  PreserveListNumbering,
];

const shouldRun = (p: RegionizePlugin, el: HTMLElement) => {
  return !p.selector || el.matches(p.selector)
}

type Key = keyof TraverseHandler;
type Handler<T extends Key> = TraverseHandler[T];

export class PluginManager implements TraverseHandler {
  private plugins: RegionizePlugin[];

  constructor(plugins: RegionizePlugin[]) {
    this.plugins = [...DEFAULT_PLUGINS, ...plugins];
  }

  getHandlers<T extends Key>(key: T, el: HTMLElement): Handler<T>[] {
    return this.plugins
      .filter(p => p[key] && shouldRun(p, el))
      .map(p => p[key]) as Handler<T>[];
  }

  // Defaults true, unless any plugin returns false
  canSplit(el: HTMLElement): boolean {
    const fns = this.getHandlers('canSplit', el);
    return !fns.every(f => f(el));
  }

  // Defaults true, unless any plugin returns false
  canSplitBetween(el: HTMLElement, next: HTMLElement): boolean {
    const fns = this.getHandlers('canSplitBetween', el);
    return !fns.every(f => f(el, next));
  }

  // Defaults false, unless any plugin returns true
  shouldTraverse(el: HTMLElement): boolean {
    const fns = this.getHandlers('shouldTraverse', el);
    return fns.some(f => f(el));
  }

  // Runs all plugins synchronously. TODO nire args
  onSplit(el: HTMLElement, remainder: HTMLElement) {
    const fns = this.getHandlers('onSplit', el);
    fns.forEach(f => f(el, remainder));
  }

  // Await plugins in sequence
  async onAddStart(el: HTMLElement) {
    const fns = this.getHandlers('onAddStart', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddFinish(el: HTMLElement) {
    const fns = this.getHandlers('onAddFinish', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddCancel(el: HTMLElement) {
    const fns = this.getHandlers('onAddCancel', el);
    for (let f of fns) await f(el);
  }
}