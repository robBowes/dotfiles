#!/usr/bin/env tsx
/**
 * Export page as PDF
 * Usage: pdf [path] [--format A4|Letter] [--landscape]
 */
import { getPage, parseArgs } from "./lib/browser.js";
import { runAction } from "./lib/run-action.js";

const { positional, flags } = parseArgs(process.argv.slice(2));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const defaultPath = `./page-${timestamp}.pdf`;
const path = positional[0] || defaultPath;

const format = (flags.format as "A4" | "Letter") || "A4";
const landscape = flags.landscape === true;

await runAction(
  async () => {
    const page = await getPage();
    await page.pdf({
      path,
      format,
      landscape,
      printBackground: true,
    });
    console.log(`PDF saved: ${path}`);
    console.log(`Format: ${format}${landscape ? " (landscape)" : ""}`);
  },
  {
    onError: (e) => {
      if (e.message?.includes("PrintToPDF")) {
        console.error("PDF export requires headless mode");
        console.error("Relaunch with: launch --headless");
        return true;
      }
      return false;
    },
  }
);
