import type { Ask } from '@sand/ask/contract'
import type { GitActionResult } from '../contract'
import type { Job } from '../run/perform'
import { selectPaths } from '../stage/select'
import { type MessageRequest, writeMessage } from './write'

export const suggestMessage = async (job: Job, ask: Ask | undefined, request: MessageRequest): Promise<GitActionResult<{ message: string }>> => {
  const selected = await selectPaths(job.git, job.repo, request.paths)
  if (!selected.ok) return selected
  job.progress.phase('message')
  return writeMessage(job.git, job.repo, ask, { ...(selected.paths ? { paths: selected.paths } : {}), ...(request.session ? { session: request.session } : {}) })
}
