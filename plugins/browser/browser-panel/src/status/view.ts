import type { Driver } from '@sand/browser-engine/contract'
import { div, dynamicChild, icon, primaryAction, secondaryAction, span, type Child, type Derive } from '@sand/dom'
import { pulsing } from '../integrations/motion'
import type { TabModel } from '../tab/model'
import type { ControlMode } from './mode'

const drivingText = (tab: TabModel) => {
  const action = tab.action.get() ?? tab.state.get()?.action
  return action ? `sand is driving · ${action.verb} ${action.target}`.trim() : 'sand is driving'
}

const bar = (...children: Child[]) =>
  div({ class: 'flex min-h-10 shrink-0 items-center gap-2 border-t border-neutral-800 px-3 py-1 text-xs' }, ...children)

const userBar = (control: (driver: Driver) => void) =>
  bar(
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon('hand', 14)),
    span({ class: 'min-w-0 flex-1 truncate text-neutral-300' }, 'You have control. sand waits.'),
    secondaryAction({ size: 'sm', onClick: () => control('agent') }, 'Hand back'),
  )

const agentBar = (tab: TabModel, control: (driver: Driver) => void) =>
  bar(
    span({ class: 'h-2 w-2 shrink-0 rounded-full bg-accent-400', onMount: pulsing }),
    span({ class: 'min-w-0 flex-1 truncate text-accent-300', text: () => drivingText(tab) }),
    primaryAction({ size: 'sm', onClick: () => control('user') }, icon('hand', 14), 'Take control'),
  )

export const statusBar = (tab: TabModel, mode: Derive<ControlMode>, control: (driver: Driver) => void) =>
  dynamicChild(mode, value => {
    if (value === 'user') return userBar(control)
    if (value === 'agent') return agentBar(tab, control)
    return null
  })
