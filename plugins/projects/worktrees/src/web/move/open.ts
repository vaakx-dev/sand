import type { WorktreeState } from '../../contract'
import { place } from '@sand/dom'
import { promptText } from '@sand/kit'
import type { Message } from '@sand/messages'
import type { Thread } from '@sand/web-client/contract'
import type { Dispose } from 'drydock'
import { branchFor } from '../../slug'
import type { WebContext, WorktreeClient } from '../client'
import type { States } from '../states'
import { moveSheet } from './sheet'

const firstAsk = (ctx: WebContext, thread: Thread) => {
  const entry = ctx.threads.path(thread.id).find(item => item.type === 'message' && (item.data as Message).role === 'user')
  return entry ? promptText(entry.data as Message, ' ') : ''
}

const freeBranch = (state: WorktreeState, wanted: string) => {
  const taken = new Set(state.branches)
  for (let tries = 1; ; tries++) {
    const name = tries === 1 ? wanted : `${wanted}-${tries}`
    if (!taken.has(name)) return name
  }
}

export const moveOpener = (ctx: WebContext, client: WorktreeClient, states: States) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  ctx.effect(() => close)

  const say = (text: string) => void ctx.notify?.push(text)

  return async () => {
    const thread = ctx.threads.current()
    if (!thread) return say('Start the thread first, or pick New worktree in the composer')
    if (thread.running) return say('Wait for the turn to finish, then move the thread')
    const state = await states.refresh(thread.info.cwd, thread.device)
    if (!state) return say("This thread's folder isn't in a git repository")
    const branch = freeBranch(state, branchFor(thread.info.title || firstAsk(ctx, thread)))
    close()
    unplace = place(ctx, 'overlay', () => moveSheet(ctx, client, { thread, state, branch }, close), 100)
  }
}
