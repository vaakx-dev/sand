import type { Occurrence, Target } from '@sand/calendar/contract'
import { homeRoute, shell, type Route, type Shell } from '@sand/ui-shell/contract'
import { joinDisposers } from '@sand/util'
import { div, dynamicChild, effect, resizeObserver, scoped, sig, untrack } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { agendaView } from './agenda'
import { inject } from './context'
import { detailSheet } from './detail'
import { formSheet, type FormParts } from './form'
import { headView } from './head'
import { calendarModel } from './model'
import { calendarKind } from './section'
import { subscribeSheet } from './subscribe'
import { weekView } from './week'

const narrowBelow = 560

const homeOrder = 500

const targetOf = (event: Occurrence): Target => ({ calendar: event.calendar, id: event.id, ...(event.original && { original: event.original }) })

export default definePlugin({
  name: 'calendar-space',
  description: 'Calendar in the sidebar and its screen: your events as an agenda or a week, quick add, and the details of each event',
  inject,
  apply(ctx) {
    const { kit } = ctx
    const model = calendarModel(ctx)
    const report = (error: unknown) => ctx.report(error)

    const leaveEvent = (found: Shell, key: string) => {
      const { tab, ...rest } = found.current()
      if (tab === key) found.open(rest, { replace: true })
    }

    const screen = (found: Shell, route: () => Route) => {
      const form = (parts: Pick<FormParts, 'edit' | 'at'>) => found.sheet(formSheet(kit, { ...parts, calendars: model.writable.get(), create: model.create }))
      const add = (at?: number) => form(at === undefined ? {} : { at })
      const edit = (event: Occurrence) => form({ edit: { event, update: (patch, scope) => model.update(targetOf(event), patch, scope) } })

      const detail = (event: Occurrence) =>
        detailSheet(kit, {
          event,
          calendar: model.calendars.get().find(calendar => calendar.id === event.calendar),
          showCalendar: model.calendars.get().length > 1,
          edit: () => edit(event),
          remove: scope => model.remove(targetOf(event), scope),
          respond: response => model.respond(targetOf(event), response),
        })
      const open = (event: Occurrence) => found.sheet(detail(event))
      const openRouted = (event: Occurrence, key: string) => {
        const spec = detail(event)
        found.sheet({
          ...spec,
          body: close => {
            scoped(() => leaveEvent(found, key))
            return spec.body(close)
          },
        })
      }

      let opened: string | undefined
      effect(() => {
        const key = route().tab
        if (key === opened) return
        const event = key && model.find(key)
        if (key && !event) return
        opened = key
        if (key && event) untrack(() => openRouted(event, key))
      })

      const subscribe = () => {
        const link = sig<string | undefined>(undefined)
        const own = model.writable.get().find(calendar => calendar.provider === 'sand' && calendar.primary)
        if (own) model.feed(own).then(url => link.set(url), report)
        found.sheet(subscribeSheet(kit, link))
      }

      return {
        head: () => headView(kit, model, { phone: () => found.state() === 'phone', add: () => add(), subscribe, report }),
        main: () =>
          div(
            {
              class: 'flex h-full min-h-0 flex-1 flex-col',
              onMount: node => {
                resizeObserver(node, ([entry]) => {
                  const width = entry?.contentRect.width ?? 0
                  if (width > 0) model.narrow.set(width < narrowBelow)
                })
              },
            },
            dynamicChild(model.mode, mode => (mode === 'agenda' ? agendaView(kit, model, { open, add: () => add() }) : weekView(kit, model, { open, addAt: add }))),
          ),
      }
    }

    ctx.watch(shell, found =>
      found
        ? joinDisposers(
            found.nav({ id: 'calendar', label: 'Calendar', icon: 'calendar', order: 20, place: 'nav', to: { kind: calendarKind } }),
            found.route({ kind: calendarKind, render: route => screen(found, route) }),
            found.route({ kind: homeRoute, order: homeOrder, render: route => screen(found, route) }),
          )
        : undefined,
    )
  },
})
