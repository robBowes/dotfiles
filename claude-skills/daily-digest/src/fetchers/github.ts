import { fetchJson, getEnv, ok, err, type Result } from '../lib/api.js'

export interface GitHubPR {
  repo: string
  number: number
  title: string
  url: string
  author: string
  newComments?: number
}

export interface GitHubData {
  reviewRequests: GitHubPR[]
  assigned: GitHubPR[]
  mentioned: GitHubPR[]
  myPRsWithComments: GitHubPR[]
}

interface GraphQLResponse {
  data?: {
    reviewRequests?: { nodes: PRNode[] }
    assigned?: { nodes: PRNode[] }
    mentioned?: { nodes: PRNode[] }
    myPRs?: { nodes: PRNode[] }
  }
  errors?: { message: string }[]
}

interface PRNode {
  number: number
  title: string
  url: string
  author: { login: string }
  repository: { nameWithOwner: string }
  timelineItems?: { totalCount: number }
}

const GRAPHQL_URL = 'https://api.github.com/graphql'

export async function fetchGitHub(): Promise<Result<GitHubData>> {
  const token = getEnv('GITHUB_TOKEN')
  const username = getEnv('GITHUB_USERNAME')

  if (!token || !username) {
    return err('Skipped: missing GITHUB_TOKEN or GITHUB_USERNAME')
  }

  const query = `
    query {
      reviewRequests: search(query: "type:pr state:open review-requested:${username}", type: ISSUE, first: 50) {
        nodes { ...prFields }
      }
      assigned: search(query: "type:pr state:open assignee:${username}", type: ISSUE, first: 50) {
        nodes { ...prFields }
      }
      mentioned: search(query: "type:pr state:open mentions:${username}", type: ISSUE, first: 50) {
        nodes { ...prFields }
      }
      myPRs: search(query: "type:pr state:open author:${username}", type: ISSUE, first: 50) {
        nodes {
          ...prFields
          ... on PullRequest {
            timelineItems(itemTypes: [ISSUE_COMMENT, PULL_REQUEST_REVIEW], last: 100) {
              totalCount
            }
          }
        }
      }
    }
    fragment prFields on PullRequest {
      number
      title
      url
      author { login }
      repository { nameWithOwner }
    }
  `

  const result = await fetchJson<GraphQLResponse>(GRAPHQL_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ query }),
  })

  if (!result.ok) return result

  const { data, errors } = result.data
  if (errors?.length) return err(errors.map(e => e.message).join(', '))
  if (!data) return err('No data in response')

  const mapPR = (node: PRNode): GitHubPR => ({
    repo: node.repository.nameWithOwner,
    number: node.number,
    title: node.title,
    url: node.url,
    author: node.author.login,
  })

  const myPRsWithComments = (data.myPRs?.nodes ?? [])
    .filter(n => (n.timelineItems?.totalCount ?? 0) > 0)
    .map(n => ({
      ...mapPR(n),
      newComments: n.timelineItems?.totalCount,
    }))

  return ok({
    reviewRequests: (data.reviewRequests?.nodes ?? []).map(mapPR),
    assigned: (data.assigned?.nodes ?? []).map(mapPR),
    mentioned: (data.mentioned?.nodes ?? []).map(mapPR),
    myPRsWithComments,
  })
}
