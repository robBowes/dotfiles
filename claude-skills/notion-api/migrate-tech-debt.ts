#!/usr/bin/env tsx
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const SOURCE_DB = "1a4926c8-329d-8086-b277-d72616e97020"; // Tech Debt Ideas Board
const TARGET_DB = "a5a50020-7a95-402f-ad25-9d6487646cef"; // Project Board

// Status mapping: Tech Debt → Project Board
const STATUS_MAP: Record<string, string> = {
  Ideas: "Not Started",
  Planned: "Not Started",
  "In progress": "In Progress",
  Paused: "Paused",
};

// Statuses to migrate (open tasks only)
const OPEN_STATUSES = ["Ideas", "Planned", "In progress", "Paused"];

interface TechDebtTask {
  id: string;
  name: string;
  status: string;
  assignees: string[]; // user IDs
  url: string;
}

async function getOpenTechDebtTasks(): Promise<TechDebtTask[]> {
  const tasks: TechDebtTask[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.databases.query({
      database_id: SOURCE_DB,
      start_cursor: cursor,
      filter: {
        or: OPEN_STATUSES.map((status) => ({
          property: "Status",
          status: { equals: status },
        })),
      },
    });

    for (const page of response.results as any[]) {
      const props = page.properties;
      const name = props.Name?.title?.[0]?.plain_text || "Untitled";
      const status = props.Status?.status?.name || "Ideas";
      const assignees = props.Assign?.people?.map((p: any) => p.id) || [];

      tasks.push({
        id: page.id,
        name,
        status,
        assignees,
        url: page.url,
      });
    }

    cursor = response.has_more ? response.next_cursor! : undefined;
  } while (cursor);

  return tasks;
}

async function createProjectBoardTask(task: TechDebtTask): Promise<string> {
  const targetStatus = STATUS_MAP[task.status] || "Not Started";

  const properties: any = {
    "Task name": {
      title: [{ text: { content: task.name } }],
    },
    Status: {
      status: { name: targetStatus },
    },
    Scope: {
      select: { name: "Tech Debt" },
    },
  };

  // Add assignees if any
  if (task.assignees.length > 0) {
    properties["Assign"] = {
      people: task.assignees.map((id) => ({ id })),
    };
  }

  const page = await notion.pages.create({
    parent: { database_id: TARGET_DB },
    properties,
  });

  return (page as any).url;
}

async function archiveTask(pageId: string): Promise<void> {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      Status: {
        status: { name: "Archived" },
      },
    },
  });
}

async function main() {
  console.log("Fetching open tech debt tasks...");
  const tasks = await getOpenTechDebtTasks();
  console.log(`Found ${tasks.length} open tasks to migrate\n`);

  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) {
    console.log("DRY RUN - no changes will be made\n");
  }

  const results: { name: string; success: boolean; error?: string }[] = [];

  for (const task of tasks) {
    process.stdout.write(`• ${task.name.substring(0, 50).padEnd(50)} `);

    if (dryRun) {
      console.log(`→ ${STATUS_MAP[task.status] || "Not Started"}`);
      continue;
    }

    try {
      const newUrl = await createProjectBoardTask(task);
      await archiveTask(task.id);
      console.log("✓ Migrated & archived");
      results.push({ name: task.name, success: true });
    } catch (error: any) {
      console.log("✗ Failed");
      console.error(`  Error: ${error.message || JSON.stringify(error)}`);
      results.push({ name: task.name, success: false, error: error.message });
    }
  }

  if (!dryRun) {
    console.log("\n--- Summary ---");
    console.log(`Total: ${tasks.length}`);
    console.log(`Success: ${results.filter((r) => r.success).length}`);
    console.log(`Failed: ${results.filter((r) => !r.success).length}`);
  }
}

main().catch(console.error);
