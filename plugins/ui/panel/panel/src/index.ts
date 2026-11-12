import { kit } from '@sand/ui-kit/contract'
import { shell, type Route, type Subject } from '@sand/ui-shell/contract'
import { byOrder } from '@sand/util'
import { derive, div, dynamicChild, list, sig, stored, type Derive, type Sig } from '@vaakx-dev/vrui'
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

    const tabBar = (subject: () => Subject) => {
      const active = derive(() => activeOf(subject()))
      const shown = derive(() => shownTabs(subject()))
      return dynamicChild(
        derive(() => shown.get().length === 1),
        single => (single ? ctx.kit.barTitle(() => shown.get()[0]?.label ?? '') : tabStrip(shown, active)),
      )
    }

    const tabStrip = (shown: Derive<PanelTab[]>, active: Derive<PanelTab | undefined>) =>
      list(
        shown,
        tab => tab.id,
        tab => tabButton(tab, () => active.get() === tab.get()),
        div({ role: 'tablist', 'aria-label': 'Panel tabs', class: 'flex min-w-0 flex-1 items-center gap-1' }),
      )

    const frame = (subject: () => Subject) =>
      div(
        { class: 'scrollbars-thin min-h-0 min-w-0 flex-1 overflow-y-auto' },
        dynamicChild(
          derive(() => activeOf(subject())),
          tab => (tab ? tab.render(subject) : null),
        ),
      )

    const forSubject = (route: () => Route, view: (subject: () => Subject) => HTMLElement) => {
      const subjectNow = () => ctx.shell.subjectOf(route())
      return dynamicChild(
        derive(() => keyOf(subjectNow())),
        key => {
          const first = key ? subjectNow() : undefined
          if (!first) return null
          return view(() => subjectNow() ?? first)
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
        head: route => forSubject(route, tabBar),
        render: route => div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, forSubject(route, frame)),
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
      showing: (tab, subject) => ctx.shell.asideOpen('panel') && activeOf(subject)?.id === tab,
    })
  },
})
