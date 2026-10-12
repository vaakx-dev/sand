import type { UserContent } from '@sand/messages'
import type { FollowUpMode } from '@sand/web-client/contract'
import type { ComposerCapture } from './contract'
import { errorMessage } from '@sand/kit'
import { pulse } from '@sand/kit/web'
import { derive, effect, sig, stored, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { createWorking } from './agents/working'
import { compose } from './attachments/content'
import { createFiles, type Attached } from './attachments/files'
import { createSegments } from './editor/segments'
import { createEditing } from './queue/editing'
import { chooseModel, modelMissing, retry, submit } from './send/submit'

type Ctx = Context<'threads' | 'turns'>

interface Typed {
  text: string
  items: Attached[]
}

const isMode = (value: unknown) => value === 'queue' || value === 'steer'

const commandLike = /^\/[a-z]/

const turnErrorOf = (ctx: Ctx, dismissed: Set<string>) => {
  const thread = ctx.threads.current()
  if (!thread || thread.running || thread.ended?.stopReason !== 'error') return undefined
  const key = `${thread.id}:${thread.info.head}`
  if (dismissed.has(key)) return undefined
  const via = ctx.models?.info(ctx.models.settings(thread.id)?.model)?.via
  return { key, text: thread.ended.error ?? 'Unknown error', detail: thread.ended.detail, via }
}

export type TurnError = NonNullable<ReturnType<typeof turnErrorOf>>

export const createModel = (ctx: Ctx) => {
  const text = sig('')
  const segments = createSegments(text)
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
  const turnError = changes.read(() => turnErrorOf(ctx, dismissed.get()))
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

  const fail = (message: string) => failure.set({ text: message, retry: false })

  const couldNotSend = (error: unknown) =>
    failure.set({ text: `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}. Your message is still here.`, retry: true })

  const typed = (): Typed => ({ text: text.get(), items: files.items.get() })

  const unchanged = (before: Typed) => text.get() === before.text && files.items.get() === before.items

  const attempt = async (busy: boolean, task: () => Promise<void>, failed: (error: unknown) => void) => {
    failure.set(undefined)
    sending.set(busy)
    try {
      await task()
    } catch (error) {
      failed(error)
    } finally {
      sending.set(false)
    }
  }

  const answer = (active: ComposerCapture, value: string) => {
    const before = text.get()
    const task = async () => {
      await active.send(value)
      if (text.get() === before) text.set('')
    }
    return attempt(true, task, error => fail(errorMessage(error)))
  }

  const runCommand = (value: string) => {
    const before = text.get()
    const task = async () => {
      clear()
      await submit(ctx, value, [])
    }
    return attempt(false, task, error => {
      if (!text.get()) text.set(before)
      fail(errorMessage(error))
    })
  }

  const saveEdit = (id: string, value: string, items: UserContent[]) => {
    const thread = ctx.threads.current()
    if (!thread || !edits.queued(id)) return edits.vanish()
    const before = typed()
    const task = async () => {
      await ctx.turns.edit(thread.id, id, items.length ? compose(value, items) : value)
      if (unchanged(before) && editing.get() === id) edits.leave()
    }
    return attempt(true, task, couldNotSend)
  }

  const sendPrompt = (value: string, items: UserContent[]) => {
    const before = typed()
    const task = async () => {
      await submit(ctx, value, items, running.get() ? mode.get() : undefined)
      if (unchanged(before)) clear()
    }
    return attempt(true, task, couldNotSend)
  }

  const send = async () => {
    if (sending.get() || blocked.get()) return
    const value = text.get().trim()
    const active = capture.get()
    if (active && !commandLike.test(value)) return answer(active, value)
    const id = editing.get()
    const items = files.contents()
    if (id) return empty.get() ? undefined : saveEdit(id, value, items)
    if (!items.length && commandLike.test(value)) return runCommand(value)
    if ((value || items.length) && modelMissing(ctx)) return attempt(false, () => chooseModel(ctx), error => fail(errorMessage(error)))
    return sendPrompt(value, items)
  }

  return {
    text,
    segments,
    files,
    failure,
    editing,
    sending,
    mode,
    running,
    idle,
    online,
    empty,
    loading,
    blocked,
    changes,
    capture,
    turnError,
    working: createWorking(ctx),
    send,
    clear,
    fail,
    addCapture,
    edit: edits.begin,
    draft: edits.draft,
    cancelEdit: edits.leave,
    retryTurn: () => void retry(ctx).catch(error => fail(errorMessage(error))),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type Model = ReturnType<typeof createModel>
