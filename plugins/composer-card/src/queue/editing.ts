import type { Pending } from '@sand/protocol'
import { split } from '@sand/conversation'
import { effect, sig, untrack, type Pulse, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { contentsOf, type Attached, type Files } from '../attachments/files'
import type { Saved } from '../drafts/store'

interface Origin {
  thread?: string
  text: string
  items: Attached[]
}

export const createEditing = (ctx: Context<'threads' | 'turns'>, text: Sig<string>, files: Files, changes: Pulse) => {
  const editing = sig<string | undefined>(undefined)
  const origin = sig<Origin | undefined>(undefined)

  const queued = (id: string) => Boolean(ctx.threads.current()?.followUps.some(item => item.id === id))

  const reset = () => {
    editing.set(undefined)
    origin.set(undefined)
  }

  const leave = () => {
    const saved = origin.get()
    reset()
    if (!saved) return
    text.set(saved.text)
    files.items.set(saved.items)
  }

  const begin = (item: Pending) => {
    const parts = split(item.prompt)
    origin.set(origin.get() ?? { thread: ctx.threads.current()?.id, text: text.get(), items: files.items.get() })
    text.set(parts.text)
    files.set(parts.items)
    editing.set(item.id)
  }

  const vanish = () => {
    leave()
    ctx.notify?.push('The queued message already started, so editing was cancelled', { level: 'info' })
  }

  effect(() => {
    changes.version.get()
    const id = editing.get()
    const thread = ctx.threads.current()
    if (id && thread && thread.id === origin.get()?.thread && !queued(id)) untrack(vanish)
  })

  const draft = (): Saved => {
    const saved = origin.get()
    return saved ? { text: saved.text, items: contentsOf(saved.items) } : { text: text.get(), items: files.contents() }
  }

  return { editing, queued, begin, leave, vanish, reset, draft }
}
