import type { GitHub, PullRef } from '@sand/github/contract'

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
                conclusion
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

type RawOutput =
  | { __typename: 'CheckRun'; name: string; conclusion: string | null; title: string | null; summary: string | null; text: string | null; annotations: { nodes: RawAnnotation[] } }
  | { __typename: 'StatusContext'; context: string; state: string; description: string | null }

interface RawCommit {
  repository: { object: { statusCheckRollup: { contexts: { nodes: RawOutput[] } } | null } | null } | null
}

const fieldLimit = 1500

const cut = (text: string | null) => {
  const trimmed = text?.trim() ?? ''
  return trimmed.length > fieldLimit ? `${trimmed.slice(0, fieldLimit)}…` : trimmed
}

const nameOf = (raw: RawOutput) => (raw.__typename === 'CheckRun' ? raw.name : raw.context)

const passed = (raw: RawOutput) => (raw.__typename === 'CheckRun' ? raw.conclusion : raw.state) === 'SUCCESS'

const annotationLine = ({ path, message, location }: RawAnnotation) => `${path}:${location.start.line}: ${cut(message)}`

const outputText = (raw: RawOutput) => {
  if (raw.__typename === 'StatusContext') return cut(raw.description)
  return [cut(raw.title), cut(raw.summary), cut(raw.text), ...raw.annotations.nodes.map(annotationLine)].filter(Boolean).join('\n')
}

export const checkOutput = async (github: GitHub, { repo, number }: PullRef, head: string, names: string[]) => {
  const [owner, name] = repo.split('/')
  if (!owner || !name) throw new Error(`"${repo}" isn't an owner/name repository for #${number}.`)
  const raw = await github.graphql<RawCommit>(outputQuery, { owner, name, oid: head })
  const contexts = raw.repository?.object?.statusCheckRollup?.contexts.nodes ?? []
  return contexts
    .filter(context => names.includes(nameOf(context)) && !passed(context))
    .map(context => `${nameOf(context)}:\n${outputText(context) || '(no output)'}`)
    .join('\n\n')
}
