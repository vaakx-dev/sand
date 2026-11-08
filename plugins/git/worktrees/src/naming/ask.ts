import type { Session } from '@sand/chats/contract'
import type { SubModel } from '@sand/sub-model/contract'
import { z } from 'zod'
import { slugOf } from './slug'

const mostPromptChars = 4000

const system = `You name git branches. Given the task a developer is starting, reply with a short branch name: 2 to 5 lowercase English words joined by hyphens that say what will change, such as "files-panel-search" or "fix-snooze-wake". No type prefix like feat/, no ticket numbers, no quotes. Reply as JSON: {"branch": "..."}.`

const named = z.object({ branch: z.string().min(1) })

export const askBranchName = async (sub: SubModel, session: Session, prompt: string) => {
  const task = [session.title && `Thread title: ${session.title}`, `Task:\n${prompt.slice(0, mostPromptChars)}`].filter(Boolean).join('\n\n')
  const { branch } = await sub.json({ tier: 'fast', system, prompt: task, session: session.id }, named)
  const slug = slugOf(branch)
  if (!slug) throw new Error(`the suggested name "${branch}" has no letters or digits`)
  return slug
}
