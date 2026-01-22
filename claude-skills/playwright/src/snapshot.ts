#!/usr/bin/env tsx
/**
 * Aria snapshot of current page
 * Usage: snapshot [--file out.yaml] [--selector "body"]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";
import { writeFile } from "fs/promises";

const { flags, positional } = parseArgs(process.argv.slice(2));
const selector = (flags.selector as string) || positional[0] || "body";

await runAction(async () => {
  const page = await getPage();
  const snapshot = await page.locator(selector).ariaSnapshot();

  if (flags.file) {
    await writeFile(flags.file as string, snapshot);
    console.log(`Snapshot saved to: ${flags.file}`);
  } else {
    console.log(snapshot);
  }
});
