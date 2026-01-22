#!/usr/bin/env tsx
/**
 * Close running browser
 * Usage: close
 */
import { loadCDPEndpoint, removeCDPEndpoint, getBrowser, BrowserNotRunningError } from "./lib/browser.js";

const info = await loadCDPEndpoint();

if (!info) {
  console.log("No browser running");
  process.exit(0);
}

try {
  const browser = await getBrowser();
  await browser.close();
  console.log(`Browser closed (PID ${info.pid})`);
} catch (e) {
  if (e instanceof BrowserNotRunningError) {
    // Browser already dead, just cleanup
    console.log("Browser process already stopped");
  } else {
    // Try to kill the process directly
    try {
      process.kill(info.pid, "SIGTERM");
      console.log(`Sent SIGTERM to PID ${info.pid}`);
    } catch {
      console.log("Browser process not found");
    }
  }
}

await removeCDPEndpoint();
