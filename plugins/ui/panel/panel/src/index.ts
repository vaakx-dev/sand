import { kit } from '@sand/ui-kit/contract'
import { shell, type Route, type Subject } from '@sand/ui-shell/contract'
import { byOrder } from '@sand/util'
import { derive, div, dynamicChild, list, sig, stored, type Sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { panel, type PanelTab } from './contract'

const keyOf = (subject: Subject | undefined) => (subject ? [subject.session, subject.device, subject.cwd ?? ''].join('|') : '')

export default definePlugin({
  name: 'panel',
  description: "A full-height panel at a chat's right with tabs that other plugins add",
  inject: { kit, shell },
  apply(ctx) {
    const tabs = sig<PanelTab[]>([])
    const picked = stored('sand.panel.tab', '')
    const shownTabs = (subject: Subject) => tabs.get().filter(tab => tab.shows(subject)).toSorted(byOrder)
    const activeOf = (subject: Subject) => {
      const shown = shownTabs(subject)
      return shown.find(tab => tab.id === picked.get()) ?? shown[0]
    }

    const tabButton = (tab: Sig<PanelTab>, active: () => boolean) =>
      ctx.kit.iconButton(
        {
          role: 'tab',
          title: () => tab.get().label,
          'aria-label': () => tab.get().label,
          'aria-selected': () => String(active()),
          active,
          onClick: () => picked.set(tab.get().id),
        },
        ctx.kit.icon(tab.get().icon),
      )

    const frame = (subject: () => Subject) => {
      const active = derive(() => activeOf(subject()))
      return div(
        { class: 'scrollbars-thin min-h-0 min-w-0 flex-1 overflow-y-auto' },
        list(
          derive(() => shownTabs(subject())),
          tab => tab.id,
          tab => tabButton(tab, () => active.get() === tab.get()),
          div({ role: 'tablist', 'aria-label': 'Panel tabs', class: [ctx.kit.layer.sticky, 'sticky top-0 flex h-12 items-center gap-1 bg-neutral-950 px-2'] }),
        ),
        dynamicChild(active, tab => (tab ? tab.render(subject) : null)),
      )
    }

    const body = (route: () => Route) => {
      const subjectNow = () => ctx.shell.subjectOf(route())
      return dynamicChild(
        derive(() => keyOf(subjectNow())),
        key => {
          const first = key ? subjectNow() : undefined
          if (!first) return null
          return frame(() => subjectNow() ?? first)
        },
      )
    }

    ctx.effect(() =>
      ctx.shell.aside({
        id: 'panel',
        kind: 'panel',
        label: 'Side panel',
        icon: 'panel',
        order: 20,
        shows: route => {
          const subject = ctx.shell.subjectOf(route)
          return subject ? shownTabs(subject).length > 0 : false
        },
        render: route => div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, body(route)),
      }),
    )
    ctx.provide(panel, {
      tab(tab) {
        tabs.update(all => [...all, tab])
        return () => tabs.update(all => all.filter(other => other !== tab))
      },
      show(tab) {
        picked.set(tab)
        ctx.shell.showAside('panel', true)
      },
      applies: (tab, subject) => tabs.get().some(found => found.id === tab && found.shows(subject)),
    })
  },
})
