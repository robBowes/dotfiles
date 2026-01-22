#!/usr/bin/env tsx
import { parseCliArgs, printHelp } from './lib/args.js'
import { formatMarkdown, saveDigest, type DigestData } from './lib/output.js'
import { fetchGitHub } from './fetchers/github.js'
import { fetchSlack } from './fetchers/slack.js'
import { fetchGmail } from './fetchers/gmail.js'
import { fetchTasks } from './fetchers/tasks.js'
import { fetchCalendar } from './fetchers/calendar.js'
import { fetchNotion } from './fetchers/notion.js'

const SERVICES = ['github', 'slack', 'gmail', 'tasks', 'calendar', 'notion'] as const

async function runDigest(): Promise<DigestData> {
  const results = await Promise.allSettled([
    fetchGitHub(),
    fetchSlack(),
    fetchGmail(),
    fetchTasks(),
    fetchCalendar(),
    fetchNotion(),
  ])

  const data: DigestData = { errors: [] }

  results.forEach((result, i) => {
    const service = SERVICES[i]

    if (result.status === 'rejected') {
      data.errors.push({ service, error: result.reason?.message ?? String(result.reason) })
      return
    }

    if (!result.value.ok) {
      data.errors.push({ service, error: result.value.error })
      return
    }

    // Type-safe assignment based on service
    switch (service) {
      case 'github':
        data.github = result.value.data as DigestData['github']
        break
      case 'slack':
        data.slack = result.value.data as DigestData['slack']
        break
      case 'gmail':
        data.gmail = result.value.data as DigestData['gmail']
        break
      case 'tasks':
        data.tasks = result.value.data as DigestData['tasks']
        break
      case 'calendar':
        data.calendar = result.value.data as DigestData['calendar']
        break
      case 'notion':
        data.notion = result.value.data as DigestData['notion']
        break
    }
  })

  return data
}

async function main() {
  const args = parseCliArgs()

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  console.log('Fetching daily digest...\n')

  const data = await runDigest()

  // JSON output mode
  if (args.json) {
    console.log(JSON.stringify(data, null, 2))
    process.exit(data.errors.length === SERVICES.length ? 1 : 0)
  }

  // Markdown output
  const markdown = formatMarkdown(data)
  console.log(markdown)

  // Save to file
  if (!args.noFile) {
    const filepath = saveDigest(markdown)
    console.log(`\nSaved to: ${filepath}`)
  }

  // Exit with error only if ALL services failed
  process.exit(data.errors.length === SERVICES.length ? 1 : 0)
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
