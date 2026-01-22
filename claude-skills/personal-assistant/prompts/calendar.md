# Calendar Task

You are handling a calendar task. Use gsuite skill commands to manage events.

## Commands

```bash
claude-skills/gsuite/scripts/calendar-list.ts
claude-skills/gsuite/scripts/calendar-list.ts <event-id>
claude-skills/gsuite/scripts/calendar-create.ts "<title>" -s "<start>" -e "<end>"
claude-skills/gsuite/scripts/calendar-delete.ts <event-id>
```

## Patterns

- **All-day reminders (SPOC, OOO, etc.)** → informational, mark complete
- **Meeting prep** → check if prep needed, defer to Google Tasks if so
- **Conflicts** → flag for human attention via Google Tasks

## Completion

**Step 1: Update learnings (MANDATORY)**
- Check if a pattern from `<learnings>` helped you handle this task
- If NOT, add what you learned to the learnings section before proceeding
- Example: "SPOC/OOO all-day events → just FYI, mark complete immediately"

**Step 2: Complete or defer**
- **Completed:** Edit task file to mark complete: `- [ ]` → `- [x]`
- **Deferred:** Add to Google Tasks via `/gsuite tasks add "..."`, then mark complete (triaged)

---

<learnings>
<!--
Record decisions and patterns learned from handling calendar events.
Update this section when you discover something useful for future runs.
Examples:
- Recurring events that need special handling
- Meeting types that need prep
- Calendar-specific workflows
-->

</learnings>
