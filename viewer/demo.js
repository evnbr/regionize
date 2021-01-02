const { addUntilOverflow } = window.Regionize;

const paragraphContent = document.querySelector('#paragraph-content').content;
const listContent = document.querySelector('#list-content').content;
const nestedContent = document.querySelector('#nested-content').content;

const items = [
  {
    id: 'basics',
    name: 'Basics',
    desc: 'Note that the indent repeats in the remainder',
    contentFrag: paragraphContent,
    config: {},
  },
  {
    id: 'indents',
    name: 'Fixing indents',
    desc: 'Using onDidSplit to hide the duplicate indent',
    contentFrag: paragraphContent,
    config: {
      onDidSplit: (orig, remainder) => {
        remainder.style.textIndent = 0;
      },    
    },
  },
  {
    id: 'list',
    name: 'List items',
    desc: 'Note that the list number repeats in the remainder',
    contentFrag: listContent,
    config: {},
  },
  {
    id: 'list2',
    name: 'Fixing list style',
    desc: 'Using onDidSplit to hide the duplicate number',
    contentFrag: listContent,
    config: {
      onDidSplit: (orig, remainder) => {
        if (remainder.matches('li')) {
          remainder.style.listStyle = 'none';
        }
      },
    },
  },
  {
    id: 'list3',
    name: 'List item + canSplit',
    desc: 'Using canSplit to keep each item whole',
    contentFrag: listContent,
    config: {
      canSplit: el => !el.matches('li'),
    },
  },
  {
    id: 'nest',
    name: 'Split graphical elements',
    desc: 'Note that by default, split elements keep the same padding, margin, and border. Similar to indents or list numbering, this might make it unclear that the element was continued.',
    contentFrag: nestedContent,
    config: {},
  },
  {
    id: 'nest2',
    name: 'Styling a split graphical element',
    desc: 'Using onDidSplit to zero out padding and borders. Note that onDidSplit runs after the split point has been determined— you can make arbitrary style changes, but adjusting the space available for text will not reflow.',
    contentFrag: nestedContent,
    config: {
      onDidSplit: (orig, remainder) => {
        if (orig.matches('.bordered')) {
          orig.style.borderBottom = 'none';
          orig.style.paddingBottom = 0;
          orig.style.marginBottom = 0;
          remainder.style.borderTop = 'none';
          remainder.style.paddingTop = 0;
          remainder.style.marginTop = 0;
        }
      },
    },
  },
];


const reducedIndent = (obj) => {
  // everything but the first line of functions has 4 extra indents
  const lines = obj.toString().split('\n');
  return lines
    .map((str, lineIndex) => (lineIndex > 0 ? str.substring(4) : str))
    .join('\n');
};

const prettyPrintConfig = (obj) => {
  const lines = Object
    .keys(obj)
    .map(k => `  ${k}: ${reducedIndent(obj[k])}`);
  return lines.length ? `{\n${lines.join('\n')}\n}` : '{}';
};

const isNode = input => !!input && input.nodeType;
const isString = input => !!input && typeof input === 'string';
const isAppendable = input => isNode(input) || isString(input);


const h = (tagName, ...args) => {
  const el = document.createElement(tagName);

  for (const arg of args) {
    if (isAppendable(arg)) {
      el.append(arg);
    } else {
      for (const [key, val] of Object.entries(arg)) {
        if (key in el) {
          el[key] = val;
        } else {
          el.setAttribute(key, val);
        }
      }
    }
  }
  return el;
};

const setup = async ({ id, name, desc, contentFrag, config }) => {
  const rowFragment = document.querySelector('#row-template').content.cloneNode(true);

  const item = h(
    'section',
    { id, className: 'item' },
    h('h2', { className: 'item-title' }, h('a', { href: `#${id}` }, name)),
    h('p', desc),
    rowFragment
  );

  const configHolder = item.querySelector('.config-slot');
  configHolder.append(prettyPrintConfig(config));

  const content = item.querySelector('.content');
  content.append(contentFrag.cloneNode(true));

  document.body.append(item);

  const region = item.querySelector('.region');
  const remainderRegion = item.querySelector('.remainder');
  const result = await addUntilOverflow(content.cloneNode(true), region, config);
  remainderRegion.append(result.remainder ? result.remainder : '[No remainder]');
};

items.forEach(setup);
