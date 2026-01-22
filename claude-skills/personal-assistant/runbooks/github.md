# GitHub Runbook

You are handling a GitHub PR task. Use `gh` CLI to manage pull requests.

## Available Commands

```bash
# View PR details
gh pr view <number> --repo <owner/repo>
gh pr view <number> --repo <owner/repo> --json additions,deletions,files,author,title,body

# View PR diff
gh pr diff <number> --repo <owner/repo>

# Check PR status
gh pr checks <number> --repo <owner/repo>

# Review actions
gh pr review <number> --repo <owner/repo> --approve
gh pr review <number> --repo <owner/repo> --approve --body "LGTM"
gh pr review <number> --repo <owner/repo> --request-changes --body "Please fix..."
gh pr review <number> --repo <owner/repo> --comment --body "Question about..."

# Merge
gh pr merge <number> --repo <owner/repo> --squash
gh pr merge <number> --repo <owner/repo> --squash --auto  # Enable auto-merge

# Comment
gh pr comment <number> --repo <owner/repo> --body "..."
```

## Task Patterns

### Dependabot PRs
If author is `dependabot[bot]`:
1. Check if it's a patch/minor version bump (safe) vs major (risky)
2. Verify checks are passing: `gh pr checks`
3. If patch/minor + checks pass: Approve and enable auto-merge
4. If major: Defer - add to Google Tasks for human review

### Trivial PRs (docs, config)
If changes are only to `.md`, `.txt`, `.json`, `.yml`, `.yaml`, config files:
1. Review the diff: `gh pr diff`
2. If <= 20 lines and looks correct: Approve
3. If larger: Defer - add to Google Tasks

### Code PRs
For PRs with actual code changes:
1. Get PR details: `gh pr view --json additions,deletions,files`
2. If <= 50 lines and tests pass: Review diff carefully, approve if straightforward
3. If > 100 lines: Defer - add to Google Tasks (too large for automated review)

### Stale PRs (from "My PRs" section)
If this is one of your own PRs with comments:
1. View the PR and comments: `gh pr view`
2. Defer - add to Google Tasks (user needs to respond to feedback)

### Review Requests
If someone requested your review:
1. View the PR: `gh pr view`
2. Check the diff: `gh pr diff`
3. If simple and correct: Approve
4. If needs changes: Defer - add to Google Tasks

## Confidence Levels

**AUTO-HANDLE (approve/merge):**
- Dependabot patch/minor with passing checks
- Trivial doc/config changes <= 20 lines
- Already approved PRs with passing checks (just merge)

**DEFER (add to Google Tasks):**
- Major version bumps
- Code changes > 50 lines
- PRs that need changes requested
- Your own PRs with feedback

## Completion

**If completed:** Edit the task file to mark complete: `- [ ]` → `- [x]`

**If deferred:** Add to Google Tasks via `/gsuite tasks add "..."`, then mark digest item complete (triaged)
