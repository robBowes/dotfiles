---
name: playwright
description: Browser automation via Playwright with persistent headed browser. Commands run via JSON-RPC server with layered timeouts (never hangs). Navigate, click, fill, screenshot, snapshot.
---

# Playwright Browser Automation

Automate browser interactions with a persistent headed browser.

## Setup

```bash
cd ~/.claude/skills/playwright
pnpm install
```

## Usage

All commands go through the `pw` CLI:

```bash
~/.claude/skills/playwright/bin/pw navigate https://example.com
~/.claude/skills/playwright/bin/pw snapshot
~/.claude/skills/playwright/bin/pw click "button.submit"
~/.claude/skills/playwright/bin/pw screenshot
```

Or set `PW=~/.claude/skills/playwright/bin/pw` and use:

```bash
$PW navigate https://example.com
$PW click "button"
```

## Commands

### Navigation

| Command | Usage | Description |
|---------|-------|-------------|
| navigate | `pw navigate <url> [--wait_until load\|domcontentloaded\|networkidle]` | Go to URL |
| wait | `pw wait <selector> [--state visible\|hidden]` | Wait for element |

### Page Understanding

| Command | Usage | Description |
|---------|-------|-------------|
| snapshot | `pw snapshot [--selector "body"] [--file out.yaml]` | Aria accessibility tree |
| screenshot | `pw screenshot [path] [--full_page] [--selector sel]` | PNG capture |
| get_text | `pw get_text <selector> [--all]` | Extract text |
| get_html | `pw get_html <selector> [--outer]` | Extract HTML |
| evaluate | `pw evaluate <script>` | Run JavaScript |

### Interaction

| Command | Usage | Description |
|---------|-------|-------------|
| click | `pw click <selector> [--force] [--double]` | Click element |
| fill | `pw fill <selector> <value>` | Fill input |
| select | `pw select <selector> <value> [--by value\|label]` | Select dropdown |

### Export

| Command | Usage | Description |
|---------|-------|-------------|
| pdf | `pw pdf [path] [--format A4\|Letter]` | Export PDF (headless only) |

### Browser Control

| Command | Usage | Description |
|---------|-------|-------------|
| close | `pw close` | Stop browser process |

## Architecture

The skill uses a server architecture (like MS Playwright MCP) for reliability:

```
┌─────────────────────────────┐
│      pw (CLI client)        │
│  Spawns server per command  │
└──────────────┬──────────────┘
               │ JSON-RPC/stdio
               ▼
┌─────────────────────────────┐
│     Server (short-lived)    │
│  - Tool execution           │
│  - Timeout handling         │
│  - Exit watchdog (15s)      │
└──────────────┬──────────────┘
               │ CDP
               ▼
┌─────────────────────────────┐
│   Browser (long-lived)      │
│   Persists across commands  │
└─────────────────────────────┘
```

**Key features:**
- Commands never hang (layered timeouts)
- Browser persists across commands (CDP on port 9222)
- Exit watchdog forces cleanup after 15s
- Network completion tracking

## Timeouts

| Operation | Timeout |
|-----------|---------|
| Click, fill, select | 5s |
| Navigation | 60s |
| Network completion | 5s |
| Exit watchdog | 15s |

## Storage State

Auto-loads cookies from `./playwright/storage.json` **relative to caller's working directory**.

## Common Patterns

### Login flow
```bash
$PW navigate https://app.example.com/login
$PW fill "#email" "user@example.com"
$PW fill "#password" "secret"
$PW click "button[type=submit]"
$PW wait ".dashboard"
```

### Scrape data
```bash
$PW evaluate "Array.from(document.querySelectorAll('tr')).map(r => Array.from(r.querySelectorAll('td')).map(c => c.textContent))"
```

### Take full page screenshot
```bash
$PW screenshot page.png --full_page
```

## Legacy Commands

Old CLI scripts still available for backwards compatibility:
- `bin/launch` - Start browser
- `bin/close` - Stop browser
- `bin/navigate`, `bin/click`, etc.

## Troubleshooting

**Browser not starting?**
- Check if port 9222 is in use: `lsof -i :9222`
- Kill existing browser and retry

**Command timing out?**
- Default action timeout is 5s
- Navigation timeout is 60s
- Check if element selector is correct
