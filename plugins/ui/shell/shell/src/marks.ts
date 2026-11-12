import type { Kit } from '@sand/ui-kit/contract'
import { clock, span } from '@vaakx-dev/vrui'
export const ageEnd = (kit: Kit, at?: number) => {
  if (at === undefined) return null
  const now = clock(60_000)
  return span({ class: 'shrink-0 text-xs text-neutral-500 tabular-nums' }, () => kit.shortAge(Math.max(0, now.get() - at)))
}
