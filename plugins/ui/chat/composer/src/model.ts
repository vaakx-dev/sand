import type { Held, Shelves } from '@sand/attachments/web/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { SendOptions } from '@sand/web-client/contract'
import { derive, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { commandChar } from './complete/detect'
import { boundTriggers, type Triggers } from './complete/registry'
import type { Command } from './contract'
import type { Saved } from './drafts/store'
import { createRecords } from './records'
import { createHolds } from './send/holds'
import type { Outgoing, Target } from './target'

interface Typed {
  text: string
  items: Held[]
}

interface Retry {
  typed: Typed
  options: Outgoing
}

const applied = (settings: SessionSettings, patch: SettingsPatch): SessionSettings => {
  const { model, effort, speed } = { ...settings, ...patch }
  return { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
}

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
  const running = derive(() => target.running())
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

  const fail = (message: string) => failure.set({ text: message })

  const couldNotSend = (outgoing: Retry, error: unknown) =>
    failure.set({ text: `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}. Your message is still here.`, retry: outgoing })

  const typed = (): Typed => ({ text: text.get(), items: attached.get() })

  const unchanged = (before: Typed) => {
    const now = typed()
    return now.text === before.text && now.items.length === before.items.length && now.items.every((item, at) => item === before.items[at])
  }

  const requestId = () => {
    const failed = failure.get()?.retry
    return failed && unchanged(failed.typed) ? failed.options.clientRequestId : crypto.randomUUID()
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

  const triggers = boundTriggers(registries, command => void runCommand(command))

  const sendPrompt = (outgoing: Retry) => {
    const task = async () => {
      const items = await upload()
      const value = outgoing.typed.text.trim()
      await target.send(value, [...items, ...records.content(value)], picked.get(), outgoing.options)
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
    if (!value && !withAttachments) return target.interrupt().catch(error => fail(errorMessage(error)))
    if ((value || withAttachments) && !target.ready(picked.get())) return
    return sendPrompt({ typed: typed(), options: { mode, clientRequestId: requestId() } })
  }

  return {
    target,
    text,
    attached,
    shelf,
    upload,
    records,
    triggers,
    picked,
    choose: (patch: SettingsPatch) => picked.update(current => applied(current, patch)),
    failure,
    sending,
    running,
    delivery,
    pcName,
    empty,
    blocked,
    holds,
    send,
    resend: sendPrompt,
    clear,
    fail,
    draft: (): Saved => ({ text: text.get(), items: attached.get(), records: records.linked(text.get()), settings: picked.get() }),
  }
}

export type Model = ReturnType<typeof createModel>
