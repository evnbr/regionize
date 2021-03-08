import type { Plugin } from '../types';


export const preserveTableColumns = (selector = 'tr'): Plugin => ({
  selector,
  onSplit: (
    original: HTMLElement,
    remainder: HTMLElement,
    deepClone: (el: HTMLElement) => HTMLElement,
  ): void => {
    const originalRowCells = [...original.children] as HTMLElement[];
    
    if (!remainder.firstElementChild) {
      // the remainder tr is empty, we must have addded all the cells in the row
      return;
    }
  
    const currentCellIndex = originalRowCells.length;

    // starting from cell in the current column, back up through the
    // previous cells and clone them into the remainder.
    for (let i = currentCellIndex - 2; i >= 0; i -= 1) {
      const origCell = originalRowCells[i];
      if (origCell) {
        // TODO: should any add/remove events be triggered for these?
        const continuedCell = deepClone(origCell);
        remainder.prepend(continuedCell);
      }
    }

    // TODO: also clone the remainder
    // cells into the original?
  },  
});
