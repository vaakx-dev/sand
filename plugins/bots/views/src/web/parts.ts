import type { BotAutomation, BotAutomationSource, BotProfileSection } from '@sand/bots/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { BotsContext } from './context'
import type { Registry } from './registry'
import type { BotStore } from './store'
import type { OpenTabs } from './tabs'
import type { Work } from './work'

export interface Parts {
  ctx: BotsContext
  store: BotStore
  work: Work
  tabs: OpenTabs
  projects: Derive<ProjectGroup[]>
  sections: Registry<BotProfileSection>
  automationSources: Registry<BotAutomationSource>
  open(bot: string, tab?: string): void
  profile(bot: string): void
  create(): void
}

export const automationsOf = (parts: Parts, bot: string): BotAutomation[] => parts.automationSources.items.get().flatMap(source => source.list(bot))

export const projectName = (parts: Parts, project: string) => parts.projects.get().find(group => group.id === project)?.name ?? 'Unknown project'

export const projectNames = (parts: Parts, list: string[]) => list.map(project => projectName(parts, project)).join(', ')
