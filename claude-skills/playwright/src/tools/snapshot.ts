import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { writeFile } from "fs/promises";

export const snapshot = defineTool({
  name: "snapshot",
  description: "Get aria snapshot of page (clean accessibility tree)",
  schema: z.object({
    selector: z.string().default("body").describe("Selector to snapshot"),
    file: z.string().optional().describe("Save to file instead of returning"),
  }),
  timeout: 10000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const snap = await page.locator(params.selector).ariaSnapshot();

    if (params.file) {
      await writeFile(params.file, snap);
      return { saved: params.file };
    }

    return { snapshot: snap };
  },
});
