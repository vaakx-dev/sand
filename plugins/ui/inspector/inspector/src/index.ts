import { kit } from '@sand/ui-kit/contract'
import { shell, type Route, type Subject } from '@sand/ui-shell/contract'
import { byOrder } from '@sand/util'
import { derive, div, dynamicChild, list, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { inspector, type InspectorRow } from './contract'

const keyOf = (subject: Subject | undefined) => (subject ? [subject.session, subject.device, subject.cwd ?? ''].join('|') : '')

export default definePlugin({
  name: 'inspector',
  description: "A small card at a chat's top right with rows about where and how its thread runs",
  inject: { kit, shell },
  apply(ctx) {
    const rows = sig<InspectorRow[]>([])
    const shownRows = (subject: Subject) => rows.get().filter(row => row.shows(subject)).toSorted(byOrder)

    const groupsOf = (subject: () => Subject) =>
      derive(() => {
        const shown = shownRows(subject())
        return [...new Set(shown.map(row => row.group))].map(group => ({ group, rows: shown.filter(row => row.group === group) }))
      })

    const card = (route: () => Route) => {
      const subjectNow = () => ctx.shell.subjectOf(route())
      return dynamicChild(
        derive(() => keyOf(subjectNow())),
        key => {
          const first = key ? subjectNow() : undefined
          if (!first) return null
          const subject = () => subjectNow() ?? first
          return list(
            groupsOf(subject),
            entry => entry.group,
            (entry, index) =>
              div(
                { class: 'flex min-w-0 flex-col' },
                dynamicChild(index, at => (at > 0 ? ctx.kit.cardRule() : null)),
                list(
                  derive(() => entry.get().rows),
                  row => row.id,
                  row => row.get().render(subject),
                  div({ class: 'flex min-w-0 flex-col' }),
                ),
              ),
            div({ class: 'flex min-w-0 flex-col' }),
          )
        },
      )
    }

    ctx.effect(() =>
      ctx.shell.aside({
        id: 'inspector',
        kind: 'card',
        label: 'Details',
        icon: 'info',
        order: 10,
        shows: route => {
          const subject = ctx.shell.subjectOf(route)
          return subject ? shownRows(subject).length > 0 : false
        },
        render: route => div({ class: 'flex min-w-0 flex-col' }, card(route)),
      }),
    )
    ctx.provide(inspector, {
      row(row) {
        rows.update(all => [...all, row])
        return () => rows.update(all => all.filter(other => other !== row))
      },
    })
  },
})
