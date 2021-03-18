import type { Plugin } from '../types';

export const keepTogether = (
  firstSelector: string,
  secondSelector: string
): Plugin => ({
  selector: firstSelector,
  canSplitBetween: (_, next) => {
    return !next.matches(secondSelector);
  },
});
