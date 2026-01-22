#!/usr/bin/env tsx
/**
 * Launch headed browser with CDP, save endpoint for other scripts
 * Usage: launch [--headless] [--devtools] [--fg]
 *
 * Runs in background by default. Use --fg to run in foreground (for debugging).
 */
import { chromium } from "playwright";
import { spawn } from "child_process";
import { parseArgs, saveCDPEndpoint, removeCDPEndpoint, loadCDPEndpoint } from "./lib/browser.js";
import { join } from "path";

const CDP_PORT = 9222;

const { flags } = parseArgs(process.argv.slice(2));
const headless = flags.headless === true;
const devtools = flags.devtools === true;
const foreground = flags.fg === true; // Default is background

// Default: spawn detached child using nohup + shell
if (!foreground) {
  const scriptPath = new URL(import.meta.url).pathname;
  const scriptDir = join(scriptPath, "..");
  const args = process.argv.slice(2).join(" ") + " --fg";
  const cmd = `cd "${scriptDir}" && nohup tsx "${scriptPath}" ${args} > /dev/null 2>&1 &`;

  spawn("sh", ["-c", cmd], {
    detached: true,
    stdio: "ignore",
  }).unref();

  // Wait for CDP file to be created
  await new Promise(r => setTimeout(r, 3000));
  const info = await loadCDPEndpoint();
  if (info) {
    console.log(`Browser launched in background (PID ${info.pid})`);
    console.log(`CDP: ${info.wsEndpoint}`);
  } else {
    console.log("Browser starting in background...");
  }
  process.exit(0);
}

// Check if browser already running
const existing = await loadCDPEndpoint();
if (existing) {
  console.log(`Browser already running (PID ${existing.pid})`);
  console.log(`Endpoint: ${existing.wsEndpoint}`);
  process.exit(0);
}

// Launch browser with CDP (context/storage handled by pw commands)
const browser = await chromium.launch({
  headless,
  handleSIGINT: false,
  handleSIGTERM: false,
  handleSIGHUP: false,
  args: [
    `--remote-debugging-port=${CDP_PORT}`,
    ...(devtools ? ["--auto-open-devtools-for-tabs"] : []),
  ],
});

const wsEndpoint = `http://localhost:${CDP_PORT}`;
await saveCDPEndpoint(wsEndpoint, process.pid);

console.log(`Browser launched (${headless ? "headless" : "headed"})`);
console.log(`PID: ${process.pid}`);
console.log(`CDP: ${wsEndpoint}`);

// Note: Context/page creation handled by pw commands (they load storage from caller's cwd)
browser.on("disconnected", async () => {
  console.log("Browser closed");
  await removeCDPEndpoint();
  process.exit(0);
});

// Handle signals
process.on("SIGINT", async () => {
  console.log("\nClosing browser...");
  await browser.close();
  await removeCDPEndpoint();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await browser.close();
  await removeCDPEndpoint();
  process.exit(0);
});

// Keep alive until browser disconnects or signal received
await new Promise(() => {});
