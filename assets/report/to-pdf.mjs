// Print a report HTML file to PDF with any headless Chromium it can find.
// Usage: node to-pdf.mjs report.html [report.pdf]
// Order: $CHROME, Chrome / Chromium / Edge / Brave on macOS, Linux and Windows, then Python Playwright.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const [, , src, outArg] = process.argv;
if (!src) { console.error('Usage: node to-pdf.mjs report.html [report.pdf]'); process.exit(1); }
const html = path.resolve(src);
const out = path.resolve(outArg || html.replace(/\.html?$/i, '.pdf'));

const candidates = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
  const r = spawnSync('which', [bin], { encoding: 'utf8' });
  if (r.status === 0) candidates.push(r.stdout.trim());
}

const browser = candidates.find((c) => { try { return fs.existsSync(c); } catch { return false; } });
if (browser) {
  execFileSync(browser, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
    '--virtual-time-budget=15000', `--print-to-pdf=${out}`, pathToFileURL(html).href], { stdio: 'ignore' });
} else {
  // Fallback: Python Playwright, often present in sandboxes that have no Chrome install.
  const py = `import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page()
    pg.goto(sys.argv[1], wait_until="networkidle")
    pg.pdf(path=sys.argv[2], prefer_css_page_size=True, print_background=True)
    b.close()`;
  const r = spawnSync('python3', ['-c', py, pathToFileURL(html).href, out], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('No headless browser found. Deliver the HTML file; it prints to PDF from any browser (File > Print > Save as PDF).');
    process.exit(2);
  }
}
if (!fs.existsSync(out) || fs.statSync(out).size < 1000) { console.error('PDF was not written.'); process.exit(3); }
console.log(out);
