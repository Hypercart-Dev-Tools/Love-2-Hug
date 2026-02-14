# Static Home Page for Lovable Sites
**Last updated:** February 2026  
**Status:** Not started  

## Make your React/Vite site visible to search engines and AI crawlers

**The problem:** Lovable sites ship as React SPAs. When a search engine or AI bot requests your site, it receives an empty `<div id="root"></div>` and no content. Your site is invisible to Google, Bing, ChatGPT, Claude, and every other crawler that doesn't execute JavaScript.

**The approach:** Instead of modifying your live home page (risky — Lovable can overwrite it, React hydration can break), we create a **standalone test page at `/seo-test/`** first. This page lives safely in `public/seo-test/index.html`, completely outside React. Verify it works, then decide whether to promote it to `/` or use it as a template for a Cloudflare Worker.

**Who this is for:** Anyone with a Lovable-hosted React/Vite site who wants their content indexed.

---

## How to use this doc

Pick your path based on your comfort level:

```
Non-Technical (Lovable editor only, no CLI)
  Step 1: Create a static test page at /seo-test/
  Step 2: Verify crawlers can see it
  Step 3: Apply the pattern to your home page

Technical (CLI, CI/CD, or Cloudflare)
  Option A: Automate prerendering with Puppeteer
  Option B: Cloudflare Worker proxy for bots
```

**Everyone starts with the non-technical path.** The technical options are for automating or scaling what you proved works in the test.

---

# Part 1: Non-Technical Path

**Tools needed:** Lovable editor + a browser. No CLI, no terminal, no installs.

## Step 1: Create your SEO test page

### Why `/seo-test/` instead of modifying `/`?

- **Zero risk.** Your live home page stays untouched. Nothing can break.
- **No hydration conflicts.** This page is plain HTML — React never touches it.
- **Lovable-proof.** Files in `public/` survive Lovable rebuilds. Your root `index.html` does not.
- **Verifiable.** You can test with real crawlers before committing to anything.

### Steps (Lovable editor)

1. **Create the folder and file.** In your Lovable project, create:
   ```
   public/seo-test/index.html
   ```

