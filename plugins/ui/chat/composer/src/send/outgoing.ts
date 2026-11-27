import { promptOf } from '@sand/attachments/contract'
import { stored, type Held, type Progress, type Shelves } from '@sand/attachments/web/contract'
import type { UserContent } from '@sand/chats/contract'
import type { KeyVal } from '@sand/keyval'
import { bytes, errorMessage } from '@sand/util'
import { derive, effect, onTimeout, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Destination, Sending } from '../contract'
import type { Saved } from '../drafts/store'
import { contextOf } from '../records'
import type { Outbound, Target } from '../target'

export interface Send {
  id: string
  to: Destination
  draft: Saved
  at: number
  failed?: string
}

export interface SendsSaved {
  load(): Promise<Send[]>
  save(sends: Send[]): Promise<void>
}

interface OutgoingParts {
  target: Target
  shelves: Sig<Shelves | undefined>
  saved: SendsSaved
  returned(send: Send, error: string): boolean
  edit(send: Send): void
}

const SHELVES_WAIT_MS = 30_000

const percent = (sent: number, size: number) => Math.floor((sent / Math.max(1, size)) * 100)

const sendError = (error: unknown) => `Couldn't send: ${errorMessage(error).replace(/\.$/, '')}.`

const files = (count: number) => (count === 1 ? '1 file' : `${count} files`)

export const sendsIn = (database: KeyVal<Send[]>, scope: string): SendsSaved => ({
  load: async () => (await database.get(scope).catch(() => undefined)) ?? [],
  save: sends => (sends.length ? database.put(scope, sends) : database.remove(scope)).catch(() => {}),
})

export const createOutgoing = ({ target, shelves, saved, returned, edit }: OutgoingParts) => {
  const sends = sig<Send[]>([])
  const handed = sig(new Set<string>())
  const chains = new Map<string, Promise<void>>()

  const persist = () => void saved.save(untrack(() => sends.get()))

  const listed = (send: Send) => untrack(() => sends.get()).some(found => found.id === send.id)

  const replace = (id: string, change: (send: Send) => Send[]) => {
    sends.update(all => all.flatMap(send => (send.id === id ? change(send) : [send])))
    persist()
  }

  const remove = (id: string) => replace(id, () => [])

  const fail = (send: Send, error: unknown) => {
    if (!listed(send)) return
    const message = sendError(error)
    if (returned(send, message)) return remove(send.id)
    replace(send.id, found => [{ ...found, failed: message }])
  }

  const loadedShelves = () =>
    new Promise<Shelves>((resolve, reject) => {
      const stopTimer = onTimeout(() => {
        stop()
        reject(new Error('attachments are turned off'))
      }, SHELVES_WAIT_MS)
      const stop = effect(() => {
        const found = shelves.get()
        if (!found) return
        stopTimer()
        onTimeout(() => stop())
        resolve(found)
      })
    })

  const contentOf = async (items: Held[], device: string | undefined): Promise<UserContent[]> => {
    if (items.every(stored)) return items
    return (shelves.get() ?? (await loadedShelves())).content(items, device)
  }

  const outboundOf = async ({ id, draft, to }: Send): Promise<Outbound> => {
    const items = await contentOf(draft.items, to.device)
    return { id, text: draft.text.trim(), content: [...items, ...contextOf(draft.records)], settings: draft.settings ?? {} }
  }

  const hand = (send: Send) => handed.update(ids => new Set(ids).add(send.id))

  const handBack = (send: Send) => handed.update(ids => new Set([...ids].filter(id => id !== send.id)))

  const handOver = async (send: Send, message: Outbound) => {
    hand(send)
    try {
      await target.deliver(send.to, message)
    } finally {
      handBack(send)
    }
  }

  const deliver = async (send: Send) => {
    if (!listed(send)) return
    const message = await outboundOf(send)
    if (!listed(send)) return
    await handOver(send, message)
  }

  const run = (send: Send) => {
    const before = chains.get(send.to.conversation) ?? Promise.resolve()
    const after = before.then(() => deliver(send)).then(
      () => remove(send.id),
      error => fail(send, error),
    )
    chains.set(send.to.conversation, after)
  }

  const add = (send: Send) => {
    sends.update(all => [...all, send])
    persist()
    run(send)
  }

  const retry = (id: string) => {
    const send = sends.get().find(found => found.id === id)
    if (!send?.failed) return
    const again = { ...send, failed: undefined }
    replace(id, () => [again])
    run(again)
  }

  const progressText = ({ sent, size, files: count, stalled }: Progress) => {
    const done = `${percent(sent, size)}%`
    if (stalled === 'offline') return `Waiting for connection · ${done}`
    if (stalled === 'retrying') return `Upload trouble, retrying · ${done}`
    return `Uploading ${files(count)} · ${done} of ${bytes(size)}`
  }

  const behind = (send: Send) => {
    const all = sends.get()
    return all.slice(0, all.indexOf(send)).some(other => !other.failed && other.to.conversation === send.to.conversation)
  }

  const captionOf = (send: Send) => () => {
    if (send.failed) return send.failed
    const progress = shelves.get()?.progress(send.draft.items, send.to.device)
    if (progress) return progressText(progress)
    return behind(send) ? 'Sends after the message above' : 'Sending…'
  }

  const shownPrompt = (send: Send) => {
    const items = shelves.get()?.shown(send.draft.items, send.to.device) ?? send.draft.items.filter(stored)
    return promptOf(send.draft.text.trim(), [...items, ...contextOf(send.draft.records)])
  }

  const changes = (send: Send) => [
    ...(send.failed ? [{ id: 'retry', label: 'Retry', icon: 'retry' as const, run: () => retry(send.id) }] : []),
    {
      id: 'edit',
      label: 'Edit',
      icon: 'pencil' as const,
      run: () => {
        remove(send.id)
        edit(send)
      },
    },
    { id: 'remove', label: 'Remove', icon: 'x' as const, group: 'remove', danger: true, run: () => remove(send.id) },
  ]

  const actionsOf = (send: Send) => (handed.get().has(send.id) ? [] : changes(send))

  const shown = derive(() =>
    sends.get().map(
      (send): Sending => ({
        id: send.id,
        conversation: target.shownIn(send.to),
        prompt: untrack(() => shownPrompt(send)),
        at: send.at,
        failed: Boolean(send.failed),
        caption: captionOf(send),
        actions: actionsOf(send),
      }),
    ),
  )

  const resume = async () => {
    const found = await saved.load()
    sends.update(all => [...found.filter(send => !all.some(known => known.id === send.id)), ...all])
    for (const send of found) if (!send.failed) run(send)
  }

  return { add, retry, resume, sending: () => shown.get() }
}

export type Outgoing = ReturnType<typeof createOutgoing>
