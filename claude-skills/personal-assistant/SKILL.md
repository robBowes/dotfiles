---
name: personal-assistant
description: Autonomous personal assistant for Gmail, GitHub, Notion tasks, and calendar events. Scans for pending items, classifies by confidence, auto-executes clear actions, queues ambiguous ones for approval. Use when user wants to process inbox, review PRs, or run assistant.
---

# Personal Assistant

Orchestrates autonomous task handling by spawning Claude Code instances in tmux windows.

## Usage

```bash
# Process 3 tasks from daily digest
/personal-assistant 3 ~/daily-digest-2026-01-20.md

# Process 5 tasks
/personal-assistant 5 /path/to/tasks.md
```

## How It Works

1. Read the task file (markdown with checkboxes)
2. Find first N unchecked tasks (`- [ ]`)
3. For each task, spawn a new Claude Code in a tmux window:
   - Window named after the task (truncated)
   - Uses haiku model for speed/cost
   - Gets the task + appropriate runbook
   - Knows the task file path to check off when done

## Ad-hoc Queries

When asked about a topic outside of a task file, **read the corresponding prompt first**:

| Topic | Prompt to load |
|-------|----------------|
| Email, inbox, Gmail | `prompts/email.md` |
| GitHub, PRs, issues | `prompts/github.md` |
| Notion, tasks, tickets | `prompts/notion.md` |
| Calendar, events, meetings | `prompts/calendar.md` |
| Other | `prompts/general.md` |

These prompts contain patterns and rules for handling each domain consistently.

## Orchestrator Instructions

When this skill is invoked with args `<count> <task-file>`:

1. **Parse the task file** to find unchecked items matching `- [ ]`
2. **Select the first N** unchecked tasks
3. **For each task**, determine the runbook:
   - Contains `github.com` or `#\d+` → github runbook
   - Contains `[msg:` or email indicators → email runbook
   - Contains `notion.so` → notion runbook
   - Contains `[event:` or calendar indicators → calendar runbook
   - Default → general runbook

4. **Spawn tmux windows** using the spawn script:
```bash
/Users/robbowes/.claude-personal/skills/personal-assistant/spawn-task.sh "<window-name>" "<task-type>" "<prompt>"
```

Task types: `email`, `github`, `notion`, `calendar`, `general`

The script loads the corresponding prompt file from `prompts/<task-type>.md` which includes:
- System instructions for that task type
- A `<learnings>` section the agent can update with useful patterns

5. **The prompt** should be the RAW task line from the digest - do NOT make judgment calls:
   - Copy the task line verbatim (minus the checkbox)
   - Add the task file path to mark complete
   - Let the handler decide how to handle it based on its runbook

**IMPORTANT:** Do NOT tell the handler what to do (e.g., "archive this", "check if actionable"). The handler reads the content, consults the runbook patterns, and decides.

**Example:**
```bash
# GOOD - raw task, no judgment
/Users/robbowes/.claude-personal/skills/personal-assistant/spawn-task.sh "pr-6543-deps" "github" "[vessel-co/vessel#6543](https://github.com/vessel-co/vessel/pull/6543) - Bump storybook deps (@dependabot). Task file: /Users/robbowes/daily-digest-2026-01-20.md"

# BAD - orchestrator making judgment calls
/Users/robbowes/.claude-personal/skills/personal-assistant/spawn-task.sh "pr-6543-deps" "github" "Review and approve vessel-co/vessel#6543 if it looks good. Archive if not needed."
```

## Runbooks

Runbooks provide guardrails and available tools for each task type:

- `runbooks/email.md` - Email handling via gsuite skill
- `runbooks/github.md` - PR review/merge via gh CLI
- `runbooks/notion.md` - Notion task management via notion-api skill
- `runbooks/calendar.md` - Calendar event handling via gsuite skill
- `runbooks/general.md` - Fallback for unclassified tasks

## Task Completion

The user is available to approve actions and make decisions. Each task must end in one of two states:

**Completed** - Task fully handled (PR merged, email archived, etc.):
1. Edit the task file to change `- [ ]` to `- [x]`
2. Exit cleanly

**Deferred** - Task needs followup (complex PR, email needs response, etc.):
1. Add to Google Tasks via gsuite skill: `/gsuite tasks add "Review PR 6543 - major version bump"`
2. Mark the digest item as complete (it's been triaged)
3. Exit cleanly

**Never** silently skip and leave items unchecked. Every item should be either completed or added to Google Tasks.

## Safety

- Uses haiku model (fast, cheap)
- Each task runs in isolated tmux window
- Runbooks define what actions are allowed
- Tasks can only modify the master task list to check off their item

## Example Task File

```markdown
# Daily Digest - 2026-01-20

## GitHub
- [ ] [vessel-co/vessel#6543](https://github.com/vessel-co/vessel/pull/6543) - Bump storybook deps (@dependabot)
- [ ] [vessel-co/vessel#6538](https://github.com/vessel-co/vessel/pull/6538) - TASK-2957: Display AI insights (@efleury1)

## Gmail
- [ ] NEW **DMARC Digests** - DMARC Digest for vessel.co [msg:19bd9db36cccdec7]
- [ ] NEW **Calendly** - New Event: Meeting with Rob [msg:19bd929f7b7f424b]

## Notion
- [ ] [Fix display bug](https://www.notion.so/Display-bug-123) - Tiny batch [Triage]
```
