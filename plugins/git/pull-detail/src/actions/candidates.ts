import { type PullRef, pullVariables } from '@sand/github/contract'
import { present } from '../detail/nodes'
import type { Nodes } from '../detail/raw'
import { refusal } from '../errors/refusal'
import type { ActionDeps } from './action'

const most = 20
const asked = 40

const candidatesQuery = `
query ReviewCandidates($owner: String!, $name: String!, $first: Int!, $q: String) {
  repository(owner: $owner, name: $name) {
    assignableUsers(first: $first, query: $q) { nodes { login } }
  }
}
`

interface CandidatesData {
  repository: { assignableUsers: Nodes<{ login: string }> } | null
}

export const reviewCandidates = async (deps: ActionDeps, ref: PullRef, q?: string): Promise<string[]> => {
  const { detail } = await deps.details.get(ref)
  const { owner, name } = pullVariables(ref)
  const data = await deps.github.graphql<CandidatesData>(candidatesQuery, { owner, name, first: asked, q: q?.trim() || null }).catch((error: unknown) => {
    throw refusal('list possible reviewers for', ref, error)
  })
  const skipped = new Set([detail.author, ...detail.requested].map(login => login.toLowerCase()))
  return present(data.repository?.assignableUsers.nodes)
    .map(user => user.login)
    .filter(login => !skipped.has(login.toLowerCase()))
    .slice(0, most)
}
