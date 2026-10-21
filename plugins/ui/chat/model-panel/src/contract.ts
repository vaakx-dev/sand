import { service } from 'drydock'

export interface ModelPill {
  open(effort?: boolean): void
}

export const modelPill = service<ModelPill>('modelPill')
