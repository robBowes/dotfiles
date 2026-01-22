import { z } from "zod";
import { defineTool } from "../lib/tool.js";

export const pdf = defineTool({
  name: "pdf",
  description: "Export page as PDF (requires headless mode)",
  schema: z.object({
    path: z.string().optional().describe("File path (defaults to timestamp)"),
    format: z.enum(["A4", "Letter"]).default("A4").describe("Paper format"),
    landscape: z.boolean().default(false).describe("Landscape orientation"),
  }),
  timeout: 30000,
  handle: async (ctx, params) => {
    const page = await ctx.requirePage();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const path = params.path || `./page-${timestamp}.pdf`;

    try {
      await page.pdf({
        path,
        format: params.format,
        landscape: params.landscape,
        printBackground: true,
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.message.includes("PrintToPDF")) {
        throw new Error("PDF export requires headless mode");
      }
      throw e;
    }

    return { path, format: params.format, landscape: params.landscape };
  },
});
