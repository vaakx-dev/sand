import type { Authorized } from '@sand/connections/contract'

export type Time = { date: string } | { dateTime: string; timeZone?: string }

export type Answer = 'needsAction' | 'accepted' | 'declined' | 'tentative'

export interface Attendee {
  email: string
  displayName?: string
  responseStatus: Answer
  optional?: boolean
  self?: boolean
  resource?: boolean
}

export interface Reminders {
  useDefault: boolean
  overrides?: { method: string; minutes: number }[]
}

export interface Item {
  id: string
  etag: string
  status: 'confirmed' | 'tentative' | 'cancelled'
  iCalUID?: string
  summary?: string
  description?: string
  location?: string
  start?: Time
  end?: Time
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: Time
  organizer?: { email: string; displayName?: string }
  attendees?: Attendee[]
  transparency?: 'opaque' | 'transparent'
  reminders?: Reminders
  sequence?: number
}

export interface Events {
  timeZone: string
  items: Item[]
  nextPageToken?: string
  nextSyncToken?: string
}

export interface Entry {
  id: string
  summary: string
  summaryOverride?: string
  timeZone: string
  backgroundColor?: string
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner'
  primary?: boolean
  hidden?: boolean
  deleted?: boolean
}

export interface Entries {
  items: Entry[]
  nextPageToken?: string
}

export interface FreeBusy {
  calendars: Record<string, { busy?: { start: string; end: string }[] }>
}

export class GoogleError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

const conflict = 'The event changed in Google Calendar since sand last synced it. Try again after the next sync.'

const failure = async (response: Response) => {
  if (response.status === 412) return new GoogleError(412, conflict)
  const body = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | undefined
  return new GoogleError(response.status, `Google Calendar answered ${response.status}: ${body?.error?.message ?? response.statusText}`)
}

export const statusOf = (error: unknown) => (error instanceof GoogleError ? error.status : undefined)

export interface Call {
  method?: string
  body?: unknown
  etag?: string
  signal?: AbortSignal
}

export const call = async <T>(fetch: Authorized, url: string | URL, { method = 'GET', body, etag, signal }: Call = {}): Promise<T> => {
  const headers = { ...(body !== undefined && { 'content-type': 'application/json' }), ...(etag && { 'if-match': etag }) }
  const response = await fetch(url, { method, headers, signal, ...(body !== undefined && { body: JSON.stringify(body) }) })
  if (!response.ok) throw await failure(response)
  return (response.status === 204 ? undefined : await response.json()) as T
}
