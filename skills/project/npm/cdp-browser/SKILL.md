---
name: cdp-browser
description: Drive Chrome/Chromium through CDP for navigation, extraction, screenshots, and console/network diagnostics.
compatibility: Requires Chrome/Chromium installed and CDP endpoint access on localhost:9222.
metadata:
  mode: npm
---

# cdp-browser skill

Install this file in your repo as `.agents/skills/cdp-browser/SKILL.md`.

Use this skill when a task needs real-browser execution rather than static HTTP fetching.

## Quick workflow

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

## Default operating pattern

1. Start a managed browser session.
2. Navigate to the target page and wait for network idle.
3. Remove overlays when needed (`dismiss-cookies`).
4. Extract data with `eval`; use `pick` when selector discovery is needed.
5. Capture artifacts (`screenshot`, `logs-tail`, `net-summary`) when requested.
6. Return results with all generated file paths.

## Commands

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

## Response expectations

- Include exact paths for any generated artifacts.
- Include the failing command and concise stderr when a command errors.
- Keep extraction steps deterministic and reproducible.

## Troubleshooting

- If connection fails, verify `http://localhost:9222/json/version`.
- If browser detection fails, run `start --browser <path-or-name>`.
- Use `--fresh` for a clean session.
- Use `--copy-profile [name]` for logged-in state.
- Use `CDP_BROWSER_BASE_DIR` to control managed data paths.
