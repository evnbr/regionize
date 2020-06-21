const isTextNode = (node: Node): node is Text => {
  return node.nodeType === Node.TEXT_NODE;
};
const isElement = (node: Node): node is HTMLElement => {
  return node.nodeType === Node.ELEMENT_NODE;
};
const isNode = (input: any): input is Node => {
  return input && input.nodeType;
};
const isString = (input: any): input is string => {
  return input && typeof input === 'string';
};
const isScript = (node: Element): boolean => {
  return node.tagName === 'SCRIPT';
};
const isImage = (node: Element): node is HTMLImageElement => {
  return node.tagName === 'IMG';
};
const isUnloadedImage = (node: Element): node is HTMLImageElement => {
  return isImage(node) && !node.naturalWidth;
};
const isContentElement = (node: Node): node is HTMLElement => {
  return isElement(node) && !isScript(node);
};

export {
  isTextNode,
  isNode,
  isString,
  isElement,
  isContentElement,
  isUnloadedImage,
};
