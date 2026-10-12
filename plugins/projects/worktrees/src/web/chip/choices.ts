import type { WorktreeIntent } from '../../contract'
import { errorMessage } from '@sand/kit'
import type { DraftTarget, Thread } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WebContext, WorktreeClient } from '../client'

export type Choice = { mode: 'local' } | { mode: 'new'; base?: string } | { mode: 'existing'; path: string; branch: string | null }

const local: Choice = { mode: 'local' }
const freshMs = 60_000

const startedFrom = (thread: Thread | undefined, draft: DraftTarget) =>
  Boolean(thread && !thread.info.messages && thread.device === draft.device && thread.info.cwd === draft.cwd && Date.now() - thread.info.created < freshMs)

export const createChoices = (ctx: WebContext, client: WorktreeClient) => {
  const chosen = sig<Record<string, Choice>>({})
  let last: DraftTarget | undefined

  const remember = () => {
    const draft = ctx.threads.drafting()
    if (draft) last = draft
  }

  const handOver = (id: string | undefined) => {
    const draft = last
    remember()
    if (!id || !draft) return
    const choice = chosen.get()[draft.id]
    if (!choice || choice.mode === 'local' || !startedFrom(ctx.threads.get(id), draft)) return
    chosen.update(({ [draft.id]: _gone, ...rest }) => rest)
    const intent: WorktreeIntent = choice.mode === 'new' ? { mode: 'new', base: choice.base } : { mode: 'existing', path: choice.path }
    void client.intend(id, intent).catch(error => ctx.notify?.push(`Could not start in a worktree: ${errorMessage(error)}`, { level: 'error' }))
  }

  ctx.on('thread.select', handOver)
  ctx.on('threads.change', remember)
  ctx.on('drafts.change', remember)

  return {
    of: (draft: string | undefined) => (draft ? (chosen.get()[draft] ?? local) : local),
    choose(draft: string, choice: Choice) {
      chosen.update(current => ({ ...current, [draft]: choice }))
    },
  }
}

export type Choices = ReturnType<typeof createChoices>
