const { addUntilOverflow } = window.Regionize;

const prettyPrintConfig = (obj) => {
  const items = Object.keys(obj).map(k => `  ${k}: ${obj[k]}`);
  return items.length ? `{\n${items.join('\n')}\n}` : '{}';
};

const setup = async ({ id, name, desc, contentFrag, config }) => {
  // const item = document.querySelector(`${id}`);
  const item = document.createElement('section');
  item.className = 'item';
  item.setAttribute('id', id);

  const a = document.createElement('a');
  a.textContent = name;
  a.setAttribute('href', `#${id}`);

  const h2 = document.createElement('h2');
  h2.className = 'item-title';
  h2.append(a);

  const p = document.createElement('p');
  p.textContent = desc;

  const row = document.querySelector('#row-template').content.cloneNode(true);
  
  item.append(h2, p, row);

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
    desc: 'Using onDidSplit to zero out borders',
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

for (const item of items) {
  setup(item);
}
