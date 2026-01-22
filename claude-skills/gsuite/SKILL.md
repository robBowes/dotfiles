---
name: gsuite
description: Gmail, Google Tasks, and Google Calendar management. Use when user wants to read/archive/mark/unsubscribe emails, add/complete/delete tasks, or list/create/update/delete calendar events. Triggers on requests involving email management, task lists, or calendar scheduling.
---

# GSuite

Manage Gmail, Google Tasks, and Google Calendar via CLI scripts.

## Setup

Requires OAuth credentials in root `.env.local`:

```
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx  # via pnpm auth
```

Run `pnpm auth` from this package to authenticate (opens browser).

## Gmail

```bash
# List emails
pnpm gmail:list                    # unread
pnpm gmail:list -q "from:boss"     # search query
pnpm gmail:list --json

# Read email body
pnpm gmail:read <message-id>
pnpm gmail:read <message-id> --json

# Actions
pnpm gmail:action archive <id>     # remove from inbox
pnpm gmail:action read <id>        # mark read
pnpm gmail:action unread <id>      # mark unread
pnpm gmail:action trash <id>       # delete
pnpm gmail:action star <id>
pnpm gmail:action unstar <id>

# Unsubscribe
pnpm gmail:unsubscribe <id>        # show unsub link
pnpm gmail:unsubscribe <id> --open # open in browser

# Auto-cleanup (archive noise)
pnpm gmail:cleanup                 # archive matching rules
pnpm gmail:cleanup --dry-run      # preview without archiving
pnpm gmail:cleanup -l 100          # process up to 100 per rule

# Filters (server-side rules)
pnpm gmail:filter list
pnpm gmail:filter create --from "noise@example.com" --skip-inbox --label "Auto/Noise"
pnpm gmail:filter create --query "subject:alert" --skip-inbox --mark-read
pnpm gmail:filter delete <filter-id>
```

## Tasks

```bash
# List tasks (shows list IDs needed for other commands)
pnpm tasks:list
pnpm tasks:list -l "Work"          # filter by list name
pnpm tasks:list --all              # include completed
pnpm tasks:list --json

# Add task
pnpm tasks:add "Task title"
pnpm tasks:add "Task" -l "Work"           # specific list
pnpm tasks:add "Task" -d 2024-01-20       # with due date
pnpm tasks:add "Task" -n "Notes here"     # with notes

# Complete task (need task ID and list ID from tasks:list)
pnpm tasks:complete <task-id> -l <list-id>
pnpm tasks:complete <task-id> -l <list-id> --uncomplete

# Delete task
pnpm tasks:delete <task-id> -l <list-id>
```

## Calendar

```bash
# List events (shows calendar IDs needed for other commands)
pnpm calendar:list                 # today
pnpm calendar:list -d 7            # next 7 days
pnpm calendar:list -c "Work"       # specific calendar
pnpm calendar:list --json

# Create event
pnpm calendar:create "Meeting" -s "2024-01-20 14:00"
pnpm calendar:create "Meeting" -s "2024-01-20 14:00" -e "2024-01-20 15:00"
pnpm calendar:create "Vacation" -s "2024-01-20" -e "2024-01-25" --allday
pnpm calendar:create "Lunch" -s "..." -l "Cafe" -d "Discussion"

# Update event (need event ID and calendar ID from calendar:list)
pnpm calendar:update <event-id> -c <calendar-id> -t "New Title"
pnpm calendar:update <event-id> -c <calendar-id> -s "2024-01-20 15:00"

# Delete event
pnpm calendar:delete <event-id> -c <calendar-id>
```

## Common Workflows

### Process unread emails
```bash
pnpm gmail:list --json | jq '.[] | {id, from, subject}'
pnpm gmail:read <id>
pnpm gmail:action archive <id>
```

### Add task with due date
```bash
pnpm tasks:add "Review PR" -d 2024-01-20 -l "Work"
```

### Schedule meeting
```bash
pnpm calendar:create "Team sync" -s "2024-01-20 10:00" -e "2024-01-20 10:30"
```
