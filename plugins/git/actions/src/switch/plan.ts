import type { GitRunner } from '@sand/git/contract'
import type { GitActionResult } from '../contract'
import { failure } from '../run/failure'
import { listRemotes, readConfig, refExists } from '../run/refs'
import type { Repo } from '../run/repo'

export interface SwitchRequest {
  branch: string
  create?: boolean
  from?: string
}

export interface SwitchPlan {
  args: string[]
  created: boolean
}

const validName = async (git: GitRunner, repo: Repo, name: string) =>
  !name.startsWith('-') && !!(await git.maybe(repo.root, ['check-ref-format', '--branch', name], { read: true }))

const trackingRemote = async (git: GitRunner, repo: Repo, name: string) => {
  const remotes = await listRemotes(git, repo)
  const held = await Promise.all(remotes.map(async remote => ((await refExists(git, repo, `refs/remotes/${remote}/${name}`)) ? remote : undefined)))
  const found = held.filter((remote): remote is string => remote !== undefined)
  const preferred = await readConfig(git, repo, 'checkout.defaultRemote')
  return [preferred, 'origin'].find(remote => remote && found.includes(remote)) ?? found[0]
}

const planExisting = async (git: GitRunner, repo: Repo, name: string): Promise<GitActionResult<SwitchPlan>> => {
  if (await refExists(git, repo, `refs/heads/${name}`)) return { ok: true, args: ['switch', name], created: false }
  const remote = await trackingRemote(git, repo, name)
  if (!remote) return failure('not-found', `There's no branch called ${name}.`)
  return { ok: true, args: ['switch', '-c', name, '--track', `${remote}/${name}`], created: true }
}

export const planSwitch = async (git: GitRunner, repo: Repo, { branch, create, from }: SwitchRequest): Promise<GitActionResult<SwitchPlan>> => {
  if (!(await validName(git, repo, branch))) return failure('unknown', `"${branch}" isn't a valid branch name.`)
  if (!create) return planExisting(git, repo, branch)
  if (from?.startsWith('-')) return failure('not-found', `There's no branch or commit called ${from}.`)
  return { ok: true, args: ['switch', '-c', branch, ...(from ? [from] : [])], created: true }
}
