const { addUntilOverflow } = window.Regionize;
const items = window.testCases;

const reducedIndent = (orginal) => {
  const lines = orginal.split('\n');
  return lines
    .map((str => str.substring(2)))
    .join('\n');
};

const prettyPrintPlugins = (getter) => {
  const lines = getter
    .toString()
    .split('\n')
    .slice(1, -1)
    .join('\n');
  const reduced = reducedIndent(lines);
  return `[\n${reduced}\n  ],`;
};

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

// const contentCache = {};
// async function getContent(key) {
//   if (!contentCache[key]) {
//     const response = await fetch(`./content/${key}.html`);
//     const htmlText = await response.text();
//     const temp = document.createElement('template');
//     temp.innerHTML = htmlText;
//     const frag = temp.content;
//     contentCache[key] = frag;
//   }

//   return contentCache[key].cloneNode(true);
// }

async function setup({ id, name, desc, contentId, getPlugins }) {
  const rowFragment = document.querySelector('#row-template').content.cloneNode(true);

  const item = h(
    'section',
    { id, className: 'item' },
    h('h2', { className: 'item-title' }, h('a', { href: `#${id}` }, name)),
    h('p', { className: 'item-desc' }, desc),
    rowFragment
  );

  const plugins = getPlugins();
  const configHolder = item.querySelector('.config-slot');
  configHolder.append(plugins.length > 0 ? prettyPrintPlugins(getPlugins) : '[],');

  // const contentFrag = await getContent(contentId);
  const contentFrag = document.querySelector(`#${contentId}`).content.cloneNode(true);
  const content = item.querySelector('.content');
  const container = item.querySelector('.sized-container');
  const remainderContainer = item.querySelector('.remainder');

  content.append(contentFrag);
  document.body.append(item);


  // console.log(`Starting ${id}`);

  const result = await addUntilOverflow({
    content: content.cloneNode(true),
    container,
    plugins,
  });
  // remainderContainer.append(result.remainder ? result.remainder : '[No remainder]');
  await addUntilOverflow({
    content: result.remainder,
    container: remainderContainer,
    plugins,
  });

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
