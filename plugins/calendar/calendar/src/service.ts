import { expand, instant, isDate, sameWhen, type Recurrence, type When } from '@sand/ical'
import {
  notifies,
  type AgendaQuery,
  type Busy,
  type Calendar,
  type CalendarChange,
  type CalendarEvent,
  type Calendars,
  type EventPatch,
  type Occurrence,
  type Provider,
  type RemoteEvent,
  type Scope,
  type Source,
  type Target,
} from './contract'
import { endAfter, fromDraft, occurrenceOf, patched, shifted, split } from './edit'
import type { Store } from './store'
import { every, keyOf, pull } from './sync'

export interface Hooks {
  changed(change: CalendarChange): void
  listed(list: Calendar[]): void
  report(error: unknown): void
}

type Pending = Omit<CalendarEvent, 'id' | 'calendar' | 'updated'> & { id?: string }

type Series = CalendarEvent & { recurrence: Recurrence }

const overrideId = (series: string, original: When) => `${series}~${isDate(original) ? original.date : `${original.time}~${original.zone}`}`

const localId = ({ uid, series, original }: Pending) => (series && original ? overrideId(series, original) : uid)

const unsupported = (calendar: Calendar, what: string) => new Error(`${calendar.name} can't ${what}`)

const isSeries = (event: CalendarEvent): event is Series => Boolean(event.recurrence)

const merged = (spans: Busy[]) =>
  spans
    .sort((a, b) => a.from - b.from)
    .reduce<Busy[]>((all, span) => {
      const last = all.at(-1)
      if (last && span.from <= last.to) last.to = Math.max(last.to, span.to)
      else all.push({ ...span })
      return all
    }, [])

const seriesPatch = (master: Series, original: When, patch: EventPatch): EventPatch => {
  if (!patch.start) return patch
  const moved = shifted(master, original, patch.start)
  const end = patch.end ? endAfter({ start: patch.start, end: patch.end }, moved.start) : moved.end
  return { ...moved, ...patch, start: moved.start, end }
}

const fresh = (event: Omit<Pending, 'id'>): Pending => ({ ...event, id: undefined, etag: undefined })

