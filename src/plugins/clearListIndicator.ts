import type { Plugin } from '../types';

export const clearListIndicator = (selector = 'li'): Plugin => ({
  selector,
  onSplitFinish: (_, remainder) => {
    remainder.style.listStyleType = 'none';
  },
});