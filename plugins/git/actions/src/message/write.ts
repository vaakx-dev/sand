import type { Ask } from '@sand/ask/contract'
import type { GitLayout, GitRunner } from '@sand/git/contract'
import { errorMessage, oneLine } from '@sand/util'
import { z } from 'zod'
import type { GitActionResult } from '../contract'
import { failure } from '../run/failure'
import { nothingToCommit } from '../stage/empty'
import { previewChanges } from './preview'
import { messagePrompt, messageSystem } from './prompt'

const recentSubjects = 15

const written = z.object({ title: z.string().min(1), bullets: z.array(z.string()) })

export interface MessageRequest {
  paths?: string[]
  session?: string
}

const cannotWrite = (why: string) => failure('unknown', `Couldn't write a commit message: ${why.replace(/\.$/, '')}; type one instead.`)

const compose = ({ title, bullets }: z.infer<typeof written>) => {
  const body = bullets.map(bullet => oneLine(bullet).replace(/^[-*]\s*/, '')).filter(bullet => bullet && !/^co-authored-by:/i.test(bullet))
  const head = oneLine(title)
  return body.length ? `${head}\n\n${body.map(bullet => `- ${bullet}`).join('\n')}` : head
}

const readSubjects = async (git: GitRunner, repo: GitLayout) => {
  const out = await git.maybe(repo.root, ['log', `-${recentSubjects}`, '--format=%s'], { read: true })
  return out?.split(/\r?\n/).filter(Boolean) ?? []
}

export const writeMessage = async (git: GitRunner, repo: GitLayout, ask: Ask | undefined, { paths, session }: MessageRequest): Promise<GitActionResult<{ message: string }>> => {
  if (!ask) return cannotWrite('no model is available')
  const preview = await previewChanges(git, repo, paths)
  if (!preview.stat) return nothingToCommit()
  const subjects = await readSubjects(git, repo)
  try {
    const reply = await ask.json({ system: messageSystem, prompt: messagePrompt(preview, subjects), ...(session ? { session } : {}) }, written)
    return { ok: true, message: compose(reply) }
  } catch (error) {
    return cannotWrite(errorMessage(error))
  }
}
