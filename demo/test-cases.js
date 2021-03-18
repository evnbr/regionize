/* eslint-disable no-restricted-globals */

const {
  clearIndents = () => {},
  clearListIndicator = () => {},
  continueListNumbering = () => {},
  preventSplit = () => {},
  keepTogether = () => {},
  makePlugin = () => {},
} = (typeof self !== 'undefined' ? self.Regionize.Plugins : {});


const paragraphContent = 'paragraph-content';
const listContent = 'list-content';
const nestedContent = 'nested-content';
const traverseContent = 'traverse-content';
const orphanHeadingContent = 'orphan-heading-content';
const orphanParaContent = 'orphan-para-content';
const widowParaContent = 'widow-para-content';

const testCases = [
  {
    id: 'indents-1',
    name: 'Problem: Indents',
    desc: 'Note that the indent repeats in the remainder',
    contentId: paragraphContent,
    getPlugins: () => [],
  },
  {
    id: 'indents-2',
    name: 'Fixing indents',
    desc: 'Using a plugin to hide the duplicate indent',
    contentId: paragraphContent,
    getPlugins: () => [
      clearIndents('p'),
    ],
  },
  {
    id: 'list',
    name: 'Problem: List styling',
    desc: 'To the brower, splitting an element starts a new list with new numbering',
    contentId: listContent,
    getPlugins: () => [],
  },
  {
    id: 'list-onDidSplit',
    name: 'Fixing list style',
    desc: 'Using plugins to continue the list as expected',
    contentId: listContent,
    getPlugins: () => [
      continueListNumbering(),
      clearListIndicator(),
    ],
  },
  {
    id: 'list-canSplit',
    name: 'Preventing split',
    desc: 'Using preventSplit to keep each item whole',
    contentId: listContent,
    getPlugins: () => [
      continueListNumbering(),
      preventSplit('li'),
    ],
  },
  {
    id: 'nest',
    name: 'Problem: Split graphical elements',
    desc: 'Note that by default, split elements keep the same padding, margin, and border. Similar to indents or list numbering, this might make it unclear that the element was continued.',
    contentId: nestedContent,
    getPlugins: () => [],
  },
  {
    id: 'nest-styling',
    name: 'Styling split graphical elements with onSplit',
    desc: 'Using a custom onSplit plugin to zero out padding and borders. Note that onSplit runs after the split point has been determined— if you make style changes that adjust the space available for content, content will not reflow.',
    contentId: nestedContent,
    getPlugins: () => [
      makePlugin({
        selector: '.bordered',
        onSplitFinish: (el, remainder) => {
          Object.assign(el.style, {
            borderBottomWidth: 0,
            paddingBottom: 0,
            marginBottom: 0,
          });
          Object.assign(remainder.style, {
            borderTopWidth: 0,
            paddingTop: 0,
            marginTop: 0,
          });
        },
      }),
    ],
  },
  {
    id: 'nest-stylin2',
    name: 'Other ways of handling split graphical elements',
    desc: 'Alternately, if you modify elements in onAddStart, style changes will be taken into account when measuring. This requires careful manual work.You may need to clean up after yourself in onAddFinish, but be warned that may only be called on a cloned remainder.',
    contentId: nestedContent,
    getPlugins: () => [
      makePlugin({
        onAddStart: (el) => {
          Object.assign(el.style, {
            borderBottomWidth: 0,
            paddingBottom: 0,
            marginBottom: 0,
          });
        },
        onAddFinish: (el) => {
          Object.assign(el.style, {
            borderBottomWidth: '',
            paddingBottom: '',
            marginBottom: '',
          });
        },
      }),
    ],
  },

  {
    id: 'traverse1',
    name: 'Every element is traversed by default',
    desc: '.',
    contentId: traverseContent,
    getPlugins: () => [
      makePlugin({
        selector: '.bordered',
        onAddFinish: (el) => {
          if (el.matches('.inner')) {
            el.style.backgroundColor = 'yellow';
          }
        },
      }),
    ],
  },
  {
    id: 'traverse3',
    name: 'Using canSkipTraverse',
    desc: 'If you don\'t need to trigger a side effect on an element, you can return true from canSkipTraverse. This may offer minor performance improvement with deep DOM hierarchies. Note that onAdd is never called on the first inner element, since the first box fit in one go. The second box is traversed to find a good breaking point',
    contentId: traverseContent,
    getPlugins: () => [
      makePlugin({
        selector: '.bordered',
        canSkipTraverse: () => true,
        onAddFinish: (el) => {
          if (el.matches('.inner')) {
            el.style.backgroundColor = 'yellow';
          }
        },
      }),
    ],
  },
  {
    id: 'traverse2',
    name: 'Doesn\'t traverse elements if can\'t split',
    desc: 'Optimization: Note that onAdd is not called on either of the inner elements. Since its parent is not splittable, and we\'ve indicated that skipping the contents is safe, onAdd is never called.',
    contentId: traverseContent,
    getPlugins: () => [
      preventSplit('.bordered'),
      makePlugin({
        selector: '.bordered',
        canSkipTraverse: () => true,
        onAddFinish: (el) => {
          if (el.matches('.inner')) {
            el.style.backgroundColor = 'yellow';
          }
        },
      }),
    ],
  },
  {
    id: 'orphan-sibling',
    name: 'Problem: Orphaned sibling',
    desc: 'By default, a split can be inserted anywhere, ie between a heading and its following paragraphs.',
    contentId: orphanHeadingContent,
    getPlugins: () => [],
  },
  {
    id: 'orphan-sibling-2',
    name: 'Fixing orphaned sibling with keepTogether',
    desc: 'You can use keepTogether to prevent a split between two selectors. If regionize can\'t add a split between two elements, it will back up and add a split in the earliest valid position, so that both are moved to the next page.',
    contentId: orphanHeadingContent,
    getPlugins: () => [
      keepTogether('h3', '*'),
    ],
  },
  {
    id: 'keep-gotchas-1',
    name: 'keepTogether Gotchas, Part 1',
    desc: 'Use caution when performing side effects in onAddFinish. For example, you may be inclined to write a custom rule to style a parent element based on if it contains an h3. This normally works fine, but you probably don\'t want your h3 orphaned.',
    contentId: orphanHeadingContent,
    getPlugins: () => [
      makePlugin({
        selector: 'h3',
        onAddFinish: (el) => {
          el.style.color = 'green';
          el.closest('.sized-container')
            .style.border = '4px solid green';
        },
      }),
    ],
  },
  {
    id: 'keep-gotchas-2',
    name: 'keepTogether Gotchas, Part 2',
    desc: 'However, when you add a keepTogether rule, your custom rule leads to an incorrect result. That is because Regionize may add and then remove an element to fulfill the keepTogether. But removing the h3 did not undo the side effect.',
    contentId: orphanHeadingContent,
    getPlugins: () => [
      keepTogether('h3', '*'),
      makePlugin({
        selector: 'h3',
        onAddFinish: (el) => {
          el.style.color = 'green';
          el.closest('.sized-container')
            .style.border = '4px solid green';
        },
      }),
    ],
  },
  {
    id: 'keep-gotchas-3',
    name: 'keepTogether Gotchas, Part 3',
    desc: 'To use side effects safely, your plugin should also include an onAddCancel method, giving you the chance to clean up after yourself.',
    contentId: orphanHeadingContent,
    getPlugins: () => [
      keepTogether('h3', '*'),
      makePlugin({
        selector: 'h3',
        onAddFinish: (el) => {
          el.style.color = 'green';
          el.closest('.sized-container')
            .style.border = '4px solid green';
        },
        onAddCancel: (el) => {
          el.closest('.sized-container')
            .style.border = '';
        },
      }),
    ],
  },
  {
    id: 'orphan-paragraph',
    name: 'Problem: Orphaned paragraph line',
    desc: 'Currently, regionize does not handle orphaned lines (the beginning line of a paragraph left behind when the rest overflows, where you may prefer to break early and move the entire paragraph). This may be added in a future release.',
    contentId: orphanParaContent,
    getPlugins: () => [
      clearIndents('p'),
    ],
  },
  {
    id: 'widow-paragraph',
    name: 'Problem: Widowed paragraph line',
    desc: 'Currently, regionize does not handle widowed lines (the last line of a paragraph overflowing in a new region, where you may prefer to break early to overflow 2 lines).  This may be added in a future release.',
    contentId: widowParaContent,
    getPlugins: () => [
      clearIndents('p'),
    ],
  },
];

(((root, factory) => {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.testCases = factory();
  }
})(typeof self !== 'undefined' ? self : this, () => testCases));
