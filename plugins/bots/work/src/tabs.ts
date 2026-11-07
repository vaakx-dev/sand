import type { Markdown } from '@sand/markdown/contract'
import { derive, div, dynamicChild, show, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import type { WorkSection } from './contract'
import { workList } from './list'
import { planView, type Plan } from './plan'
import type { Task } from './tasks'

export type Tab = 'work' | 'plan'

export interface WorkParts {
  bot: string
  tasks: Derive<Task[]>
  plan: Plan
  markdown: Derive<Markdown | undefined>
  sections: Derive<WorkSection[]>
  startsThreads: () => boolean
  started: () => boolean
}

export const showsWork = (parts: WorkParts) => parts.startsThreads() || parts.sections.get().length > 0

export const hasWork = (parts: WorkParts) => parts.started() || parts.plan.filled.get() || parts.sections.get().length > 0

const tabs: { value: Tab; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'plan', label: 'Plan' },
]

export const tabSwitch = ({ kit }: WorkContext, parts: WorkParts, tab: Sig<Tab>) =>
  dynamicChild(derive(() => showsWork(parts)), shows => (shows ? kit.segmented(tabs, tab, value => tab.set(value), { label: 'Bot work' }) : kit.headTitle(2, 'Plan')))

const workTab = ({ kit }: WorkContext, parts: WorkParts, open: (thread: string) => void) =>
  div(
    { class: 'flex flex-col' },
    kit.rowList(
      parts.sections,
      section => section.id,
      section => section.get().render(parts.bot),
    ),
    show(parts.startsThreads, () => workList(kit, parts.tasks, open)),
  )

export const tabBody = (ctx: WorkContext, parts: WorkParts, tab: Sig<Tab>, open: (thread: string) => void) =>
  dynamicChild(
    derive(() => (showsWork(parts) ? tab.get() : 'plan')),
    shown => (shown === 'work' ? workTab(ctx, parts, open) : planView(ctx, parts.plan, parts.markdown)),
  )
