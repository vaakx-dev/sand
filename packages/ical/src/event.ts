export type When = { date: string } | { time: string; zone: string }

export interface Recurrence {
  rule: string
  exdates?: When[]
  rdates?: When[]
}

export interface Person {
  email: string
  name?: string
}

export const responses = ['needs-action', 'accepted', 'declined', 'tentative'] as const

export type Response = (typeof responses)[number]

export interface Attendee extends Person {
  response: Response
  optional?: boolean
}

export const statuses = ['confirmed', 'tentative', 'cancelled'] as const

export type Status = (typeof statuses)[number]

export interface Event {
  uid: string
  title: string
  start: When
  end: When
  recurrence?: Recurrence
  original?: When
  location?: string
  notes?: string
  organizer?: Person
  attendees?: Attendee[]
  status: Status
  free?: boolean
  reminders?: number[]
  sequence?: number
}

export interface Span {
  start: When
  end: When
  from: number
  to: number
}

export interface Range {
  from: number
  to: number
}
