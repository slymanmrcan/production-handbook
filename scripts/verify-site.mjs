import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { parse } from 'parse5';
import { sections } from '../src/navigation.mjs';

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries.filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}

function readPage(html) {
  const ids = new Set();
  const links = new Set();
  let canonical;

  function walk(node) {
    const attributes = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
    if (attributes.id) ids.add(attributes.id);
    if (node.tagName === 'a' && attributes.href) links.add(attributes.href);
    if (node.tagName === 'link' && attributes.rel === 'canonical') canonical = attributes.href;
    for (const child of node.childNodes ?? []) walk(child);
  }

  walk(parse(html));
  return { canonical, ids, links };
}

function collectSlugs(items) {
  return items.flatMap((item) => item.items ? collectSlugs(item.items) : item.slug);
}

const files = new Set(await listFiles('dist'));
const pages = new Map();
for (const file of files) {
  if (file.endsWith('.html')) pages.set(file, readPage(await readFile(join('dist', file), 'utf8')));
}

const home = new URL(pages.get('index.html').canonical);
const navigation = new Set(collectSlugs(sections));
const errors = [];
let checked = 0;

for (const file of await listFiles('docs')) {
  if (!/\.(md|mdx)$/.test(file)) continue;
  const path = file.replace(/\.(md|mdx)$/, '');
  const expected = path === '404' ? '404.html' : path.endsWith('/index') || path === 'index'
    ? `${path}.html`
    : `${path}/index.html`;
  if (!files.has(expected)) errors.push(`${file}: missing output ${expected}`);
  if (path !== 'index' && path !== '404' && !navigation.has(path.replace(/\/index$/, ''))) {
    errors.push(`${file}: missing from the sidebar`);
  }
}

for (const [path, page] of pages) {
  const source = new URL(path.replace(/index\.html$/, ''), home);
  for (const link of page.links) {
    const url = new URL(link, source);
    if (url.origin !== home.origin) continue;
    if (!url.pathname.startsWith(home.pathname)) {
      if (!link.startsWith('https://') && !link.startsWith('http://')) {
        errors.push(`${path}: ${link} points outside ${home.pathname}`);
      }
      continue;
    }

    const relativePath = decodeURIComponent(url.pathname.slice(home.pathname.length));
    const target = files.has(relativePath) ? relativePath : join(relativePath, 'index.html');
    if (!files.has(target)) {
      errors.push(`${path}: ${link} has no destination`);
    } else if (url.hash && pages.has(target) && !pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) {
      errors.push(`${path}: ${link} has no matching heading or anchor`);
    }
    checked++;
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${checked} internal links and fragments across ${pages.size} HTML pages.`);
}
