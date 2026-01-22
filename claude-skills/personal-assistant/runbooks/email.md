# Email Runbook

You are handling an email task. Use direct script calls for granular permissions.

## Available Commands

Call scripts directly (NOT via pnpm filter - that's too broad for permissions):

```bash
# Read email content
~/.claude/skills/gsuite/scripts/gmail-read.ts <message-id>

# Mark as read (safe - auto-approve ok)
~/.claude/skills/gsuite/scripts/gmail-action.ts read <message-id>

# Archive (requires explicit approval)
~/.claude/skills/gsuite/scripts/gmail-action.ts archive <message-id>

# Star for follow-up
~/.claude/skills/gsuite/scripts/gmail-action.ts star <message-id>

# Unsubscribe
~/.claude/skills/gsuite/scripts/gmail-unsubscribe.ts <message-id>
```

## Task Patterns

### Invoices/Receipts
If the email contains an invoice, receipt, or bill:
1. Forward to Dext: `robert.vessel@dext.cc` (single attachment) or `robert.vessel@multiple.dext.cc` (multiple)
2. Archive the email

### Newsletters
If it's a newsletter that's been read:
1. Archive it

### Test/Staging Emails
If from `*@test.*`, `*@staging.*`, `*@dev.*` domains or subject contains `[TEST]`, `[STAGING]`:
1. Archive it

### Docusign Notifications
If it's a Docusign "viewed" notification:
1. Archive it (informational only)

### Calendar Invites (Calendly, etc.)
If it's a calendar invite notification:
1. Read to confirm details
2. Archive it (the event is already in calendar)

### DMARC/Security Reports
If it's an automated security report (DMARC, etc.):
1. Archive it (automated reports, review weekly)

### Needs Response
If the email appears to need a human response:
1. Star it for follow-up
2. DO NOT attempt to reply

## Confidence Levels

**AUTO-HANDLE (just do it):**
- Archive read newsletters
- Archive Docusign "viewed" notifications
- Archive test/staging emails older than 2h
- Archive calendar invite confirmations

**DEFER (add to Google Tasks):**
- Emails that need a response
- Important-looking emails from people
- Anything with unclear intent

## Completion

**If completed:** Edit the task file to mark complete: `- [ ]` → `- [x]`

**If deferred:** Add to Google Tasks via `~/.claude/skills/gsuite/scripts/tasks-add.ts "..."`, then mark digest item complete (triaged)
