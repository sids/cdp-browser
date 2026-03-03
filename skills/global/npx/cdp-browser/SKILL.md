---
name: cdp-browser
description: Control Chrome/Chromium via CDP using npx when no dependency should be added to the repository. Use for navigation, evaluation, screenshots, element picking, and logging.
compatibility: Requires Node.js 22+, internet access for package resolution when not cached, Chrome/Chromium installed, and CDP endpoint access on localhost:9222.
metadata:
  mode: npx
---

# cdp-browser skill (global pattern, npx)

Install this file in your repo as `.agents/skills/cdp-browser/SKILL.md`.

Use this skill when a task requires controlling a real browser tab from terminal commands using CDP, and the repo does not want to add `cdp-browser` as a dependency.

## Use this usage pattern when

- commands are run via `npx`
- no persistent dependency is required

## Runtime expectations

- Node.js 22+
- Chrome/Chromium installed
- CDP endpoint on `http://localhost:9222` (use `npx -y cdp-browser start` to set this up)

## Agent command workflow

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

## Version pinning (recommended for reproducibility)

```bash
npx -y cdp-browser@0.1.1 nav https://example.com
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
- If browser autodetection fails, run start with `--browser <path-or-name>`.
- Use `--fresh` for a clean managed browser session.
- Use `--copy-profile [name]` to bootstrap logged-in state; set `CDP_BROWSER_PROFILE` to choose the default profile name.
- Override managed paths with `CDP_BROWSER_BASE_DIR` when needed.
- If connection fails, check `http://localhost:9222/json/version`.
- Report output paths explicitly (for example screenshot file path).
