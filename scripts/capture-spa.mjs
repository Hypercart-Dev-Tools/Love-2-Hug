#!/usr/bin/env node

/**
 * capture-spa.mjs — Capture a rendered SPA as a self-contained static HTML page
 *
 * EXPERIMENTAL ALPHA — Part of the SEO Capture Tool (see OFF-ROAD/SEO-CAPTURE-TOOL.md)
 *
 * Usage:
 *   node scripts/capture-spa.mjs <url> [--output <path>] [--open]
 *
 * Examples:
 *   node scripts/capture-spa.mjs https://love2hug.dev
 *   node scripts/capture-spa.mjs http://localhost:5173 --output dist/seo-test/index.html
 *   node scripts/capture-spa.mjs https://yoursite.com --open
 *
 * What it does:
 *   1. Launches headless Chrome via Puppeteer
 *   2. Navigates to the URL, waits for content to render
 *   3. Inlines all external CSS into <style> blocks
 *   4. Removes <script type="module"> tags (not needed for SEO)
 *   5. Validates SEO meta tags and warns about missing ones
 *   6. Adds a capture marker for verification
 *   7. Writes the self-contained HTML to public/seo-test/index.html
 *   8. Runs verification checks on the output
 */

import puppeteer from 'puppeteer';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';

// --- Configuration ---
const DEFAULTS = {
  output: resolve('public', 'seo-test', 'index.html'),
  timeout: 30000,
  contentTimeout: 10000,
  contentSelectors: 'h1, [data-testid="home"], main, [role="main"]',
};

// --- CLI argument parsing ---
function parseArgs(argv) {
  const args = argv.slice(2);
  const config = { url: null, output: DEFAULTS.output, open: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      config.output = resolve(args[++i]);
    } else if (args[i] === '--open') {
      config.open = true;
    } else if (!args[i].startsWith('--')) {
      config.url = args[i];
    }
  }
  return config;
}

// --- Logging helpers ---
const log = {
  step: (n, msg) => console.log(`\n  [${n}/7] ${msg}`),
  pass: (msg) => console.log(`    PASS  ${msg}`),
  warn: (msg) => console.log(`    WARN  ${msg}`),
  fail: (msg) => console.log(`    FAIL  ${msg}`),
  info: (msg) => console.log(`    ..    ${msg}`),
};

// --- Step 1: Navigate ---
async function navigate(page, url) {
  log.step(1, `Navigating to ${url}`);
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: DEFAULTS.timeout });
    log.pass('Page loaded (networkidle0)');
  } catch (e) {
    log.fail(`Navigation failed: ${e.message}`);
    throw e;
  }
}

// --- Step 2: Wait for content ---
async function waitForContent(page) {
  log.step(2, 'Waiting for content to render');
  try {
    await page.waitForSelector(DEFAULTS.contentSelectors, { timeout: DEFAULTS.contentTimeout });
    log.pass('Content element found');
  } catch {
    log.warn('No h1/main/[data-testid="home"] found — page may be empty or use different selectors');
  }
}

// --- Step 3: Inline CSS ---
async function inlineCSS(page) {
  log.step(3, 'Inlining external CSS');
  const result = await page.evaluate(async () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    let inlined = 0;
    let failed = 0;
    for (const link of links) {
      try {
        const res = await fetch(link.href);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const css = await res.text();
        const style = document.createElement('style');
        style.setAttribute('data-inlined-from', link.getAttribute('href') || 'unknown');
        style.textContent = css;
        link.replaceWith(style);
        inlined++;
      } catch {
        failed++;
      }
    }
    return { total: links.length, inlined, failed };
  });

  if (result.total === 0) {
    log.info('No external stylesheets found (CSS may already be inline)');
  } else if (result.failed > 0) {
    log.warn(`Inlined ${result.inlined}/${result.total} stylesheets (${result.failed} failed)`);
  } else {
    log.pass(`Inlined ${result.inlined} stylesheet(s)`);
  }
  return result;
}

// --- Step 4: Strip JS ---
async function stripJS(page) {
  log.step(4, 'Removing module scripts (not needed for SEO)');
  const removed = await page.evaluate(() => {
    const scripts = document.querySelectorAll('script[type="module"], script[src*="/assets/"]');
    const count = scripts.length;
    scripts.forEach(s => s.remove());
    return count;
  });

  if (removed > 0) {
    log.pass(`Removed ${removed} script(s)`);
  } else {
    log.info('No module/asset scripts found');
  }
  return removed;
}

