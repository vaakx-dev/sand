import type { Occurrence, Target } from '@sand/calendar/contract'
import { layout, layoutChange, place, spaces } from '@sand/layout/contract'
import { pulse } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin, type Dispose } from 'drydock'
import { agendaView } from './agenda'
import { inject } from './context'
import { detailSheet } from './detail'
import { formSheet, type FormParts } from './form'
import { headView } from './head'
import { calendarModel } from './model'
import { subscribeSheet } from './subscribe'
import { weekView } from './week'

const space = 'calendar'

const targetOf = (event: Occurrence): Target => ({ calendar: event.calendar, id: event.id, ...(event.original && { original: event.original }) })

export default definePlugin({
  name: 'calendar-space',
  description: 'The Calendar space: your events as an agenda or a week, quick add, and the details of each event',
  inject,
  apply(ctx) {
    const { kit } = ctx
    const model = calendarModel(ctx)
    const narrow = pulse(ctx, [layoutChange], [layout]).read(() => ctx.get(layout)?.state().narrow ?? false)
    const report = (error: unknown) => ctx.report(error)

    let closeSheet: Dispose | undefined
    const hide = () => {
      void closeSheet?.()
      closeSheet = undefined
    }
    const sheet = (view: () => HTMLElement) => {
      hide()
      closeSheet = place(ctx, 'overlay', view, 100)
    }

    const form = (parts: Pick<FormParts, 'edit' | 'at'>) =>
      sheet(() => formSheet(kit, { ...parts, calendars: model.writable.get(), close: hide, create: model.create }))
    const add = (at?: number) => form(at === undefined ? {} : { at })
    const edit = (event: Occurrence) => form({ edit: { event, update: (patch, scope) => model.update(targetOf(event), patch, scope) } })

    const open = (event: Occurrence) =>
      sheet(() =>
        detailSheet(kit, {
          event,
          calendar: model.calendars.get().find(calendar => calendar.id === event.calendar),
          close: hide,
          edit: () => edit(event),
          remove: scope => model.remove(targetOf(event), scope),
          respond: response => model.respond(targetOf(event), response),
        }),
      )

    const subscribe = () => {
      const link = sig<string | undefined>(undefined)
      const own = model.writable.get().find(calendar => calendar.provider === 'sand' && calendar.primary)
      if (own) model.feed(own).then(url => link.set(url), report)
      sheet(() => subscribeSheet(kit, link, hide))
    }

    const main = () =>
      div(
        { class: 'flex h-full min-h-0 flex-1 flex-col' },
        headView(kit, model, { narrow, add: () => add(), subscribe, report }),
        dynamicChild(model.mode, mode => (mode === 'agenda' ? agendaView(kit, model, { open, add: () => add() }) : weekView(kit, model, { open, addAt: add }))),
      )

    ctx.watch(spaces, found =>
      found ? joinDisposers(found.space({ id: space, label: 'Calendar', icon: 'calendar', order: 30 }), place(ctx, { space, region: 'main' }, main)) : undefined,
    )
  },
})
