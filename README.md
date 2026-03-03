# cdp-browser

`cdp-browser` is a lightweight Chrome DevTools Protocol (CDP) CLI for coding agents.

It provides simple terminal commands to control a browser tab without Puppeteer:
- navigate tabs
- run JavaScript
- take screenshots
- pick elements interactively
- dismiss cookie banners
- watch console + network logs

## Acknowledgement

This package is based on the web-browser skill from:
https://github.com/mitsuhiko/agent-stuff/tree/main/skills/web-browser

This implementation uses native WebSocket support (Node 22+/Bun), with no `ws` dependency.

## Requirements

- One runtime:
  - Node.js **22+** (for npm/npx usage), or
  - Bun (for bun/bunx usage)
- Google Chrome / Chromium installed
- CDP endpoint available on `http://localhost:9222`
  - `cdp-browser start` configures this automatically
  - if you launch the browser manually, pass `--remote-debugging-port=9222`
- `cdp-browser start` supports:
  - macOS (app bundle paths)
  - Debian/Ubuntu-style Linux setups (`google-chrome*` / `chromium*` on PATH)
  - custom executable via `--browser <path-or-name>` (or `CDP_BROWSER_BIN`)
  - profile selection via `--copy-profile [name]` and `CDP_BROWSER_PROFILE`
  - base directory override via `CDP_BROWSER_BASE_DIR`

## Usage patterns

### Project dependency usage pattern (recommended for reproducibility)

Install as a project dependency, then run from your package manager.

**npm**

```bash
npm install cdp-browser
npm exec cdp-browser -- start
npm exec cdp-browser -- nav https://example.com --new
npm exec cdp-browser -- eval "document.title"
npm exec cdp-browser -- screenshot
```

**bun**

```bash
bun add cdp-browser
bun run cdp-browser start
bun run cdp-browser nav https://example.com --new
bun run cdp-browser eval "document.title"
bun run cdp-browser screenshot
```

#### Skill installation for project dependency pattern

Install exactly one skill file as `.agents/skills/cdp-browser/SKILL.md`.

**npm variant (symlink from dependency):**

```bash
mkdir -p .agents/skills/cdp-browser
ln -sf "$(pwd)/node_modules/cdp-browser/skills/project/npm/cdp-browser/SKILL.md" \
  ".agents/skills/cdp-browser/SKILL.md"
```

**bun variant (symlink from dependency):**

```bash
mkdir -p .agents/skills/cdp-browser
ln -sf "$(pwd)/node_modules/cdp-browser/skills/project/bun/cdp-browser/SKILL.md" \
  ".agents/skills/cdp-browser/SKILL.md"
```

### Global usage pattern

Run the package directly without adding a dependency.

**npx**

```bash
npx -y cdp-browser start
npx -y cdp-browser nav https://example.com --new
npx -y cdp-browser eval "document.title"
```

Pin a version when needed:

```bash
npx -y cdp-browser@0.1.2 nav https://example.com
```

**bunx**

```bash
bunx cdp-browser start
bunx cdp-browser nav https://example.com --new
bunx cdp-browser eval "document.title"
```

Pin a version when needed:

```bash
bunx cdp-browser@0.1.2 nav https://example.com
```

#### Skill installation for global pattern

Install exactly one skill file as `.agents/skills/cdp-browser/SKILL.md`.

Option A: install with Skills CLI

```bash
npx -y skills add sids/cdp-browser/skills/global/npx/cdp-browser -g
# or
bunx skills add sids/cdp-browser/skills/global/bunx/cdp-browser -g
```

Option B: copy one of the global skill variants manually:

```bash
mkdir -p .agents/skills/cdp-browser
cp ./skills/global/npx/cdp-browser/SKILL.md .agents/skills/cdp-browser/SKILL.md
# or
cp ./skills/global/bunx/cdp-browser/SKILL.md .agents/skills/cdp-browser/SKILL.md
```

## Commands

- `cdp-browser start [--fresh] [--copy-profile [name]] [--browser <path-or-name>]`  
  Start Chrome/Chromium with remote debugging on port `9222` and start background watch logging.
- `cdp-browser nav <url> [--new]`  
  Navigate current tab or open a new tab.
- `cdp-browser eval '<js expression>'`  
  Evaluate JavaScript in the active tab.
- `cdp-browser screenshot`  
  Capture current viewport and print output PNG path.
- `cdp-browser pick '<message>'`  
  Interactive element picker with metadata output.
- `cdp-browser dismiss-cookies [--reject]`  
  Try to accept/reject cookie banners across common CMP implementations.
- `cdp-browser watch`  
  Start background logger for console/network events.
- `cdp-browser logs-tail [--file <path>] [--follow]`  
  Tail latest watcher log file.
- `cdp-browser net-summary [--file <path>]`  
  Summarize network statuses and failures from logs.
- `cdp-browser wait-network-idle [--timeout <ms>] [--idle-time <ms>] [--max-inflight <count>]`  
  Wait until active tab requests stay at or below the in-flight threshold for the idle window.

`start` option behavior:
- `--fresh`: clears the managed browser data directory before launching.
- `--copy-profile [name]`: copies your local browser profile store into managed data before launch.
  - if `name` is omitted, profile defaults to `CDP_BROWSER_PROFILE` or `Default`.
- `CDP_BROWSER_PROFILE`: sets the profile directory used for launch (for example `Default`, `Profile 1`).
- `CDP_BROWSER_BASE_DIR`: overrides managed base directory for both browser data and watcher logs.

Managed defaults (macOS + Linux):
- browser data: `${XDG_DATA_HOME:-~/.local/share}/cdp-browser/browser-data`
- watcher logs: `${XDG_STATE_HOME:-~/.local/state}/cdp-browser/logs/YYYY-MM-DD/*.jsonl`

When `CDP_BROWSER_BASE_DIR` is set:
- browser data: `${CDP_BROWSER_BASE_DIR}/browser-data`
- watcher logs: `${CDP_BROWSER_BASE_DIR}/logs/YYYY-MM-DD/*.jsonl`

Examples:
- `npm exec cdp-browser -- start --fresh`
- `npm exec cdp-browser -- start --copy-profile`
- `npm exec cdp-browser -- start --copy-profile "Profile 1"`
- `CDP_BROWSER_PROFILE="Profile 1" npm exec cdp-browser -- start --copy-profile`
- `CDP_BROWSER_BASE_DIR=/tmp/cdp-browser npm exec cdp-browser -- start --fresh`
- `CDP_BROWSER_BASE_DIR=/tmp/cdp-browser npm exec cdp-browser -- watch`
- `npm exec cdp-browser -- wait-network-idle --timeout 45000 --idle-time 1500`

## Logs

Watcher output is written to:

```text
${XDG_STATE_HOME:-~/.local/state}/cdp-browser/logs/YYYY-MM-DD/*.jsonl
```

Override with:

```bash
CDP_BROWSER_BASE_DIR=/custom/cdp-browser
```

Then logs are written under:

```text
${CDP_BROWSER_BASE_DIR}/logs/YYYY-MM-DD/*.jsonl
```

## Publish

```bash
npm run publish:npm
```

To verify package contents first:

```bash
npm run pack:dry-run
```
