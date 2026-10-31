import type { GitHubAuth, PullRef } from '@sand/github/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Thread } from '@sand/web-client/contract'
import type { Derive, Sig } from '@vaakx-dev/vrui'
import type { QueryState } from './address/state'
import type { AgentActions } from './agent/actions'
import type { PullMenu, PullTab } from './contract'
import type { ExtensionBook } from './extend/book'
import type { PageContext } from './inject'
import type { ListModel } from './list/model'
import type { RepoChoice } from './projects/repos'

export interface PageParts {
  ctx: PageContext
  kit: Kit
  query: QueryState
  list: ListModel
  agent: AgentActions
  tabs: ExtensionBook<PullTab>
  menus: ExtensionBook<PullMenu>
  repos: Derive<RepoChoice[]>
  count: Sig<number>
  auth: Derive<GitHubAuth | undefined>
  account: Derive<string>
  narrow: Derive<boolean>
  selected: Derive<PullRef | undefined>
  thread(session: string): Thread | undefined
  select(pull: PullRef | undefined): void
  close(): void
  showSide(): void
}
