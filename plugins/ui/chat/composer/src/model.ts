import { shelves, type Held, type Shelf } from '@sand/attachments/web/contract'
import { pcs, pcsChange, wire } from '@sand/devices-contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { modelPill } from '@sand/model-panel/contract'
import { errorMessage } from '@sand/util'
import { models, modelsChange, outbox, outboxChange, type SendOptions, threadChange, threadSelect } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import { commandChar } from './complete/detect'
import { createTriggers } from './complete/registry'
import type { ComposerContext } from './context'
import type { Command } from './contract'
import type { Saved } from './drafts/store'
import { createRecords } from './records'
import { createHolds } from './send/holds'
import { modelMissing, retry, sendDevice, submit } from './send/submit'

interface Typed {
  text: string
  items: Held[]
}

interface Outgoing {
  typed: Typed
  options: Pick<SendOptions, 'mode' | 'clientRequestId'>
}

type Delivery = 'now' | 'queued' | 'unreachable'

const deliveryOf = (ctx: ComposerContext): Delivery => {
  const pc = sendDevice(ctx)
  if (ctx.get(wire)?.ready(pc) ?? true) return 'now'
  return ctx.threads.current() && ctx.get(outbox)?.accepts(pc) ? 'queued' : 'unreachable'
}

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

const applied = (settings: SessionSettings, patch: SettingsPatch): SessionSettings => {
  const { model, effort, speed } = { ...settings, ...patch }
  return { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
}

export const createModel = (ctx: ComposerContext) => {
  const text = sig('')
  const attached = sig<Held[]>([])
  const shelf = sig<Shelf | undefined>(undefined)
  ctx.watch(shelves, found => shelf.set(found?.create(attached, { device: () => sendDevice(ctx), thread: () => ctx.threads.current()?.id })))
  const attachments = derive(() => (shelf.get() ? attached.get() : []))
  const records = createRecords()
  const picked = sig<SessionSettings>({})
  const failure = sig<{ text: string; retry?: Outgoing } | undefined>(undefined)
  const sending = sig(false)
  const dismissed = sig(new Set<string>())
  const changes = pulse(ctx, [threadSelect, pcsChange, modelsChange, outboxChange], [wire, pcs, outbox])
  ctx.on(threadChange, id => {
    if (id === ctx.threads.current()?.id) changes.bump()
  })

  const running = changes.read(() => Boolean(ctx.threads.current()?.running))
  const idle = changes.read(() => !ctx.threads.current())
  const delivery = changes.read(() => deliveryOf(ctx))
  const pcName = changes.read(() => ctx.get(pcs)?.name(sendDevice(ctx)) ?? 'sand')
  const turnError = changes.read(() => turnErrorOf(ctx, dismissed.get()))
  const empty = derive(() => !text.get().trim() && !attachments.get().length)
  const blocked = derive(() => Boolean(shelf.get()?.rejected()))
  const holds = createHolds()
  const clear = () => {
    text.set('')
    attached.set([])
    records.list.set([])
    picked.set({})
  }

  const settings = (): SessionSettings => {
    const known = ctx.get(models)
    const pick = picked.get()
    const usable = Boolean(pick.model && known?.info(pick.model))
    return { ...known?.defaults(), ...(usable && pick) }
  }

  const fail = (message: string) => failure.set({ text: message })

  const couldNotSend = (outgoing: Outgoing, error: unknown) =>
    failure.set({ text: `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}. Your message is still here.`, retry: outgoing })

  const typed = (): Typed => ({ text: text.get(), items: attached.get() })

  const unchanged = (before: Typed) => {
    const now = typed()
    return now.text === before.text && now.items.length === before.items.length && now.items.every((item, at) => item === before.items[at])
  }

  const upload = () => shelf.get()?.upload() ?? Promise.resolve([])

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

  const runCommand = (command: Command) => {
    const before = text.get()
    text.set('')
    return attempt(false, async () => command.run(), error => {
      if (!text.get()) text.set(before)
      fail(errorMessage(error))
    })
  }

  const triggers = createTriggers(command => void runCommand(command))

  const sendPrompt = (outgoing: Outgoing) => {
    const task = async () => {
      const items = await upload()
      const value = outgoing.typed.text.trim()
      await submit(ctx, value, [...items, ...records.content(value)], settings(), outgoing.options)
      if (unchanged(outgoing.typed)) clear()
    }
    return attempt(true, task, error => couldNotSend(outgoing, error))
  }

  const send = async (mode?: SendOptions['mode']) => {
    if (sending.get() || blocked.get() || holds.reason.get()) return
    const value = text.get().trim()
    const withAttachments = attachments.get().length > 0
    const command = value.startsWith(commandChar) ? triggers.named(value.slice(1)) : undefined
    if (command && !withAttachments) return runCommand(command)
    const pill = ctx.get(modelPill)
    if ((value || withAttachments) && modelMissing(ctx, settings()) && pill) return pill.open()
    return sendPrompt({ typed: typed(), options: { mode, clientRequestId: crypto.randomUUID() } })
  }

  return {
    text,
    attached,
    shelf,
    upload,
    records,
    triggers,
    picked,
    settings,
    choose: (patch: SettingsPatch) => picked.update(current => applied(current, patch)),
    failure,
    sending,
    running,
    idle,
    delivery,
    pcName,
    empty,
    blocked,
    holds,
    changes,
    turnError,
    send,
    resend: sendPrompt,
    clear,
    fail,
    draft: (): Saved => ({ text: text.get(), items: attached.get(), records: records.linked(text.get()), settings: picked.get() }),
    retryTurn: () => void retry(ctx).catch(error => fail(errorMessage(error))),
    dismiss: (key: string) => dismissed.update(keys => new Set([...keys, key])),
  }
}

export type Model = ReturnType<typeof createModel>
