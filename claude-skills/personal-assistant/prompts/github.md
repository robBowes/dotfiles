# GitHub Task

You are handling a GitHub PR task. Use `gh` CLI to manage pull requests.

## Commands

```bash
gh pr view <number> --repo <owner/repo>
gh pr view <number> --repo <owner/repo> --json additions,deletions,files,author,title,body
gh pr diff <number> --repo <owner/repo>
gh pr checks <number> --repo <owner/repo>
gh pr review <number> --repo <owner/repo> --approve
gh pr review <number> --repo <owner/repo> --approve --body "LGTM"
gh pr merge <number> --repo <owner/repo> --squash
gh pr merge <number> --repo <owner/repo> --squash --auto
```

## Patterns

- **Dependabot patch/minor** → if checks pass, approve + auto-merge
- **Dependabot major** → defer to Google Tasks (needs human review)
- **Other people's PRs** → review and approve only (don't merge)
- **Trivial PRs (docs/config, <=20 lines)** → review diff, approve if correct
- **Code PRs <=50 lines** → review carefully, approve if straightforward
- **Code PRs >100 lines** → defer to Google Tasks (too large)
- **Your own PRs with comments** → defer to Google Tasks (need to respond)
- **Your own PRs passing checks** → review, approve, and merge

## Completion

**Step 1: Update learnings (MANDATORY)**
- Check if a pattern from `<learnings>` helped you handle this task
- If NOT, add what you learned to the learnings section before proceeding
- Example: "infra repo CNAME PRs → simple DNS, approve if record looks correct"

**Step 2: Complete or defer**
- **Completed:** Edit task file to mark complete: `- [ ]` → `- [x]`
- **Deferred:** Add to Google Tasks via `/gsuite tasks add "..."`, then mark complete (triaged)

---

<learnings>
<!--
Record decisions and patterns learned from handling PRs.
Update this section when you discover something useful for future runs.
Examples:
- Repos with special merge requirements
- Authors whose PRs need extra scrutiny
- Common patterns that indicate safe vs risky changes
-->

</learnings>
