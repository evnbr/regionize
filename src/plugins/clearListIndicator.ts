import type { Plugin } from '../types';

export const clearListIndicator = (selector = 'li'): Plugin => ({
  selector,
  onSplit: (_, remainder) => {
    remainder.style.listStyleType = 'none';
  },
});