import { type GitHub, type PullRef, pullVariables } from '@sand/github/contract'
import { errorMessage } from '@sand/util'

const outputQuery = `query CheckOutput($owner: String!, $name: String!, $oid: GitObjectID!) {
  repository(owner: $owner, name: $name) {
    object(oid: $oid) {
      ... on Commit {
        statusCheckRollup {
          contexts(first: 100) {
            nodes {
              __typename
              ... on CheckRun {
                name
                databaseId
                conclusion
                checkSuite { app { slug } }
                title
                summary
                text
                annotations(first: 5) { nodes { path message location { start { line } } } }
              }
              ... on StatusContext { context state description }
            }
          }
        }
      }
    }
  }
}`

interface RawAnnotation {
  path: string
  message: string
  location: { start: { line: number } }
}

interface RawRun {
  __typename: 'CheckRun'
  name: string
  databaseId: number
  conclusion: string | null
  checkSuite: { app: { slug: string } | null }
  title: string | null
  summary: string | null
  text: string | null
  annotations: { nodes: RawAnnotation[] }
}

type RawOutput = RawRun | { __typename: 'StatusContext'; context: string; state: string; description: string | null }

interface RawCommit {
  repository: { object: { statusCheckRollup: { contexts: { nodes: RawOutput[] } } | null } | null } | null
}

const fieldLimit = 1500

const logsAtMost = 3

const cut = (text: string | null) => {
  const trimmed = text?.trim() ?? ''
  return trimmed.length > fieldLimit ? `${trimmed.slice(0, fieldLimit)}…` : trimmed
}

const nameOf = (raw: RawOutput) => (raw.__typename === 'CheckRun' ? raw.name : raw.context)

const passed = (raw: RawOutput) => (raw.__typename === 'CheckRun' ? raw.conclusion : raw.state) === 'SUCCESS'

const fromActions = (raw: RawOutput): raw is RawRun => raw.__typename === 'CheckRun' && raw.checkSuite.app?.slug === 'github-actions'

const annotationLine = ({ path, message, location }: RawAnnotation) => `${path}:${location.start.line}: ${cut(message)}`

const logTail = (github: GitHub, repo: string, job: number) =>
  github.jobLog(repo, job).then(
    log => (log ? `Log tail:\n${log}` : ''),
    (error: unknown) => `Log tail unavailable: ${errorMessage(error)}`,
  )

const runText = (raw: RawRun, tail: string) => [cut(raw.title), cut(raw.summary), cut(raw.text), ...raw.annotations.nodes.map(annotationLine), tail].filter(Boolean).join('\n')

const outputText = async (github: GitHub, repo: string, raw: RawOutput, logged: Set<RawRun>) => {
  if (raw.__typename === 'StatusContext') return cut(raw.description)
  return runText(raw, logged.has(raw) ? await logTail(github, repo, raw.databaseId) : '')
}

export const checkOutput = async (github: GitHub, pull: PullRef, head: string, names: string[]) => {
  const { owner, name } = pullVariables(pull)
  const raw = await github.graphql<RawCommit>(outputQuery, { owner, name, oid: head })
  const contexts = raw.repository?.object?.statusCheckRollup?.contexts.nodes ?? []
  const failing = contexts.filter(context => names.includes(nameOf(context)) && !passed(context))
  const logged = new Set(failing.filter(fromActions).slice(0, logsAtMost))
  const texts = await Promise.all(failing.map(context => outputText(github, pull.repo, context, logged)))
  return failing.map((context, at) => `${nameOf(context)}:\n${texts[at] || '(no output)'}`).join('\n\n')
}
