import { parseArgs } from 'util'

export interface Args {
  help: boolean
  json: boolean
  noFile: boolean
}

export function parseCliArgs(): Args {
  const { values } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      json: { type: 'boolean', short: 'j', default: false },
      'no-file': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  })

  return {
    help: values.help ?? false,
    json: values.json ?? false,
    noFile: values['no-file'] ?? false,
  }
}

export function printHelp(): void {
  console.log(`
Usage: digest [options]

Daily digest aggregator - GitHub PRs, Gmail, Slack, Notion, Tasks, Calendar

Options:
  -h, --help     Show this help message
  -j, --json     Output raw JSON instead of markdown
  --no-file      Don't save to ~/daily-digest-YYYY-MM-DD.md

Environment variables required:
  GITHUB_TOKEN, GITHUB_USERNAME
  SLACK_TOKEN
  NOTION_API_KEY
  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN

Run 'pnpm setup' to configure Google OAuth.
`.trim())
}
