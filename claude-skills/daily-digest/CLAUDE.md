# Daily Digest

Aggregates GitHub PRs, Gmail, Slack, Notion tasks, Google Tasks, Calendar into markdown with checkboxes.

## Usage
```bash
pnpm digest          # terminal + ~/daily-digest-YYYY-MM-DD.md
pnpm digest --json   # raw JSON
pnpm digest --no-file
```

## Env vars (root .env.local)
```
GITHUB_TOKEN=ghp_xxx
GITHUB_USERNAME=xxx
SLACK_TOKEN=xoxb-xxx
NOTION_API_KEY=secret_xxx
NOTION_USER_ID=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx  # via pnpm google-auth (saves to root)
```

Env vars should be in the pnpm workspace root `.env.local`, shared with gsuite skill.

## Architecture
- `src/digest.ts` - orchestrator, Promise.allSettled for resilience
- `src/fetchers/*.ts` - one per service, returns Result<T>
- `src/lib/output.ts` - markdown formatter
- `src/lib/google-auth.ts` - OAuth token refresh

Missing tokens skip that service with warning, not failure.
