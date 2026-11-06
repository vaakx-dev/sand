import type { Authorized } from '@sand/connections/contract'

export interface Time {
  dateTime: string
  timeZone: string
}

export interface Address {
  address?: string
  name?: string
}

export type Answer = 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded'

export interface Guest {
  type: 'required' | 'optional' | 'resource'
  status?: { response: Answer }
  emailAddress: Address
}

export type Day = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export type Index = 'first' | 'second' | 'third' | 'fourth' | 'last'

export interface Pattern {
  type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly'
  interval: number
  month: number
  dayOfMonth: number
  daysOfWeek: Day[]
  firstDayOfWeek: Day
  index: Index
}

export interface Span {
  type: 'endDate' | 'noEnd' | 'numbered'
  startDate: string
  endDate: string
  numberOfOccurrences: number
  recurrenceTimeZone: string
}

export interface Repeat {
  pattern: Pattern
  range: Span
}

export interface Item {
  id: string
  '@odata.etag'?: string
  iCalUId?: string
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster'
  seriesMasterId?: string | null
  subject?: string | null
  body?: { contentType: string; content: string }
  start: Time
  end: Time
  originalStart?: string | null
  originalStartTimeZone?: string
  originalEndTimeZone?: string
  isAllDay?: boolean
  isCancelled?: boolean
  isOrganizer?: boolean
  showAs?: string
  isReminderOn?: boolean
  reminderMinutesBeforeStart?: number
  location?: { displayName?: string }
  organizer?: { emailAddress: Address }
  attendees?: Guest[]
  responseStatus?: { response: Answer }
  recurrence?: Repeat | null
}

export interface Removed {
  id: string
  '@removed': { reason: string }
}

export interface Entry {
  id: string
  name: string
  hexColor?: string
  isDefaultCalendar?: boolean
  canEdit?: boolean
  owner?: Address
}

export interface Page<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

export interface Schedule {
  scheduleId: string
  scheduleItems?: { status: string; start: Time; end: Time }[]
}

export class GraphError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message)
  }
}

const conflict = 'The event changed in Outlook since sand last synced it. Try again after the next sync.'

const failure = async (response: Response) => {
  if (response.status === 412) return new GraphError(412, undefined, conflict)
  const body = (await response.json().catch(() => undefined)) as { error?: { code?: string; message?: string } } | undefined
  return new GraphError(response.status, body?.error?.code, `Outlook answered ${response.status}: ${body?.error?.message ?? response.statusText}`)
}

export const statusOf = (error: unknown) => (error instanceof GraphError ? error.status : undefined)

export const codeOf = (error: unknown) => (error instanceof GraphError ? error.code : undefined)

const prefer = ['outlook.timezone="UTC"', 'outlook.body-content-type="text"', 'odata.maxpagesize=200'].join(', ')

export interface Call {
  method?: string
  body?: unknown
  etag?: string
  signal?: AbortSignal
}

export const call = async <T>(fetch: Authorized, url: string | URL, { method = 'GET', body, etag, signal }: Call = {}): Promise<T> => {
  const headers = { prefer, ...(body !== undefined && { 'content-type': 'application/json' }), ...(etag && { 'if-match': etag }) }
  const response = await fetch(url, { method, headers, signal, ...(body !== undefined && { body: JSON.stringify(body) }) })
  if (!response.ok) throw await failure(response)
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export const pages = async <T>(fetch: Authorized, url: string | URL, signal?: AbortSignal) => {
  const all: T[] = []
  for (let next: string | URL | undefined = url; next; ) {
    const page: Page<T> = await call<Page<T>>(fetch, next, { signal })
    all.push(...page.value)
    next = page['@odata.nextLink']
  }
  return all
}
