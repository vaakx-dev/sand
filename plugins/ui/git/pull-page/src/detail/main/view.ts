import type { IconName } from '@sand/ui-kit/contract'
import { pullPrompts } from '@sand/pull-links/prompts'
import { derive, div, dynamicChild, type Child } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'
import { blockReason, type MainKind, mainKind } from './kind'
import { mergeAction } from './merge'
import { updateAction } from './update'

const quietAction = (shown: Shown, label: string, glyph: IconName, run: () => void, title?: string) => {
  const { kit } = shown.parts
  return kit.quietButton({ size: 'sm', title, disabled: shown.model.busy, onClick: run }, kit.icon(glyph, 14), label)
}

const note = (shown: Shown, glyph: IconName, text: string) => shown.parts.kit.statusLine({ mark: shown.parts.kit.icon(glyph, 14), text, title: text })

const resolve = (shown: Shown) =>
  quietAction(
    shown,
    'Resolve in thread',
    'sparkles',
    () => void shown.parts.agent.ask(shown.pull(), pullPrompts.resolve(shown.pull())),
    'Ask the agent to bring in the base branch and resolve the conflicts',
  )

const views: Record<Exclude<MainKind, 'none'>, (shown: Shown) => Child> = {
  'delete-branch': shown => quietAction(shown, 'Delete branch', 'trash', () => void shown.actions.deleteBranch()),
  reopen: shown => quietAction(shown, 'Reopen', 'pull-request', () => void shown.actions.close(false)),
  ready: shown => quietAction(shown, 'Ready for review', 'pull-request', () => void shown.actions.ready(true)),
  conflict: resolve,
  'auto-on': shown => note(shown, 'clock', `Merges by ${shown.pull().autoMerge} when ready`),
  behind: updateAction,
  auto: shown => mergeAction(shown, true),
  merge: shown => mergeAction(shown, false),
  blocked: shown => note(shown, 'alert', blockReason(shown.pull()) ?? "Can't merge yet"),
}

export const mainAction = (shown: Shown) =>
  dynamicChild(
    derive(() => mainKind(shown.pull())),
    kind => (kind === 'none' ? null : div({ class: 'flex min-w-0 flex-wrap items-center gap-2' }, views[kind](shown))),
  )
