#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync } from "node:fs";
import { homedir, platform } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getUserDataDir } from "../paths.js";

function printUsage(exitCode = 1) {
  console.log("Usage: cdp-browser start [--headless] [--fresh] [--copy-profile [name]] [--browser <path-or-name>]");
  console.log("\nOptions:");
  console.log("  --headless                Run without a graphical display");
  console.log("  --fresh                   Clear managed browser data before start");
  console.log("  --copy-profile [name]     Copy local browser profile into managed data");
  console.log("                            Defaults to CDP_BROWSER_PROFILE or 'Default'");
  console.log("  --browser <path-or-name>  Override browser executable for this run");
  console.log("\nEnvironment:");
  console.log("  CDP_BROWSER_BIN           Override browser executable (fallback)");
  console.log("  CDP_BROWSER_PROFILE       Profile directory name (for launch/default copy)");
  console.log("  CDP_BROWSER_BASE_DIR      Override managed base directory");
  console.log("\nExamples:");
  console.log("  cdp-browser start");
  console.log("  cdp-browser start --fresh");
  console.log("  cdp-browser start --copy-profile");
  console.log("  cdp-browser start --copy-profile 'Profile 1'");
  console.log("  cdp-browser start --browser chromium --copy-profile Default");
  process.exit(exitCode);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let fresh = false;
  let headless = false;
  let copyProfile = false;
  let copyProfileName = null;
  let browserOverride = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help") {
      printUsage(0);
    }

    if (arg === "--headless") {
      headless = true;
      continue;
    }

    if (arg === "--fresh") {
      fresh = true;
      continue;
    }

    if (arg === "--copy-profile") {
      copyProfile = true;
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        copyProfileName = next;
        i += 1;
      }
      continue;
    }

    if (arg.startsWith("--copy-profile=")) {
      copyProfile = true;
      const value = arg.slice("--copy-profile=".length);
      if (!value) {
        console.error("✗ --copy-profile requires a non-empty value when using --copy-profile=<value>");
        printUsage(1);
      }
      copyProfileName = value;
      continue;
    }

    if (arg === "--browser") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        console.error("✗ --browser requires a value");
        printUsage(1);
      }
      browserOverride = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--browser=")) {
      const value = arg.slice("--browser=".length);
      if (!value) {
        console.error("✗ --browser requires a non-empty value when using --browser=<value>");
        printUsage(1);
      }
      browserOverride = value;
      continue;
    }

    console.error(`✗ Unknown option: ${arg}`);
    printUsage(1);
  }

  return {
    headless,
    fresh,
    copyProfile,
    copyProfileName,
    browserOverride,
  };
}

function commandExists(command) {
  const result = spawnSync("which", [command], { stdio: "ignore" });
  return result.status === 0;
}

function resolveBrowserExecutable(candidate) {
  if (!candidate) return null;

  if (candidate.includes("/") || candidate.startsWith(".")) {
    return existsSync(candidate) ? candidate : null;
  }

  if (commandExists(candidate)) {
    return candidate;
  }

  return null;
}

