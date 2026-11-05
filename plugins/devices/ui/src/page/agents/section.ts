import { derive, show } from '@vaakx-dev/vrui'
import type { Ui } from '../../ui'
import { agentRow } from './row'

export const agentsSection = (ui: Ui) => {
  const { emptyState, icon, quietButton, rowList, settingsSection } = ui.kit
  const { devices } = ui.data
  const list = derive(() => devices.live().filter(device => device.kind === 'agent'))
  return settingsSection(
    { title: 'Agents', action: quietButton({ size: 'sm', onClick: () => ui.open.agent() }, icon('plus', 'sm'), 'Add an agent') },
    rowList(list, device => device.id, device => agentRow(ui, device)),
    show(
      () => devices.records.loaded.get() && !list.get().length,
      () => emptyState({ surface: 'group', text: 'No agents yet. Add one to use your threads from Claude Code, Codex or another MCP client.' }),
    ),
  )
}
