export const isTextNode = (node: Node): node is Text => {
  return node.nodeType === Node.TEXT_NODE;
};

export const isElement = (input: any): input is HTMLElement => {
  return input && input.nodeType === Node.ELEMENT_NODE;
};

export const isNode = (input: any): input is Node => {
  return input && input.nodeType;
};

export const isString = (input: any): input is string => {
  return input && typeof input === 'string';
};

export const isScript = (node: Element): boolean => {
  return node.tagName === 'SCRIPT';
};

export const isContentElement = (node: Node): node is HTMLElement => {
  return isElement(node) && !isScript(node);
};

export const missingInputError = (name: string) => {
  return new Error(`Regionize: Required option '${name}' not specified`);
}

