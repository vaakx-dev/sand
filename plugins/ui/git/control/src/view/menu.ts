import { type GitRepoLocal, repoOf } from '@sand/git/contract'
import { plural } from '@sand/util'
import { span, type Child } from '@vaakx-dev/vrui'
import { canAsk } from '../agent/ask'
import { catchUpPrompt, rebasePrompt } from '../agent/prompts'
import { defaultName, isDiverged, upstreamName } from '../next/facts'
import { catchUpBehind, commitReason, pullReason, pushReason, type Reason } from '../next/reasons'
import type { ControlParts } from '../parts'
import { sectionItems } from './sections'

interface Entry {
  icon: string
  label: string
  run(): void
  reason?: Reason
  hint?: string
  title?: string
}

const shortcutHint = (mac: boolean) => (mac ? '⌘⇧↵' : 'Ctrl⇧Enter')

const entry = ({ kit }: ControlParts, close: () => void, item: Entry) =>
  kit.menuItem(
    {
      icon: item.icon,
      disabled: Boolean(item.reason),
      title: item.reason?.full ?? item.title ?? item.label,
      onClick: () => {
        close()
        item.run()
      },
    },
    span({ class: 'min-w-0 flex-1 truncate' }, item.label),
    item.reason || item.hint ? kit.menuReason(item.reason?.short ?? item.hint) : null,
  )

const commitLabel = (local: GitRepoLocal) => (local.fileCount > 0 ? `Commit ${plural(local.fileCount, 'file')}…` : 'Commit…')

const gitEntries = (parts: ControlParts, local: GitRepoLocal): Entry[] => {
  const { kit, model, actions, waiting, openCommit } = parts
  const remote = model.status.get()?.remote
  const wait = waiting.get()
  const busy: Reason | undefined = wait ? { short: wait, full: wait } : undefined
  return [
    { icon: 'commit', label: commitLabel(local), reason: commitReason(local) ?? busy, hint: shortcutHint(kit.isMac()), run: openCommit },
    { icon: 'push', label: 'Push', reason: pushReason(local, remote) ?? busy, run: () => void actions.push() },
    { icon: 'pull', label: 'Pull', reason: pullReason(local, remote) ?? busy, run: () => void actions.pull() },
  ]
}

const agentEntries = (parts: ControlParts, local: GitRepoLocal): Entry[] => {
  const { ctx, model, actions } = parts
  const remote = model.status.get()?.remote
  if (!remote || !canAsk(ctx, model.thread.get())) return []
  const entries: Entry[] = []
  if (isDiverged(remote)) entries.push({ icon: 'sparkles', label: 'Ask the agent to rebase', run: () => actions.ask(rebasePrompt(upstreamName(remote))) })
  const behind = catchUpBehind(local, remote)
  const base = defaultName(local)
  if (behind > 0)
    entries.push({
      icon: 'sparkles',
      label: `Ask the agent to catch up with ${base}`,
      hint: `${behind} behind`,
      title: `${base} moved on by ${plural(behind, 'commit')}`,
      run: () => actions.ask(catchUpPrompt(base)),
    })
  return entries
}

export const actionMenu = (parts: ControlParts, close: () => void): Child[] => {
  const status = parts.model.status.get()
  const local = repoOf(status)
  if (!status || !local) return []
  const groups = [gitEntries(parts, local), agentEntries(parts, local)].filter(group => group.length > 0)
  const own = groups.flatMap((group, index) => [index > 0 ? parts.kit.menuSeparator() : null, ...group.map(item => entry(parts, close, item))])
  return [...own, ...sectionItems(parts, status, close)]
}
