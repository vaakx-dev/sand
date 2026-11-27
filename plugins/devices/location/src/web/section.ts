import { settingMark } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, type Sig, sig } from '@vaakx-dev/vrui'
import { type Access, access } from './integrations/access'

interface SectionParts {
  kit: Kit
  sharing: Sig<boolean>
  toggle(): void
}

const ITEM = { id: 'location-device', label: 'Share location from this device', keywords: ['gps', 'position', 'where', 'privacy', 'geolocation'] }

const ASKS_ONCE = 'Your browser asks once, the first time an agent needs it'

const ACCESS_LINES: Record<Access, string> = {
  insecure: 'Needs HTTPS, such as Tailscale HTTPS',
  missing: 'This browser can’t share a location',
  denied: 'Blocked. Allow location for sand in site settings',
  granted: 'Agents get this device’s precise location when they ask',
  prompt: ASKS_ONCE,
  unknown: ASKS_ONCE,
}

const OFF_LINE = 'Agents never get a location from this device'

const unable = (state: Access | undefined) => state === 'insecure' || state === 'missing'

const lineFor = (state: Access | undefined, sharing: boolean) => {
  if (state && unable(state)) return ACCESS_LINES[state]
  if (!sharing) return OFF_LINE
  return state ? ACCESS_LINES[state] : null
}

const locationSection = ({ kit, sharing, toggle }: SectionParts) => {
  const state = sig<Access | undefined>(undefined)
  void access().then(found => state.set(found))
  const detail = derive(() => lineFor(state.get(), sharing.get()))
  return kit.settingsSection(
    { title: 'On this device' },
    kit.settingsRow(
      { title: ITEM.label, detail, ...settingMark(ITEM.id) },
      kit.toggleSwitch({ on: sharing, 'aria-label': ITEM.label, disabled: () => unable(state.get()), onClick: toggle }),
    ),
  )
}

export { ITEM, locationSection }
