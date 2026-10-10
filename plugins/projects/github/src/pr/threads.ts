import { ghJson } from '../gh'
import type { Comment, Thread } from './types'

const query = `query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes { isResolved isOutdated path line comments(first: 20) { nodes { author { login } body createdAt } } }
      }
    }
  }
}`

interface Node {
  isResolved: boolean
  isOutdated: boolean
  path: string
  line: number | null
  comments: { nodes: Comment[] }
}

interface Response {
  data: { repository: { pullRequest: { reviewThreads: { nodes: Node[] } } } }
}

export const unresolvedThreads = async (repo: string, number: number, cwd: string, signal: AbortSignal): Promise<Thread[]> => {
  const [owner, name] = repo.split('/')
  const args = ['api', 'graphql', '-f', `query=${query}`, '-F', `owner=${owner}`, '-F', `name=${name}`, '-F', `number=${number}`]
  const response = await ghJson<Response>(args, cwd, signal)
  return response.data.repository.pullRequest.reviewThreads.nodes
    .filter(node => !node.isResolved && !node.isOutdated)
    .map(node => ({ path: node.path, line: node.line, comments: node.comments.nodes }))
}
