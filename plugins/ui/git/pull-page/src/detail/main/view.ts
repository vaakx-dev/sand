import { derive, div, dynamicChild, type Child } from '@vaakx-dev/vrui'
import { conflictPrompt } from '../../agent/prompts'
import type { Shown } from '../shown'
import { blockReason, type MainKind, mainKind } from './kind'
import { mergeSplit } from './merge'
import { updateSplit } from './update'

const busyAction = (shown: Shown, label: string, run: () => void, primary = true) => {
  const { kit } = shown.parts
  const button = primary ? kit.primaryAction : kit.secondaryAction
  return button({ disabled: shown.model.busy, onClick: run }, label)
}

const resolveButton = (shown: Shown) => {
  const { kit, agent } = shown.parts
  return kit.primaryAction(
    {
      disabled: shown.model.busy,
      title: 'Ask the agent to merge the base in and resolve the conflicts',
      onClick: () => void agent.askLinked(shown.pull(), shown.linked.get()[0], conflictPrompt(shown.pull())),
    },
    kit.icon('sparkles', 14),
    'Resolve in thread',
  )
}

const autoNote = (shown: Shown) => shown.parts.kit.badge('accent', shown.parts.kit.icon('clock', 12), `Merges by ${shown.pull().autoMerge} when ready`)

const views: Record<MainKind, (shown: Shown) => Child> = {
  'delete-branch': shown => busyAction(shown, 'Delete branch', () => void shown.actions.deleteBranch(), false),
  reopen: shown => busyAction(shown, 'Reopen', () => void shown.actions.close(false), false),
  ready: shown => busyAction(shown, 'Ready for review', () => void shown.actions.ready(true)),
  conflict: resolveButton,
  'auto-on': autoNote,
  behind: updateSplit,
  auto: shown => mergeSplit(shown, { auto: true }),
  merge: shown => mergeSplit(shown, { auto: false }),
  blocked: shown => mergeSplit(shown, { auto: false, blocked: blockReason(shown.pull()) }),
  none: () => null,
}

export const mainAction = (shown: Shown) =>
  dynamicChild(
    derive(() => mainKind(shown.pull())),
    kind => div({ class: 'flex min-w-0 flex-col items-end gap-1' }, views[kind](shown), kind === 'blocked' ? shown.parts.kit.metaLine(blockReason(shown.pull()) ?? '') : null),
  )
