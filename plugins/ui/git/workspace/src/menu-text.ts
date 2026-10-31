import type { Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'

export interface MenuText {
  title: string
  detail?: string
  reason?: string
}

export const menuText = (kit: Kit, { title, detail, reason }: MenuText) => [
  span({ class: 'min-w-0 flex-1 truncate' }, title),
  reason ? kit.menuReason(reason) : detail ? kit.metaLine(detail) : null,
]
