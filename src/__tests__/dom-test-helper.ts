import { isNode, isString } from '../typeGuards';

// A tiny, sloppy hyperscript-like function for templating the DOM.
//
// Unlike standard hyperscript:
// - the first argument is always the tagName, without included classes or IDs
// - there's no dedicated second argument, but all {} will be added as attributes
// - no registering event listeners

type Appendable = Node | string;

const isAppendable = (input: any): input is Appendable => {
  return isNode(input) || isString(input);
};

const h = (tagName: string, ...args: (Object | Appendable)[]): HTMLElement => {
  const el = document.createElement(tagName);

  for (let arg of args) {
    if (isAppendable(arg)) {
      el.append(arg);
    } else {
      for (let [key, val] of Object.entries(arg)) {
        if (key in el) {
          (el as any)[key] = val; // not typesafe
        } else {
          el.setAttribute(key, val);
        }
      }
    }
  }
  return el;
};

// div
const div = (...arg: (Object | Appendable)[]) =>
  h('div', ...arg) as HTMLDivElement;
const span = (...arg: (Object | Appendable)[]) =>
  h('span', ...arg) as HTMLSpanElement;
const p = (...arg: (Object | Appendable)[]) =>
  h('p', ...arg) as HTMLParagraphElement;
const section = (...arg: (Object | Appendable)[]) => h('section', ...arg);

// list
const ol = (...arg: (Object | Appendable)[]) =>
  h('ol', ...arg) as HTMLOListElement;
const ul = (...arg: (Object | Appendable)[]) =>
  h('ul', ...arg) as HTMLUListElement;
const li = (...arg: (Object | Appendable)[]) =>
  h('li', ...arg) as HTMLLIElement;

// table
const table = (...arg: (Object | Appendable)[]) =>
  h('table', ...arg) as HTMLTableElement;
const tr = (...arg: (Object | Appendable)[]) =>
  h('tr', ...arg) as HTMLTableRowElement;
const td = (...arg: (Object | Appendable)[]) =>
  h('td', ...arg) as HTMLTableDataCellElement;
const th = (...arg: (Object | Appendable)[]) =>
  h('th', ...arg) as HTMLTableHeaderCellElement;

const text = (text: string): Text => document.createTextNode(text);

export { h, div, span, p, section, text, ol, ul, li, table, tr, th, td };
