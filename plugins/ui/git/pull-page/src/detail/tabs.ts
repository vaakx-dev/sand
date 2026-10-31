import { derive, div, dynamicChild, list, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { PullTab } from '../contract'
import { commitsView } from './commits/view'
import { overviewView } from './overview/view'
import type { Shown } from './shown'

interface DetailTab extends Omit<PullTab, 'render'> {
  view(shown: Shown): Node
}

const builtIn: DetailTab[] = [
  { id: 'overview', title: 'Overview', order: 0, view: overviewView },
  { id: 'commits', title: 'Commits', order: 30, count: pull => pull.commits.length, view: commitsView },
]

const hosted = (tab: PullTab): DetailTab => ({
  ...tab,
  view: shown =>
    div({
      class: 'flex min-h-0 flex-1 flex-col',
      onMount: host => {
        const stop = tab.render(shown.model.ref, host)
        return stop ? () => void stop() : undefined
      },
    }),
})

const tabButton = (shown: Shown, tab: Sig<DetailTab>, current: Sig<string>) => {
  const { kit } = shown.parts
  const active = () => current.get() === tab.get().id
  const count = () => tab.get().count?.(shown.pull())
  return kit.quietButton(
    { size: 'sm', role: 'tab', active, 'aria-selected': () => String(active()), onClick: () => current.set(tab.get().id) },
    () => tab.get().title,
    show(
      () => count() !== undefined,
      () => kit.countMark(() => count() ?? 0),
    ),
  )
}

export const detailTabs = (shown: Shown) => {
  const current = sig('overview')
  const tabs = derive(() => [...builtIn, ...shown.parts.tabs.tabs.get().map(hosted)].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
  const chosen = derive(() => tabs.get().find(tab => tab.id === current.get()) ?? tabs.get()[0])
  return [
    list(
      tabs,
      tab => tab.id,
      tab => tabButton(shown, tab, current),
      div({ role: 'tablist', class: 'flex shrink-0 items-center gap-1 border-b border-neutral-800 px-3 py-1' }),
    ),
    div(
      { class: 'flex min-h-0 flex-1 flex-col overflow-auto overscroll-contain', role: 'tabpanel' },
      dynamicChild(chosen, tab => (tab ? tab.view(shown) : null)),
    ),
  ]
}
