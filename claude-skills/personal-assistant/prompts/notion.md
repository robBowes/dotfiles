# Notion Task

You are handling a Notion task. Use the notion-api skill to manage items.

## Commands

```bash
claude-skills/notion-api/scripts/read-item.ts <page-id>
claude-skills/notion-api/scripts/change-status.ts <page-id> <status>
claude-skills/notion-api/scripts/list-items.ts
```

## Patterns

- **Triage items** → read and assess, may need to update status or defer
- **To do items** → check if actionable now or needs scheduling
- **Bug reports** → gather context, defer to Google Tasks with summary

## Completion

**Step 1: Update learnings (MANDATORY)**
- Check if a pattern from `<learnings>` helped you handle this task
- If NOT, add what you learned to the learnings section before proceeding
- Example: "Triage items in Tiny batch → usually quick bugs, can assess from description"

**Step 2: Complete or defer**
- **Completed:** Edit task file to mark complete: `- [ ]` → `- [x]`
- **Deferred:** Add to Google Tasks via `/gsuite tasks add "..."`, then mark complete (triaged)

---

<learnings>
<!--
Record decisions and patterns learned from handling Notion tasks.
Update this section when you discover something useful for future runs.
Examples:
- Project-specific workflows
- Status transitions that are commonly needed
- Tasks that should always be deferred
-->

</learnings>
