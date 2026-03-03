---
name: cdp-browser
description: Control Chrome/Chromium via CDP when cdp-browser is installed as a dependency and invoked with npm exec cdp-browser. Use for navigation, evaluation, screenshots, element picking, and logging.
compatibility: Requires Node.js 22+, Chrome/Chromium installed, and CDP endpoint access on localhost:9222.
metadata:
  mode: npm
---

# cdp-browser skill (project dependency pattern, npm)

Install this file in your repo as `.agents/skills/cdp-browser/SKILL.md`.

Use this skill when a task requires controlling a real browser tab from terminal commands using CDP.

## Use this usage pattern when

- `cdp-browser` is installed as a project dependency
- Project runs browser commands with: `npm exec cdp-browser -- ...`

## Setup expectations

Project `package.json` should contain:

```json
{
  "dependencies": {
    "cdp-browser": "^0.1.1"
  }
}
```

Chrome/Chromium must be installed. `cdp-browser start` configures CDP on port `9222` automatically.

## Optional: install this skill via symlink

If `cdp-browser` is installed in the repo, symlink this file instead of copying:

```bash
mkdir -p .agents/skills/cdp-browser
ln -sf "$(pwd)/node_modules/cdp-browser/skills/project/npm/cdp-browser/SKILL.md" \
  ".agents/skills/cdp-browser/SKILL.md"
```

## Agent command workflow

```bash
npm exec cdp-browser -- start
npm exec cdp-browser -- nav https://example.com --new
npm exec cdp-browser -- wait-network-idle
npm exec cdp-browser -- dismiss-cookies
npm exec cdp-browser -- eval "document.title"
npm exec cdp-browser -- screenshot
npm exec cdp-browser -- watch
npm exec cdp-browser -- logs-tail --follow
npm exec cdp-browser -- net-summary
```

## Command reference

- `start [--fresh] [--copy-profile [name]] [--browser <path-or-name>]`
- `nav <url> [--new]`
- `eval '<expression>'`
- `screenshot`
- `pick '<message>'`
- `dismiss-cookies [--reject]`
- `watch`
- `logs-tail [--file <path>] [--follow]`
- `net-summary [--file <path>]`
- `wait-network-idle [--timeout <ms>] [--idle-time <ms>] [--max-inflight <count>]`

## Guidance

- Prefer `eval` for deterministic extraction.
- Use `pick` when selectors are unknown and interactive selection is acceptable.
- Use `dismiss-cookies` early on sites with CMP overlays.
- If browser autodetection fails, run start with `--browser <path-or-name>`.
- Use `--fresh` for a clean managed browser session.
- Use `--copy-profile [name]` to bootstrap logged-in state; set `CDP_BROWSER_PROFILE` to choose the default profile name.
- Override managed paths with `CDP_BROWSER_BASE_DIR` when needed.
- If connection fails, check `http://localhost:9222/json/version`.
- Report output paths explicitly (for example screenshot file path).
