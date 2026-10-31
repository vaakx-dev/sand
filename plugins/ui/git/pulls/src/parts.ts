import type { PullLink } from '@sand/pull-links/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Derive, Sig } from '@vaakx-dev/vrui'
import type { PullPlace } from './contract'
import type { PullsContext } from './inject'
import type { LinkStore } from './links/store'
import type { PullActions } from './pull/actions'

export interface PullParts {
  ctx: PullsContext
  kit: Kit
  store: LinkStore
  actions: PullActions
  place: Sig<PullPlace | undefined>
  links: Derive<PullLink[]>
  primary: Derive<PullLink | undefined>
  focus: Sig<string | undefined>
  create(place: PullPlace): void
  open(link: PullLink, place: PullPlace): void
}
