import { OverflowDetectingContainer } from './types';
import { setIsRegion } from './attributeHelper';

class Region implements OverflowDetectingContainer {
  element: HTMLElement;
  initialContainerHeight: Number;
  private measurementWrapper: HTMLElement;

  constructor(el: HTMLElement) {
    this.element = el;
    this.measurementWrapper = document.createElement('div');
    this.measurementWrapper.classList.add('region-measured-content');
    this.measurementWrapper.style.position = 'relative';
    this.element.append(this.measurementWrapper);
    setIsRegion(el);

    this.hasOverflowed = this.hasOverflowed.bind(this);
    this.initialContainerHeight = this.containerHeight();
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

  private containerHeight() {
    return this.element.offsetHeight;
  }

  private contentHeight() {
    return this.measurementWrapper.offsetHeight;
  }

  overflowAmount(): number {
    const containerHeight = this.containerHeight();
    const contentHeight = this.contentHeight();
    if (containerHeight === 0) {
      throw Error('Regionize: Trying to flow into an element with zero height.');
    }
    return contentHeight - containerHeight;
  }

  hasOverflowed(): boolean {
    return this.overflowAmount() > -5;
  }
}

export default Region;
