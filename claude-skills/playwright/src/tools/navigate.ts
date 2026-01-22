import { z } from "zod";
import { defineTool } from "../lib/tool.js";
import { waitForCompletion } from "../lib/timeout.js";

export const navigate = defineTool({
  name: "navigate",
  description: "Navigate to URL",
  schema: z.object({
    url: z.string().describe("URL to navigate to"),
    waitUntil: z
      .enum(["load", "domcontentloaded", "networkidle"])
      .default("domcontentloaded")
      .describe("When to consider navigation complete"),
  }),
  timeout: 60000, // Navigation can be slow
  handle: async (ctx, params) => {
    const page = await ctx.getPage();

    await waitForCompletion(page, async () => {
      await page.goto(params.url, { waitUntil: params.waitUntil });
    });

    const title = await page.title();
    return { url: page.url(), title };
  },
});
