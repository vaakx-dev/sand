import { instant, isDate, parseRule, plainOf, recur, ruleText, utcStamp, validZone, whenAt, whenOf, zoneOf, type Event, type Recurrence, type Rule, type When } from '@sand/ical'
import type { EventDraft, EventPatch } from './contract'

const normalWhen = (when: When): When => {
  if (isDate(when)) return { date: Temporal.PlainDate.from(when.date).toString() }
  return { time: Temporal.PlainDateTime.from(when.time).toString({ smallestUnit: 'second' }), zone: validZone(when.zone) ?? when.zone }
}

export const defaultEnd = (start: When): When =>
  isDate(start) ? { date: plainOf(start).toPlainDate().add({ days: 1 }).toString() } : whenAt(instant(start, 'UTC') + 3_600_000, start, 'UTC')

export const endAfter = (event: Pick<Event, 'start' | 'end'>, start: When): When => {
  if (isDate(start) !== isDate(event.start)) return defaultEnd(start)
  if (isDate(start)) return { date: plainOf(start).add(plainOf(event.start).until(plainOf(event.end))).toPlainDate().toString() }
  return whenAt(instant(start, 'UTC') + instant(event.end, 'UTC') - instant(event.start, 'UTC'), start, 'UTC')
}

const check = (event: Pick<Event, 'start' | 'end' | 'recurrence'>) => {
  if (isDate(event.start) !== isDate(event.end)) throw new Error('An event starts and ends both on dates (all day) or both at times')
  const length = instant(event.end, 'UTC') - instant(event.start, 'UTC')
  if (length < 0 || (isDate(event.start) && length === 0)) throw new Error('An event has to end after it starts')
  if (event.recurrence) parseRule(event.recurrence.rule)
}

const guests = (attendees: EventDraft['attendees']) => attendees?.map(guest => ({ ...guest, response: guest.response ?? 'needs-action' }))

const recurrenceOf = (recurrence: EventDraft['recurrence']): Recurrence | undefined =>
  recurrence && {
    rule: ruleText(parseRule(recurrence.rule)),
    ...(recurrence.exdates && { exdates: recurrence.exdates.map(normalWhen) }),
    ...(recurrence.rdates && { rdates: recurrence.rdates.map(normalWhen) }),
  }

export const fromDraft = (draft: EventDraft, uid: string): Event => {
  const { attendees, recurrence, status, start, end, ...rest } = draft
  const fixed = guests(attendees)
  const repeat = recurrenceOf(recurrence)
  const event: Event = {
    ...rest,
    uid,
    status: status ?? 'confirmed',
    start: normalWhen(start),
    end: normalWhen(end),
    ...(fixed && { attendees: fixed }),
    ...(repeat && { recurrence: repeat }),
  }
  check(event)
  return event
}

export const patched = <E extends Event>(event: E, patch: EventPatch) => {
  const { start, end, attendees, recurrence, ...rest } = patch
  const { recurrence: kept, ...base } = event
  const begins = start ? normalWhen(start) : event.start
  const repeat = recurrence === undefined ? kept : recurrenceOf(recurrence ?? undefined)
  const fixed = attendees ? guests(attendees) : event.attendees
  const ends = end ? normalWhen(end) : start && endAfter(event, begins)
  const next = {
    ...base,
    ...rest,
    start: begins,
    end: ends ?? event.end,
    ...(fixed && { attendees: fixed }),
    ...(repeat && { recurrence: repeat }),
  }
  check(next)
  return next
}

export const occurrenceOf = <E extends Event>({ recurrence: _, ...master }: E, original: When) => ({ ...master, start: original, end: endAfter(master, original), original })

export const shifted = (master: Event, original: When, start: When) => {
  if (isDate(start) !== isDate(master.start)) throw new Error('Change a whole series between all day and timed from its first event')
  const by = plainOf(original).until(plainOf(start))
  const move = (when: When) => whenOf(plainOf(when).add(by), when)
  const moved = whenOf(plainOf(master.start).add(by), start)
  const { recurrence } = master
  return {
    start: moved,
    end: endAfter(master, moved),
    ...(recurrence && {
      recurrence: { ...recurrence, ...(recurrence.exdates && { exdates: recurrence.exdates.map(move) }), ...(recurrence.rdates && { rdates: recurrence.rdates.map(move) }) },
    }),
  }
}

const until = (when: When) => (isDate(when) ? plainOf(when).toPlainDate().subtract({ days: 1 }).toString().replaceAll('-', '') : utcStamp(instant(when, 'UTC') - 1000))

const countBefore = (master: Event, rule: Rule, original: When) =>
  [...recur(rule, plainOf(master.start), zoneOf(master.start, 'UTC'), plainOf(original).subtract({ seconds: 1 }))].length

export const split = <E extends Event & { recurrence: Recurrence }>(master: E, original: When, uid: string) => {
  const { recurrence } = master
  const rule = parseRule(recurrence.rule)
  const at = instant(original, 'UTC')
  const count = rule.count ? countBefore(master, rule, original) : 0
  const part = (later: boolean, piece: Rule): Recurrence => {
    const keep = (whens: When[] | undefined) => {
      const kept = whens?.filter(when => instant(when, 'UTC') >= at === later)
      return kept?.length ? kept : undefined
    }
    const exdates = keep(recurrence.exdates)
    const rdates = keep(recurrence.rdates)
    return { rule: ruleText(piece), ...(exdates && { exdates }), ...(rdates && { rdates }) }
  }
  const head: Rule = rule.count ? { ...rule, count } : { ...rule, until: until(original) }
  const tail: Rule = rule.count ? { ...rule, count: rule.count - count } : rule
  return {
    earlier: { ...master, recurrence: part(false, head) },
    later: { ...master, uid, start: original, end: endAfter(master, original), recurrence: part(true, tail) },
  }
}
