---
name: gsuite
description: Gmail, Google Tasks, and Google Calendar management. Use when user wants to read/archive/mark/unsubscribe emails, add/complete/delete tasks, or list/create/update/delete calendar events. Triggers on requests involving email management, task lists, or calendar scheduling.
---

# GSuite

Manage Gmail, Google Tasks, and Google Calendar via CLI scripts.

## Setup

Scripts are in PATH - call directly (e.g., `gmail-list`, `tasks-add`).

Requires OAuth credentials in root `.env.local`. Supports work (default) and personal accounts:

```
# Work account (default)
GOOGLE_WORK_CLIENT_ID=xxx
GOOGLE_WORK_CLIENT_SECRET=xxx
GOOGLE_WORK_REFRESH_TOKEN=xxx  # via auth

# Personal account (optional)
GOOGLE_PERSONAL_CLIENT_ID=xxx
GOOGLE_PERSONAL_CLIENT_SECRET=xxx
GOOGLE_PERSONAL_REFRESH_TOKEN=xxx  # via auth -p
```

Run `auth` for work account, `auth -p` for personal (opens browser).

## Account Selection

All commands default to work account. Add `-p` / `--personal` flag for personal:
```bash
gmail-list           # work account
gmail-list -p        # personal account
```

## Gmail

```bash
# List emails
gmail-list                    # unread
gmail-list -q "from:boss"     # search query
gmail-list --json             # full JSON output
gmail-list --ids              # IDs only (for piping)

# Read email body
gmail-read <message-id>
gmail-read <message-id> --json

# Actions
gmail-action archive <id>     # remove from inbox
gmail-action read <id>        # mark read
gmail-action unread <id>      # mark unread
gmail-action trash <id>       # delete
gmail-action star <id>
gmail-action unstar <id>

# Unsubscribe
gmail-unsubscribe <id>        # show unsub link
gmail-unsubscribe <id> --open # open in browser

# Auto-cleanup (archive noise)
gmail-cleanup                 # archive matching rules
gmail-cleanup --dry-run      # preview without archiving
gmail-cleanup -l 100          # process up to 100 per rule

# Filters (server-side rules)
gmail-filter list
gmail-filter create --from "noise@example.com" --skip-inbox --label "Auto/Noise"
gmail-filter create --query "subject:alert" --skip-inbox --mark-read
gmail-filter delete <filter-id>
```

## Tasks

```bash
# List tasks (shows list IDs needed for other commands)
tasks-list
tasks-list -l "Work"          # filter by list name
tasks-list --all              # include completed
tasks-list --json

# Add task
tasks-add "Task title"
tasks-add "Task" -l "Work"           # specific list
tasks-add "Task" -d 2024-01-20       # with due date
tasks-add "Task" -n "Notes here"     # with notes

# Complete task (need task ID and list ID from tasks:list)
tasks-complete <task-id> -l <list-id>
tasks-complete <task-id> -l <list-id> --uncomplete

# Delete task
tasks-delete <task-id> -l <list-id>
```

## Calendar

```bash
# List events (shows calendar IDs needed for other commands)
calendar-list                 # today
calendar-list -d 7            # next 7 days
calendar-list -c "Work"       # specific calendar
calendar-list --json

# Create event
calendar-create "Meeting" -s "2024-01-20 14:00"
calendar-create "Meeting" -s "2024-01-20 14:00" -e "2024-01-20 15:00"
calendar-create "Vacation" -s "2024-01-20" -e "2024-01-25" --allday
calendar-create "Lunch" -s "..." -l "Cafe" -d "Discussion"

# Update event (need event ID and calendar ID from calendar:list)
calendar-update <event-id> -c <calendar-id> -t "New Title"
calendar-update <event-id> -c <calendar-id> -s "2024-01-20 15:00"

# Delete event
calendar-delete <event-id> -c <calendar-id>
```

## Piping

Commands support piping IDs via stdin for bulk operations:

```bash
# Archive all Slack notifications
gmail-list --ids -q "from:slack.com" | gmail-action archive

# Trash all promotional emails
gmail-list --ids -q "category:promotions" | gmail-action trash

# Forward receipts to accounting
gmail-list --ids -q "subject:receipt" | gmail-forward --to receipts@company.com

# Bulk unsubscribe (opens each in browser)
gmail-list --ids -q "unsubscribe" | gmail-unsubscribe --open
```

## Common Workflows

### Process unread emails
```bash
gmail-list --json | jq '.messages[] | {id, from, subject}'
gmail-read <id>
gmail-action archive <id>
```

### Bulk archive by search
```bash
gmail-list --ids -q "from:noreply@github.com" | gmail-action archive
```

### Add task with due date
```bash
tasks-add "Review PR" -d 2024-01-20 -l "Work"
```

### Schedule meeting
```bash
calendar-create "Team sync" -s "2024-01-20 10:00" -e "2024-01-20 10:30"
```
