const { addUntilOverflow } = window.Regionize;

const paragraphContent = document.querySelector('#paragraph-content').content;
const listContent = document.querySelector('#list-content').content;
const nestedContent = document.querySelector('#nested-content').content;
const traverseContent = document.querySelector('#traverse-content').content;

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
      onDidSplit: (el, remainder) => {
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
      onDidSplit: (el, remainder) => {
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
    desc: 'Using onDidSplit to zero out padding and borders. Note that onDidSplit runs after the split point has been determined— you can make arbitrary style changes, including adjusting the space available for content, but content will not reflow.',
    contentFrag: nestedContent,
    config: {
      onDidSplit: (el, remainder) => {
        if (el.matches('.bordered')) {
          el.style.borderBottom = 'none';
          el.style.paddingBottom = 0;
          el.style.marginBottom = 0;
          remainder.style.borderTop = 'none';
          remainder.style.paddingTop = 0;
          remainder.style.marginTop = 0;
        }
      },
    },
  },
  {
    id: 'traverse1',
    name: 'Optimization: Doesn\'t traverse elements if their parent fits',
    desc: 'Note that onAdd is never called on the first inner element, since the first box fit in one go. The second box is traversed to find a good breaking point.',
    contentFrag: traverseContent,
    config: {
      onDidAdd: (el) => {
        if (el.matches('.inner')) {
          el.style.backgroundColor = 'yellow';
        }
      },
    },
  },
  {
    id: 'traverse3',
    name: 'Using shouldTraverse to override the above',
    desc: 'We can de-optimize and force traversal of every inner element',
    contentFrag: traverseContent,
    config: {
      shouldTraverse: el => true,
      onDidAdd: (el) => {
        if (el.matches('.inner')) {
          el.style.backgroundColor = 'yellow';
        }
      },
    },
  },
  {
    id: 'traverse2',
    name: 'Optimization: Doesn\'t traverse elements if their parent can\'t split',
    desc: 'Note that onAdd is not called on either of the inner elements. Since its parent is not splittable, the contents are skipped over as an optimization',
    contentFrag: traverseContent,
    config: {
      canSplit: el => !el.matches('.bordered'),
      onDidAdd: (el) => {
        if (el.matches('.inner')) {
          el.style.backgroundColor = 'yellow';
        }
      },
    },
  },
  {
    id: 'traverse4',
    name: 'Using shouldTraverse to override the above',
    desc: 'We can de-optimize here as well, and canSplit is still respected. (Note that the second inner item will only be traversed when it is added to its own region, and so isn\'t yellow here.)',
    contentFrag: traverseContent,
    config: {
      shouldTraverse: el => true,
      canSplit: el => !el.matches('.bordered'),
      onDidAdd: (el) => {
        if (el.matches('.inner')) {
          el.style.backgroundColor = 'yellow';
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
  return lines.length ? `{\n${lines.join(',\n')}\n}` : '{}';
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

  const container = item.querySelector('.region');
  const remainderContainer = item.querySelector('.remainder');

  const result = await addUntilOverflow(content.cloneNode(true), container, config);
  remainderContainer.append(result.remainder ? result.remainder : '[No remainder]');
};

items.forEach(setup);
