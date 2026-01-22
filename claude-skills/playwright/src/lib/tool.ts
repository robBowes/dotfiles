import { z } from "zod";
import type { Context } from "./context.js";
import { withTimeout } from "./timeout.js";

export interface Tool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  name: string;
  description: string;
  schema: TInput;
  timeout: number;
  handle: (ctx: Context, params: z.output<TInput>) => Promise<TOutput>;
}

export interface ToolConfig<TInput extends z.ZodTypeAny, TOutput> {
  name: string;
  description: string;
  schema: TInput;
  timeout?: number; // Default: 5000ms for actions
  handle: (ctx: Context, params: z.output<TInput>) => Promise<TOutput>;
}

const DEFAULT_TIMEOUT = 5000;

export function defineTool<TInput extends z.ZodTypeAny, TOutput>(
  config: ToolConfig<TInput, TOutput>
): Tool<TInput, TOutput> {
  return {
    name: config.name,
    description: config.description,
    schema: config.schema,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    handle: config.handle,
  };
}

/**
 * Execute a tool with timeout and error handling.
 */
export async function executeTool<TInput extends z.ZodTypeAny, TOutput>(
  tool: Tool<TInput, TOutput>,
  ctx: Context,
  rawParams: unknown
): Promise<{ result?: TOutput; error?: string }> {
  try {
    // Validate params
    const params = tool.schema.parse(rawParams);

    // Execute with timeout
    const result = await withTimeout(
      tool.handle(ctx, params),
      tool.timeout,
      tool.name
    );

    return { result };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { error };
  }
}
