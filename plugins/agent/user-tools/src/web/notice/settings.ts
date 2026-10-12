import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild } from '@vaakx-dev/vrui'
import type { AlertAccess } from '../integrations/alerts'
import type { Access } from './access'

const states: Record<Exclude<AlertAccess, 'default'>, string> = {
  granted: 'On',
  denied: 'Blocked in browser settings',
  unsupported: 'Not available on this page',
}

const control = ({ note, secondaryAction }: Kit, access: Access) =>
  dynamicChild(access.state, state => (state === 'default' ? secondaryAction({ size: 'sm', onClick: access.ask }, 'Turn on') : note(states[state])))

export const alertsSection = (kit: Kit, access: Access) => {
  const { settingsRow, settingsSection } = kit
  return settingsSection(
    { title: 'Alerts' },
    settingsRow('Alert me when the page is hidden', control(kit, access), 'Notices the agent sends you show as system notifications while sand is in the background'),
  )
}
