import type { BotSummary } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { type Child, derive, div, dynamicChild, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Decision, Mode, PermissionSettings, Rule } from '../contract'
import { modeDetails, modeLabels } from './mode'

export interface PageParts {
  kit: Kit
  settings: Sig<PermissionSettings | undefined>
  bots(): BotSummary[]
  setBot(bot: string, mode: Mode): void
  setDeadline(minutes: number): void
  removeRule(id: string): void
}

const DEADLINES = [5, 15, 30, 60, 120]

const outcomes: Record<Decision['outcome'], string> = {
  waiting: 'Waiting on you',
  allowed: 'Allowed',
  denied: 'Denied',
  expired: 'Timed out',
  cancelled: 'Cancelled',
}

const deciders: Record<NonNullable<Decision['by']>, string> = {
  default: 'by default',
  rule: 'by a saved rule',
  owner: 'by you',
  auto: 'by auto',
  grant: 'by your late answer',
}

const decisionDetail = ({ outcome, by, title }: Decision) => `${outcomes[outcome]}${by ? ` ${deciders[by]}` : ''} · ${title}`

const ruleWhere = ({ owner, title }: Rule) => (owner === 'bot' ? `For the bot ${title} and the threads it starts` : `In the thread “${title}” and its subagents`)

const oneLine = (text: Child) => span({ class: 'block truncate' }, text)

const deadlineRow = ({ kit, setDeadline }: PageParts, settings: Sig<PermissionSettings | undefined>) =>
  kit.settingsRow(
    { title: 'Deny unanswered questions after', detail: 'The agent hears it was denied and carries on with other work' },
    kit.segmented(
      DEADLINES.map(minutes => ({ value: minutes, label: `${minutes} min` })),
      () => settings.get()?.deadlineMinutes,
      setDeadline,
      { label: 'Question deadline' },
    ),
  )

const botRow = ({ kit, setBot }: PageParts, settings: Sig<PermissionSettings | undefined>, bot: Sig<BotSummary>) => {
  const mode = () => settings.get()?.modes.find(entry => entry.owner === 'bot' && entry.id === bot.get().id)?.mode ?? 'off'
  return kit.settingsRow(
    { lead: kit.botFace(bot.get().id, bot.get().color, 16), title: () => bot.get().name || 'New bot', detail: () => modeDetails[mode()] },
    kit.segmented(
      (['off', 'ask', 'auto'] as const).map(value => ({ value, label: modeLabels[value] })),
      mode,
      value => setBot(bot.get().id, value),
      { label: 'Permissions' },
    ),
  )
}

const ruleRow = ({ kit, removeRule }: PageParts, rule: Sig<Rule>) =>
  kit.settingsRow(
    { title: () => `Always allow ${rule.get().tool}`, detail: () => ruleWhere(rule.get()) },
    kit.iconButton({ size: 'sm', surface: 'group', title: 'Remove', 'aria-label': 'Remove', onClick: () => removeRule(rule.get().id) }, kit.icon('trash', 'sm')),
  )

const decisionFull = ({ summary, reason }: Decision) =>
  div({ class: 'flex min-w-0 flex-col gap-1 pb-3 text-sm wrap-anywhere text-neutral-400' }, span({ class: 'font-mono text-neutral-100' }, tildeHome(summary)), reason ? span({}, reason) : null)

const decisionRow = ({ kit }: PageParts, decision: Sig<Decision>) => {
  const open = sig(false)
  return div(
    { class: 'flex min-w-0 flex-col' },
    kit.settingsRow({ title: oneLine(() => `${decision.get().tool}: ${tildeHome(decision.get().summary)}`), detail: oneLine(() => decisionDetail(decision.get())), onOpen: () => open.set(!open.get()) }),
    show(open, () => decisionFull(decision.get())),
  )
}

const loaded = (parts: PageParts, settings: Sig<PermissionSettings | undefined>) => {
  const { kit } = parts
  const bots = derive(() => parts.bots())
  const rules = derive(() => settings.get()?.rules ?? [])
  const decisions = derive(() => settings.get()?.decisions ?? [])
  return div(
    { class: 'flex flex-col gap-6' },
    kit.settingsSection({}, deadlineRow(parts, settings)),
    show(
      () => bots.get().length > 0,
      () => kit.settingsSection({ title: 'Bots', note: 'Threads a bot starts follow it, and ask you every time before using a saved login or starting agents' }, kit.rowList(bots, bot => bot.id, bot => botRow(parts, settings, bot))),
    ),
    kit.settingsSection(
      { title: 'Saved rules' },
      kit.rowList(rules, rule => rule.id, rule => ruleRow(parts, rule)),
      show(
        () => !rules.get().length,
        () => kit.emptyState({ text: 'None yet. Always allow on a question saves one here.' }),
      ),
    ),
    show(
      () => decisions.get().length > 0,
      () => kit.settingsSection({ title: 'Recent decisions' }, kit.rowList(decisions, decision => decision.id, decision => decisionRow(parts, decision))),
    ),
  )
}

export const permissionsPage = (parts: PageParts) =>
  div(
    { class: 'flex flex-col gap-6' },
    parts.kit.pageHead('Threads and bots run every call until you pick Ask or Auto, in a thread’s details or here for a bot.'),
    dynamicChild(
      parts.settings.map(value => value === undefined),
      loading => (loading ? parts.kit.loadingState() : loaded(parts, parts.settings)),
    ),
  )
