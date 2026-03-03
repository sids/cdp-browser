---
name: cdp-browser
description: Drive Chrome/Chromium through CDP for navigation, extraction, screenshots, and console/network diagnostics.
compatibility: Requires Chrome/Chromium installed and CDP endpoint access on localhost:9222.
metadata:
  mode: npx
---

# cdp-browser skill

Install this file in your repo as `.agents/skills/cdp-browser/SKILL.md`.

Use this skill when a task needs real-browser execution rather than static HTTP fetching.

## Quick workflow

```bash
npx -y cdp-browser start
npx -y cdp-browser nav https://example.com --new
npx -y cdp-browser wait-network-idle
npx -y cdp-browser dismiss-cookies
npx -y cdp-browser eval "document.title"
npx -y cdp-browser screenshot
npx -y cdp-browser watch
npx -y cdp-browser logs-tail --follow
npx -y cdp-browser net-summary
```

## Optional version pinning

```bash
npx -y cdp-browser@0.1.2 nav https://example.com
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
