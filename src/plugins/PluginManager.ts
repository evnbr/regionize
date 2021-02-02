import { ensureImageLoaded } from './ensureImageLoaded';
import { continueListNumbering } from './continueListNumbering';
import { Plugin, TraverseHandler } from '../types';
  
const DEFAULT_PLUGINS = [
  ensureImageLoaded(),
];

type Func<T extends keyof TraverseHandler> = TraverseHandler[T];

export class PluginManager implements TraverseHandler {
  private plugins: Plugin[];

  constructor(plugins: Plugin[]) {
    this.plugins = [...DEFAULT_PLUGINS, ...plugins];
  }

  getFuncs<T extends keyof TraverseHandler>(key: T, el: HTMLElement): Func<T>[] {
    return this.plugins
      .filter(p => p[key] && (!p.selector || el.matches(p.selector)))
      .map(p => p[key]) as Func<T>[]; // cast is ok because filter checks against undefined
  }

  // Defaults true, unless any plugin returns false
  canSplit(el: HTMLElement): boolean {
    const fns = this.getFuncs('canSplit', el);
    return fns.every(f => f(el));
  }

  // Defaults true, unless any plugin returns false
  canSplitBetween(el: HTMLElement, next: HTMLElement): boolean {
    const fns = this.getFuncs('canSplitBetween', el);
    return fns.every(f => f(el, next));
  }

  // Defaults false, unless any plugin returns true
  shouldTraverse(el: HTMLElement): boolean {
    const fns = this.getFuncs('shouldTraverse', el);
    return fns.some(f => f(el));
  }

  // Runs all plugins synchronously. TODO other args
  onSplit(el: HTMLElement, remainder: HTMLElement) {
    const fns = this.getFuncs('onSplit', el);
    fns.forEach(f => f(el, remainder));
  }

  // Await plugins in sequence
  async onAddStart(el: HTMLElement) {
    const fns = this.getFuncs('onAddStart', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddFinish(el: HTMLElement) {
    const fns = this.getFuncs('onAddFinish', el);
    for (let f of fns) await f(el);
  }

  // Await plugins in sequence
  async onAddCancel(el: HTMLElement) {
    const fns = this.getFuncs('onAddCancel', el);
    for (let f of fns) await f(el);
  }
}