import type { Dispose } from 'drydock'
import type { Calendar, CalendarChange, Provider, Source } from './contract'
import type { Store } from './store'

export const keyOf = (calendar: Calendar) => calendar.id.slice(calendar.provider.length + 1)

const pullEvents = async (store: Store, calendar: Calendar, source: Source, signal: AbortSignal, changed: (change: CalendarChange) => void) => {
  let token = store.token(calendar.id)
  for (;;) {
    const page = await source.sync(keyOf(calendar), token, signal)
    if (page.reset) store.clear(calendar.id)
    const removed = page.removed.flatMap(id => [id, ...store.series(calendar.id, id).map(other => other.id)])
    store.drop(calendar.id, removed)
    store.save(page.events.map(event => ({ ...event, calendar: calendar.id, updated: Date.now() })))
    token = page.token
    store.setToken(calendar.id, token)
    const ids = page.events.map(event => event.id)
    if (page.reset || ids.length || removed.length) changed({ calendar: calendar.id, changed: ids, removed: removed.filter(id => !ids.includes(id)) })
    if (!page.more) return
  }
}

export const pull = async (store: Store, provider: Provider, source: Source, signal: AbortSignal, changed: (change: CalendarChange) => void) => {
  const remote = (await source.calendars(signal)).map(({ key, ...calendar }): Calendar => ({ ...calendar, id: `${provider.id}/${key}`, provider: provider.id }))
  const known = store.calendars().filter(calendar => calendar.provider === provider.id)
  for (const gone of known.filter(calendar => !remote.some(other => other.id === calendar.id))) store.dropCalendar(gone.id)
  for (const calendar of remote) store.saveCalendar(calendar)
  for (const calendar of remote.filter(calendar => calendar.capabilities.includes('read'))) await pullEvents(store, calendar, source, signal, changed)
}

export const every = (ms: number, run: () => Promise<void>): Dispose => {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = () =>
    void run().finally(() => {
      if (!stopped) timer = setTimeout(tick, ms)
    })
  tick()
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
