const preserveTableColumns = (
  original: HTMLElement,
  remainder: HTMLElement,
  deepClone: (el: HTMLElement) => HTMLElement,
): void => {
  const originalRowCells = [...original.children] as HTMLElement[];

  const nextChild = remainder.firstElementChild;

  if (!nextChild) {
    return;
  }

  const currentCellIndex = originalRowCells.length;
  for (let i = currentCellIndex - 2; i >= 0; i -= 1) {
    const origCell = originalRowCells[i];
    if (origCell) {
      // TODO: should add events be triggered for these?
      const continuedCell = deepClone(origCell);
      remainder.prepend(continuedCell);
    }
  }
};

export default preserveTableColumns;
