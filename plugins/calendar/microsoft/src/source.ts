import type { Busy, Capability, RemoteCalendar, RemoteEvent, Response, Source, SyncPage, When } from '@sand/calendar/contract'
import type { Authorized } from '@sand/connections/contract'
import { instant, sameWhen, type Range } from '@sand/ical'
import { bodyOf, changes, eventOf, originOf, seriesOf } from './events'
import { call, codeOf, pages, statusOf, type Entry, type Item, type Page, type Removed, type Schedule, type Time } from './graph'
import { ianaZone } from './zones'

const poll = 5 * 60_000

const day = 86_400_000

const back = 365 * day

const ahead = 730 * day

const renew = 30 * day

interface Token {
  link: string
  from: number
}

const windowFrom = (from: number): Range => ({ from, to: from + back + ahead })

const currentWindow = () => windowFrom(Date.now() - back)

const spanning = (range: Range, dates: When[]): Range => {
  const at = dates.map(date => instant(date, 'UTC'))
  return { from: Math.min(range.from, ...at.map(ms => ms - day)), to: Math.max(range.to, ...at.map(ms => ms + day)) }
}

const capabilitiesOf = (entry: Entry, readOnly: boolean): Capability[] =>
  readOnly || !entry.canEdit ? ['read', 'freebusy'] : ['read', 'write', 'invite', 'freebusy']

const calendarOf = (entry: Entry, readOnly: boolean, zone: string): RemoteCalendar => ({
  key: entry.id,
  name: entry.name,
  zone,
  ...(entry.hexColor && { color: entry.hexColor }),
  ...(entry.owner?.address && { email: entry.owner.address }),
  capabilities: capabilitiesOf(entry, readOnly),
  primary: Boolean(entry.isDefaultCalendar),
})

const actions: Record<Response, string | undefined> = { accepted: 'accept', declined: 'decline', tentative: 'tentativelyAccept', 'needs-action': undefined }

const busy = new Set(['busy', 'tentative', 'oof'])

const expired = (error: unknown) => statusOf(error) === 410 || /syncstate|resync/i.test(codeOf(error) ?? '')

const missing = (error: unknown) => {
  if (statusOf(error) !== 404) throw error
  return undefined
}

const isRemoved = (change: Item | Removed): change is Removed => '@removed' in change

const meeting = (item: Item) => Boolean(item.isOrganizer && item.attendees?.length)

const guard = (notify: boolean, sends: boolean, title: string) => {
  if (sends && !notify) throw new Error(`Outlook would email the guests of "${title}" about this, and this change isn't one that may notify them`)
}

const isoOf = (ms: number) => Temporal.Instant.fromEpochMilliseconds(ms).toString()

const timeOf = (ms: number): Time => ({ dateTime: Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO('UTC').toPlainDateTime().toString(), timeZone: 'UTC' })

const msOf = (time: Time) => Temporal.PlainDateTime.from(time.dateTime).toZonedDateTime(ianaZone(time.timeZone) ?? 'UTC').epochMilliseconds

export interface Account {
  fetch: Authorized
  api: string
  readOnly: boolean
  stored(id: string): RemoteEvent | undefined
}

