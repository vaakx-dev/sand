import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, type Sig } from '@vaakx-dev/vrui'
import type { ApprovalSettings, Mode, Rule } from '../contract'

export interface PageParts {
  kit: Kit
  settings: Sig<ApprovalSettings | undefined>
  setMode(mode: Mode): void
  remove(rule: string): void
}

const verbs = { allow: 'Allow', ask: 'Ask before', deny: 'Never run' }

const owners = { thread: 'thread', bot: 'bot' }

const ruleTitle = ({ verdict, tool }: Rule) => `${verbs[verdict]} ${tool ?? 'any tool'}`

const ruleDetail = ({ owner, title, effect }: Rule) =>
  [effect ? `Calls that ${effect}` : 'Any call', title ? `in ${title}` : `in any ${owners[owner]}`].join(' ')

const ruleRow = ({ kit, remove }: PageParts, rule: Sig<Rule>) =>
  kit.settingsRow(
    { lead: kit.icon(rule.get().owner === 'bot' ? 'bot' : 'message', 'md'), title: rule.map(ruleTitle), detail: rule.map(ruleDetail) },
    kit.iconButton(
      { size: 'sm', surface: 'group', title: 'Remove', 'aria-label': 'Remove', onClick: () => remove(rule.get().id) },
      kit.icon('trash', 'sm'),
    ),
  )

const loaded = (parts: PageParts, settings: Sig<ApprovalSettings | undefined>) => {
  const { kit, setMode } = parts
  const { emptyState, rowList, settingsRow, settingsSection, toggleSwitch } = kit
  const careful = derive(() => settings.get()?.mode === 'careful')
  const rules = derive(() => settings.get()?.rules ?? [])
  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(
      {},
      settingsRow(
        { title: 'Ask before commands', detail: 'Also before file changes outside the thread’s or bot’s folder. Off, they run them freely.' },
        toggleSwitch({ on: careful, 'aria-label': 'Ask before commands', onClick: () => setMode(careful.get() ? 'trusted' : 'careful') }),
      ),
    ),
    settingsSection(
      { title: 'Saved rules' },
      rowList(
        rules,
        rule => rule.id,
        rule => ruleRow(parts, rule),
      ),
      show(
        () => !rules.get().length,
        () => emptyState({ surface: 'group', text: 'None yet. Always allow on a request saves one here.' }),
      ),
    ),
  )
}

export const approvalsPage = (parts: PageParts) =>
  div(
    { class: 'flex flex-col gap-6' },
    parts.kit.pageHead(
      'Threads and bots ask you before a call sends, spends or deletes.',
    ),
    dynamicChild(
      parts.settings.map(value => value === undefined),
      loading => (loading ? parts.kit.loadingState() : loaded(parts, parts.settings)),
    ),
  )
