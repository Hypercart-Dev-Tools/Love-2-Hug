# SEO Capture Tool
**Status:** Experimental Alpha
**Last updated:** February 2026
**Depends on:** Node.js, Puppeteer, Python 3 (optional, for local preview)

## What this does

A single command that captures a rendered React/Vite SPA and produces a **self-contained static HTML file** ready for search engines and AI crawlers. It solves the core problem described in [STATIC-HOME-PAGE.md](STATIC-HOME-PAGE.md): SPAs ship an empty `<div id="root"></div>` that crawlers can't read.

```bash
node scripts/capture-spa.mjs https://yoursite.com
```

Or with the full wrapper (capture + local preview):

```bash
./scripts/capture-and-verify.sh https://yoursite.com
```

## What it does (7 steps, fully automated)

| Step | Action | Why |
|------|--------|-----|
| 1 | Navigate to URL | Loads the SPA in headless Chrome |
| 2 | Wait for content | Ensures React has finished rendering |
| 3 | Inline all external CSS | Puppeteer's `page.content()` only captures HTML, not CSS files. Without this, Tailwind utility classes render as unstyled text. This was the #1 bug we hit (see Lessons Learned in STATIC-HOME-PAGE.md). |
| 4 | Remove JS module scripts | Crawlers don't execute JavaScript — that's the whole point of this tool |
| 5 | Validate SEO meta tags | Checks for title, description, OG tags, Twitter cards, JSON-LD, canonical URL, h1. Warns about anything missing. |
| 6 | Add capture marker | Injects `<meta name="capture-status">` and timestamp for verification |
| 7 | Write + self-verify | Saves the file, then re-reads it and runs 7 automated checks |

## Files

| File | Purpose |
|------|---------|
| `scripts/capture-spa.mjs` | Core Node.js script — does all 7 steps |
| `scripts/capture-and-verify.sh` | Bash wrapper — runs the Node script, starts a local preview server, opens your browser |

## Quick start

### Prerequisites

```bash
# From the project root
npm install   # installs Puppeteer
```

### Capture from a live site

```bash
node scripts/capture-spa.mjs https://yoursite.com
```

### Capture from a local dev server

```bash
# Terminal 1: start your Vite dev server
npm run dev

# Terminal 2: capture it
node scripts/capture-spa.mjs http://localhost:5173
```

### Full flow with preview

```bash
./scripts/capture-and-verify.sh https://yoursite.com
```

This will:
1. Run the capture
2. Start a local HTTP server on a random port
3. Open the result in your browser
4. Wait for you to review, then clean up

## CLI options

```
node scripts/capture-spa.mjs <url> [options]

Options:
  --output <path>   Output file path (default: public/seo-test/index.html)
  --open            Open the result in the default browser after capture
```

## Example output

```
  ======================================
  SEO Capture Tool — Experimental Alpha
  ======================================
  Source: https://love2hug.dev
  Output: /path/to/public/seo-test/index.html

  [1/7] Navigating to https://love2hug.dev
    PASS  Page loaded (networkidle0)

  [2/7] Waiting for content to render
    PASS  Content element found

  [3/7] Inlining external CSS
    PASS  Inlined 1 stylesheet(s)

  [4/7] Removing module scripts (not needed for SEO)
    PASS  Removed 1 script(s)

  [5/7] Validating SEO meta tags
    PASS  <title>: Love2Hug - AGENTS.md Architecture Guide for Lovable P...
    PASS  meta description: Open-source checklist-driven architecture guide fo...
    PASS  canonical URL: https://love2hug.dev/
    PASS  og:title: Love2Hug - AGENTS.md Architecture Guide for Lovable P...
    PASS  og:description: Open-source checklist-driven architecture guide fo...
    PASS  og:image: https://love2hug.dev/og-image.png
    PASS  og:url: https://love2hug.dev/
    PASS  twitter:card: summary_large_image
    PASS  JSON-LD structured data: present
    PASS  <h1> heading: Make your Lovable code Huggable for users — built for ...

  [6/7] Capturing final HTML
    PASS  Captured 42 KB of HTML

  [7/7] Writing output and verifying
    ..    Written to: /path/to/public/seo-test/index.html
    PASS  Has <h1> content
    PASS  Capture marker present
    PASS  No external stylesheet links (CSS inlined)
    PASS  No module script tags (JS stripped)
    PASS  Has <title> tag
    PASS  Has meta description
    PASS  File size: 42 KB

  ======================================
  Summary
  ======================================
  CSS stylesheets inlined: 1
  JS scripts removed:     1
  SEO tags found:         10/10
  Verification:           ALL PASSED
  Output:                 /path/to/public/seo-test/index.html
```

## How it fits into the workflow

This tool automates Step 1 from [STATIC-HOME-PAGE.md](STATIC-HOME-PAGE.md):

```
1. Run capture tool  →  self-contained /seo-test/index.html
2. Deploy to Lovable  →  verify at https://yoursite.com/seo-test/
3. Check with crawlers  →  curl, Google Rich Results Test, Free SEO Check
4. Promote to /  →  Cloudflare Worker (recommended) or manual copy
```

## Known limitations (Alpha)

- **Requires the target site to be running.** Cannot capture from build output alone (use the prerender script in STATIC-HOME-PAGE.md for that).
- **CSS inlining fetches from the same origin.** Cross-origin stylesheets (Google Fonts, CDNs) will be inlined if CORS allows, but may fail silently if not.
- **No image optimization.** Images are left as-is (external URLs). For a fully self-contained page, you'd need to also download and embed images.
- **Interactive components won't work.** Accordions, modals, and other JS-driven UI will be frozen in their initial state (collapsed, closed, etc.). This is expected — crawlers don't interact with the page.
- **Color values for custom themes are not extracted automatically.** If you use the Tailwind CDN fallback (as we did on this project), you'll need to manually define CSS custom properties. The tool captures whatever CSS the site already has.

## Related

- [STATIC-HOME-PAGE.md](STATIC-HOME-PAGE.md) — The full guide this tool automates
- [STATIC-HOME-PAGE.md > Lessons Learned](STATIC-HOME-PAGE.md#lessons-learned-on-this-project) — Real-world issues that informed this tool's design
