import type { BotSummary } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { tildeHome } from '@sand/util'
import { type Child, derive, div, dynamicChild, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import { settingMark } from '@sand/settings/contract'
import { DEFAULT_DEADLINE_MINUTES, type Decision, type Mode, modes, type PermissionSettings, type Rule } from '../contract'
import { modeLabels } from './mode'

export interface PageParts {
  kit: Kit
  settings: Sig<PermissionSettings | undefined>
  bots(): BotSummary[]
  setBot(bot: string, mode: Mode): void
  setDeadline(minutes: number): void
  removeRule(id: string): void
}

const DEADLINES = [5, 15, 30, 60, 120]

const DEFAULT_BOT_MODE: Mode = 'off'

const ITEMS = {
  deadline: { id: 'question-deadline', label: 'Question deadline', keywords: ['timeout', 'deny', 'unanswered', 'minutes'] },
  bots: { id: 'bot-permissions', label: 'Bot permissions', keywords: ['bots', 'mode', 'ask', 'auto'] },
  rules: { id: 'saved-rules', label: 'Saved rules', keywords: ['always allow', 'rules'] },
  decisions: { id: 'recent-decisions', label: 'Recent decisions', keywords: ['log', 'history', 'allowed', 'denied'] },
}

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

const ruleWhere = ({ owner, title }: Rule) => (owner === 'bot' ? `Bot ${title}` : `Thread “${title}”`)

const withDefault = (label: string, isDefault: boolean) => (isDefault ? `${label} (default)` : label)

const oneLine = (text: Child) => span({ class: 'block truncate' }, text)

const deadlineRow = ({ kit, setDeadline }: PageParts, settings: Sig<PermissionSettings | undefined>) => {
  const minutes = () => settings.get()?.deadlineMinutes
  return kit.settingsRow(
    {
      ...settingMark(ITEMS.deadline.id),
      title: 'Deny unanswered questions after',
      reset: { changed: () => minutes() !== DEFAULT_DEADLINE_MINUTES, run: () => setDeadline(DEFAULT_DEADLINE_MINUTES) },
    },
    kit.segmented(
      DEADLINES.map(value => ({ value, label: withDefault(`${value} min`, value === DEFAULT_DEADLINE_MINUTES) })),
      minutes,
      setDeadline,
      { label: ITEMS.deadline.label },
    ),
  )
}

const botRow = ({ kit, setBot }: PageParts, settings: Sig<PermissionSettings | undefined>, bot: Sig<BotSummary>) => {
  const mode = () => settings.get()?.modes.find(entry => entry.owner === 'bot' && entry.id === bot.get().id)?.mode ?? DEFAULT_BOT_MODE
  return kit.settingsRow(
    {
      lead: kit.botFace(bot.get().id, bot.get().color, 16),
      title: () => bot.get().name || 'New bot',
      reset: { changed: () => mode() !== DEFAULT_BOT_MODE, run: () => setBot(bot.get().id, DEFAULT_BOT_MODE) },
    },
    kit.segmented(
      modes.map(value => ({ value, label: withDefault(modeLabels[value], value === DEFAULT_BOT_MODE) })),
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
      () => kit.settingsSection({ ...settingMark(ITEMS.bots.id), title: 'Bots' }, kit.rowList(bots, bot => bot.id, bot => botRow(parts, settings, bot))),
    ),
    kit.settingsSection(
      { ...settingMark(ITEMS.rules.id), title: ITEMS.rules.label },
      kit.rowList(rules, rule => rule.id, rule => ruleRow(parts, rule)),
      show(
        () => !rules.get().length,
        () => kit.emptyState({ text: 'None' }),
      ),
    ),
    show(
      () => decisions.get().length > 0,
      () => kit.settingsSection({ ...settingMark(ITEMS.decisions.id), title: ITEMS.decisions.label }, kit.rowList(decisions, decision => decision.id, decision => decisionRow(parts, decision))),
    ),
  )
}

export const permissionItems = Object.values(ITEMS)

export const permissionsPage = (parts: PageParts) =>
  div(
    { class: 'flex flex-col gap-6' },
    dynamicChild(
      parts.settings.map(value => value === undefined),
      loading => (loading ? parts.kit.loadingState() : loaded(parts, parts.settings)),
    ),
  )
