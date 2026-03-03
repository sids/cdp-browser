---
name: cdp-browser
description: Install the cdp-browser skill variant that matches your command prefix so agents can drive Chrome/Chromium via CDP.
---

# cdp-browser skills

This package includes multiple variants of the same skill. Install exactly one variant as:

`.agents/skills/cdp-browser/SKILL.md`

## Variant selection guide

- `npm exec cdp-browser -- ...` → `skills/project/npm/cdp-browser/SKILL.md`
- `bun run cdp-browser ...` → `skills/project/bun/cdp-browser/SKILL.md`
- `npx -y cdp-browser ...` → `skills/global/npx/cdp-browser/SKILL.md`
- `bunx cdp-browser ...` → `skills/global/bunx/cdp-browser/SKILL.md`

## Installation

If `cdp-browser` is available in your repository, symlink the chosen variant:

```bash
mkdir -p .agents/skills/cdp-browser
ln -sf "$(pwd)/node_modules/cdp-browser/skills/project/npm/cdp-browser/SKILL.md" \
  ".agents/skills/cdp-browser/SKILL.md"
```

Replace the source path with the variant you selected.
