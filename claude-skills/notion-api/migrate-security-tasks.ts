#!/usr/bin/env tsx
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const SOURCE_DB = "1ea926c8329d80429bd0d0293b114fa4";
const TARGET_DB = "a5a500207a95402fad259d6487646cef";

// Status mapping: Security -> Project Tasks
const STATUS_MAP: Record<string, string> = {
  Triage: "Not Started",
  "To do": "Not Started",
  "In progress": "In Progress",
  "Being reviewed": "In Progress",
  Closed: "Done",
};

// Priority mapping: Security -> Project Tasks
const PRIORITY_MAP: Record<string, string> = {
  High: "Must have",
  Medium: "Nice to have",
  Low: "Cut from scope",
};

async function cloneBlocks(sourceId: string, targetId: string) {
  const blocks = await notion.blocks.children.list({ block_id: sourceId });

  for (const block of blocks.results as any[]) {
    if (block.type === "child_page" || block.type === "child_database")
      continue;

    const blockData: any = {
      object: "block",
      type: block.type,
      [block.type]: block[block.type],
    };

    if (blockData[block.type]) {
      delete blockData[block.type].id;
      delete blockData[block.type].created_time;
      delete blockData[block.type].last_edited_time;
    }

    try {
      const newBlock = await notion.blocks.children.append({
        block_id: targetId,
        children: [blockData],
      });

      if (
        block.has_children &&
        block.type !== "child_page" &&
        block.type !== "child_database"
      ) {
        await cloneBlocks(block.id, (newBlock.results[0] as any).id);
      }
    } catch (e: any) {
      console.error(`  Skipped ${block.type}: ${e.message}`);
    }
  }
}

async function main() {
  // Get all non-done tasks
  const response = await notion.databases.query({
    database_id: SOURCE_DB,
    filter: {
      and: [{ property: "Status", status: { does_not_equal: "Done" } }],
    },
    page_size: 100,
  });

  console.log(`Found ${response.results.length} tasks to migrate\n`);

  let migrated = 0;
  let failed = 0;

  for (const page of response.results as any[]) {
    const props = page.properties;
    const title = props.Name?.title?.[0]?.plain_text || "Untitled";
    const status = props.Status?.status?.name || "Triage";
    const priority = props.Priority?.select?.name;
    const description =
      props.Description?.rich_text?.map((t: any) => t.plain_text).join("") ||
      "";
    const dueDate = props["Due Date"]?.date?.start;
    const assignees = props.Assign?.people?.map((p: any) => p.id) || [];

    console.log(`Migrating: ${title}`);
    console.log(
      `  Status: ${status} -> ${STATUS_MAP[status] || "Not Started"}`,
    );
    if (priority)
      console.log(`  Priority: ${priority} -> ${PRIORITY_MAP[priority]}`);

    try {
      // Build properties for new page
      const newProps: any = {
        "Task name": { title: [{ text: { content: title } }] },
        Status: { status: { name: STATUS_MAP[status] || "Not Started" } },
        "Task type": { select: { name: "Security" } },
      };

      if (priority && PRIORITY_MAP[priority]) {
        newProps["Priority"] = { select: { name: PRIORITY_MAP[priority] } };
      }

      if (description) {
        newProps["Description"] = {
          rich_text: [{ text: { content: description } }],
        };
      }

      if (dueDate) {
        newProps["Due"] = { date: { start: dueDate } };
      }

      if (assignees.length > 0) {
        newProps["Assign"] = {
          people: assignees.map((id: string) => ({ id })),
        };
      }

      // Create new page
      const newPage = await notion.pages.create({
        parent: { database_id: TARGET_DB },
        properties: newProps,
      });

      console.log(
        `  Created: TASK-${(newPage as any).properties.ID.unique_id.number}`,
      );

      // Clone content blocks
      await cloneBlocks(page.id, newPage.id);

      // Archive original
      await notion.pages.update({
        page_id: page.id,
        archived: true,
      });

      console.log(`  Archived original\n`);
      migrated++;
    } catch (e: any) {
      console.error(`  FAILED: ${e.message}\n`);
      failed++;
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Failed: ${failed}`);
}

main();
