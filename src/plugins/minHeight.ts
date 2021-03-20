import type { Plugin } from '../types';

export const minHeight = (selector: string, minHeight: number): Plugin => ({
  selector,
  getMinHeight: (el) => minHeight,
});