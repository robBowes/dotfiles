#!/usr/bin/env tsx
/**
 * Capture screenshot of page
 * Usage: screenshot [path] [--fullpage] [--selector <sel>] [--type png|jpeg]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const defaultPath = `./screenshot-${timestamp}.png`;
const path = positional[0] || defaultPath;

const fullPage = flags.fullpage === true;
const selector = flags.selector as string | undefined;
const type = (flags.type as "png" | "jpeg") || "png";

await runAction(async () => {
  const page = await getPage();

  if (selector) {
    const element = await page.$(selector);
    if (!element) {
      console.error(`Element not found: ${selector}`);
      process.exit(1);
    }
    await element.screenshot({ path, type });
    console.log(`Screenshot (element): ${path}`);
  } else {
    await page.screenshot({ path, fullPage, type });
    console.log(`Screenshot${fullPage ? " (fullpage)" : ""}: ${path}`);
  }
});
