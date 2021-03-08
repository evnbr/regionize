import { ensureImageLoaded } from './ensureImageLoaded';
import { Plugin, TraverseHandler } from '../types';
  
const DEFAULT_PLUGINS = [
  ensureImageLoaded(),
];

function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

type Func<K extends keyof TraverseHandler> = TraverseHandler[K];

// A class that exposes a consistent interface
// over a list of plugins, combining the results as
// appropriate
export class PluginManager implements TraverseHandler {
  private plugins: Plugin[];

  constructor(plugins: Plugin[]) {
    this.plugins = [...DEFAULT_PLUGINS, ...plugins];
  }

  matchingPlugins<K extends keyof TraverseHandler>(key: K, el: HTMLElement): Func<K>[] {
    return this.plugins
      .filter(p => p[key] && (!p.selector || el.matches(p.selector)))
      .map(p => p[key]) as Func<K>[]; // cast is ok because filter checks against undefined
  }

  // Defaults true, unless any plugin returns false
  canSplitInside(el: HTMLElement): boolean {
    const fns = this.matchingPlugins('canSplitInside', el);
    return fns.every(f => f(el));
  }

  // Defaults true, unless any plugin returns false
  canSplitBetween(el: HTMLElement, next: HTMLElement): boolean {
    const fns = this.matchingPlugins('canSplitBetween', el);
    return fns.every(f => f(el, next));
  }

  // Defaults false, unless any plugin returns true
  shouldTraverse(el: HTMLElement): boolean {
    const fns = this.matchingPlugins('shouldTraverse', el);
    return fns.some(f => f(el));
  }

  // Runs all plugins synchronously
  onSplit(
    el: HTMLElement,
    remainder: HTMLElement,
    cloneWithRules: (el: HTMLElement) => HTMLElement
  ) {
    const fns = this.matchingPlugins('onSplit', el);
    for (let f of fns) f(el, remainder, cloneWithRules);
  }

  // Await plugins in sequence
  async onAddStart(el: HTMLElement) {
    const fns = this.matchingPlugins('onAddStart', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddFinish(el: HTMLElement) {
    const fns = this.matchingPlugins('onAddFinish', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddCancel(el: HTMLElement) {
    const fns = this.matchingPlugins('onAddCancel', el);
    for (let f of fns) await f(el);
  }
}