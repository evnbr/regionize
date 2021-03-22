import type { Plugin } from '../types';

export const minHeight = (selector: string, height: number): Plugin => ({
  selector,
  getMinHeight: () => height,
});
