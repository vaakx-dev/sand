import { errorMessage, sig } from '@sand/dom'
import type { DraftTarget } from '@sand/web-client/contract'
import type { WebContext, WorktreeClient } from '../client'

export type Choice = { mode: 'local' } | { mode: 'new'; base?: string } | { mode: 'existing'; path: string; branch: string | null }

const local: Choice = { mode: 'local' }
const freshMs = 60_000

export const createChoices = (ctx: WebContext, client: WorktreeClient) => {
  const chosen = sig<Record<string, Choice>>({})
  let last: DraftTarget | undefined

  const remember = () => {
    const draft = ctx.threads.drafting()
    if (draft) last = draft
  }

  const forget = (id: string) => chosen.update(({ [id]: _gone, ...rest }) => rest)

  const started = (id: string, draft: DraftTarget) => {
    const thread = ctx.threads.get(id)
    return Boolean(
      thread &&
        !thread.info.messages &&
        thread.device === draft.device &&
        thread.info.cwd === draft.cwd &&
        Date.now() - thread.info.created < freshMs,
    )
  }

  const hand = (id: string | undefined) => {
    const draft = last
    remember()
    if (!id || !draft) return
    const choice = chosen.get()[draft.id]
    if (!choice || choice.mode === 'local' || !started(id, draft)) return
    forget(draft.id)
    const intent = choice.mode === 'new' ? { mode: 'new' as const, base: choice.base } : { mode: 'existing' as const, path: choice.path }
    void client.intend(id, intent).catch(error => ctx.notify?.push(`Could not start in a worktree: ${errorMessage(error)}`, { level: 'error' }))
  }

  ctx.on('thread.select', hand)
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
