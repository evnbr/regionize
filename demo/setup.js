const { addUntilOverflow } = window.Regionize;
const items = window.testCases;

const reducedIndent = (orginal) => {
  const lines = orginal.split('\n');
  return lines
    .map((str => str.substring(2)))
    .join('\n');
};

const prettyPrintConfig = (obj) => {
  const lines = Object
    .keys(obj)
    .map((k) => {
      const val = obj[k];
      const prettyVal = reducedIndent(val);
      return `  ${k}: ${prettyVal}`;
    });
  return lines.length ? `{\n${lines.join(',\n')}\n}` : '{}';
};

const prettyPrintPlugins = (getter) => {
  const lines = getter
    .toString()
    .split('\n')
    .slice(1, -1)
    .join('\n');
  const reduced = reducedIndent(lines);
  return `[\n${reduced}\n  ]`;
};

// const prettyPrintPlugins = (arr) => {
//   return arr && arr.length ? `[\n${arr.map(prettyPrintConfig).join(',\n')}\n]` : '[]';
// }

const isNode = input => !!input && input.nodeType;
const isString = input => !!input && typeof input === 'string';
const isAppendable = input => isNode(input) || isString(input);
const setAttrs = (el, attrs) => {
  for (const [key, val] of Object.entries(attrs)) {
    if (key in el) {
      el[key] = val;
    } else {
      el.setAttribute(key, val);
    }
  }
};
const h = (tagName, ...args) => {
  const el = document.createElement(tagName);
  for (const arg of args) {
    if (isAppendable(arg)) el.append(arg);
    else setAttrs(el, arg);
  }
  return el;
};

const setup = async ({ id, name, desc, contentId, getPlugins }) => {
  const rowFragment = document.querySelector('#row-template').content.cloneNode(true);

  
  const item = h(
    'section',
    { id, className: 'item' },
    h('h2', { className: 'item-title' }, h('a', { href: `#${id}` }, name)),
    h('p', { className: 'item-desc' }, desc),
    rowFragment
  );

  const configHolder = item.querySelector('.config-slot');
  configHolder.append(prettyPrintPlugins(getPlugins));

  const contentFrag = document.querySelector(`#${contentId}`).content;
  const content = item.querySelector('.content');
  content.append(contentFrag.cloneNode(true));

  document.body.append(item);

  const container = item.querySelector('.sized-container');
  const remainderContainer = item.querySelector('.remainder');

  // console.log(`Starting ${id}`);

  const result = await addUntilOverflow({
    content: content.cloneNode(true),
    container,
    plugins: getPlugins(),
  });
  remainderContainer.append(result.remainder ? result.remainder : '[No remainder]');

  // console.log(`Finished ${id}`);
};

const navItems = items.map(({ id, name }) => {
  return h('a', { href: `#${id}`, className: 'nav-item' }, name);
});

const nav = document.querySelector('nav');
nav.append(...navItems);

Promise.all(items.map(setup)).then(() => {
  console.log('Done');

  window.REGIONIZE_DEMOS_ALL_DONE = true;
});
