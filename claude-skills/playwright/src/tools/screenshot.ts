import { z } from "zod";
import { defineTool } from "../lib/tool.js";

export const screenshot = defineTool({
  name: "screenshot",
  description: "Capture screenshot of page",
  schema: z.object({
    path: z.string().optional().describe("File path (defaults to timestamp)"),
    fullPage: z.boolean().default(false).describe("Capture full page"),
    selector: z.string().optional().describe("Capture specific element"),
    type: z.enum(["png", "jpeg"]).default("png").describe("Image format"),
  }),
  timeout: 10000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const ext = params.type === "jpeg" ? "jpg" : "png";
    const path = params.path || `./screenshot-${timestamp}.${ext}`;

    if (params.selector) {
      const element = await page.$(params.selector);
      if (!element) {
        throw new Error(`Element not found: ${params.selector}`);
      }
      await element.screenshot({ path, type: params.type });
      return { path, selector: params.selector };
    }

    await page.screenshot({ path, fullPage: params.fullPage, type: params.type });
    return { path, fullPage: params.fullPage };
  },
});
