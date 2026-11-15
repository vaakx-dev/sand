import type { Bots } from '@sand/bots/contract'
import type { OwnerKind } from '@sand/orchestrator/contract'

const soleProject = (projects: string[]) => (projects.length === 1 ? projects[0] : undefined)

export const botOwner = (bots: Bots): OwnerKind => ({
  label: bot => bots.get(bot)?.name || undefined,
  project: bot => soleProject(bots.get(bot)?.projects ?? []),
})
