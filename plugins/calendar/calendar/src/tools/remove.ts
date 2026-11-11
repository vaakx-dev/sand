import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Calendars } from '../contract'
import { eventRef, locate, targetOf } from './find'

const input = z.object(eventRef)

const scopeText = { occurrence: '', following: ' from this occurrence on', series: ' and all its repeats' }

export const removeTool = (service: Calendars): Tool<typeof input> => ({
  name: 'calendar_delete',
  description: 'Delete an event, one occurrence of a repeating event, or the rest of a series. Guests are told when the calendar can.',
  group: 'calendar',
  input,
  effect: 'delete',
  async run({ id, calendar, occurrence, scope }) {
    const found = locate(service, id, calendar)
    await service.remove(targetOf(found, occurrence), scope)
    return `Deleted "${found.event.title}"${scopeText[scope]}`
  },
})
