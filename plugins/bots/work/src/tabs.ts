import type { Markdown } from '@sand/markdown/contract'
import { dynamicChild, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { WorkContext } from './context'
import { workList } from './list'
import { planView, type Plan } from './plan'
import type { Task } from './tasks'

export type Tab = 'work' | 'plan'

export interface WorkParts {
  tasks: Derive<Task[]>
  plan: Plan
  markdown: Derive<Markdown | undefined>
}

const tabs: { value: Tab; label: string }[] = [
  { value: 'work', label: 'Work' },
  { value: 'plan', label: 'Plan' },
]

export const tabSwitch = ({ kit }: WorkContext, tab: Sig<Tab>) => kit.segmented(tabs, tab, value => tab.set(value), { label: 'Bot work' })

export const tabBody = (ctx: WorkContext, parts: WorkParts, tab: Sig<Tab>, open: (thread: string) => void) =>
  dynamicChild(tab, shown => (shown === 'work' ? workList(ctx.kit, parts.tasks, open) : planView(ctx, parts.plan, parts.markdown)))
