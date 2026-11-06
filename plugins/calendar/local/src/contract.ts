import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

export const localProvider = 'sand'

export const feedPath = '/calendar/'

const calendar = z.object({ calendar: z.string() })

export const calendarImport = request('calendar.import', {
  input: z.object({ calendar: z.string().optional(), ics: z.string().max(10_000_000) }),
  output: type<number>(),
})
export const calendarExport = request('calendar.export', { input: calendar, output: type<string>() })
export const calendarFeed = request('calendar.feed', { input: calendar, output: type<string>() })
