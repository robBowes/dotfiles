#!/usr/bin/env tsx
import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { parseArgs } from 'util';
import { writeFile } from 'fs/promises';
import { populateUserCache, resolveUser } from './user-resolver';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const n2m = new NotionToMarkdown({ notionClient: notion });

// MdBlock type from notion-to-md
type MdBlock = {
  type?: string;
  blockId: string;
  parent: string;
  children: MdBlock[];
};

type Comment = {
  id: string;
  author: string;
  text: string;
  createdTime: string;
  discussionId: string;
};

type CommentThread = {
  blockId: string;
  footnoteNum: number;
  comments: Comment[];
};

function extractId(input: string): string {
  if (input.includes('notion.so')) {
    const url = new URL(input);
    const pParam = url.searchParams.get('p');
    if (pParam) return pParam.replace(/-/g, '');
    const match = url.pathname.match(/([a-f0-9]{32})$/i)
      || url.pathname.match(/([a-f0-9-]{36})$/i)
      || url.pathname.match(/-([a-f0-9]{32})(?:\?|$)/i);
    if (match) return match[1].replace(/-/g, '');
  }
  return input.replace(/-/g, '');
}

const { values } = parseArgs({
  options: {
    page: { type: 'string', short: 'p' },
    output: { type: 'string', short: 'o' },
    'include-properties': { type: 'boolean', default: false },
  },
});

if (!values.page) {
  console.error(`Usage: page-to-md.ts --page <PAGE_ID|URL> [--output <file.md>] [--include-properties]

Fetch a Notion page and save as Markdown. Outputs to stdout if no --output specified.

Examples:
  page-to-md.ts --page abc123 --output notes.md
  page-to-md.ts --page 'https://notion.so/...' > page.md
`);
  process.exit(1);
}

const pageId = extractId(values.page);

