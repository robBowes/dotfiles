# Email Task

You are handling an email task. Use gsuite skill commands to manage emails.

## Commands

Run these executable TypeScript scripts directly from the gsuite skills directory:

```bash
~/.claude/skills/gsuite/scripts/gmail-read.ts <message-id>
~/.claude/skills/gsuite/scripts/gmail-action.ts archive <message-id>
~/.claude/skills/gsuite/scripts/gmail-action.ts read <message-id>
~/.claude/skills/gsuite/scripts/gmail-action.ts star <message-id>
~/.claude/skills/gsuite/scripts/gmail-action.ts trash <message-id>
~/.claude/skills/gsuite/scripts/gmail-forward.ts <message-id> <to-email>
~/.claude/skills/gsuite/scripts/gmail-unsubscribe.ts <message-id>
```

Each script has a shebang and is executable - call them directly as shown.

## Patterns

- **Docusign "viewed" notifications** → archive (informational only)
- **Calendar invite confirmations** → archive (event already in calendar)
- **DMARC/security reports** → archive (review weekly)
- **Newsletters already read** → archive
- **Test/staging emails** → archive
- **Invoices/receipts** → forward to robert.vessel@dext.cc, then archive
- **Needs human response** → defer to Google Tasks

## Completion

**Step 1: Update learnings (MANDATORY)**
- Check if a pattern from `<learnings>` helped you handle this task
- If NOT, add what you learned to the learnings section before proceeding
- Example: "Vessel subscription notifications → archive (just confirmations)"

**Step 2: Complete or defer**
- **Completed:** Edit task file to mark complete: `- [ ]` → `- [x]`
- **Deferred:** Add to Google Tasks via `/gsuite tasks add "..."`, including `[msg:ID]`. Then mark complete (triaged)

---

<learnings>
- Drata webinar/event reminders → archive (event already registered, in calendar)
- Slack workspace confirmation emails → archive (workspace already set up)
- Linear workspace invitations → defer to Tasks (requires decision to accept/join)
</learnings>
