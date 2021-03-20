import fs from 'fs';
import posthtml from 'posthtml';
import beautify from 'posthtml-beautify';
import { chromium, firefox, webkit } from 'playwright';
import { diffLines } from 'diff';
import colors from 'colors';

import testCases from './test-cases.js';

// Run this test with `npm run test:e2e`

const args = process.argv.slice(2);
const SAVE_SNAPSHOTS = !!args.length && args[0] === 'save_all';

const TEST_URL = (new URL('./index.html', import.meta.url)).toString();

const renderDiff = (a, b) => {
  const diff = diffLines(a, b);

  diff.forEach((part) => {
    let color = 'grey';
    if (part.added) color = 'green';
    if (part.removed) color = 'red';
    process.stderr.write(colors[color](part.value));
  });
  process.stderr.write('\n');
};

const normalizer = posthtml().use(beautify({}));
async function normalizeHtml(txt) {
  const processed = await normalizer.process(txt);
  return processed.html;
}

const runBrowserTest = async (b) => {
  const browserName = b.name();

  const browser = await b.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(TEST_URL);
  await page.waitForFunction('window.REGIONIZE_DEMOS_ALL_DONE == true');

  for (const { id } of testCases) {
    const fileName = `./snapshots/golden/${id}.txt`;
    const htmlRaw = await page.innerHTML(`#${id} .output`);

    // firefox innerHTML return attributes in a different order, normalize first
    const html = await normalizeHtml(htmlRaw);

    if (SAVE_SNAPSHOTS) {
      fs.writeFileSync(fileName, html);
      console.log(`💾 Saved snapshot on ${browserName} as '${fileName}'`);
    } else {
      try {
        const golden = fs.readFileSync(fileName).toString();

        if (html === golden) {
          console.log(`✅ Snapshot matched on ${browserName} '${id}'`);
        } else {
          console.log(`❌ Snapshot diff on ${browserName} '${id}'`);
          renderDiff(golden, html);
        }
      } catch (err) {
        console.log(`🤷 Error running '${id}' on ${browserName}`);
        console.log(err);
      }
    }
  }

  await page.close();
  await context.close();
  await browser.close();
};

if (SAVE_SNAPSHOTS) {
  runBrowserTest(chromium);
} else {
  [chromium, webkit, firefox].forEach(runBrowserTest);
}
