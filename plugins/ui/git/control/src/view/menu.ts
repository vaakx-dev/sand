import { plural } from '@sand/util'
import { span, type Child } from '@vaakx-dev/vrui'
import { catchUpPrompt, rebasePrompt } from '../agent/prompts'
import { canAsk } from '../agent/ask'
import { defaultName, isDiverged, repoOf, upstreamName } from '../next/facts'
import { catchUpBehind, commitReason, pullReason, pushReason } from '../next/reasons'
import type { ControlParts } from '../parts'
import { sectionItems } from './sections'

interface Entry {
  icon: string
  label: string
  run(): void
  reason?: string
  detail?: string
  hint?: string
}

const shortcutHint = (mac: boolean) => (mac ? '⌘⇧↵' : 'Ctrl⇧Enter')

const entry = ({ kit }: ControlParts, close: () => void, item: Entry) =>
  kit.menuItem(
    {
      icon: item.icon,
      disabled: Boolean(item.reason),
      onClick: () => {
        close()
        item.run()
      },
    },
    span(
      { class: 'flex min-w-0 flex-1 flex-col' },
      span({ class: 'truncate' }, item.label),
      item.reason ? kit.menuReason(item.reason) : item.detail ? kit.metaLine(item.detail) : null,
    ),
    item.hint ? span({ class: 'shrink-0 text-xs text-neutral-500' }, item.hint) : null,
  )

const agentEntries = (parts: ControlParts): Entry[] => {
  const { ctx, model, actions } = parts
  const status = model.status.get()
  const local = repoOf(status)
  const remote = status?.remote
  if (!local || !remote || !canAsk(ctx, model.thread.get())) return []
  const entries: Entry[] = []
  if (isDiverged(remote)) entries.push({ icon: 'sparkles', label: 'Ask the agent to rebase', run: () => actions.ask(rebasePrompt(upstreamName(remote))) })
  const behind = catchUpBehind(local, remote)
  const base = defaultName(local)
  if (behind > 0)
    entries.push({
      icon: 'sparkles',
      label: `Ask the agent to catch up with ${base}`,
      detail: `${base} moved on by ${plural(behind, 'commit')}`,
      run: () => actions.ask(catchUpPrompt(base)),
    })
  return entries
}

export const actionMenu = (parts: ControlParts, close: () => void): Child[] => {
  const { kit, model, actions, waiting, openCommit } = parts
  const status = model.status.get()
  const local = repoOf(status)
  if (!local) return []
  const remote = status?.remote
  const wait = waiting.get()
  const git: Entry[] = [
    {
      icon: 'commit',
      label: 'Commit…',
      reason: commitReason(local) ?? wait,
      detail: `${plural(local.fileCount, 'file')} changed`,
      hint: shortcutHint(kit.isMac()),
      run: openCommit,
    },
    { icon: 'push', label: 'Push', reason: pushReason(local, remote) ?? wait, run: () => void actions.push() },
    { icon: 'pull', label: 'Pull', reason: pullReason(local, remote) ?? wait, run: () => void actions.pull() },
  ]
  const agent = agentEntries(parts)
  const items = git.map(item => entry(parts, close, item))
  const own = agent.length ? [...items, kit.menuSeparator(), ...agent.map(item => entry(parts, close, item))] : items
  return status ? [...own, ...sectionItems(parts, status, close)] : own
}
