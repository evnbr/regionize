const div = (cls: string): HTMLElement => {
  const el = document.createElement('div');
  el.classList.add(cls);
  return el;
};

class Region {
  element: HTMLElement;
  private contentWrap: HTMLElement;
  previousRegion?: Region;
  nextRegion?: Region;

  constructor(el: HTMLElement) {
    this.element = el;
    this.contentWrap = div('region-content');
    this.contentWrap.style.position = 'relative';
    this.element.append(this.contentWrap);
  }

  append(...nodes: (string | Node)[]) {
    this.contentWrap.append(...nodes);
  }

  isEmpty(): boolean {
    const el: HTMLElement = this.contentWrap;
    if (el.textContent === null) return true;
    return el.textContent.trim() === '' && el.offsetHeight < 2;
  }

  isReasonableSize(): boolean {
    const box = this.element.getBoundingClientRect();
    return box.height > 100 && box.width > 100; // TODO: Number is arbitrary
  }

  overflowAmount(): number {
    const contentH = this.contentWrap.offsetHeight;
    const boxH = this.element.offsetHeight;
    if (boxH === 0)
      throw Error(
        'Regionizer: Trying to flow into an element with zero height.',
      );
    return contentH - boxH;
  }

  hasOverflowed(): boolean {
    return this.overflowAmount() > -5;
  }
}

export default Region;
