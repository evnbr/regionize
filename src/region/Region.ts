import { OverflowDetector } from '../types';
import { setIsRegion } from '../attributeHelper';

export class Region implements OverflowDetector {
  element: HTMLElement;
  initialgetContainerHeight: Number;
  private measurementWrapper: HTMLElement;

  constructor(el: HTMLElement) {
    this.element = el;
    this.measurementWrapper = Region.createWrapper();
    this.element.append(this.measurementWrapper);
    setIsRegion(el);

    this.hasOverflowed = this.hasOverflowed.bind(this);
    this.initialgetContainerHeight = this.getContainerHeight();
  }

  private static createWrapper() {
    const wrap = document.createElement('div');
    wrap.classList.add('region-measured-content');
    wrap.style.position = 'relative';
    return wrap;
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

  overflowAmount(): number {
    const containerHeight = this.getContainerHeight();
    const contentHeight = this.getContentHeight();
    if (containerHeight === 0) {
      throw Error('Regionize: Trying to flow into an element with zero height.');
    }
    return contentHeight - containerHeight;
  }

  hasOverflowed(): boolean {
    return this.overflowAmount() > -5;
  }
}