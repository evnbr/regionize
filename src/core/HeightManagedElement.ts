// By default, element height isn't tracked. It's enough to know if the overflow
// container itself has changed height. However, we do need to track heights to suppress
// orphans and widows. If the user has provided a minheight for an element, an
// instance of this class is created for the lifetime of addings its children.

export class HeightManagedElement {
  readonly element: HTMLElement;

  private readonly originalHeight: number;

  private readonly minHeight: number;

  constructor(el: HTMLElement, minHeight: number) {
    this.element = el;
    this.minHeight = minHeight;
    this.originalHeight = this.measure();
  }

  private measure() {
    return this.element.offsetHeight;
  }

  canSplitAtCurrentHeights(): boolean {
    const addedHeight = this.measure();
    const estimatedRemainderHeight = this.originalHeight - addedHeight;

    return addedHeight > this.minHeight && estimatedRemainderHeight > this.minHeight;
  }
}
