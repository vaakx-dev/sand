import type { Kit } from '@sand/ui-kit/contract'

export const noAutomations = (kit: Kit) => kit.emptyState({ text: 'No automations yet. Ask a bot to check something on a schedule.' })
