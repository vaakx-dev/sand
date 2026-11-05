import { isPcUnavailable } from '@sand/devices-contract'
import type { SendResult } from '@sand/turns-contract/contract'
import { errorMessage } from '@sand/util'
import type { Outbox, OutboxItem } from '../contract'
import { after } from '../detached'
import type { Link } from './link'

export interface SavedPc {
  pc: string
  turnsApi: boolean
}

export interface Saved {
  items: OutboxItem[]
  pcs: SavedPc[]
}

export interface OutboxSaved {
  load(): Promise<Saved>
  put(item: OutboxItem): Promise<void>
  remove(id: string): Promise<void>
  remember(pc: SavedPc): Promise<void>
}

interface OutboxOptions {
  link: Link
  saved: OutboxSaved
  sent(item: OutboxItem, result: SendResult): void
  changed(): void
}

type Outcome = 'sent' | 'unanswered' | { error: string }

const attempts = 4
const retryDelay = 2_000
const hubUnanswered = new Set(['The sand runtime stopped', 'sand is not running a runtime right now'])

const wait = (ms: number) => new Promise<void>(resolve => after(ms, resolve))

const unanswered = (error: unknown) =>
  isPcUnavailable(error) || (error instanceof Error && (error.name === 'TimedOut' || hubUnanswered.has(error.message)))

const byAge = (a: OutboxItem, b: OutboxItem) => a.at - b.at

export const createOutbox = ({ link, saved, sent, changed }: OutboxOptions) => {
  const items = new Map<string, OutboxItem>()
  const turnsApi = new Map<string, boolean>()
  const sending = new Set<string>()
  const flushing = new Set<string>()

  const restore = (found: Saved) => {
    for (const item of found.items) if (!items.has(item.id)) items.set(item.id, item)
    for (const { pc, turnsApi: api } of found.pcs) if (!turnsApi.has(pc)) turnsApi.set(pc, api)
    changed()
  }

  const loaded = saved.load().then(restore, () => {})

  const list = (pc: string) => [...items.values()].filter(item => item.pc === pc).sort(byAge)

  const next = (pc: string) => list(pc).find(item => !item.error)

  const keep = (item: OutboxItem) => {
    items.set(item.id, item)
    void saved.put(item)
    changed()
  }

  const drop = (id: string) => {
    items.delete(id)
    void saved.remove(id)
    changed()
  }

  const deliver = async (item: OutboxItem) => {
    const { id, session, prompt, mode, label, settings } = item
    const input = { session, prompt, mode, label, settings, clientRequestId: id }
    for (let attempt = 1; ; attempt++) {
      try {
        return sent(item, await link.send(item.pc, input))
      } catch (error) {
        if (attempt === attempts || !unanswered(error)) throw error
        await wait(retryDelay)
      }
    }
  }

  const outcome = async (item: OutboxItem): Promise<Outcome> => {
    try {
      await deliver(item)
      return 'sent'
    } catch (error) {
      return unanswered(error) ? 'unanswered' : { error: errorMessage(error) }
    }
  }

  const replay = async (item: OutboxItem) => {
    sending.add(item.id)
    changed()
    const result = await outcome(item)
    sending.delete(item.id)
    if (result === 'unanswered') {
      changed()
      return false
    }
    if (result === 'sent') drop(item.id)
    else keep({ ...item, ...result })
    return true
  }

  const flush = async (pc: string) => {
    if (flushing.has(pc)) return
    flushing.add(pc)
    let item = next(pc)
    while (item && link.ready(pc) && (await replay(item))) item = next(pc)
    flushing.delete(pc)
  }

  const submit = async (item: OutboxItem) => {
    await loaded
    if (!link.ready(item.pc)) return keep(item)
    if (next(item.pc)) {
      keep(item)
      return void flush(item.pc)
    }
    try {
      await deliver(item)
    } catch (error) {
      if (!unanswered(error)) throw error
      keep(item)
    }
  }

  const greeted = (pc: string) => {
    const api = link.turnsApi(pc)
    if (turnsApi.get(pc) !== api) {
      turnsApi.set(pc, api)
      void saved.remember({ pc, turnsApi: api })
    }
    return loaded.then(() => flush(pc))
  }

  const service: Outbox = {
    accepts: pc => turnsApi.get(pc) ?? false,
    list,
    sending: id => sending.has(id),
    async send(id) {
      const item = items.get(id)
      if (!item || sending.has(id)) return
      if (item.error) keep({ ...item, error: undefined })
      await flush(item.pc)
    },
    cancel(id) {
      if (items.has(id) && !sending.has(id)) drop(id)
    },
  }

  return { service, submit, greeted }
}
