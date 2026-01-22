# Notion Runbook

You are handling a Notion task. Use the `notion-api` skill scripts to manage tasks.

## Available Commands

All scripts are in `~/.claude/skills/notion-api/scripts/` (or use pnpm filter).

```bash
# Read task details
~/.claude/skills/notion-api/scripts/read-item.ts --page '<notion-url-or-id>'

# Change task status
~/.claude/skills/notion-api/scripts/change-status.ts --page '<page-id>' --status "Done"
~/.claude/skills/notion-api/scripts/change-status.ts --page '<page-id>' --status "In Progress"

# Add a comment
~/.claude/skills/notion-api/scripts/add-comment.ts --page '<page-id>' "Comment text"

# Update properties
~/.claude/skills/notion-api/scripts/update-item.ts --page '<page-id>' --property Status --value "Done"

# Append content to page
~/.claude/skills/notion-api/scripts/append-content.ts --page '<page-id>' "# Notes\n- Item 1"
```

## Task Patterns

### Triage Tasks
If the task is in "Triage" status:
1. Read the task details
2. This needs human review to prioritize - skip it
3. Mark task as checked in the digest (you've reviewed it, just can't action it)

### To Do Tasks
If the task is in "To Do" status:
1. Read the task to understand what's needed
2. If it's a simple task you can complete (documentation, config change, etc.): do it
3. If it requires code changes or complex work: skip for human

### Bug Reports
If the task describes a bug:
1. Read the details
2. Skip - bugs require investigation and code changes

### Feature Requests
If the task is a feature request:
1. Read the details
2. Skip - features require planning and implementation

## Confidence Levels

**AUTO-HANDLE:**
- Triage tasks: Just read and acknowledge (mark as seen in digest)
- Simple documentation tasks

**NEEDS REVIEW (skip):**
- Bug fixes
- Feature implementation
- Tasks requiring code changes
- Tasks without clear acceptance criteria

## Important Notes

- Notion tasks from the daily digest are usually informational
- The goal is to triage/review them, not necessarily complete them
- Most Notion tasks require human judgment for actual work

## Completion

When done reviewing:
1. Edit the task file to mark your task as complete: `- [ ]` → `- [x]`
2. Exit
