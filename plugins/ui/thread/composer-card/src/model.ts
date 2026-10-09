import type { FollowUpMode } from '@sand/web-client/contract'
import type { ComposerCapture } from './contract'
import { derive, effect, errorMessage, pulse, sig, stored, untrack } from '@sand/dom'
import type { Context } from 'drydock'
import { createWorking } from './agents/working'
import { compose } from './attachments/content'
import { createFiles } from './attachments/files'
import { createEditing } from './queue/editing'
import { retry, submit } from './send/submit'

const isMode = (value: unknown) => value === 'queue' || value === 'steer'

const commandLike = /^\/[a-z]/

export const createModel = (ctx: Context<'threads' | 'turns'>) => {
  const text = sig('')
  const files = createFiles(() => ctx.wire?.hello()?.attachments)
  const failure = sig<{ text: string; retry: boolean } | undefined>(undefined)
  const sending = sig(false)
  const mode = stored<FollowUpMode>('sand.follow-up-mode', 'queue', isMode)
  const dismissed = sig(new Set<string>())
  const changes = pulse(ctx, ['thread.select', 'commands.change', 'wire.state', 'models.change'], ['commands', 'wire'])
  ctx.on('thread.change', id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })

  const running = changes.read(() => Boolean(ctx.threads.current()?.running))
  const idle = changes.read(() => ctx.threads.idle())
  const online = changes.read(() => !ctx.wire || ctx.wire.state() === 'open')
  const edits = createEditing(ctx, text, files, changes)
  const { editing } = edits
  const empty = derive(() => !text.get().trim() && !files.items.get().length)
  const loading = derive(() => files.loading())
  const blocked = derive(() => Boolean(files.rejected()) || files.loading())
  const captures = sig<ComposerCapture[]>([])
  const capture = derive(() => (editing.get() || files.items.get().length ? undefined : captures.get().at(-1)))
  effect(() => {
    const active = capture.get()
    const value = text.get()
    untrack(() => active?.input?.(value))
  })

  const addCapture = (entry: ComposerCapture) => {
    captures.update(list => [...list, entry])
    return () => captures.update(list => list.filter(other => other !== entry))
  }

  const clear = () => {
    text.set('')
    files.set([])
    edits.reset()
  }

  const finish = (id: string | undefined) => {
    if (!id) return clear()
    if (editing.get() === id) edits.leave()
  }

  const answer = async (active: ComposerCapture, value: string) => {
    const before = text.get()
    failure.set(undefined)
    sending.set(true)
    try {
      await active.send(value)
      if (text.get() === before) text.set('')
    } catch (error) {
      failure.set({ text: errorMessage(error), retry: false })
    } finally {
      sending.set(false)
    }
  }

  const send = async () => {
    if (sending.get() || blocked.get()) return
    const value = text.get().trim()
    const active = capture.get()
    if (active && !commandLike.test(value)) return answer(active, value)
    const items = files.contents()
    const before = { text: text.get(), items: files.items.get() }
    const id = editing.get()
    if (id && empty.get()) return
    if (id && !edits.queued(id)) return edits.vanish()
    const command = !id && !items.length && commandLike.test(value)
    failure.set(undefined)
    sending.set(!command)
    if (command) clear()
    try {
      if (id) await ctx.turns.edit(ctx.threads.current()!.id, id, items.length ? compose(value, items) : value)
      else await submit(ctx, value, items, running.get() ? mode.get() : undefined)
      if (!command && text.get() === before.text && files.items.get() === before.items) finish(id)
    } catch (error) {
      if (command && !text.get()) text.set(before.text)
      failure.set(command ? { text: errorMessage(error), retry: false } : { text: `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}. Your message is still here.`, retry: true })
    } finally {
      sending.set(false)
    }
  }

  const turnError = changes.read(() => {
    const thread = ctx.threads.current()
    const ended = thread && !thread.running ? thread.ended : undefined
    if (ended?.stopReason !== 'error') return undefined
    const key = `${thread!.id}:${thread!.info.head}`
    const via = ctx.models?.info(ctx.models.settings(thread!.id)?.model)?.via
    return dismissed.get().has(key) ? undefined : { key, text: ended.error ?? 'Unknown error', detail: ended.detail, via }
  })

  return {
    text,
    files,
    failure,
    editing,
    sending,
    mode,
    running,
    idle,
    online,
    empty,
    blocked,
    changes,
    working: createWorking(ctx),
    turnError,
    send,
    edit: edits.begin,
    draft: edits.draft,
    loading,
    capture,
    addCapture,
    clear,
    setMode: (next: FollowUpMode) => mode.set(next),
    cancelEdit: edits.leave,
    retryTurn: () => void retry(ctx).catch(error => failure.set({ text: errorMessage(error), retry: false })),
    fail: (text: string) => failure.set({ text, retry: false }),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type Model = ReturnType<typeof createModel>
