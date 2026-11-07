import { errorMessage, uuid } from '@sand/util'
import type { Context, Dispose } from 'drydock'
import type { Book } from './book'
import { type Handler, type Kind, type KindContext, kindsChange, type Started, type Watch, type Watches } from './contract'
import { createDelivery, type Timings } from './delivery'
import { empty, joined } from './queue'
import type { Stored } from './store'

interface Instance {
  kind: string
  controller: AbortController
  stop?: Dispose
}

const failedWith = (error: unknown) => (stored: Stored) => ({ ...stored, watch: { ...stored.watch, error: errorMessage(error) } })

const sameInfo = (a?: Record<string, string>, b?: Record<string, string>) => JSON.stringify(a) === JSON.stringify(b)

export const createWatches = (ctx: Context, book: Book, timings: Timings): Watches => {
  const kinds = new Map<string, Kind>()
  const handlers = new Map<string, Handler>()
  const instances = new Map<string, Instance>()
  const delivery = createDelivery(book, handlers, timings)

  const contextOf = (id: string, signal: AbortSignal): KindContext => {
    const update = (change: (stored: Stored) => Stored) => {
      if (!signal.aborted) book.update(id, change)
    }
    return {
      id,
      signal,
      get state() {
        return book.get(id)?.state
      },
      save: state => update(stored => ({ ...stored, state })),
      emit(change) {
        if (signal.aborted) return
        update(stored => ({ ...stored, watch: { ...stored.watch, changed: change.at, error: undefined }, queue: joined(stored.queue, { changes: [change], dropped: 0 }) }))
        delivery.soon(id)
      },
      fail: error => update(failedWith(error)),
    }
  }

  const halt = (id: string) => {
    const instance = instances.get(id)
    if (!instance) return
    instances.delete(id)
    instance.controller.abort()
    void instance.stop?.()
  }

  const launch = async (watch: Watch) => {
    const kind = kinds.get(watch.kind)
    if (!kind || instances.has(watch.id)) return
    const instance: Instance = { kind: kind.name, controller: new AbortController() }
    instances.set(watch.id, instance)
    const { signal } = instance.controller
    try {
      const result = await kind.start(kind.input.parse(watch.input), contextOf(watch.id, signal))
      const started: Started = result ? result : {}
      if (signal.aborted) return void started.stop?.()
      instance.stop = started.stop
      book.update(watch.id, stored => (sameInfo(stored.watch.info, started.info) ? stored : { ...stored, watch: { ...stored.watch, info: started.info } }))
    } catch (error) {
      halt(watch.id)
      throw error
    }
  }

  const resume = (watch: Watch) => launch(watch).catch((error: unknown) => book.update(watch.id, failedWith(error)))

  ctx.effect(() => () => {
    delivery.stop()
    for (const id of instances.keys()) halt(id)
  })

  return {
    kind(kind) {
      if (kinds.has(kind.name)) throw new Error(`A watch kind named ${kind.name} already exists`)
      kinds.set(kind.name, kind)
      ctx.emit(kindsChange)
      for (const { watch } of book.all()) if (watch.kind === kind.name) void resume(watch)
      return () => {
        if (kinds.get(kind.name) !== kind) return
        kinds.delete(kind.name)
        for (const [id, instance] of instances) if (instance.kind === kind.name) halt(id)
        ctx.emit(kindsChange)
      }
    },
    kinds: () => [...kinds.values()],
    handle(owner, handler) {
      if (handlers.has(owner)) throw new Error(`${owner} watches already have a handler`)
      handlers.set(owner, handler)
      delivery.wake(owner)
      return () => {
        if (handlers.get(owner) === handler) handlers.delete(owner)
      }
    },
    async create({ owner, subject, kind: name, input, label, data = null }) {
      const kind = kinds.get(name)
      if (!kind) throw new Error(`No watch kind named ${name}; the kinds are ${[...kinds.keys()].join(', ') || 'none'}`)
      const parsed = kind.input.parse(input)
      const watch: Watch = { id: uuid(), owner, subject, kind: name, input: parsed, label, data, target: kind.describe(parsed), created: Date.now() }
      book.put({ watch, state: undefined, queue: empty })
      try {
        await launch(watch)
      } catch (error) {
        book.drop(watch.id)
        throw error
      }
      return book.get(watch.id)?.watch ?? watch
    },
    remove(id) {
      halt(id)
      delivery.forget(id)
      return book.drop(id)
    },
    get: id => book.get(id)?.watch,
    list: (owner, subject) =>
      book
        .all()
        .map(({ watch }) => watch)
        .filter(watch => watch.owner === owner && (subject === undefined || watch.subject === subject))
        .sort((a, b) => a.created - b.created),
  }
}