export const createSource = ({ fetch, api, readOnly, stored }: Account): Source => {
  const zone = Temporal.Now.timeZoneId()

  const url = (path: string[], params: Record<string, string> = {}) => {
    const found = new URL(`${api}/${path.map(encodeURIComponent).join('/')}`)
    for (const [key, value] of Object.entries(params)) found.searchParams.set(key, value)
    return found
  }

  const event = (id: string, ...rest: string[]) => url(['me', 'events', id, ...rest])

  const get = (id: string, signal?: AbortSignal) => call<Item>(fetch, event(id), { signal })

  const instances = (series: string, { from, to }: Range, signal?: AbortSignal) =>
    pages<Item>(
      fetch,
      url(['me', 'events', series, 'instances'], {
        startDateTime: isoOf(from),
        endDateTime: isoOf(to),
        $select: 'id,type,start,end,isAllDay,originalStart,originalStartTimeZone,originalEndTimeZone,seriesMasterId',
      }),
      signal,
    )

  const load = async (item: Item, range: Range, signal?: AbortSignal) => (item.recurrence ? seriesOf(item, await instances(item.id, range, signal), range) : eventOf(item))

  const pageOf = async (list: Page<Item | Removed>, from: number, reset: boolean, signal: AbortSignal): Promise<SyncPage> => {
    const link = list['@odata.nextLink'] ?? list['@odata.deltaLink']
    if (!link) throw new Error('Outlook ended a sync without a delta link')
    const removed = list.value.filter(isRemoved).map(change => change.id)
    const items = list.value.filter((change): change is Item => !isRemoved(change))
    const series = new Set([
      ...items.flatMap(item => (item.type === 'seriesMaster' ? item.id : (item.seriesMasterId ?? []))),
      ...removed.flatMap(id => stored(id)?.series ?? []),
    ])
    const masters: RemoteEvent[] = []
    const gone = new Set<string>()
    for (const id of series) {
      const master = await get(id, signal).catch(missing)
      if (master) masters.push(await load(master, windowFrom(from), signal))
      else gone.add(id)
    }
    const kept = items.filter(item => item.type !== 'seriesMaster' && !(item.seriesMasterId && gone.has(item.seriesMasterId)))
    return {
      events: [...kept.map(eventOf), ...masters],
      removed: [...removed, ...gone],
      token: JSON.stringify({ link, from } satisfies Token),
      ...(list['@odata.nextLink'] && { more: true }),
      ...(reset && { reset: true }),
    }
  }

  const fresh = async (calendar: string, signal: AbortSignal) => {
    const range = currentWindow()
    const start = url(['me', 'calendars', calendar, 'calendarView', 'delta'], { startDateTime: isoOf(range.from), endDateTime: isoOf(range.to) })
    return pageOf(await call(fetch, start, { signal }), range.from, true, signal)
  }

  const sync = async (calendar: string, token: string | undefined, signal: AbortSignal) => {
    const saved: Token | undefined = token ? JSON.parse(token) : undefined
    if (!saved || Date.now() - saved.from > back + renew) return fresh(calendar, signal)
    const list = await call<Page<Item | Removed>>(fetch, saved.link, { signal }).catch((error: unknown) => {
      if (!expired(error)) throw error
      return undefined
    })
    return list ? pageOf(list, saved.from, false, signal) : fresh(calendar, signal)
  }

  const patch = async (current: Item, next: Omit<RemoteEvent, 'id'>, notify: boolean) => {
    const before = eventOf(current)
    if (next.status !== before.status) throw new Error("Outlook doesn't keep a status for events: delete the event or mark its time free instead")
    const body = changes(bodyOf(before, zone), bodyOf(next, zone))
    if (!Object.keys(body).length) return current
    guard(notify, Boolean(current.isOrganizer && (current.attendees?.length || next.attendees?.length)), next.title)
    return call<Item>(fetch, event(current.id), { method: 'PATCH', body, etag: next.etag })
  }

  const skip = async (present: Item[], dates: When[]) => {
    for (const item of present.filter(instance => dates.some(date => sameWhen(date, originOf(instance)))))
      await call(fetch, event(item.id), { method: 'DELETE' }).catch(missing)
  }

  const instanceAt = async (series: string, original: When) => {
    const at = instant(original, 'UTC')
    const found = (await instances(series, { from: at - day, to: at + day })).find(item => sameWhen(originOf(item), original))
    if (!found) throw new Error("That occurrence isn't in Outlook any more")
    return get(found.id)
  }

  return {
    poll,
    calendars: async signal => (await pages<Entry>(fetch, url(['me', 'calendars']), signal)).map(entry => calendarOf(entry, readOnly, zone)),
    sync,
    async create(calendar, next, notify) {
      if (next.series && next.original) return eventOf(await patch(await instanceAt(next.series, next.original), next, notify))
      guard(notify, Boolean(next.attendees?.length), next.title)
      const created = await call<Item>(fetch, url(['me', 'calendars', calendar, 'events']), { method: 'POST', body: bodyOf(next, zone) })
      const skipped = next.recurrence?.exdates ?? []
      if (!skipped.length) return eventOf(created)
      const range = spanning(currentWindow(), skipped)
      await skip(await instances(created.id, range), skipped)
      return load(await get(created.id), range)
    },
    async update(_calendar, next, notify) {
      const current = await get(next.id)
      if (!current.recurrence) return eventOf(await patch(current, next, notify))
      const range = spanning(currentWindow(), next.recurrence?.exdates ?? [])
      const present = await instances(current.id, range)
      const before = seriesOf(current, present, range)
      const reshaped = !sameWhen(before.start, next.start) || before.recurrence?.rule !== next.recurrence?.rule
      const known = before.recurrence?.exdates ?? []
      const skipped = reshaped ? [] : (next.recurrence?.exdates ?? []).filter(date => !known.some(other => sameWhen(other, date)))
      guard(notify, skipped.length > 0 && meeting(current), next.title)
      await patch(current, next, notify)
      await skip(present, skipped)
      return load(await get(current.id), range)
    },
    async remove(_calendar, gone, notify) {
      if (gone.series) return
      if (!notify) {
        const current = await get(gone.id).catch(missing)
        if (!current) return
        guard(notify, meeting(current), gone.title)
      }
      await call(fetch, event(gone.id), { method: 'DELETE' }).catch(missing)
    },
    async respond(_calendar, target, response, notify) {
      const action = actions[response]
      if (!action) throw new Error("Outlook can't take an answer back")
      await call(fetch, event(target.id, action), { method: 'POST', body: { sendResponse: notify } })
      const answered = await get(target.id).catch(missing)
      return answered ? load(answered, currentWindow()) : { ...target, response }
    },
    async freeBusy(people, { from, to }, signal) {
      const body = { schedules: people, startTime: timeOf(from), endTime: timeOf(to), availabilityViewInterval: 15 }
      const { value } = await call<Page<Schedule>>(fetch, url(['me', 'calendar', 'getSchedule']), { method: 'POST', body, signal })
      const busyOf = (person: string): Busy[] =>
        (value.find(schedule => schedule.scheduleId.toLowerCase() === person.toLowerCase())?.scheduleItems ?? [])
          .filter(item => busy.has(item.status))
          .map(item => ({ from: msOf(item.start), to: msOf(item.end) }))
      return Object.fromEntries(people.map(person => [person, busyOf(person)]))
    },
  }
}
