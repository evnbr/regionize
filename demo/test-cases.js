const paragraphContent = 'paragraph-content';
const listContent = 'list-content';
const nestedContent = 'nested-content';
const traverseContent = 'traverse-content';
const orphanHeadingContent = 'orphan-heading-content';
const orphanParaContent = 'orphan-para-content';
const widowParaContent = 'widow-para-content';

const testCases = [
  {
    id: 'basics',
    name: 'Basics',
    desc: 'Note that the indent repeats in the remainder',
    contentId: paragraphContent,
    config: {},
  },
  {
    id: 'indents',
    name: 'Fixing indents',
    desc: 'Using onDidSplit to hide the duplicate indent',
    contentId: paragraphContent,
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
    contentId: listContent,
    config: {},
  },
  {
    id: 'list-onDidSplit',
    name: 'Fixing list style',
    desc: 'Using onDidSplit to hide the duplicate number',
    contentId: listContent,
    config: {
      onDidSplit: (el, remainder) => {
        if (remainder.matches('li')) {
          remainder.style.listStyleType = 'none';
        }
      },
    },
  },
  {
    id: 'list-canSplit',
    name: 'List item + canSplit',
    desc: 'Using canSplit to keep each item whole',
    contentId: listContent,
    config: {
      canSplit: el => !el.matches('li'),
    },
  },
  {
    id: 'nest',
    name: 'Split graphical elements',
    desc: 'Note that by default, split elements keep the same padding, margin, and border. Similar to indents or list numbering, this might make it unclear that the element was continued.',
    contentId: nestedContent,
    config: {},
  },
  {
    id: 'nest-styling',
    name: 'Styling a split graphical element',
    desc: 'Using onDidSplit to zero out padding and borders. Note that onDidSplit runs after the split point has been determined— you can make arbitrary style changes, including adjusting the space available for content, but content will not reflow.',
    contentId: nestedContent,
    config: {
      onDidSplit: (el, remainder) => {
        if (el.matches('.bordered')) {
          el.style.borderBottomWidth = 0;
          el.style.paddingBottom = 0;
          el.style.marginBottom = 0;
          remainder.style.borderTopWidth = 0;
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
    contentId: traverseContent,
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
    contentId: traverseContent,
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
    contentId: traverseContent,
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
    contentId: traverseContent,
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
  {
    id: 'orphan-sibling',
    name: 'Orphaned sibling',
    desc: 'Currently, regionize does not handle keeping siblings together, ie a heading with its following paragraphs. This may be added in a future release.',
    contentId: orphanHeadingContent,
    config: {
      onDidSplit: (el, remainder) => {
        remainder.style.textIndent = 0;
      },
    },
  },
  {
    id: 'orphan-paragraph',
    name: 'Orphaned paragraph line',
    desc: 'Currently, regionize does not handle orphaned lines (the beginning line of a paragraph left behind when the rest overflows, where you may prefer to break early and move the entire paragraph). This may be added in a future release.',
    contentId: orphanParaContent,
    config: {
      onDidSplit: (el, remainder) => {
        remainder.style.textIndent = 0;
      },
    },
  },
  {
    id: 'widow-paragraph',
    name: 'Widowed paragraph line',
    desc: 'Currently, regionize does not handle widowed lines (the last line of a paragraph overflowing in a new region, where you may prefer to break early to overflow 2 lines).  This may be added in a future release.',
    contentId: widowParaContent,
    config: {
      onDidSplit: (el, remainder) => {
        remainder.style.textIndent = 0;
      },
    },
  },
];

(((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.testCases = factory();
  }
// eslint-disable-next-line no-restricted-globals
})(typeof self !== 'undefined' ? self : this, () => testCases));
