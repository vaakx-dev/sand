import type { BotAutomation, BotAutomationSource, BotProfileSection } from '@sand/bots/contract'
import type { ThreadView } from '@sand/chat/contract'
import type { Toasts } from '@sand/toasts/contract'
import type { ThreadRows } from '@sand/threads-home/contract'
import type { ProjectGroup, ProjectShown, Thread } from '@sand/web-client/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'
import type { Registry } from './registry'
import type { BotStore } from './store'

export type BotView = 'jobs' | 'chat'

export interface Parts {
  ctx: BotsContext
  store: BotStore
  toasts: Toasts
  projects: Derive<ProjectGroup[]>
  shown(project: string): ProjectShown
  advanced: Derive<boolean>
  threadView: Derive<ThreadView | undefined>
  threadRows: Derive<ThreadRows | undefined>
  chat(bot: string): Thread | undefined
  sections: Registry<BotProfileSection>
  automationSources: Registry<BotAutomationSource>
  open(bot: string, view?: BotView): void
  showJob(bot: string, job: string): void
  profile(bot: string): void
  create(): void
}

export const automationsOf = (parts: Parts, bot: string): BotAutomation[] => parts.automationSources.items.get().flatMap(source => source.list(bot))

export const projectName = (parts: Parts, project: string) => parts.shown(project).name

export const projectNames = (parts: Parts, list: string[]) => list.map(project => projectName(parts, project)).join(', ')
