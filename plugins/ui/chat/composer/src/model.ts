import { promptOf } from '@sand/attachments/contract'
import type { Held, Shelves } from '@sand/attachments/web/contract'
import type { UserContent } from '@sand/chats/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { SendOptions } from '@sand/web-client/contract'
import { derive, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { commandChar } from './complete/detect'
import { boundTriggers, type Triggers } from './complete/registry'
import type { Command, ComposerContent, Sending } from './contract'
import type { Saved } from './drafts/store'
import { contextOf, createRecords } from './records'
import { createHolds } from './send/holds'
import type { Outgoing, Target } from './target'

interface Retry {
  draft: Saved
  options: Outgoing
}

const applied = (settings: SessionSettings, patch: SettingsPatch): SessionSettings => {
  const { model, effort, speed } = { ...settings, ...patch }
  return { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
}

const uploaded = (item: Held): item is UserContent => !(item instanceof File)

const sendError = (error: unknown) => `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}.`

export const createModel = (target: Target, registries: Triggers[], shelves: Sig<Shelves | undefined>) => {
  const text = sig('')
  const attached = sig<Held[]>([])
  const shelf = derive(() => {
    const found = shelves.get()
    return untrack(() => found?.create(attached, target.place))
  })
  const attachments = derive(() => (shelf.get() ? attached.get() : []))
  const records = createRecords()
  const picked = sig<SessionSettings>({})
  const failure = sig<{ text: string; retry?: Retry } | undefined>(undefined)
  const sending = sig(false)
  const outgoing = sig<Saved | undefined>(undefined)
  const shown = sig<Sending | undefined>(undefined)
  const running = derive(() => target.running())
  const stoppable = derive(() => target.stoppable())
  const delivery = derive(() => target.delivery())
  const pcName = derive(() => target.pcName())
  const empty = derive(() => !text.get().trim() && !attachments.get().length)
  const blocked = derive(() => Boolean(shelf.get()?.rejected()))
  const holds = createHolds()
  const clear = () => {
    text.set('')
    attached.set([])
    records.list.set([])
    picked.set({})
  }

  const fill = (saved: Saved) => {
    records.list.set(saved.records ?? [])
    text.set(saved.text)
    attached.set(saved.items)
    picked.set(saved.settings ?? {})
  }

  const reset = () => {
    clear()
    failure.set(undefined)
    outgoing.set(undefined)
  }

  const fail = (message: string) => failure.set({ text: message })

  const typed = (): Saved => ({ text: text.get(), items: attached.get(), records: records.linked(text.get()), settings: picked.get() })

  const draft = (): Saved => (empty.get() ? (outgoing.get() ?? typed()) : typed())

  const unchanged = (before: Saved) => {
    const now = typed()
    return now.text === before.text && now.items.length === before.items.length && now.items.every((item, at) => item === before.items[at])
  }

  const putBack = (saved: Saved, message: string, retry?: Retry) => {
    const restored = empty.get()
    if (restored) fill(saved)
    failure.set({ text: restored ? `${message} Your message is still here.` : message, retry })
  }

  const requestId = () => {
    const failed = failure.get()?.retry
    return failed && unchanged(failed.draft) ? failed.options.clientRequestId : crypto.randomUUID()
  }

  const upload = (items: Held[]) => shelf.get()?.upload(items) ?? Promise.resolve([])

  const content = async (saved: Saved): Promise<ComposerContent> => {
    const items = await upload(saved.items)
    return { text: saved.text.trim(), content: [...items, ...contextOf(saved.records)] }
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

  const runCommand = (command: Command) => {
    const before = text.get()
    text.set('')
    return attempt(false, async () => command.run(), error => {
      if (!text.get()) text.set(before)
      fail(errorMessage(error))
    })
  }

  const triggers = boundTriggers(registries, command => void runCommand(command))

  const show = ({ options }: Retry, { text: said, content: parts }: ComposerContent, uploading: boolean) =>
    shown.set({ id: options.clientRequestId, conversation: target.conversation() ?? '', prompt: promptOf(said, parts), at: Date.now(), uploading })

  const deliver = async (retry: Retry) => {
    const { draft: saved, options } = retry
    show(retry, { text: saved.text.trim(), content: [...saved.items.filter(uploaded), ...contextOf(saved.records)] }, !saved.items.every(uploaded))
    const prompt = await content(saved)
    show(retry, prompt, false)
    await target.send(prompt.text, prompt.content, saved.settings ?? {}, options)
  }

  const sendPrompt = (retry: Retry) => {
    outgoing.set(retry.draft)
    if (unchanged(retry.draft)) clear()
    const ours = () => outgoing.get() === retry.draft
    const settle = (error?: unknown) => {
      shown.set(undefined)
      if (!ours()) return
      outgoing.set(undefined)
      if (error) putBack(retry.draft, sendError(error), retry)
    }
    return attempt(true, () => deliver(retry).then(() => settle()), settle)
  }

  const send = async (mode?: SendOptions['mode']) => {
    if (sending.get() || blocked.get() || holds.reason.get()) return
    const value = text.get().trim()
    const withAttachments = attachments.get().length > 0
    const command = value.startsWith(commandChar) ? triggers.named(value.slice(1)) : undefined
    if (command && !withAttachments) return runCommand(command)
    if (!value && !withAttachments) return target.interrupt().catch(error => fail(errorMessage(error)))
    if (!target.ready(picked.get())) return
    return sendPrompt({ draft: typed(), options: { mode, clientRequestId: requestId() } })
  }

  return {
    target,
    text,
    attached,
    shelf,
    content,
    records,
    triggers,
    picked,
    choose: (patch: SettingsPatch) => picked.update(current => applied(current, patch)),
    failure,
    sending,
    shown,
    running,
    stoppable,
    delivery,
    pcName,
    empty,
    blocked,
    holds,
    send,
    resend: sendPrompt,
    clear,
    fill,
    reset,
    putBack,
    fail,
    draft,
    upload,
  }
}

export type Model = ReturnType<typeof createModel>
