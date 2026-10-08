import type { Entry } from '@sand/protocol'
import { errorMessage, uuid } from '@sand/kit'
import type { Context } from 'drydock'
import { busyNote, forkAt, forkedNote, labelData, moveOf, movedNote } from '../tree/moves'
import type { TreeSource } from './model'

type TreeContext = Context<'threads' | 'wire'>

export const treeSource = (ctx: TreeContext): TreeSource => {
  const say = (text: string, error = false) => ctx.notify?.push(text, error ? { level: 'error' } : {})
  const fail = (error: unknown) => say(errorMessage(error), true)

  const idle = () => {
    const thread = ctx.threads.current()
    if (thread?.running) say(busyNote, true)
    return thread?.running ? undefined : thread
  }

  const draft = (text: string | undefined, always: boolean) => {
    if (text === undefined || !ctx.composer || (!always && ctx.composer.value().trim())) return
    ctx.composer.set(text)
  }

  return {
    thread: () => ctx.threads.current(),
    jump(entry) {
      const thread = idle()
      if (!thread) return
      if (entry.id === thread.info.head) return say('Already at this point')
      const move = moveOf(entry)
      ctx.threads
        .checkout(thread.id, move.at)
        .then(() => {
          draft(move.draft, false)
          say(movedNote(move))
        })
        .catch(fail)
    },
    fork(entry) {
      const thread = idle()
      if (!thread) return
      const move = moveOf(entry)
      const run = async () => {
        const fork = await forkAt(
          {
            head: thread.info.head,
            path: () => ctx.threads.path(thread.id),
            checkout: at => ctx.threads.checkout(thread.id, at),
            branch: at => ctx.threads.branch(thread.id, at),
          },
          move.at,
        )
        await ctx.threads.select(fork.id)
        draft(move.draft, true)
        say(forkedNote)
      }
      run().catch(fail)
    },
    async label(session, target, text) {
      const thread = ctx.threads.get(session)
      if (!thread) return
      const entry: Entry = { id: uuid(), session: thread.id, parent: thread.info.head, at: Date.now(), type: 'label', data: labelData(target, text) }
      await ctx.wire.call({ type: 'session.append', session: thread.id, entry }).catch(fail)
    },
  }
}
