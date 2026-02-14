import puppeteer from 'puppeteer';
import { writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

const PUBLIC = resolve('public');

async function capture(url) {
  if (!url) {
    console.error('Error: Please provide a URL as an argument.');
    process.exit(1);
  }
  console.log(`Capturing HTML from ${url} ...`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
  } catch (e) {
    console.error(`Failed to navigate to ${url}. Is it a valid and running URL?`);
    console.error(e.message);
    await browser.close();
    process.exit(1);
  }

  // Wait for content to be on the page, using a general selector from the doc
  await page.waitForSelector('h1, [data-testid="home"], main', { timeout: 10000 }).catch(() => {
    console.warn('Warning: Could not find a primary content element (h1, [data-testid="home"], main). The page might be empty or rendered differently.');
  });

  const html = await page.content();

  // Add a marker so we can verify the capture worked
  const marked = html.replace(
    '</head>',
    `<meta name="capture-status" content="captured" />
</head>`
  );

  const outDir = resolve(PUBLIC, 'seo-test');
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'index.html'), marked, 'utf-8');
  console.log(`Done: ${resolve(outDir, 'index.html')} written with captured content.`);

  await browser.close();
}

capture(process.argv[2]).catch(err => {
  console.error('Capture script failed:', err.message);
  process.exit(1);
});
