import type { Occurrence, Target } from '@sand/calendar/contract'
import { shell, type Shell } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import { derive, div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { agendaView } from './agenda'
import { inject } from './context'
import { detailSheet } from './detail'
import { formSheet, type FormParts } from './form'
import { headView } from './head'
import { calendarModel } from './model'
import { subscribeSheet } from './subscribe'
import { weekView } from './week'

const calendarKind = 'calendar'

const targetOf = (event: Occurrence): Target => ({ calendar: event.calendar, id: event.id, ...(event.original && { original: event.original }) })

export default definePlugin({
  name: 'calendar-space',
  description: 'The Calendar item and screen: your events as an agenda or a week, quick add, and the details of each event',
  inject,
  apply(ctx) {
    const { kit } = ctx
    const model = calendarModel(ctx)
    const report = (error: unknown) => ctx.report(error)

    const screen = (found: Shell) => {
      const form = (parts: Pick<FormParts, 'edit' | 'at'>) => found.sheet(formSheet(kit, { ...parts, calendars: model.writable.get(), create: model.create }))
      const add = (at?: number) => form(at === undefined ? {} : { at })
      const edit = (event: Occurrence) => form({ edit: { event, update: (patch, scope) => model.update(targetOf(event), patch, scope) } })

      const open = (event: Occurrence) =>
        found.sheet(
          detailSheet(kit, {
            event,
            calendar: model.calendars.get().find(calendar => calendar.id === event.calendar),
            showCalendar: model.calendars.get().length > 1,
            edit: () => edit(event),
            remove: scope => model.remove(targetOf(event), scope),
            respond: response => model.respond(targetOf(event), response),
          }),
        )

      const subscribe = () => {
        const link = sig<string | undefined>(undefined)
        const own = model.writable.get().find(calendar => calendar.provider === 'sand' && calendar.primary)
        if (own) model.feed(own).then(url => link.set(url), report)
        found.sheet(subscribeSheet(kit, link))
      }

      const phone = derive(() => found.state() === 'phone')
      return {
        head: () => headView(kit, model, { phone, add: () => add(), subscribe, report }),
        main: () =>
          div(
            { class: 'flex h-full min-h-0 flex-1 flex-col' },
            dynamicChild(model.mode, mode => (mode === 'agenda' ? agendaView(kit, model, { open, add: () => add() }) : weekView(kit, model, { open, addAt: add }))),
          ),
      }
    }

    ctx.watch(shell, found =>
      found
        ? joinDisposers(
            found.nav({ id: 'calendar', label: 'Calendar', icon: 'calendar', order: 20, to: { kind: calendarKind } }),
            found.route({ kind: calendarKind, render: () => screen(found) }),
          )
        : undefined,
    )
  },
})
