import type { Choice } from '@sand/dom'
import type { GroupState, ToolLoad } from '../contract'
import { div, list, pageHead, segmented, settingsRow, settingsSection, show, type Sig } from '@sand/dom'

export type Choose = (group: string, load: ToolLoad) => void

const loads: Choice<ToolLoad>[] = [
  { value: 'always', label: 'Always', title: 'Sent with every request' },
  { value: 'on-demand', label: 'On demand', title: 'The agent loads them with find_tools when a task needs them' },
  { value: 'off', label: 'Off', title: 'The agent never gets them' },
]

const groupRow = (group: Sig<GroupState>, choose: Choose) =>
  settingsRow(
    group.map(value => value.label),
    segmented(loads, group.map(value => value.chosen), load => choose(group.get().name, load), { label: 'How these tools load' }),
    group.map(value => `${value.summary} · ${value.tools.join(', ') || 'no tools loaded'}`),
  )

const groupRows = (groups: Sig<GroupState[] | undefined>, choose: Choose) =>
  settingsSection(
    { title: 'Tool groups' },
    list(
      groups.map(value => value ?? []),
      group => group.name,
      group => groupRow(group, choose),
      div({ class: 'flex flex-col gap-y-px' }),
    ),
  )

export const toolsPage = (groups: Sig<GroupState[] | undefined>, choose: Choose) =>
  div(
    { class: 'flex flex-col gap-6' },
    pageHead('Choose which tools the agent always has, and which it looks up with find_tools when a task needs them. Tools outside these groups always load.', null),
    show(
      () => Boolean(groups.get()?.length),
      () => groupRows(groups, choose),
    ),
  )
