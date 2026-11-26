import type { GitRunner } from '@sand/git-runner/contract'
import { shortSha } from '@sand/util'
import type { Rest } from '../api/client'
import { githubHost } from '../api/endpoint'
import { GitHubError } from '../api/errors'
import { repoOf } from '../repo'
import { type Check, readChecks, readJobs } from './read'

type Target =
  | { kind: 'pushed' }
  | { kind: 'pull'; number: number; repo?: string }
  | { kind: 'run'; id: number; repo?: string }
  | { kind: 'ref'; ref: string }

interface Watched {
  kind: 'commit' | 'run'
  title: string
  repo: string
  sha: string
  read(): Promise<Check[]>
}

type TargetGit = Pick<GitRunner, 'remoteUrl' | 'maybe'>

interface TargetDeps {
  git: TargetGit
  client: Rest
}

const host = `https://${githubHost.replace('.', '\\.')}/`
const repoName = '([^/\\s#]+)/([^/\\s#]+?)'
const anyTail = '(?:[/?#].*)?$'
const pullPattern = new RegExp(`^(?:${host})?${repoName}(?:/pull/|#)(\\d+)${anyTail}`)
const runPattern = new RegExp(`^(?:${host})?${repoName}/actions/runs/(\\d+)${anyTail}`)
const pullNumberPattern = /^#?(\d+)$/
const runIdPattern = /^run:(\d+)$/

const referenceIn = (pattern: RegExp, text: string) => {
  const match = pattern.exec(text)
  if (!match) return undefined
  const [, owner, name, number] = match
  return { repo: `/repos/${owner}/${name}`, number: Number(number) }
}

const targetOf = (given: number | string | undefined): Target => {
  if (given === undefined) return { kind: 'pushed' }
  if (typeof given === 'number') return { kind: 'pull', number: given }
  const pullNumber = pullNumberPattern.exec(given)
  if (pullNumber) return { kind: 'pull', number: Number(pullNumber[1]) }
  const runId = runIdPattern.exec(given)
  if (runId) return { kind: 'run', id: Number(runId[1]) }
  const pull = referenceIn(pullPattern, given)
  if (pull) return { kind: 'pull', ...pull }
  const run = referenceIn(runPattern, given)
  if (run) return { kind: 'run', repo: run.repo, id: run.number }
  return { kind: 'ref', ref: given }
}

const folderRepo = async (git: TargetGit, cwd: string) => {
  const repo = await repoOf(git, cwd)
  if (!repo) throw new Error("This folder isn't in a GitHub repo; pass a pull request or Actions run URL.")
  return repo.path
}

const pushedCommit = async (git: TargetGit, cwd: string) => {
  const pushed = await git.maybe(cwd, ['rev-parse', '--verify', '--quiet', '@{upstream}'], { read: true })
  if (!pushed) throw new Error("This folder's branch has no upstream; push it, or pass a target.")
  return pushed
}

const pullCommit = async (client: Rest, repo: string, number: number) => (await client.rest<{ head: { sha: string } }>('GET', `${repo}/pulls/${number}`)).head.sha

const missingRef = (error: unknown) => error instanceof GitHubError && error.status === 404

const refCommit = async (client: Rest, repo: string, ref: string) => {
  const [commit] = await client.rest<[{ sha: string }]>('GET', `${repo}/commits?sha=${encodeURIComponent(ref)}&per_page=1`).catch((error: unknown) => {
    if (missingRef(error)) throw new Error(`GitHub has no branch, tag or commit "${ref}" in ${repo.replace('/repos/', '')}; push it, or check the name.`)
    throw error
  })
  return commit.sha
}

const commitWatch = (client: Rest, repo: string, sha: string): Watched => ({
  kind: 'commit',
  title: `Checks on ${shortSha(sha)}`,
  repo,
  sha,
  read: () => readChecks(client, repo, sha),
})

const runWatch = async (client: Rest, repo: string, id: number): Promise<Watched> => {
  const run = await client.rest<{ name: string; head_sha: string }>('GET', `${repo}/actions/runs/${id}`)
  return { kind: 'run', title: `${run.name} run ${id} on ${shortSha(run.head_sha)}`, repo, sha: run.head_sha, read: () => readJobs(client, repo, id) }
}

const watchedOf = async ({ git, client }: TargetDeps, cwd: string, given: number | string | undefined): Promise<Watched> => {
  const target = targetOf(given)
  switch (target.kind) {
    case 'pushed': {
      const repo = await folderRepo(git, cwd)
      return commitWatch(client, repo, await pushedCommit(git, cwd))
    }
    case 'pull': {
      const repo = target.repo ?? (await folderRepo(git, cwd))
      return commitWatch(client, repo, await pullCommit(client, repo, target.number))
    }
    case 'ref': {
      const repo = await folderRepo(git, cwd)
      return commitWatch(client, repo, await refCommit(client, repo, target.ref))
    }
    case 'run':
      return runWatch(client, target.repo ?? (await folderRepo(git, cwd)), target.id)
  }
}

export { type TargetGit, type Watched, watchedOf }
