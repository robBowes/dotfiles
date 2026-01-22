import { writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { GitHubData, GitHubPR } from '../fetchers/github.js'
import type { SlackData } from '../fetchers/slack.js'
import type { GmailData } from '../fetchers/gmail.js'
import type { TasksData } from '../fetchers/tasks.js'
import type { CalendarData } from '../fetchers/calendar.js'
import type { NotionData } from '../fetchers/notion.js'

export interface DigestData {
  github?: GitHubData
  slack?: SlackData
  gmail?: GmailData
  tasks?: TasksData
  calendar?: CalendarData
  notion?: NotionData
  errors: { service: string; error: string }[]
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function prLine(pr: GitHubPR): string {
  const suffix = pr.newComments ? ` (${pr.newComments} comments)` : ''
  return `- [ ] [${pr.repo}#${pr.number}](${pr.url}) - ${pr.title} (@${pr.author})${suffix}`
}

export function formatMarkdown(data: DigestData): string {
  const today = new Date().toISOString().split('T')[0]
  const lines: string[] = [`# Daily Digest - ${today}`, '']

  // GitHub
  if (data.github) {
    const g = data.github
    lines.push('## GitHub', '')

    if (g.reviewRequests.length) {
      lines.push('### Review Requests')
      g.reviewRequests.forEach(pr => lines.push(prLine(pr)))
      lines.push('')
    }

    if (g.assigned.length) {
      lines.push('### Assigned PRs')
      g.assigned.forEach(pr => lines.push(prLine(pr)))
      lines.push('')
    }

    if (g.mentioned.length) {
      lines.push('### Mentioned')
      g.mentioned.forEach(pr => lines.push(prLine(pr)))
      lines.push('')
    }

    if (g.myPRsWithComments.length) {
      lines.push('### My PRs with Comments')
      g.myPRsWithComments.forEach(pr => lines.push(prLine(pr)))
      lines.push('')
    }

    if (!g.reviewRequests.length && !g.assigned.length && !g.mentioned.length && !g.myPRsWithComments.length) {
      lines.push('No PRs requiring attention.', '')
    }
  }

  // Gmail
  if (data.gmail) {
    const count = data.gmail.unread.length
    const recentCount = data.gmail.unread.filter(m => m.isRecent).length
    lines.push(`## Gmail (${count} unread, ${recentCount} new today)`, '')
    if (count === 0) {
      lines.push('Inbox zero!', '')
    } else {
      data.gmail.unread.forEach(m => {
        const from = m.from.replace(/<.*>/, '').trim()
        const marker = m.isRecent ? 'NEW ' : ''
        lines.push(`- [ ] ${marker}**${from}** - ${m.subject} [msg:${m.id}] [thread:${m.threadId}]`)
      })
      lines.push('')
    }
  }

  // Slack
  if (data.slack) {
    lines.push('## Slack', '')

    if (data.slack.unreadDMs.length) {
      lines.push('### Unread DMs')
      data.slack.unreadDMs.forEach(dm => {
        lines.push(`- [ ] **@${dm.userName}** (${dm.messageCount}) - "${dm.preview.slice(0, 50)}..."`)
      })
      lines.push('')
    }

    if (data.slack.mentions.length) {
      lines.push('### @Mentions')
      data.slack.mentions.forEach(m => {
        lines.push(`- [ ] **#${m.channel}** @${m.from}: "${m.text.slice(0, 50)}..."`)
      })
      lines.push('')
    }

    if (!data.slack.unreadDMs.length && !data.slack.mentions.length) {
      lines.push('No unread messages.', '')
    }
  }

  // Notion
  if (data.notion) {
    lines.push('## Notion', '')
    if (data.notion.assignedItems.length === 0) {
      lines.push('No assigned items.', '')
    } else {
      data.notion.assignedItems.forEach(item => {
        const status = item.status ? ` [${item.status}]` : ''
        lines.push(`- [ ] [${item.title}](${item.url}) - ${item.database}${status}`)
      })
      lines.push('')
    }
  }

  // Tasks
  if (data.tasks) {
    lines.push('## Google Tasks', '')
    if (data.tasks.tasks.length === 0) {
      lines.push('No tasks due.', '')
    } else {
      data.tasks.tasks.forEach(t => {
        const due = t.due ? ` (due ${formatDate(t.due)})` : ''
        lines.push(`- [ ] ${t.title}${due} [task:${t.listId}/${t.id}]`)
      })
      lines.push('')
    }
  }

  // Calendar
  if (data.calendar) {
    lines.push('## Calendar', '')
    if (data.calendar.events.length === 0) {
      lines.push('No events today.', '')
    } else {
      data.calendar.events.forEach(e => {
        const start = formatTime(e.start)
        const end = formatTime(e.end)
        const loc = e.location ? ` @ ${e.location}` : ''
        lines.push(`- [ ] ${start}-${end} | ${e.summary}${loc} [event:${e.calendarId}/${e.id}]`)
      })
      lines.push('')
    }
  }

  // Errors
  if (data.errors.length) {
    lines.push('## Errors', '')
    data.errors.forEach(e => lines.push(`- **${e.service}**: ${e.error}`))
    lines.push('')
  }

  lines.push('---', `Generated: ${new Date().toISOString()}`)
  return lines.join('\n')
}

export function saveDigest(markdown: string): string {
  const today = new Date().toISOString().split('T')[0]
  const filename = `daily-digest-${today}.md`
  const filepath = join(homedir(), filename)
  writeFileSync(filepath, markdown)
  return filepath
}
