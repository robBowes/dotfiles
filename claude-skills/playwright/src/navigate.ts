#!/usr/bin/env tsx
/**
 * Navigate to URL
 * Usage: navigate <url> [--wait networkidle|load|domcontentloaded] [--timeout 30000]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const url = positional[0];
if (!url) {
  console.error("Usage: navigate <url> [--wait networkidle|load] [--timeout ms]");
  process.exit(1);
}

const waitUntil = (flags.wait as string) || "networkidle";
const timeout = flags.timeout ? parseInt(flags.timeout as string, 10) : 30000;

await runAction(async () => {
  const page = await getPage();
  await page.goto(url, {
    waitUntil: waitUntil as "networkidle" | "load" | "domcontentloaded",
    timeout,
  });

  const title = await page.title();
  console.log(`Navigated to: ${url}`);
  console.log(`Title: ${title}`);
});
