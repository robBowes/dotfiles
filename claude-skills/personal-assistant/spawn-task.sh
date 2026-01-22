#!/usr/bin/env bash
# Spawn a Claude Code instance in a tmux window to handle a task
# Usage: ./spawn-task.sh <window-name> <task-type> <prompt>
# task-type: email, github, notion, calendar, general

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WINDOW_NAME="$1"
TASK_TYPE="$2"
TASK_PROMPT="$3"
WORKDIR="/Volumes/dev/git/dotfiles"
PROMPT_FILE="$SCRIPT_DIR/prompts/${TASK_TYPE}.md"
TEMP_FILE=$(mktemp)

# Build full prompt: system prompt + task-specific prompt
if [[ -f "$PROMPT_FILE" ]]; then
  cat "$PROMPT_FILE" > "$TEMP_FILE"
  cat >> "$TEMP_FILE" <<EOF

---

## Your Task

$TASK_PROMPT

---

## MANDATORY: Update Learnings

Before marking this task complete, you MUST check the <learnings> section above:

1. **If a learning was helpful** → Great, proceed to completion
2. **If NO learning was helpful** → You MUST add a new learning before completing

Add learnings like:
- Patterns you discovered (e.g., "Sentry downtime emails for /health endpoint are usually false positives")
- Sender-specific rules (e.g., "Linear setup emails can always be archived")
- Edge cases you encountered

Update the learnings in: $PROMPT_FILE

This is NOT optional. Empty learnings sections mean the system isn't learning.
EOF
else
  echo "$TASK_PROMPT" > "$TEMP_FILE"
fi

tmux new-window -n "$WINDOW_NAME" "zsh -c 'cat $TEMP_FILE | direnv exec $WORKDIR claude --model haiku; rm $TEMP_FILE'"
