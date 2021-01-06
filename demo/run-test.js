const path = require('path');
const fs = require('fs');
const posthtml = require('posthtml');
const attrsSorter = require('posthtml-attrs-sorter');
const { chromium, firefox, webkit } = require('playwright');
const Diff = require('diff');
require('colors');

const testCases = require('./test-cases');

// Run this test with `npm run test:e2e`

const args = process.argv.slice(2);
const SAVE_SNAPSHOTS = !!args.length && args[0] === 'save_snapshots';

const renderDiff = (a, b) => {
  const diff = Diff.diffChars(a, b);
 
  diff.forEach((part) => {
    // green for additions, red for deletions
    // grey for common parts
    let color = 'grey';
    if (part.added) color = 'green';
    if (part.removed) color = 'red';
    process.stderr.write(part.value[color]);
  });
  process.stderr.write('\n');
}

const runBrowserTest = async (b) => {
  const browserName = b.name();
  const browser = await b.launch({
    headless: false,
  });
  const context = await browser.newContext();

  // Open new page
  const page = await context.newPage();

  const url = `file:${path.join(__dirname, 'index.html')}`;
  await page.goto(url);

  await page.waitForFunction('window.REGIONIZE_DEMOS_ALL_DONE == true');


  for (const { id } of testCases) {
    const fileName = `./demo/snapshots/${id}.txt`;
    const htmlRaw = await page.innerHTML(`#${id} .output`);

    // firefox return attributes in a different order from innerHTML, normalize first
    const html = (await posthtml().use(attrsSorter({})).process(htmlRaw)).html;

    if (SAVE_SNAPSHOTS) {
      fs.writeFileSync(fileName, html);
      console.log(`💾 Saved current snapshot on ${browserName} as '${fileName}'`);
    } else {
      const golden = fs.readFileSync(fileName).toString();

      if (html === golden) {
        console.log(`✅ Snapshot matched on ${browserName} '${id}'`);
      } else {
        console.log(`❌ Snapshot diff on ${browserName} '${id}'`);
        renderDiff(html, golden);
      }
    }
  }

  // assert.equal(page.url(), 'http://todomvc.com/examples/react/#/completed');


  // Close page
  await page.close();
  await context.close();
  await browser.close();
};

if (SAVE_SNAPSHOTS) {
  runBrowserTest(chromium);
} else {
  [chromium, webkit, firefox].forEach(runBrowserTest);
}