export const createCalendars = (store: Store, hooks: Hooks): Calendars => {
  const providers = new Map<string, Provider>()
  const running = new Map<string, Promise<void>>()
  const stops = new Map<string, AbortController>()

  const list = () => store.calendars().filter(calendar => providers.has(calendar.provider))
  const sourceOf = (calendar: Calendar) => providers.get(calendar.provider)?.source
  const announce = () => hooks.listed(list())

  const calendar = (id: string) => {
    const found = list().find(other => other.id === id)
    if (!found) throw new Error(`No calendar ${id}`)
    return found
  }

  const writable = (id: string) => {
    const found = calendar(id)
    if (!found.capabilities.includes('write')) throw new Error(`${found.name} is read-only`)
    return found
  }

  const event = (calendar: string, id: string) => {
    const found = store.event(calendar, id)
    if (!found) throw new Error(`No event ${id} in that calendar`)
    return found
  }

  const overrides = (master: CalendarEvent) => store.series(master.calendar, master.id)

  const remoteSave = (source: Source, target: Calendar, next: Pending, notify: boolean): Promise<RemoteEvent> => {
    const { id } = next
    if (id) {
      if (!source.update) throw unsupported(target, 'change events')
      return source.update(keyOf(target), { ...next, id }, notify)
    }
    if (!source.create) throw unsupported(target, 'add events')
    return source.create(keyOf(target), next, notify)
  }

  const save = async (target: Calendar, next: Pending): Promise<CalendarEvent> => {
    const source = sourceOf(target)
    const before = next.id ? store.event(target.id, next.id) : undefined
    const notify = notifies(target, next) || notifies(target, before)
    const saved = source ? await remoteSave(source, target, next, notify) : { ...next, id: next.id ?? localId(next) }
    const stored = { ...saved, calendar: target.id, updated: Date.now() }
    store.save([stored])
    hooks.changed({ calendar: target.id, changed: [stored.id], removed: [] })
    return stored
  }

  const drop = async (target: Calendar, gone: CalendarEvent) => {
    const source = sourceOf(target)
    if (source) {
      if (!source.remove) throw unsupported(target, 'remove events')
      await source.remove(keyOf(target), gone, notifies(target, gone))
    }
    const ids = [gone.id, ...(gone.recurrence ? overrides(gone).map(other => other.id) : [])]
    store.drop(target.id, ids)
    hooks.changed({ calendar: target.id, changed: [], removed: ids })
  }

  const overrideAt = (master: CalendarEvent, original: When) => overrides(master).find(other => other.original && sameWhen(other.original, original))

  const dropFrom = async (target: Calendar, master: CalendarEvent, original: When) => {
    const at = instant(original, 'UTC')
    for (const later of overrides(master).filter(other => other.original && instant(other.original, 'UTC') >= at)) await drop(target, later)
  }

  const skip = (master: Series, original: When) =>
    patched(master, { recurrence: { ...master.recurrence, exdates: [...(master.recurrence.exdates ?? []), original] } })

  const saveSeries = async (target: Calendar, master: Series, original: When, patch: EventPatch) => {
    const next = patched(master, seriesPatch(master, original, patch))
    if (!sameWhen(next.start, master.start)) for (const moved of overrides(master)) await drop(target, moved)
    return save(target, next)
  }

  const updateSeries = async (target: Calendar, master: Series, original: When, patch: EventPatch, scope: Scope) => {
    if (scope === 'occurrence') return save(target, patched(overrideAt(master, original) ?? fresh({ ...occurrenceOf(master, original), series: master.id }), patch))
    if (sameWhen(original, master.start)) return saveSeries(target, master, original, patch)
    const { earlier, later } = split(master, original, crypto.randomUUID())
    await save(target, earlier)
    await dropFrom(target, master, original)
    return save(target, patched(fresh(later), patch))
  }

  const update = async ({ calendar: id, id: eventId, original }: Target, patch: EventPatch, scope: Scope): Promise<CalendarEvent> => {
    const target = writable(id)
    const found = event(id, eventId)
    if (found.series && scope !== 'occurrence') return update({ calendar: id, id: found.series, original: found.original }, patch, scope)
    if (!isSeries(found)) return save(target, patched(found, patch))
    if (!original || scope === 'series') return saveSeries(target, found, original ?? found.start, patch)
    return updateSeries(target, found, original, patch, scope)
  }

  const removeSeries = async (target: Calendar, master: Series, original: When, scope: Scope) => {
    if (scope === 'following' && sameWhen(original, master.start)) return drop(target, master)
    if (scope === 'following') {
      await save(target, split(master, original, crypto.randomUUID()).earlier)
      return dropFrom(target, master, original)
    }
    const moved = overrideAt(master, original)
    await save(target, skip(master, original))
    if (moved) await drop(target, moved)
  }

  const remove = async ({ calendar: id, id: eventId, original }: Target, scope: Scope): Promise<void> => {
    const target = writable(id)
    const found = event(id, eventId)
    const master = found.series ? store.event(id, found.series) : undefined
    if (master && found.original) return remove({ calendar: id, id: master.id, original: found.original }, scope)
    if (!isSeries(found) || !original || scope === 'series') return drop(target, found)
    return removeSeries(target, found, original, scope)
  }

  const occurrences = (id: string, query: AgendaQuery, zone: string): Occurrence[] => {
    const rows = store.inRange(id, query)
    const series = new Set(rows.flatMap(row => row.series ?? (row.recurrence ? [row.id] : [])))
    const lone = rows.filter(row => !row.recurrence && !(row.series && store.event(id, row.series)))
    const masters = [...series].flatMap(other => store.event(id, other) ?? [])
    return [...lone.flatMap(row => expand(row, [], query, zone)), ...masters.flatMap(master => expand(master, overrides(master), query, zone))]
      .filter(({ event }) => event.status !== 'cancelled')
      .map(({ event, span, original }) => ({ ...event, ...span, ...(original && { original }) }))
  }

  const agenda = (query: AgendaQuery) => {
    const zone = query.zone ?? Temporal.Now.timeZoneId()
    const shown = list().filter(other => !query.calendars || query.calendars.includes(other.id))
    return shown.flatMap(other => occurrences(other.id, query, zone)).sort((a, b) => a.from - b.from || a.title.localeCompare(b.title))
  }

  const sync = async (id: string) => {
    const provider = providers.get(id)
    const source = provider?.source
    const signal = stops.get(id)?.signal
    if (!provider || !source || !signal) return
    const current = running.get(id) ?? pull(store, provider, source, signal, hooks.changed).finally(() => running.delete(id))
    running.set(id, current)
    await current
    announce()
  }

  const start = (provider: Provider, source: Source) => {
    const stop = new AbortController()
    stops.set(provider.id, stop)
    const ticking = every(source.poll, () => sync(provider.id).catch(hooks.report))
    return () => {
      ticking()
      stop.abort()
      stops.delete(provider.id)
    }
  }

  const preferred = () => {
    const rank = (other: Calendar) => (sourceOf(other) ? 0 : 2) + (other.primary ? 0 : 1)
    return list()
      .filter(other => other.capabilities.includes('write'))
      .sort((a, b) => rank(a) - rank(b))[0]
  }

  return {
    provide(provider) {
      if (providers.has(provider.id)) throw new Error(`A calendar provider named ${provider.id} is already in place`)
      providers.set(provider.id, provider)
      const stop = provider.source ? start(provider, provider.source) : undefined
      announce()
      return () => {
        stop?.()
        providers.delete(provider.id)
        announce()
      }
    },
    forget(provider) {
      if (providers.has(provider)) throw new Error(`Stop ${provider} before forgetting its calendars`)
      for (const gone of store.calendars().filter(other => other.provider === provider)) store.dropCalendar(gone.id)
    },
    list,
    add(provider, { name, zone, color }) {
      if (!providers.has(provider) || providers.get(provider)?.source) throw new Error(`Calendars of ${provider} come from its account`)
      const primary = !store.calendars().some(other => other.provider === provider)
      const added: Calendar = { id: `${provider}/${crypto.randomUUID()}`, provider, name, zone, ...(color && { color }), capabilities: ['read', 'write'], primary }
      store.saveCalendar(added)
      announce()
      return added
    },
    preferred,
    agenda,
    busy: query => merged(agenda(query).flatMap(({ from, to, free, response }) => (free || response === 'declined' ? [] : [{ from, to }]))),
    async freeBusy(people, range) {
      const lookups = [...providers.values()].flatMap(provider => (provider.source?.freeBusy ? [provider.source.freeBusy] : []))
      if (!lookups.length) throw new Error("No connected calendar can look up other people's free time")
      const found = await Promise.all(lookups.map(lookup => lookup(people, range, AbortSignal.timeout(30_000))))
      return Object.fromEntries(people.map(person => [person, merged(found.flatMap(result => result[person] ?? []))]))
    },
    events: id => store.events(calendar(id).id),
    get: (id, eventId) => store.event(id, eventId),
    create(id, draft) {
      const target = id ? writable(id) : preferred()
      if (!target) throw new Error('There is no calendar to add events to')
      return save(target, fromDraft(draft, crypto.randomUUID()))
    },
    update,
    remove,
    async respond({ calendar: id, id: eventId }, response) {
      const target = writable(id)
      const found = event(id, eventId)
      if (!found.organizer && !found.attendees?.length) throw new Error(`${found.title} is not an invitation`)
      const source = sourceOf(target)
      if (source && !source.respond) throw unsupported(target, 'answer invitations')
      const answered = source?.respond
        ? await source.respond(keyOf(target), found, response, notifies(target, found))
        : { ...found, response, ...(found.attendees && { attendees: found.attendees.map(guest => (guest.email === target.email ? { ...guest, response } : guest)) }) }
      const stored = { ...answered, calendar: target.id, updated: Date.now() }
      store.save([stored])
      hooks.changed({ calendar: target.id, changed: [stored.id], removed: [] })
      return stored
    },
    put(id, events) {
      const target = calendar(id)
      if (sourceOf(target)) throw new Error(`${target.name} takes events through its account`)
      const stored = events.map(
        (one): CalendarEvent => ({
          ...one,
          id: one.original ? overrideId(one.uid, one.original) : one.uid,
          ...(one.original && { series: one.uid }),
          calendar: target.id,
          updated: Date.now(),
        }),
      )
      store.save(stored)
      const change = { calendar: target.id, changed: stored.map(one => one.id), removed: [] }
      hooks.changed(change)
      return change
    },
    async sync(id) {
      await Promise.all([...providers.keys()].filter(other => !id || other === id).map(sync))
    },
  }
}
