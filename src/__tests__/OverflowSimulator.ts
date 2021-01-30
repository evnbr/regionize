import { OverflowDetector } from '../types';
import { div } from './dom-test-helper';

// Fake version of a Region, that allows the caller to simulate
// an overflow. For use in tests (on node w/ JSDom, where
// getBoundingClientRect and offsetHeight aren't available)

class OverflowSimulator implements OverflowDetector {
  isReasonableSize = true;
  element = div({ className: 'box' });
  content = div({ className: 'content' });
  private mockOverflowFunction: (el: HTMLElement) => boolean;

  constructor(overflowFunc: (el: HTMLElement) => boolean) {
    if (!overflowFunc) throw Error('Overflow not mocked');
    this.mockOverflowFunction = overflowFunc;
    this.hasOverflowed = this.hasOverflowed.bind(this);
    this.element.append(this.content);
  }
  hasOverflowed(): boolean {
    return this.mockOverflowFunction(this.content);
  }
  append(...nodes: (Node | string)[]) {
    this.content.append(...nodes);
  }
  isEmpty() {
    return false;
  }
}

export default OverflowSimulator;
