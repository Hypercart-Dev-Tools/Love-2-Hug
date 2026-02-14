#!/usr/bin/env bash
#
# capture-and-verify.sh — End-to-end SEO capture + local preview
#
# EXPERIMENTAL ALPHA — Part of the SEO Capture Tool (see OFF-ROAD/SEO-CAPTURE-TOOL.md)
#
# Usage:
#   ./scripts/capture-and-verify.sh <url>
#   ./scripts/capture-and-verify.sh https://yoursite.com
#   ./scripts/capture-and-verify.sh http://localhost:5173
#
# What it does:
#   1. Runs the Node capture script (capture-spa.mjs)
#   2. Starts a local Python HTTP server
#   3. Opens the captured page in your browser
#   4. Waits for you to review, then cleans up
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_DIR/public"
OUTPUT_FILE="$OUTPUT_DIR/seo-test/index.html"
SERVER_PORT=0  # will be assigned

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# --- Helpers ---
info()  { echo -e "${CYAN}[info]${NC}  $1"; }
ok()    { echo -e "${GREEN}[ok]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC}  $1"; }
fail()  { echo -e "${RED}[fail]${NC}  $1"; }

cleanup() {
  if [ -n "${SERVER_PID:-}" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    info "Stopped local server (PID $SERVER_PID)"
  fi
}
trap cleanup EXIT

# --- Argument check ---
if [ $# -lt 1 ]; then
  echo ""
  echo -e "${BOLD}  SEO Capture Tool — Experimental Alpha${NC}"
  echo ""
  echo "  Usage: $0 <url>"
  echo ""
  echo "  Examples:"
  echo "    $0 https://yoursite.com"
  echo "    $0 http://localhost:5173"
  echo ""
  exit 1
fi

URL="$1"

echo ""
echo -e "${BOLD}  ======================================${NC}"
echo -e "${BOLD}  SEO Capture + Verify${NC}"
echo -e "${BOLD}  ======================================${NC}"
echo ""

# --- Step 1: Check dependencies ---
info "Checking dependencies..."

if ! command -v node &>/dev/null; then
  fail "Node.js not found. Install it from https://nodejs.org"
  exit 1
fi
ok "Node.js $(node --version)"

if ! [ -d "$PROJECT_DIR/node_modules/puppeteer" ]; then
  warn "Puppeteer not installed. Running npm install..."
  (cd "$PROJECT_DIR" && npm install)
fi
ok "Puppeteer installed"

if ! command -v python3 &>/dev/null; then
  warn "Python3 not found — skipping local preview server"
  NO_SERVER=true
else
  ok "Python3 $(python3 --version 2>&1 | awk '{print $2}')"
  NO_SERVER=false
fi

# --- Step 2: Run capture ---
echo ""
info "Running capture script..."
echo ""

node "$SCRIPT_DIR/capture-spa.mjs" "$URL" --output "$OUTPUT_FILE"
CAPTURE_EXIT=$?

if [ $CAPTURE_EXIT -ne 0 ]; then
  echo ""
  fail "Capture script exited with errors (code $CAPTURE_EXIT)"
  echo "  Review the warnings above and fix any issues before deploying."
  echo ""
  exit $CAPTURE_EXIT
fi

# --- Step 3: Start local server + open browser ---
if [ "$NO_SERVER" = false ] && [ -f "$OUTPUT_FILE" ]; then
  echo ""
  info "Starting local preview server..."

  # Find an available port
  SERVER_PORT=$(python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()")

  (cd "$OUTPUT_DIR" && python3 -m http.server "$SERVER_PORT" --bind 127.0.0.1 &>/dev/null) &
  SERVER_PID=$!
  sleep 1

  PREVIEW_URL="http://localhost:$SERVER_PORT/seo-test/"

  if kill -0 "$SERVER_PID" 2>/dev/null; then
    ok "Server running at $PREVIEW_URL"

    # Open in browser
    if [ "$(uname)" = "Darwin" ]; then
      open "$PREVIEW_URL"
    elif command -v xdg-open &>/dev/null; then
      xdg-open "$PREVIEW_URL"
    fi

    echo ""
    echo -e "  ${BOLD}Preview is open in your browser.${NC}"
    echo "  Press Enter to stop the server and exit..."
    read -r
  else
    warn "Server failed to start on port $SERVER_PORT"
  fi
fi

echo ""
ok "Done. Output is at: $OUTPUT_FILE"
echo ""
