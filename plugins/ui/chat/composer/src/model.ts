import { stored, type Held, type Shelves } from '@sand/attachments/web/contract'
import type { SessionSettings, SettingsPatch } from '@sand/model/contract'
import { errorMessage } from '@sand/util'
import type { SendOptions } from '@sand/web-client/contract'
import { derive, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import { commandChar } from './complete/detect'
import { boundTriggers, type Triggers } from './complete/registry'
import type { Command, ComposerContent } from './contract'
import type { Saved } from './drafts/store'
import { contextOf, createRecords } from './records'
import { createHolds } from './send/holds'
import { createOutgoing, type Send, type SendsSaved } from './send/outgoing'
import type { Target } from './target'

interface Failure {
  text: string
  retry?: Send
}

const applied = (settings: SessionSettings, patch: SettingsPatch): SessionSettings => {
  const { model, effort, speed } = { ...settings, ...patch }
  return { ...(model && { model }), ...(effort && { effort }), ...(speed && { speed }) }
}

const joined = (before: string, after: string) => (before.trim() && after.trim() ? `${before.trim()}\n\n${after.trim()}` : before.trim() || after.trim())

export const createModel = (target: Target, registries: Triggers[], shelves: Sig<Shelves | undefined>, saved: SendsSaved) => {
  const text = sig('')
  const attached = sig<Held[]>([])
  const shelf = derive(() => {
    const found = shelves.get()
    return untrack(() => found?.create(attached, target.place))
  })
  const attachments = derive(() => (shelf.get() ? attached.get() : []))
  const records = createRecords()
  const picked = sig<SessionSettings>({})
  const failure = sig<Failure | undefined>(undefined)
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

  const fill = (draft: Saved) => {
    records.list.set(draft.records ?? [])
    text.set(draft.text)
    attached.set(draft.items)
    picked.set(draft.settings ?? {})
  }

  const merge = (draft: Saved) => {
    records.add(draft.records ?? [])
    text.update(typed => joined(typed, draft.text))
    attached.update(list => [...list, ...draft.items])
  }

  const reset = () => {
    clear()
    failure.set(undefined)
  }

  const fail = (message: string) => failure.set({ text: message })

  const draft = (): Saved => ({ text: text.get(), items: attached.get(), records: records.linked(text.get()), settings: picked.get() })

  const unchanged = (before: Saved) => {
    const now = draft()
    return now.text === before.text && now.items.length === before.items.length && now.items.every((item, at) => item === before.items[at])
  }

  const putBack = (saved: Saved, message: string, retry?: Send) => {
    const restored = empty.get()
    if (restored) fill(saved)
    failure.set({ text: restored ? `${message} Your message is still here.` : message, ...(retry && { retry }) })
  }

  const showing = (send: Send) => target.conversation() === target.shownIn(send.to)

  const outgoing = createOutgoing({
    target,
    shelves,
    saved,
    returned(send, message) {
      if (!showing(send) || !empty.get()) return false
      putBack(send.draft, message, send)
      return true
    },
    edit: send => merge(send.draft),
  })

  const requestId = () => {
    const failed = failure.get()?.retry
    return failed && unchanged(failed.draft) ? failed.id : crypto.randomUUID()
  }

  const uploaded = (items: Held[]) => shelves.get()?.uploaded(items, target.place.device()) ?? items.filter(stored)

  const content = async (saved: Saved): Promise<ComposerContent> => {
    const items = (await shelves.get()?.content(saved.items, target.place.device())) ?? saved.items.filter(stored)
    return { text: saved.text.trim(), content: [...items, ...contextOf(saved.records)] }
  }

  const runCommand = async (command: Command) => {
    const before = text.get()
    text.set('')
    failure.set(undefined)
    try {
      await command.run(target.chat())
    } catch (error) {
      if (!text.get()) text.set(before)
      fail(errorMessage(error))
    }
  }

  const triggers = boundTriggers(registries, command => void runCommand(command))

  const sendPrompt = (send: Send) => {
    failure.set(undefined)
    if (unchanged(send.draft)) clear()
    outgoing.add(send)
  }

  const resend = (send: Send) => {
    const to = target.destination()
    if (to) sendPrompt({ ...send, to, at: Date.now(), failed: undefined })
  }

  const send = async (mode?: SendOptions['mode']) => {
    if (blocked.get() || holds.reason.get()) return
    const value = text.get().trim()
    const withAttachments = attachments.get().length > 0
    const command = value.startsWith(commandChar) ? triggers.named(value.slice(1)) : undefined
    if (command && !withAttachments) return runCommand(command)
    if (!value && !withAttachments) return target.interrupt().catch(error => fail(errorMessage(error)))
    const to = target.destination()
    if (!to || !target.ready(picked.get())) return
    sendPrompt({ id: requestId(), to, draft: draft(), at: Date.now(), ...(mode && { mode }) })
  }

  return {
    target,
    text,
    attached,
    shelf,
    content,
    uploaded,
    records,
    triggers,
    picked,
    choose: (patch: SettingsPatch) => picked.update(current => applied(current, patch)),
    failure,
    running,
    stoppable,
    delivery,
    pcName,
    empty,
    blocked,
    holds,
    send,
    resend,
    sending: outgoing.sending,
    waiting: () => outgoing.sending().some(send => send.conversation === target.conversation()),
    resume: outgoing.resume,
    clear,
    fill,
    merge,
    reset,
    putBack,
    fail,
    draft,
  }
}

export type Model = ReturnType<typeof createModel>
