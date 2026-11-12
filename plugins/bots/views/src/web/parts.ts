import type { BotAutomation, BotAutomationSource, BotProfileSection, ModelChoice } from '@sand/bots/contract'
import type { ProjectGroup, ProjectShown } from '@sand/web-client/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { Conversations } from './chat/conversations'
import type { BotsContext } from './context'
import type { Registry } from './registry'
import type { BotStore } from './store'

export interface Parts {
  ctx: BotsContext
  store: BotStore
  chats: Conversations
  projects: Derive<ProjectGroup[]>
  shown(project: string): ProjectShown
  advanced: Derive<boolean>
  defaults: Derive<ModelChoice>
  sections: Registry<BotProfileSection>
  automationSources: Registry<BotAutomationSource>
  open(bot: string): void
  profile(bot: string): void
  create(): void
}

export const automationsOf = (parts: Parts, bot: string): BotAutomation[] => parts.automationSources.items.get().flatMap(source => source.list(bot))

export const projectName = (parts: Parts, project: string) => parts.shown(project).name

export const projectNames = (parts: Parts, list: string[]) => list.map(project => projectName(parts, project)).join(', ')
