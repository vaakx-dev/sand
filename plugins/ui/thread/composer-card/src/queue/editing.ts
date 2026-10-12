import type { UserContent } from '@sand/messages'
import type { Pending } from '@sand/steering/contract'
import type { Pulse } from '@sand/kit/web'
import { effect, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { split } from '../attachments/content'
import { contentsOf, type Attached, type Files } from '../attachments/files'
import type { Saved } from '../drafts/store'

interface Origin {
  thread?: string
  text: string
  items: Attached[]
}

const same = (left: UserContent[], right: UserContent[]) => left.length === right.length && left.every((item, index) => item === right[index])

const inlineFiles = async (ctx: Context<'threads'>, files: Files, items: UserContent[], current: () => boolean) => {
  if (!ctx.media || !items.length) return
  const inlined = await ctx.media.inline(items, ctx.threads.current()?.id).catch(() => items)
  if (current() && same(files.contents(), items) && !same(inlined, items)) files.set(inlined)
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
    void inlineFiles(ctx, files, parts.items, () => editing.get() === item.id)
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