async function main() {
  try {
    await populateUserCache(notion);
    const page = await notion.pages.retrieve({ page_id: pageId }) as any;

    let output = '';

    // Get title
    const titleProp = Object.values(page.properties).find((p: any) => p.type === 'title') as any;
    const title = titleProp?.title?.[0]?.plain_text || '(Untitled)';
    output += `# ${title}\n\n`;

    // Include properties if requested
    if (values['include-properties']) {
      output += '## Properties\n\n';
      for (const [key, val] of Object.entries(page.properties) as [string, any][]) {
        if (val.type === 'title') continue;
        const formatted = formatProperty(val);
        if (formatted) output += `- **${key}**: ${formatted}\n`;
      }
      output += '\n';
    }

    // Get content as markdown blocks (with block IDs)
    const mdBlocks = await n2m.pageToMarkdown(pageId);

    // Fetch comments for all blocks
    const blockIds = [pageId, ...extractBlockIds(mdBlocks)];
    const blockComments = await fetchAllComments(blockIds);

    // Build comment thread map: blockId → CommentThread[]
    const allThreads: CommentThread[] = [];
    const threadMap = new Map<string, CommentThread[]>();

    for (const [blockId, comments] of Array.from(blockComments)) {
      const grouped = groupByThread(comments);
      const threads: CommentThread[] = grouped.map(threadComments => ({
        blockId,
        footnoteNum: allThreads.length + threadMap.get(blockId)?.length! + 1 || allThreads.length + 1,
        comments: threadComments,
      }));

      // Assign sequential footnote numbers
      for (const thread of threads) {
        thread.footnoteNum = allThreads.length + 1;
        allThreads.push(thread);
      }

      threadMap.set(blockId, threads);
    }

    // Build markdown with injected footnote markers
    for (const block of mdBlocks) {
      output += injectFootnotes(block, threadMap);
    }

    // Append footnotes section
    output += formatFootnotes(allThreads);

    if (values.output) {
      await writeFile(values.output, output);
      console.log(`Saved to ${values.output}`);
    } else {
      console.log(output);
    }
  } catch (error: any) {
    console.error('Error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }
}

// Extract all block IDs from MdBlock tree
function extractBlockIds(blocks: MdBlock[]): string[] {
  const ids: string[] = [];
  for (const block of blocks) {
    if (block.blockId) ids.push(block.blockId);
    if (block.children?.length) ids.push(...extractBlockIds(block.children));
  }
  return ids;
}

// Retry with exponential backoff on rate limit
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimited = err?.status === 429 || err?.code === 'rate_limited';
      if (!isRateLimited || attempt === maxRetries) throw err;

      const retryAfter = err?.headers?.['retry-after'];
      const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  throw new Error('Unreachable');
}

// Fetch comments for a block, returns empty array on error
async function fetchBlockComments(blockId: string): Promise<Comment[]> {
  try {
    const response = await withRetry(() => notion.comments.list({ block_id: blockId }));
    return response.results.map((c: any) => ({
      id: c.id,
      author: resolveUser(c.created_by),
      text: c.rich_text?.map((t: any) => t.plain_text).join('') || '',
      createdTime: c.created_time,
      discussionId: c.discussion_id,
    }));
  } catch {
    return [];
  }
}

// Fetch comments for all blocks in parallel
async function fetchAllComments(blockIds: string[]): Promise<Map<string, Comment[]>> {
  const results = await Promise.all(
    blockIds.map(async (id) => [id, await fetchBlockComments(id)] as const)
  );
  return new Map(results.filter(([_, comments]) => comments.length > 0));
}

// Group comments by discussion (thread)
function groupByThread(comments: Comment[]): Comment[][] {
  const threads = new Map<string, Comment[]>();
  for (const c of comments) {
    const thread = threads.get(c.discussionId) || [];
    thread.push(c);
    threads.set(c.discussionId, thread);
  }
  // Sort each thread by time
  const threadList = Array.from(threads.values());
  for (const thread of threadList) {
    thread.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
  }
  return threadList;
}

// Inject footnote markers into markdown block
function injectFootnotes(block: MdBlock, commentMap: Map<string, CommentThread[]>): string {
  const threads = commentMap.get(block.blockId);
  let md = block.parent;

  if (threads?.length) {
    const markers = threads.map(t => `[^c${t.footnoteNum}]`).join('');
    // Insert before trailing newlines
    md = md.replace(/(\n*)$/, `${markers}$1`);
  }

  // Process children
  if (block.children?.length) {
    for (const child of block.children) {
      md += injectFootnotes(child, commentMap);
    }
  }

  return md;
}

// Format date for display
function formatCommentDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format comment threads as footnotes
function formatFootnotes(threads: CommentThread[]): string {
  if (!threads.length) return '';

  let output = '\n---\n\n## Comments\n\n';

  for (const thread of threads) {
    const [first, ...replies] = thread.comments;
    output += `[^c${thread.footnoteNum}]: **${first.author}** (${formatCommentDate(first.createdTime)}): "${first.text}"\n`;

    for (const reply of replies) {
      output += `       └─ **${reply.author}**: "${reply.text}"\n`;
    }
    output += '\n';
  }

  return output;
}

function formatProperty(prop: any): string | null {
  switch (prop.type) {
    case 'rich_text':
      return prop.rich_text?.map((t: any) => t.plain_text).join('') || null;
    case 'number':
      return prop.number?.toString() ?? null;
    case 'select':
      return prop.select?.name || null;
    case 'multi_select':
      return prop.multi_select?.map((s: any) => s.name).join(', ') || null;
    case 'status':
      return prop.status?.name || null;
    case 'date':
      if (!prop.date) return null;
      return prop.date.end ? `${prop.date.start} → ${prop.date.end}` : prop.date.start;
    case 'people':
      return prop.people?.length ? prop.people.map((p: any) => resolveUser(p)).join(', ') : null;
    case 'checkbox':
      return prop.checkbox ? '✓' : '✗';
    case 'url':
      return prop.url || null;
    default:
      return null;
  }
}

main();
