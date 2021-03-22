import { setIsRegion } from '../attributeHelper';

const createWrapper = () => {
  const wrap = document.createElement('div');
  wrap.classList.add('region-measured-content');
  wrap.style.position = 'relative';
  return wrap;
};

export interface OverflowContainer {
  readonly element: HTMLElement;
  append(...nodes: (string | Node)[]): void;
  hasOverflowed(): boolean;
}

export class OverflowContainerElement implements OverflowContainer {
  element: HTMLElement;

  private measurementWrapper: HTMLElement;

  constructor(el: HTMLElement) {
    this.element = el;
    this.measurementWrapper = createWrapper();
    this.element.append(this.measurementWrapper);
    setIsRegion(el);

    this.hasOverflowed = this.hasOverflowed.bind(this);
  }

  append(...nodes: (string | Node)[]) {
    this.measurementWrapper.append(...nodes);
  }

  // TODO: do we still need this?
  isEmpty(): boolean {
    const el = this.measurementWrapper;
    if (el.textContent === null) return true;
    return el.textContent.trim() === '' && el.offsetHeight < 2;
  }

  // TODO: do we still need this? if so reimplement
  isReasonableSize(): boolean {
    const box = this.element.getBoundingClientRect();
    return box.height > 100 && box.width > 100; // TODO: Number is arbitrary
  }

  private getContainerHeight() {
    return this.element.offsetHeight;
  }

  private getContentHeight() {
    return this.measurementWrapper.offsetHeight;
  }

  private overflowAmount(): number {
    const containerHeight = this.getContainerHeight();
    const contentHeight = this.getContentHeight();
    if (containerHeight === 0) {
      throw Error('Regionize: Trying to flow into an element with zero height.');
    }
    return contentHeight - containerHeight;
  }

  hasOverflowed(): boolean {
    return this.overflowAmount() > -5; // todo why 5
  }
}
