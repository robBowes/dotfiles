---
name: notion-api
description: Interact with Notion project boards via the Notion API. Use when Claude needs to list, read, create, or update tickets/items on a Notion project board, change ticket status, or filter items by state or project. Supports querying databases, reading page content, updating properties, and creating new items.
---

# Notion API Skill

Interact with Notion project boards to manage tickets and tasks.

## Prerequisites

Requires `NOTION_API_KEY` environment variable set with an integration token from https://www.notion.so/my-integrations

The integration must be connected to the workspace containing the target databases.

## Vessel Workspace Databases

| Database | ID                                 | Description                 |
| -------- | ---------------------------------- | --------------------------- |
| Tasks    | `a5a500207a95402fad259d6487646cef` | Main tasks/tickets database |

### Quick Commands for Vessel Tasks

```bash
# List tasks in a project
npx tsx scripts/list-items.ts --database a5a500207a95402fad259d6487646cef --project "Autonomous Reporting Extraction"

# List tasks by status
npx tsx scripts/list-items.ts --database a5a500207a95402fad259d6487646cef --status "Not Started"

# Read a specific task
npx tsx scripts/read-item.ts --page <PAGE_ID>
```

## Available Scripts

All scripts are in `scripts/` and run with `npx tsx`:

| Script             | Purpose                           |
| ------------------ | --------------------------------- |
| `list-items.ts`    | List/filter items from a database |
| `read-item.ts`     | Read full content of a page       |
| `update-item.ts`   | Update page properties            |
| `create-item.ts`   | Create new item in database       |
| `change-status.ts` | Change status of an item          |

## Quick Reference

### List items with filters

```bash
npx tsx scripts/list-items.ts --database <DB_ID> [--status "Done"] [--project "SOC 2"] [--limit 20]
```

### Read item content

```bash
npx tsx scripts/read-item.ts --page <PAGE_ID>
```

### Update item properties

```bash
npx tsx scripts/update-item.ts --page <PAGE_ID> --property Status --value "Done"
npx tsx scripts/update-item.ts --page <PAGE_ID> --title "New title"
```

### Create new item

```bash
npx tsx scripts/create-item.ts --database <DB_ID> --title "Task name" [--status "Not Started"] [--assign "Person Name"]
```

### Change status

```bash
npx tsx scripts/change-status.ts --page <PAGE_ID> --status "Done"
```

## Database ID Extraction

Extract database ID from Notion URL:

- URL: `https://www.notion.so/workspace/a5a500207a95402fad259d6487646cef?v=...`
- Database ID: `a5a500207a95402fad259d6487646cef`

For page URLs:

- URL: `https://www.notion.so/workspace/Page-Title-abc123def456`
- Page ID: `abc123def456` (last 32 chars, hyphenated or not)

## Property Types Reference

See [references/property-types.md](references/property-types.md) for handling different Notion property types when updating.

## Common Patterns

### Filter by multiple criteria

```bash
npx tsx scripts/list-items.ts --database $DB_ID --status "Not Started" --project "SOC 2"
```

### Batch status update (using zx)

```typescript
import { $ } from "zx";
const pages = ["id1", "id2", "id3"];
for (const id of pages) {
  await $`npx tsx scripts/change-status.ts --page ${id} --status "Done"`;
}
```

## Error Handling

Scripts exit with code 1 on error and print JSON error details. Common issues:

- `401`: Invalid or missing API key
- `404`: Page/database not found or not shared with integration
- `400`: Invalid property name or value format
