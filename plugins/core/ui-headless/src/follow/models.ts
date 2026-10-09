import type { SessionInfo } from '@sand/sessions-sqlite/contract'

export interface ModelLookup {
  model(session: string): string | undefined
  label(model: string): string
}

export const ownModel = (agent: SessionInfo, models?: ModelLookup) => {
  if (!models || !agent.parent) return undefined
  const model = models.model(agent.id)
  return model && model !== models.model(agent.parent) ? models.label(model) : undefined
}
