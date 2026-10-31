import type { Ask } from '@sand/ask/contract'
import type { Committed, GitActionResult } from '../contract'
import { findHooks } from '../hooks/find'
import { writeMessage } from '../message/write'
import { pushBranch } from '../push/push'
import { failedRun } from '../run/failure'
import type { Job } from '../run/perform'
import { runLong, tooSlow } from '../run/step'
import { selectPaths } from '../stage/select'
import { pathCommand, stagePaths } from '../stage/stage'
import { commitFailed } from './failed'

export interface CommitRequest {
  paths?: string[]
  message?: string
  push?: boolean
  session?: string
}

const commitHooks = ['pre-commit', 'prepare-commit-msg', 'commit-msg']

const chooseMessage = async (job: Job, ask: Ask | undefined, request: CommitRequest, paths?: string[]) => {
  const typed = request.message?.trim()
  if (typed) return { ok: true as const, message: typed }
  job.progress.phase('message')
  return writeMessage(job.git, job.repo, ask, { ...(paths ? { paths } : {}), ...(request.session ? { session: request.session } : {}) })
}

const readCommit = async ({ git, repo }: Job) => {
  const [commit = '', subject = ''] = (await git.ok(repo.root, ['log', '-1', '--format=%H%n%s'], { read: true })).split(/\r?\n/)
  return { commit, subject }
}

export const commitChanges = async (job: Job, ask: Ask | undefined, request: CommitRequest): Promise<GitActionResult<Committed>> => {
  const { git, repo, progress } = job
  const selected = await selectPaths(git, repo, request.paths)
  if (!selected.ok) return selected
  const message = await chooseMessage(job, ask, request, selected.paths)
  if (!message.ok) return message
  progress.phase('stage')
  const staged = await stagePaths(git, repo, selected.paths)
  if (staged.result.code !== 0) return failedRun(git, staged.result, staged.args)
  const hooks = await findHooks(git, repo, commitHooks)
  progress.phase(hooks.length ? 'hooks' : 'commit')
  const command = pathCommand(['commit', '-m', message.message, ...(selected.paths ? ['--only'] : [])], selected.paths)
  const { result, timedOut } = await runLong(git, repo.root, command.args, { ...command.options, onLine: progress.line })
  if (timedOut) return tooSlow('The commit', result)
  if (result.code !== 0) return commitFailed(git, result, command.args, hooks)
  const made = await readCommit(job)
  if (!request.push) return { ok: true, ...made, pushed: false }
  const pushed = await pushBranch(job)
  return pushed.ok ? { ok: true, ...made, pushed: true } : { ok: true, ...made, pushed: false, pushFailure: pushed }
}
