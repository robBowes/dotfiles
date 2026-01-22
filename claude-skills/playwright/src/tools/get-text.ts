import { z } from "zod";
import { defineTool } from "../lib/tool.js";

export const getText = defineTool({
  name: "get_text",
  description: "Get text content from element",
  schema: z.object({
    selector: z.string().describe("CSS selector"),
    all: z.boolean().default(false).describe("Get text from all matching elements"),
  }),
  timeout: 5000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();

    if (params.all) {
      const elements = await page.$$(params.selector);
      const texts = await Promise.all(elements.map((el) => el.textContent()));
      const cleaned = texts.map((t) => t?.trim() || "").filter(Boolean);
      return { texts: cleaned };
    }

    const element = await page.$(params.selector);
    if (!element) {
      throw new Error(`Element not found: ${params.selector}`);
    }
    const text = await element.textContent();
    return { text: text?.trim() || "" };
  },
});
