import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const commands = {
  start: "commands/start.js",
  nav: "commands/nav.js",
  eval: "commands/eval.js",
  screenshot: "commands/screenshot.js",
  pick: "commands/pick.js",
  "dismiss-cookies": "commands/dismiss-cookies.js",
  watch: "commands/watch.js",
  "logs-tail": "commands/logs-tail.js",
  "net-summary": "commands/net-summary.js",
  "wait-network-idle": "commands/wait-network-idle.js",
};

export async function run() {
  const subcommand = process.argv[2];

  if (!subcommand || subcommand === "--help" || !commands[subcommand]) {
    console.log("Usage: cdp-browser <command> [args...]");
    console.log("\nRun with:");
    console.log("  npm exec cdp-browser -- <command> [args...]");
    console.log("  npx cdp-browser <command> [args...]");
    console.log("  bun run cdp-browser <command> [args...]");
    console.log("  bunx cdp-browser <command> [args...]");
    console.log("  node bin/browser.js <command> [args...]");
    console.log("\nCommands:");
    console.log("  start [--fresh] [--copy-profile [name]] [--browser <path-or-name>]  Start Chrome/Chromium with remote debugging");
    console.log("  nav <url> [--new]  Navigate current tab or open new tab");
    console.log("  eval '<code>'      Evaluate JavaScript in active tab");
    console.log("  screenshot         Screenshot current viewport");
    console.log("  pick '<message>'   Interactive element picker");
    console.log("  dismiss-cookies    Dismiss cookie consent dialogs");
    console.log("  watch              Start background console/network logger");
    console.log("  logs-tail          Tail latest log file");
    console.log("  net-summary        Summarize network responses");
    console.log("  wait-network-idle  Wait until active tab network requests go idle");
    process.exit(!subcommand || subcommand === "--help" ? 0 : 1);
  }

  // Remove the sub-command from argv so the script sees the right positions
  process.argv.splice(2, 1);

  const scriptDir = dirname(fileURLToPath(import.meta.url));
  await import(join(scriptDir, commands[subcommand]));
}
