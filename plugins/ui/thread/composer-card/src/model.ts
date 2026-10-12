import type { ComposerCapture } from './contract'
import { errorMessage } from '@sand/kit'
import { pulse } from '@sand/kit/web'
import { derive, effect, sig, untrack } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { createWorking } from './agents/working'
import { createFiles } from './attachments/files'
import type { Saved } from './drafts/store'
import { createSegments } from './editor/segments'
import { chooseModel, modelMissing, retry, sendDevice, submit } from './send/submit'

type Ctx = Context<'threads' | 'turns'>

interface Typed {
  text: string
  ids: string
}

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
  const files = createFiles(ctx)
  const failure = sig<{ text: string; retry: boolean } | undefined>(undefined)
  const sending = sig(false)
  const dismissed = sig(new Set<string>())
  const changes = pulse(ctx, ['thread.select', 'commands.change', 'wire.state', 'models.change'], ['commands', 'wire'])
  ctx.on('thread.change', id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })

  const running = changes.read(() => Boolean(ctx.threads.current()?.running))
  const idle = changes.read(() => ctx.threads.idle())
  const online = changes.read(() => !ctx.wire || ctx.wire.state() === 'open')
  const turnError = changes.read(() => turnErrorOf(ctx, dismissed.get()))
  const empty = derive(() => !text.get().trim() && !files.items.get().length)
  const loading = derive(() => files.loading())
  const blocked = derive(() => Boolean(files.rejected()) || files.loading())
  const captures = sig<ComposerCapture[]>([])
  const capture = derive(() => (files.items.get().length ? undefined : captures.get().at(-1)))
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
  }

  const fail = (message: string) => failure.set({ text: message, retry: false })

  const couldNotSend = (error: unknown) =>
    failure.set({ text: `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}. Your message is still here.`, retry: true })

  const typed = (): Typed => ({ text: text.get(), ids: files.items.get().map(item => item.id).join() })

  const unchanged = (before: Typed) => {
    const now = typed()
    return now.text === before.text && now.ids === before.ids
  }

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

  const sendPrompt = (value: string) => {
    const before = typed()
    const task = async () => {
      const items = await files.upload(sendDevice(ctx))
      await submit(ctx, value, items)
      if (unchanged(before)) clear()
    }
    return attempt(true, task, couldNotSend)
  }

  const send = async () => {
    if (sending.get() || blocked.get()) return
    const value = text.get().trim()
    const active = capture.get()
    if (active && !commandLike.test(value)) return answer(active, value)
    const attached = files.items.get().length > 0
    if (!attached && commandLike.test(value)) return runCommand(value)
    if ((value || attached) && modelMissing(ctx)) return attempt(false, () => chooseModel(ctx), error => fail(errorMessage(error)))
    return sendPrompt(value)
  }

  return {
    text,
    segments,
    files,
    failure,
    sending,
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
    draft: (): Saved => ({ text: text.get(), items: files.held() }),
    retryTurn: () => void retry(ctx).catch(error => fail(errorMessage(error))),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type Model = ReturnType<typeof createModel>