// --- Step 5: Validate SEO tags ---
async function validateSEO(page) {
  log.step(5, 'Validating SEO meta tags');
  const seo = await page.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.getAttribute('content') || el.textContent || '').trim() : null;
    };
    return {
      title: document.title || null,
      description: get('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
      ogTitle: get('meta[property="og:title"]'),
      ogDescription: get('meta[property="og:description"]'),
      ogImage: get('meta[property="og:image"]'),
      ogUrl: get('meta[property="og:url"]'),
      twitterCard: get('meta[name="twitter:card"]'),
      jsonLd: document.querySelector('script[type="application/ld+json"]') ? 'present' : null,
      h1: document.querySelector('h1')?.textContent?.trim()?.substring(0, 80) || null,
    };
  });

  const checks = [
    ['<title>', seo.title],
    ['meta description', seo.description],
    ['canonical URL', seo.canonical],
    ['og:title', seo.ogTitle],
    ['og:description', seo.ogDescription],
    ['og:image', seo.ogImage],
    ['og:url', seo.ogUrl],
    ['twitter:card', seo.twitterCard],
    ['JSON-LD structured data', seo.jsonLd],
    ['<h1> heading', seo.h1],
  ];

  let passed = 0;
  let warned = 0;
  for (const [name, value] of checks) {
    if (value) {
      log.pass(`${name}: ${value.substring(0, 60)}${value.length > 60 ? '...' : ''}`);
      passed++;
    } else {
      log.warn(`${name}: MISSING`);
      warned++;
    }
  }

  return { seo, passed, warned, total: checks.length };
}

// --- Step 6: Capture + marker ---
async function captureHTML(page) {
  log.step(6, 'Capturing final HTML');
  const html = await page.content();
  const timestamp = new Date().toISOString();
  const marked = html.replace(
    '</head>',
    `<meta name="capture-status" content="captured" />\n<meta name="capture-timestamp" content="${timestamp}" />\n</head>`
  );
  log.pass(`Captured ${(marked.length / 1024).toFixed(0)} KB of HTML`);
  return marked;
}

// --- Step 7: Write + verify ---
async function writeAndVerify(html, outputPath) {
  log.step(7, 'Writing output and verifying');

  const outDir = resolve(outputPath, '..');
  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, html, 'utf-8');
  log.info(`Written to: ${outputPath}`);

  // Verification checks on the written file
  const content = await readFile(outputPath, 'utf-8');
  const checks = {
    hasContent: /<h1[^>]*>/.test(content),
    hasMarker: content.includes('capture-status'),
    noExternalCSS: !/<link[^>]*rel=["']stylesheet["'][^>]*>/.test(content),
    noModuleScripts: !/<script[^>]*type=["']module["'][^>]*>/.test(content),
    hasTitle: /<title[^>]*>[^<]+<\/title>/.test(content),
    hasDescription: /meta[^>]*name=["']description["']/.test(content),
    sizeOK: content.length > 1000,
  };

  const labels = {
    hasContent: 'Has <h1> content',
    hasMarker: 'Capture marker present',
    noExternalCSS: 'No external stylesheet links (CSS inlined)',
    noModuleScripts: 'No module script tags (JS stripped)',
    hasTitle: 'Has <title> tag',
    hasDescription: 'Has meta description',
    sizeOK: `File size: ${(content.length / 1024).toFixed(0)} KB`,
  };

  let allPassed = true;
  for (const [key, passed] of Object.entries(checks)) {
    if (passed) {
      log.pass(labels[key]);
    } else {
      log.fail(labels[key]);
      allPassed = false;
    }
  }

  return { allPassed, checks };
}

// --- Main ---
async function main() {
  const config = parseArgs(process.argv);

  if (!config.url) {
    console.error(`
  SEO Capture Tool — Experimental Alpha

  Usage: node scripts/capture-spa.mjs <url> [options]

  Options:
    --output <path>   Output file path (default: public/seo-test/index.html)
    --open            Open the result in the default browser after capture

  Examples:
    node scripts/capture-spa.mjs https://yoursite.com
    node scripts/capture-spa.mjs http://localhost:5173 --open
    node scripts/capture-spa.mjs https://yoursite.com --output dist/seo-test/index.html
`);
    process.exit(1);
  }

  console.log('\n  ======================================');
  console.log('  SEO Capture Tool — Experimental Alpha');
  console.log('  ======================================');
  console.log(`  Source: ${config.url}`);
  console.log(`  Output: ${config.output}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });

  try {
    const page = await browser.newPage();
    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 800 });

    await navigate(page, config.url);
    await waitForContent(page);
    const cssResult = await inlineCSS(page);
    const jsRemoved = await stripJS(page);
    const seoResult = await validateSEO(page);
    const html = await captureHTML(page);
    const verifyResult = await writeAndVerify(html, config.output);

    // --- Summary ---
    console.log('\n  ======================================');
    console.log('  Summary');
    console.log('  ======================================');
    console.log(`  CSS stylesheets inlined: ${cssResult.inlined}`);
    console.log(`  JS scripts removed:     ${jsRemoved}`);
    console.log(`  SEO tags found:         ${seoResult.passed}/${seoResult.total}`);
    console.log(`  Verification:           ${verifyResult.allPassed ? 'ALL PASSED' : 'SOME CHECKS FAILED'}`);
    console.log(`  Output:                 ${config.output}`);

    if (seoResult.warned > 0) {
      console.log(`\n  ${seoResult.warned} SEO tag(s) missing — see warnings above.`);
    }

    if (!verifyResult.allPassed) {
      console.log('\n  Some verification checks failed. Review the output before deploying.');
    }

    console.log('');

    // Open in browser if requested
    if (config.open) {
      const { exec } = await import('child_process');
      const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
      exec(`${cmd} "${config.output}"`);
      console.log(`  Opened in browser.\n`);
    }

    process.exit(verifyResult.allPassed ? 0 : 1);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(`\n  FATAL: ${err.message}\n`);
  process.exit(1);
});
