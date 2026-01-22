import { z } from "zod";
import { defineTool } from "../lib/tool.js";

export const getHtml = defineTool({
  name: "get_html",
  description: "Get HTML from element",
  schema: z.object({
    selector: z.string().describe("CSS selector"),
    outer: z.boolean().default(false).describe("Include outer element HTML"),
  }),
  timeout: 5000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();
    const element = await page.$(params.selector);

    if (!element) {
      throw new Error(`Element not found: ${params.selector}`);
    }

    const html = params.outer
      ? await element.evaluate((el) => el.outerHTML)
      : await element.innerHTML();

    return { html };
  },
});
