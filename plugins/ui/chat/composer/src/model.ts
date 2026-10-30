import { pcs, pcsChange, wire } from '@sand/devices-contract'
import { modelPill } from '@sand/model-panel/contract'
import { pluginReload } from '@sand/reload/contract'
import { errorMessage } from '@sand/util'
import { models, modelsChange, threadChange, threadSelect } from '@sand/web-client/contract'
import { pulse } from '@sand/web-client/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import { createFiles } from './attachments/files'
import type { ComposerContext } from './context'
import type { Saved } from './drafts/store'
import { createSegments } from './editor/segments'
import { createHolds } from './send/holds'
import { modelMissing, retry, sendDevice, submit } from './send/submit'

interface Typed {
  text: string
  ids: string
}

const reloadText = '/reload'

const turnErrorOf = (ctx: ComposerContext, dismissed: Set<string>) => {
  const thread = ctx.threads.current()
  if (!thread || thread.running || thread.ended?.stopReason !== 'error') return undefined
  const key = `${thread.id}:${thread.info.head}`
  if (dismissed.has(key)) return undefined
  const known = ctx.get(models)
  const info = known?.info(known.settings(thread.id)?.model)
  const source = info?.source ? known?.sources().find(found => found.id === info.source) : undefined
  return { key, text: thread.ended.error ?? 'Unknown error', detail: thread.ended.detail, via: info?.via, viaOffline: source?.online === false }
}

export type TurnError = NonNullable<ReturnType<typeof turnErrorOf>>

export const createModel = (ctx: ComposerContext) => {
  const text = sig('')
  const segments = createSegments(text)
  const files = createFiles(ctx)
  const failure = sig<{ text: string; retry: boolean } | undefined>(undefined)
  const sending = sig(false)
  const dismissed = sig(new Set<string>())
  const changes = pulse(ctx, [threadSelect, pcsChange, modelsChange], [wire, pcs])
  ctx.on(threadChange, id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })

  const running = changes.read(() => Boolean(ctx.threads.current()?.running))
  const idle = changes.read(() => !ctx.threads.current())
  const online = changes.read(() => ctx.get(wire)?.ready(sendDevice(ctx)) ?? true)
  const pcName = changes.read(() => ctx.get(pcs)?.name(sendDevice(ctx)) ?? 'sand')
  const turnError = changes.read(() => turnErrorOf(ctx, dismissed.get()))
  const empty = derive(() => !text.get().trim() && !files.items.get().length)
  const blocked = derive(() => files.rejected())
  const holds = createHolds()
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

  const reload = (run: () => Promise<void>) => {
    const before = text.get()
    const task = async () => {
      clear()
      await run()
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
    if (sending.get() || blocked.get() || holds.reason.get()) return
    const value = text.get().trim()
    const attached = files.items.get().length > 0
    const reloader = ctx.get(pluginReload)
    if (!attached && value === reloadText && reloader) return reload(reloader.run)
    const pill = ctx.get(modelPill)
    if ((value || attached) && modelMissing(ctx) && pill) return pill.open()
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
    pcName,
    empty,
    blocked,
    holds,
    changes,
    turnError,
    send,
    clear,
    fail,
    draft: (): Saved => ({ text: text.get(), items: files.held() }),
    retryTurn: () => void retry(ctx).catch(error => fail(errorMessage(error))),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type Model = ReturnType<typeof createModel>
