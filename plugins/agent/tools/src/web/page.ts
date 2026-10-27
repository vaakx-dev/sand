import type { Choice, Kit } from '@sand/ui-kit/contract'
import type { GroupState, ToolLoad } from '../contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'

export type Choose = (group: string, load: ToolLoad) => void

const loads: Choice<ToolLoad>[] = [
  { value: 'always', label: 'Always', title: 'Sent with every request' },
  { value: 'on-demand', label: 'On demand', title: 'The agent loads them with find_tools when a task needs them' },
  { value: 'off', label: 'Off', title: 'The agent never gets them' },
]

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const groupDetail = (group: GroupState) =>
  span(sentence(group.summary), group.tools.length ? [' · ', span({ class: 'font-mono text-neutral-500' }, group.tools.join(', '))] : null)

const groupRow = ({ segmented, settingsRow }: Kit, group: Sig<GroupState>, choose: Choose) =>
  settingsRow(
    { title: group.map(value => value.label), detail: dynamicChild(group, groupDetail) },
    segmented(loads, group.map(value => value.chosen), load => choose(group.get().name, load), { label: `How ${group.get().label} tools load` }),
  )

const groupRows = (kit: Kit, groups: Sig<GroupState[] | undefined>, choose: Choose) =>
  kit.settingsSection(
    {},
    kit.rowList(
      groups.map(value => value ?? []),
      group => group.name,
      group => groupRow(kit, group, choose),
    ),
  )

export const toolsPage = (kit: Kit, groups: Sig<GroupState[] | undefined>, choose: Choose) => {
  const { loadingState, pageHead } = kit
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead('On demand tools stay out of each request until the agent finds them with find_tools. Tools outside these groups always load.'),
    dynamicChild(
      groups.map(value => value === undefined),
      loading => (loading ? loadingState() : groupRows(kit, groups, choose)),
    ),
  )
}
