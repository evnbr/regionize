class Region {
  element: HTMLElement;
  private measurementWrapper: HTMLElement;
  previousRegion?: Region;
  nextRegion?: Region;

  constructor(el: HTMLElement) {
    this.element = el;
    this.measurementWrapper = document.createElement('div');
    this.measurementWrapper.classList.add('region-content');
    this.measurementWrapper.style.position = 'relative';
    this.element.append(this.measurementWrapper);
  }

  append(...nodes: (string | Node)[]) {
    this.measurementWrapper.append(...nodes);
  }

  isEmpty(): boolean {
    const el: HTMLElement = this.measurementWrapper;
    if (el.textContent === null) return true;
    return el.textContent.trim() === '' && el.offsetHeight < 2;
  }

  isReasonableSize(): boolean {
    const box = this.element.getBoundingClientRect();
    return box.height > 100 && box.width > 100; // TODO: Number is arbitrary
  }

  overflowAmount(): number {
    const contentHeight = this.measurementWrapper.offsetHeight;
    const containerHeight = this.element.offsetHeight;
    if (containerHeight === 0)
      throw Error(
        'Regionizer: Trying to flow into an element with zero height.',
      );
    return contentHeight - containerHeight;
  }

  hasOverflowed(): boolean {
    return this.overflowAmount() > -5;
  }
}

export default Region;
