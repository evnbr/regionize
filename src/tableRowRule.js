const preserveTableColumns = (original, clone, nextChild, deepClone) => {
  const columns = [...original.children];

  const currentIndex = columns.indexOf(nextChild);
  for (let i = 0; i < currentIndex; i += 1) {
    const clonedCol = deepClone(columns[i]);
    clone.appendChild(clonedCol);
  }
};

export default preserveTableColumns;
