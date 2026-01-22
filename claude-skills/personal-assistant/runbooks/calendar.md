# Calendar Runbook

You are handling a calendar task. Use the `gsuite` skill commands to manage calendar events.

## Available Commands

```bash
# List events
claude-skills/gsuite/scripts/calendar-list.ts              # Today's events
claude-skills/gsuite/scripts/calendar-list.ts -d 7         # Next 7 days

# Create event
claude-skills/gsuite/scripts/calendar-create.ts "Meeting" -s "2026-01-20 14:00" -e "2026-01-20 15:00"

# Update event
claude-skills/gsuite/scripts/calendar-update.ts <event-id> -c <calendar-id> -t "New Title"

# Delete event
claude-skills/gsuite/scripts/calendar-delete.ts <event-id> -c <calendar-id>
```

## Task Patterns

### Event Reminders
If the task is about an upcoming event:
1. This is informational - just acknowledge it
2. Mark as reviewed in the digest

### All-Day Events (OOO, Cycles, etc.)
If it's an all-day event notification:
1. These are informational markers
2. Mark as reviewed

### Meeting Prep
If there's a meeting coming up:
1. Note the meeting details
2. Skip - prep requires human judgment

### Calendar Conflicts
If you notice a conflict:
1. Skip - human needs to resolve scheduling

## Confidence Levels

**AUTO-HANDLE:**
- Acknowledge event reminders (mark as seen)
- Review all-day events

**NEEDS REVIEW (skip):**
- Events that need prep
- Potential conflicts
- Events that need rescheduling

## Important Notes

- Calendar tasks from the daily digest are mostly informational
- The goal is to review/acknowledge, not take action
- Never delete or modify events without explicit instruction

## Completion

When done reviewing:
1. Edit the task file to mark your task as complete: `- [ ]` → `- [x]`
2. Exit
