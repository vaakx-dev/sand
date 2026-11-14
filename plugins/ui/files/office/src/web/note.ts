import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'

const note = (kit: Kit, text: string) => div({ class: 'p-4' }, kit.emptyState({ text }))

export { note }
