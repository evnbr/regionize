import type { Plugin } from '../types';

export const clearIndents = (selector = 'p'): Plugin => ({
  selector,
  onSplit: (_, remainder) => {
    remainder.style.textIndent = '0';
  },
});