function findBrowserExecutable(browserCandidate = null) {
  if (browserCandidate) {
    return resolveBrowserExecutable(browserCandidate);
  }

  const configured = process.env["CDP_BROWSER_BIN"];
  if (configured) {
    return resolveBrowserExecutable(configured);
  }

  const candidates = [];

  if (platform() === "darwin") {
    candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    candidates.push("/Applications/Chromium.app/Contents/MacOS/Chromium");
  }

  candidates.push(
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "chrome",
  );

  for (const candidate of candidates) {
    const resolved = resolveBrowserExecutable(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function findProfileSourceDir() {
  const home = homedir();

  const candidates = platform() === "darwin"
    ? [
        join(home, "Library", "Application Support", "Google", "Chrome"),
        join(home, "Library", "Application Support", "Chromium"),
      ]
    : [
        join(home, ".config", "google-chrome"),
        join(home, ".config", "chromium"),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function listAvailableProfiles(rootDir) {
  if (!rootDir || !existsSync(rootDir)) return [];

  try {
    return readdirSync(rootDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name === "Default" || name.startsWith("Profile "))
      .sort();
  } catch {
    return [];
  }
}

const {
  headless,
  fresh,
  copyProfile,
  copyProfileName,
  browserOverride,
} = parseArgs();

const configuredProfile = process.env["CDP_BROWSER_PROFILE"]?.trim();
const launchProfileName = copyProfileName || configuredProfile || "Default";

const browserExecutable = findBrowserExecutable(browserOverride);
if (!browserExecutable) {
  if (browserOverride) {
    console.error(`✗ Could not find browser executable from --browser: ${browserOverride}`);
  } else if (process.env["CDP_BROWSER_BIN"]) {
    console.error(`✗ Could not find browser executable from CDP_BROWSER_BIN: ${process.env["CDP_BROWSER_BIN"]}`);
  } else {
    console.error("✗ Could not find Chrome/Chromium executable");
    console.error("  Install Google Chrome/Chromium, pass --browser, or set CDP_BROWSER_BIN");
  }
  process.exit(1);
}

const userDataDir = getUserDataDir();

if (fresh) {
  rmSync(userDataDir, { recursive: true, force: true });
}

mkdirSync(userDataDir, { recursive: true });

if (copyProfile) {
  const sourceProfileRoot = findProfileSourceDir();
  if (!sourceProfileRoot) {
    console.error("✗ Could not find a local Chrome/Chromium profile directory to copy from");
    console.error("  Expected one of:");
    console.error(`  - ${join(homedir(), "Library", "Application Support", "Google", "Chrome")}`);
    console.error(`  - ${join(homedir(), "Library", "Application Support", "Chromium")}`);
    console.error(`  - ${join(homedir(), ".config", "google-chrome")}`);
    console.error(`  - ${join(homedir(), ".config", "chromium")}`);
    process.exit(1);
  }

  const sourceProfileDir = join(sourceProfileRoot, launchProfileName);
  if (!existsSync(sourceProfileDir)) {
    console.error(`✗ Profile '${launchProfileName}' not found in ${sourceProfileRoot}`);
    const available = listAvailableProfiles(sourceProfileRoot);
    if (available.length > 0) {
      console.error(`  Available profiles: ${available.join(", ")}`);
    }
    process.exit(1);
  }

  rmSync(userDataDir, { recursive: true, force: true });
  cpSync(sourceProfileRoot, userDataDir, { recursive: true });
}

// Start browser in background (detached so Node can exit).
spawn(
  browserExecutable,
  [
    ...(headless ? ["--headless=new"] : []),
    "--remote-debugging-port=9222",
    `--user-data-dir=${userDataDir}`,
    `--profile-directory=${launchProfileName}`,
    "--disable-search-engine-choice-screen",
    "--no-first-run",
    "--disable-features=ProfilePicker",
  ],
  { detached: true, stdio: "ignore" },
).unref();

// Wait for browser to be ready by checking the debugging endpoint.
let connected = false;
for (let i = 0; i < 30; i++) {
  try {
    const response = await fetch("http://localhost:9222/json/version");
    if (response.ok) {
      connected = true;
      break;
    }
  } catch {
    await new Promise((r) => setTimeout(r, 500));
  }
}

if (!connected) {
  console.error("✗ Failed to connect to browser on :9222");
  process.exit(1);
}

// Start background watcher for logs/network (detached).
const scriptDir = dirname(fileURLToPath(import.meta.url));
const watcherPath = join(scriptDir, "watch.js");
spawn(process.execPath, [watcherPath], { detached: true, stdio: "ignore" }).unref();

const details = [];
if (headless) details.push("headless");
if (fresh) details.push("fresh");
if (copyProfile) details.push(`copied profile ${JSON.stringify(launchProfileName)}`);
if (!copyProfile && launchProfileName !== "Default") {
  details.push(`profile ${JSON.stringify(launchProfileName)}`);
}

console.log(
  `✓ ${basename(browserExecutable)} started on :9222${details.length > 0 ? ` (${details.join(", ")})` : ""}`,
);