2. **Paste this template** and customize it for your site:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- REQUIRED: Update these for your site -->
  <title>Your Site Name — Your Value Proposition</title>
  <meta name="description" content="150 chars max describing what your site does." />
  <!-- Canonical points to / (your real home page), not /seo-test/.
       This tells Google that / is the authoritative URL, even though
       the content lives here during testing. -->
  <link rel="canonical" href="https://yoursite.com/" />

  <!-- Open Graph (shows when shared on social media) -->
  <meta property="og:title" content="Your Site Name" />
  <meta property="og:description" content="Same or similar to meta description." />
  <meta property="og:image" content="https://yoursite.com/og-image.jpg" />
  <meta property="og:url" content="https://yoursite.com/" />
  <meta property="og:type" content="website" />

  <!-- Twitter/X Card -->
  <meta name="twitter:card" content="summary_large_image" />

  <!-- Structured data (helps Google understand your site).
       Change @type to match your site: "Organization" for a company,
       "SoftwareApplication" for a SaaS product, "Product" for e-commerce,
       "LocalBusiness" for a local service, etc. -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Your Site Name",
    "url": "https://yoursite.com",
    "description": "What your site does."
  }
  </script>

  <style>
    /* Inline your styles here — this page is self-contained */
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; }
    header { padding: 1rem 2rem; border-bottom: 1px solid #eee; }
    nav a { margin-right: 1rem; text-decoration: none; color: #333; }
    main { max-width: 800px; margin: 2rem auto; padding: 0 1rem; }
    footer { text-align: center; padding: 2rem; color: #666; font-size: 0.875rem; }
  </style>
</head>
<body>
  <header>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/pricing">Pricing</a>
      <a href="/app">Get Started</a>
    </nav>
  </header>

  <main>
    <h1>Your Main Headline</h1>
    <p>Your value proposition. This is what Google and AI crawlers will see and index.</p>
    <p>Add your real content here — describe what your site does, who it's for,
       and why someone should use it. This is your SEO content.</p>
    <a href="/app">Get Started</a>
  </main>

  <footer>
    <p>&copy; 2026 Your Company</p>
  </footer>
</body>
</html>
```

3. **Customize the content.** Replace all placeholder text with your actual:
   - Site name and headline
   - Value proposition / description
   - Navigation links
   - Any key content you want crawlers to index

4. **Add at least one image.** The template above is text-only. A hero image significantly improves both SEO and social sharing. Add it inside `<main>`:
   ```html
   <img src="/hero.webp" alt="Short description of what the image shows"
        width="800" height="450" loading="lazy" />
   ```
   - Use **WebP format** for smaller file sizes (`.webp` instead of `.jpg`/`.png`)
   - Always include a descriptive **`alt` attribute** — this is what Google Images indexes
   - Set **`width` and `height`** to prevent layout shift (CLS) — use the image's actual dimensions
   - Place the image file in your `public/` folder so it's served as a static asset

5. **Deploy.** Push/deploy through Lovable as normal.

## Step 2: Verify it works

After deploying, open these URLs in your browser:

| What to check | How | What you should see |
|---|---|---|
| Page loads | Visit `https://yoursite.com/seo-test/` | Your static page with real content |
| Crawler sees content | View page source (Ctrl+U / Cmd+U) | Full HTML with your text visible in the source |
| Meta tags present | View source, search for `og:title` | Your Open Graph and description tags |
| Structured data | [Google Rich Results Test](https://search.google.com/test/rich-results) → enter your `/seo-test/` URL | No errors, your schema detected |
| SEO health check | [Free SEO Check](https://new2seo.com/free-seo-check) → enter your `/seo-test/` URL | Title, description, and OG tags all passing |

**If you have terminal access**, these commands also work:

```bash
# Does the page have real content?
curl -s https://yoursite.com/seo-test/ | grep -i "<h1>"

# Are meta tags present?
curl -s https://yoursite.com/seo-test/ | grep -i "og:title"

# Is the title correct?
curl -s https://yoursite.com/seo-test/ | grep -i "<title>"
```

**Quickest check:** Run your `/seo-test/` URL through the [Free SEO Check](https://new2seo.com/free-seo-check) — it validates title, description, OG tags, and structured data in one pass.

### Does it work?

**Yes if:** You see your real content in View Source (not an empty div). The Rich Results Test shows your structured data. The Free SEO Check shows green across the board.

**No if:** The page 404s (check the file path — it must be `public/seo-test/index.html`), or Lovable's hosting doesn't serve static subfolders (unlikely, but skip to the Technical path if so).

## Step 3: Apply to your home page

Once `/seo-test/` proves the concept, you have two options:

### Option A: Copy the pattern to your home page (simple, manual)

1. Open your live home page in Chrome
2. Right-click → Inspect → find the content inside `<div id="root">`
3. Copy the outer HTML of the rendered content
4. Open your project's root `index.html`
5. Paste that HTML inside `<div id="root">...</div>`
6. Add the SEO meta tags from your test page to `<head>`
7. Deploy and verify with `curl -s https://yoursite.com/ | grep "<h1>"`

**Caveats:**
- **Lovable may overwrite this.** If Lovable regenerates `index.html` on deploy, your edits are lost. You'll need to re-apply after each Lovable update.
- **React hydration warnings.** React may log console warnings if the static HTML doesn't exactly match what it renders. Usually harmless for SEO — crawlers don't run React.
- **Manual updates.** Every time your home page content changes, re-copy the HTML.

This is fine for landing pages that change monthly. For anything more dynamic, use the Technical path.

### Option B: Keep `/seo-test/` as your indexed landing page

Instead of modifying `/`, update your SEO strategy to point crawlers to `/seo-test/`:

- Set the canonical URL to `/seo-test/` in your sitemap
- Use `/seo-test/` as the URL you submit to Google Search Console
- Link to `/seo-test/` from external sources

This is unconventional but eliminates all maintenance risk. The tradeoff is a non-root URL for your primary indexed page.

**Important caveat:** Google treats root URLs (`/`) as significantly higher authority for brand queries. If someone searches "YourBrand", Google strongly prefers to show `yoursite.com/` over `yoursite.com/seo-test/`. This option works well for niche or long-tail content, but **not as your primary brand landing page**. If brand search visibility matters to you, treat `/seo-test/` as a stepping stone and plan to promote the content to `/` using Option A or the Technical path.

---

# Part 2: Technical Path

**Requires:** CLI access, and/or a Cloudflare account.

These options automate or enhance what you proved works in Part 1. **Do Part 1 first** — if `/seo-test/` doesn't show content to crawlers, these won't either, and you'll have wasted time on infrastructure.

## Option A: Prerender at Build Time (Puppeteer Postbuild)

**Goal:** Automatically generate a static HTML snapshot of your home page after every build.

**Requires:** CLI access (clone repo from Lovable, run locally or in CI). Puppeteer will **not** work in Lovable's build environment.

### How it works

After `vite build` produces your SPA in `dist/`, a postbuild script launches a headless browser, loads the app, waits for React to render, and saves the output as a static HTML file.

> **Watch out: Puppeteer captures HTML, not CSS.** Puppeteer's `page.content()` returns the DOM as a string but does **not** bundle external stylesheets. If your Vite build splits CSS into `/assets/*.css` files (which it does by default), the captured HTML will reference those files — but they won't exist when the page is served standalone. The result: every Tailwind utility class renders as unstyled raw HTML. The script below fixes this by inlining all `<link rel="stylesheet">` tags into `<style>` blocks before capturing. If you write your own capture script, **always inline CSS first.**

**Key change from the old approach:** We write the output to `dist/seo-test/index.html` instead of overwriting `dist/index.html`. This keeps the SPA intact and gives you a safe prerendered page to verify before promoting to `/`.

### Setup

#### 1. Install Puppeteer

```bash
npm install --save-dev puppeteer
```

#### 2. Create `scripts/prerender-home.mjs`

```javascript
import puppeteer from 'puppeteer';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve } from 'path';
import { createServer } from 'http';

const DIST = resolve('dist');
const PORT = 4173;
const OUTPUT_PATH = 'seo-test/index.html'; // Safe output — doesn't touch the SPA

async function serve() {
  const handler = async (req, res) => {
    const url = req.url === '/' ? '/index.html' : req.url;
    try {
      const file = await readFile(resolve(DIST, `.${url}`));
      const ext = url.split('.').pop();
      const types = {
        html: 'text/html',
        js: 'application/javascript',
        css: 'text/css',
        json: 'application/json',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(file);
    } catch {
      const index = await readFile(resolve(DIST, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(index);
    }
  };
  const server = createServer(handler);
  return new Promise(r => server.listen(PORT, () => r(server)));
}

async function prerender() {
  console.log('Prerendering home page to /seo-test/ ...');
  const server = await serve();

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto(`http://localhost:${PORT}/`, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  // Wait for React to render — adjust selector for your app
  await page.waitForSelector('h1, [data-testid="home"], main', { timeout: 10000 }).catch(() => {
    console.warn('Warning: Could not find expected home page element. Proceeding anyway.');
  });

  // CRITICAL: Inline all external CSS before capturing HTML.
  // Puppeteer's page.content() only captures the DOM — it does NOT
  // bundle external stylesheets. Without this step, the output HTML
  // references /assets/*.css files that won't exist in the static page,
  // and every Tailwind utility class renders as unstyled raw HTML.
  await page.evaluate(async () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (const link of links) {
      try {
        const res = await fetch(link.href);
        const css = await res.text();
        const style = document.createElement('style');
        style.textContent = css;
        link.replaceWith(style);
      } catch (e) {
        console.warn('Could not inline stylesheet:', link.href);
      }
    }
    // Also remove module scripts — JS is not needed for SEO pages
    document.querySelectorAll('script[type="module"]').forEach(s => s.remove());
  });

  const html = await page.content();

  // Add a marker so we can verify prerendering worked
  const marked = html.replace(
    '</head>',
    '<meta name="prerender-status" content="prerendered" />\n</head>'
  );

  // Write to seo-test/ subdirectory — not the SPA root
  const outDir = resolve(DIST, 'seo-test');
  await mkdir(outDir, { recursive: true });
  await writeFile(resolve(outDir, 'index.html'), marked, 'utf-8');
  console.log('Done: dist/seo-test/index.html written with prerendered content.');

  await browser.close();
  server.close();
}

prerender().catch(err => {
  console.error('Prerender failed:', err.message);
  process.exit(1);
});
```

#### 3. Add to `package.json`

```json
{
  "scripts": {
    "build": "vite build",
    "postbuild": "node scripts/prerender-home.mjs"
  }
}
```

#### 4. Verify

```bash
npm run build

# Check the capture marker exists
grep -c "prerender-status" dist/seo-test/index.html  # should print 1

# Check the output has real content
grep -c "<h1>" dist/seo-test/index.html  # should print 1+

# IMPORTANT: Check that CSS was inlined (not left as external <link> tags).
# If this prints 0, the CSS was inlined correctly and the page is self-contained.
# If this prints 1+, the page still references external stylesheets and will
# render as unstyled HTML when served standalone.
grep -c 'link rel="stylesheet"' dist/seo-test/index.html  # should print 0

# Quick visual check — serve the file and open in a browser
npx serve dist -l 4173
# Visit http://localhost:4173/seo-test/ — should look styled, not raw HTML
```

### Promoting to `/`

Once you've confirmed `/seo-test/` works, you can optionally copy the output to overwrite `dist/index.html` in the same script. Add this after the `writeFile` call:

```javascript
// Optional: also overwrite the SPA's index.html for the root route
// await writeFile(resolve(DIST, 'index.html'), marked, 'utf-8');
```

Uncomment when you're confident.

---

## Option B: Cloudflare Worker Prerender Proxy

**Goal:** Intercept crawler requests at the edge and serve static HTML, without changing your Lovable build at all.

**Requires:** Free Cloudflare account. Your domain must use Cloudflare DNS (or use a `yoursite.workers.dev` subdomain for testing).

### How it works

A Cloudflare Worker sits in front of your Lovable site. When it detects a bot user-agent, it serves a prerendered HTML page. Human visitors get the normal SPA.

```
Bot request  → Cloudflare Worker → serves cached static HTML
Human request → Cloudflare Worker → passes through to Lovable SPA
```

### Setup

#### 1. Build your static HTML

Use your verified `/seo-test/` page from Part 1 as the source. Copy its full HTML.

#### 2. Create the Worker

In Cloudflare dashboard → Workers & Pages → Create Worker:

```javascript
const BOT_AGENTS = [
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'facebot', 'twitterbot', 'linkedinbot', 'whatsapp',
  'telegrambot', 'applebot', 'gptbot', 'claudebot', 'anthropic-ai',
  'bytespider', 'perplexitybot', 'cohere-ai',
];

function isBot(userAgent) {
  const ua = (userAgent || '').toLowerCase();
  return BOT_AGENTS.some(bot => ua.includes(bot));
}

// Paste your verified /seo-test/ HTML here
const PRERENDERED_HOME = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Your Site — Your Value Prop</title>
  <meta name="description" content="Your 150-char description." />
  <link rel="canonical" href="https://yoursite.com/" />
  <meta property="og:title" content="Your Site" />
  <meta property="og:description" content="Your description." />
  <meta property="og:image" content="https://yoursite.com/og-image.jpg" />
  <meta property="og:url" content="https://yoursite.com/" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
</head>
<body>
  <!-- Your verified content from /seo-test/ goes here -->
  <main>
    <h1>Your Headline</h1>
    <p>Your content that crawlers need to see.</p>
  </main>
</body>
</html>`;

// IMPORTANT: Replace this with your actual Lovable hosting URL
const ORIGIN = 'https://your-project-id.lovable.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const ua = request.headers.get('user-agent') || '';

    // Only intercept the home page for bots
    if (url.pathname === '/' && isBot(ua)) {
      return new Response(PRERENDERED_HOME, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'X-Prerender': 'static-home',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // Everything else: fetch from the actual Lovable origin
    // NOTE: Do NOT use fetch(request) — that creates an infinite loop
    // because the Worker intercepts its own request. Fetch from the
    // origin URL explicitly instead.
    const originUrl = new URL(url.pathname + url.search, ORIGIN);
    return fetch(originUrl, {
      method: request.method,
      headers: request.headers,
    });
  },
};
```

#### 3. Route the Worker

In Cloudflare DNS, point your domain to Lovable's hosting. Add a Worker Route for `yoursite.com/*` that triggers this Worker.

#### 4. Verify

```bash
# Simulate Googlebot
curl -s -A "Googlebot" https://yoursite.com/ | grep "<h1>"

# Normal browser request (should still return the SPA)
curl -s https://yoursite.com/ | grep '<div id="root">'
```

### Automating snapshot refresh

The hardcoded HTML string is manual — same problem as the Spike approach. To automate:

- **Cloudflare KV + Cron Trigger:** Store the HTML in KV. A scheduled trigger runs weekly, fetches your live `/seo-test/` page, and updates the KV value.
- **GitHub Action:** A cron job uses Puppeteer to render your home page and updates the Worker script via the Cloudflare API.

---

## Files checklist

Regardless of which path you use, make sure these files exist:

| File | Purpose | How to verify |
|------|---------|---------------|
| `public/robots.txt` | Tells crawlers what to index | `curl https://yoursite.com/robots.txt` |
| `public/sitemap.xml` | Lists all indexable URLs | `curl https://yoursite.com/sitemap.xml` |
| `public/llms.txt` | Plain-text summary for AI crawlers | `curl https://yoursite.com/llms.txt` |
| `public/seo-test/index.html` | Your verified static SEO page | `curl https://yoursite.com/seo-test/` |

### Minimal `robots.txt`

```
User-agent: *
Allow: /

Sitemap: https://yoursite.com/sitemap.xml
```

**Note:** Lovable does not auto-generate `robots.txt` or `sitemap.xml`. These are fully manual files you create in `public/`. Update `sitemap.xml` whenever you add or remove routes.

### Minimal `sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yoursite.com/</loc>
    <lastmod>2026-02-14</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yoursite.com/seo-test/</loc>
    <lastmod>2026-02-14</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>
```

### Minimal `llms.txt`

Since this doc explicitly targets AI crawler visibility, consider adding a `public/llms.txt` file. This is a plain-text file that AI models (ChatGPT, Claude, Perplexity, etc.) look for to understand your site without parsing HTML.

```
# Your Site Name

> One-line description of what your site does.

## About
Your site helps [audience] do [thing]. Founded in [year].

## Key pages
- Home: https://yoursite.com/
- Pricing: https://yoursite.com/pricing
- About: https://yoursite.com/about
- Docs: https://yoursite.com/docs

## Contact
- Email: hello@yoursite.com
- Twitter: @yourhandle
```

Keep it short and factual. This is what AI models read when someone asks "What is YourSite?" — make sure the answer is here in plain text.

---

## Decision flowchart

```
Start here
│
├── Create public/seo-test/index.html (Part 1 — everyone does this)
│     └── Does /seo-test/ show content to crawlers?
│           ├── No → Check file path, redeploy, ask in Lovable community
│           └── Yes ↓
│
├── Is manual updates to /seo-test/ enough for you?
│     └── Yes → Done. Update the HTML when your content changes.
│
├── Want to automate it?
│     ├── Have CLI access? → Option A (Puppeteer postbuild)
│     └── No CLI? → Option B (Cloudflare Worker)
│
└── Want bots to see this content on / instead of /seo-test/?
      ├── Option A: Copy static HTML into root index.html (manual, Lovable may overwrite)
      └── Option B: Cloudflare Worker intercepts / for bots (automated, no Lovable changes)
```

---


## Lessons Learned on this Project
Attn LLMs: please update this section with real world results and adaptations.

Live site on this project: http://love2hug.com

### 2026-02-14 — Capture script grabs HTML but not CSS/JS assets

**Problem:** The Puppeteer capture script (`scripts/capture-spa.mjs`) successfully captured the rendered HTML from the live SPA into `public/seo-test/index.html`, but it only saves the HTML document — not the external CSS and JS assets referenced in `<head>`. Empty placeholder files were created at `public/assets/index-Bi-pjKIu.css` (0 bytes) and `public/assets/index-Bi0bFsIi.js` (0 bytes). The captured HTML uses Tailwind CSS utility classes throughout (`flex`, `items-center`, `bg-background`, `text-foreground`, etc.), so without the CSS definitions the page rendered as completely unstyled raw HTML on the local test server.

**Root cause:** Puppeteer's `page.content()` returns the DOM as HTML but does not bundle external stylesheets or scripts. The Vite build output splits CSS and JS into separate hashed asset files. The capture script was never designed to also fetch and save those assets.

**Fix applied:** Replaced the broken external `<script>` and `<link>` references to the empty asset files with:
1. **Tailwind CDN** (`<script src="https://cdn.tailwindcss.com"></script>`) — provides all standard Tailwind utilities at runtime
2. **Inline `tailwind.config`** — maps the site's custom color names (`coral`, `sage`, `cream`, `peach`, `plum`, `amber`, `bg-deep`, `bg-warm`, `text-soft`, `text-muted`, etc.) to HSL CSS custom properties
3. **CSS custom properties in a `<style>` block** — defines `:root` values for `--background`, `--foreground`, `--primary`, `--coral`, `--sage`, and all other theme tokens

This makes the SEO test page fully self-contained, which aligns with the doc's own recommendation in the Step 1 template (inline styles, no external dependencies).

**Takeaway for the capture script:** If you use Puppeteer to capture a Vite/React SPA, you must also handle external assets. Options:
- **Inline CSS during capture:** Use `page.evaluate()` to read all `<style>` and `<link rel="stylesheet">` content and inject it as inline `<style>` blocks before calling `page.content()`
- **Use Tailwind CDN as a fallback:** For Tailwind-based sites, adding the CDN script + theme config is simpler than reconstructing the Vite build output
- **Download assets separately:** Fetch each `/assets/*.css` and `/assets/*.js` URL and write them alongside the HTML

The JS bundle is not needed for an SEO test page (crawlers don't execute JavaScript — that's the whole point). The CSS is critical for visual verification in a browser.

**Color accuracy note:** The HSL values in the CSS custom properties are approximations based on the class names and site branding. To get exact values, inspect the live site's computed styles once it is back online, or extract them from the Lovable project's `src/index.css` or Tailwind config.
