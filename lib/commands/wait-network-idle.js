#!/usr/bin/env node

import { connect } from "../cdp.js";

const DEBUG = process.env.DEBUG === "1";
const log = DEBUG ? (...args) => console.error("[debug]", ...args) : () => {};

const IGNORED_RESOURCE_TYPES = new Set(["WebSocket", "EventSource"]);

function printUsage(exitCode = 1) {
  console.log(
    "Usage: cdp-browser wait-network-idle [--timeout <ms>] [--idle-time <ms>] [--max-inflight <count>]",
  );
  console.log("\nOptions:");
  console.log("  --timeout <ms>         Max time to wait before failing (default: 30000)");
  console.log("  --idle-time <ms>       Required continuous idle period (default: 1000)");
  console.log("  --max-inflight <count> Allowed in-flight requests during idle (default: 0)");
  console.log("\nExamples:");
  console.log("  cdp-browser wait-network-idle");
  console.log("  cdp-browser wait-network-idle --timeout 45000 --idle-time 1500");
  console.log("  cdp-browser wait-network-idle --max-inflight 1");
  process.exit(exitCode);
}

function parsePositiveInteger(value, optionName) {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${optionName} must be a non-negative integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${optionName} must be a safe integer`);
  }
  return parsed;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let timeout = 30_000;
  let idleTime = 1_000;
  let maxInflight = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--help") {
      printUsage(0);
    }

    if (arg === "--timeout") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--timeout requires a value");
      }
      timeout = parsePositiveInteger(value, "--timeout");
      i += 1;
      continue;
    }

    if (arg.startsWith("--timeout=")) {
      const value = arg.slice("--timeout=".length);
      if (!value) {
        throw new Error("--timeout requires a value");
      }
      timeout = parsePositiveInteger(value, "--timeout");
      continue;
    }

    if (arg === "--idle-time") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--idle-time requires a value");
      }
      idleTime = parsePositiveInteger(value, "--idle-time");
      i += 1;
      continue;
    }

    if (arg.startsWith("--idle-time=")) {
      const value = arg.slice("--idle-time=".length);
      if (!value) {
        throw new Error("--idle-time requires a value");
      }
      idleTime = parsePositiveInteger(value, "--idle-time");
      continue;
    }

    if (arg === "--max-inflight") {
      const value = args[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--max-inflight requires a value");
      }
      maxInflight = parsePositiveInteger(value, "--max-inflight");
      i += 1;
      continue;
    }

    if (arg.startsWith("--max-inflight=")) {
      const value = arg.slice("--max-inflight=".length);
      if (!value) {
        throw new Error("--max-inflight requires a value");
      }
      maxInflight = parsePositiveInteger(value, "--max-inflight");
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  if (timeout <= 0) {
    throw new Error("--timeout must be greater than 0");
  }

  if (idleTime <= 0) {
    throw new Error("--idle-time must be greater than 0");
  }

  return {
    timeout,
    idleTime,
    maxInflight,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let options;
try {
  options = parseArgs();
} catch (e) {
  console.error(`✗ ${e.message}`);
  printUsage(1);
}

const { timeout, idleTime, maxInflight } = options;

const globalTimeout = setTimeout(() => {
  console.error(`✗ Timed out waiting for network idle after ${timeout}ms`);
  process.exit(1);
}, timeout + 5_000);

let cdp;
let exitCode = 0;

try {
  log("connecting...");
  cdp = await connect(5000);

  log("getting pages...");
  const pages = await cdp.getPages();
  const page = pages.at(-1);

  if (!page) {
    throw new Error("No active tab found");
  }

  log("attaching to page...");
  const sessionId = await cdp.attachToPage(page.targetId);

  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);

  const inflightRequests = new Set();

  let idleSince = Date.now();
  const startedAt = Date.now();

  const removeRequest = (requestId) => {
    if (!requestId) return;
    inflightRequests.delete(requestId);
    log("request completed", requestId, "inflight", inflightRequests.size);
  };

  const onRequestWillBeSent = (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    const requestId = params.requestId;
    if (!requestId) return;

    const resourceType = params.type || null;

    if (resourceType && IGNORED_RESOURCE_TYPES.has(resourceType)) {
      log("ignoring request", requestId, resourceType);
      return;
    }

    inflightRequests.add(requestId);
    idleSince = null;
    log("request started", requestId, resourceType || "unknown", "inflight", inflightRequests.size);
  };

  const onLoadingFinished = (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    removeRequest(params.requestId);
  };

  const onLoadingFailed = (params, eventSessionId) => {
    if (eventSessionId !== sessionId) return;
    removeRequest(params.requestId);
  };

  const offRequestWillBeSent = cdp.on("Network.requestWillBeSent", onRequestWillBeSent);
  const offLoadingFinished = cdp.on("Network.loadingFinished", onLoadingFinished);
  const offLoadingFailed = cdp.on("Network.loadingFailed", onLoadingFailed);

  try {
    let reachedIdle = false;

    while (Date.now() - startedAt < timeout) {
      if (inflightRequests.size <= maxInflight) {
        if (idleSince === null) {
          idleSince = Date.now();
        }

        if (Date.now() - idleSince >= idleTime) {
          const waitedMs = Date.now() - startedAt;
          console.log(
            `✓ Network idle after ${waitedMs}ms (in-flight: ${inflightRequests.size}, idle-time: ${idleTime}ms)`,
          );
          reachedIdle = true;
          break;
        }
      } else {
        idleSince = null;
      }

      await sleep(100);
    }

    if (!reachedIdle) {
      throw new Error(`Timed out waiting for network idle after ${timeout}ms (in-flight: ${inflightRequests.size})`);
    }
  } finally {
    offRequestWillBeSent();
    offLoadingFinished();
    offLoadingFailed();
  }
} catch (e) {
  console.error("✗", e.message);
  exitCode = 1;
} finally {
  clearTimeout(globalTimeout);
  cdp?.close();
  setTimeout(() => process.exit(exitCode), 100);
}
