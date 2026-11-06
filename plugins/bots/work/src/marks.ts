import type { IconSize, Kit } from '@sand/ui-kit/contract'
import { span } from '@vaakx-dev/vrui'
import type { Stage } from './tasks'

const marks: Record<Stage, (kit: Kit, size: IconSize) => HTMLElement> = {
  need: (kit, size) => span({ class: 'inline-flex shrink-0 text-warning-400' }, kit.icon('alert', size)),
  run: (kit, size) => span({ class: 'inline-flex shrink-0 text-info-400' }, kit.spinner(size)),
  done: (kit, size) => kit.okMark(size),
}

export const stageMark = (kit: Kit, stage: Stage, size: IconSize = 'sm') => marks[stage](kit, size)
