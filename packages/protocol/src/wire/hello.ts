import type { Job } from '../agents'
import type { AttachmentLimits } from '../attachments'
import type { EffortLevel, Limits, ModelInfo } from '../llm'
import type { SessionSummary } from '../session'
import type { SkillSummary } from '../skills'
import type { SessionSettings } from '../settings'
import type { RelayContributions } from './relay'

export type WireJob = Omit<Job, 'cancel'>

export interface Hello {
  models?: ModelInfo[]
  defaults?: SessionSettings
  levels?: EffortLevel[]
  attachments?: AttachmentLimits
  scratch?: string
  sessions: SessionSummary[]
  jobs: WireJob[]
  active: string[]
  skills: SkillSummary[]
  limits?: Limits
  relay?: RelayContributions
}
