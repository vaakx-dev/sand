import { settingMark, type SettingsItem } from '@sand/settings/contract'
import type { Choice, Kit } from '@sand/ui-kit/contract'
import type { GroupState, ToolLoad } from '../contract'
import { div, dynamicChild, untrack, type Sig } from '@vaakx-dev/vrui'

export type Choose = (group: string, load: ToolLoad) => void

const loads: Choice<ToolLoad>[] = [
  { value: 'always', label: 'Always', title: 'Sent with every request' },
  { value: 'on-demand', label: 'On demand', title: 'The agent loads them with find_tools when a task needs them' },
  { value: 'off', label: 'Off', title: 'The agent never gets them' },
]

const groupsItem: SettingsItem = { id: 'tool-groups', label: 'Tool groups', keywords: ['always', 'on demand', 'off', 'find_tools', 'load'] }

const countText = (group: GroupState) => (group.tools.length === 1 ? '1 tool' : `${group.tools.length} tools`)

const loadsFor = (fallback: ToolLoad) => loads.map(choice => (choice.value === fallback ? { ...choice, label: `${choice.label} (default)` } : choice))

const groupRow = ({ segmented, settingsRow }: Kit, group: Sig<GroupState>, choose: Choose) => {
  const { name, label, load } = untrack(() => group.get())
  return settingsRow(
    {
      title: group.map(value => value.label),
      detail: group.map(countText),
      reset: { changed: () => group.get().chosen !== load, run: () => choose(name, load) },
    },
    segmented(loadsFor(load), group.map(value => value.chosen), value => choose(name, value), { label: `How ${label} tools load` }),
  )
}

const groupRows = (kit: Kit, groups: Sig<GroupState[] | undefined>, choose: Choose) =>
  kit.settingsSection(
    settingMark(groupsItem.id),
    kit.rowList(
      groups.map(value => value ?? []),
      group => group.name,
      group => groupRow(kit, group, choose),
    ),
  )

export const toolItems = [groupsItem]

export const toolsPage = (kit: Kit, groups: Sig<GroupState[] | undefined>, choose: Choose) =>
  div(
    { class: 'flex flex-col gap-6' },
    dynamicChild(
      groups.map(value => value === undefined),
      loading => (loading ? kit.loadingState() : groupRows(kit, groups, choose)),
    ),
  )
