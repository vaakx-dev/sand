import type { ThreadLink } from '@sand/sessions-sqlite/contract'

export interface Schedule {
  id: string
  session: string
  prompt: string
  at: number
  every?: number
  wake?: boolean
  from?: ThreadLink
}

export type NewSchedule = Omit<Schedule, 'id'>

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'schedules.add': NewSchedule
    'schedules.list': { session?: string }
    'schedules.cancel': { schedule: string; session?: string }
  }

  interface WireEvents {
    'schedules.change': [session: string, schedules: Schedule[]]
  }
}
