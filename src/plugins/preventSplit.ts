import type { Plugin } from '../types';

export const preventSplit = (selector: string): Plugin => ({
  selector,
  canSplit: () => false,
});
