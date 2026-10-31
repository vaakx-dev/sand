import type { PullArrangement, PullLink } from '@sand/pull-links/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Derive, Sig } from '@vaakx-dev/vrui'
import type { PullPlace } from './contract'
import type { PullsContext } from './inject'
import type { DetailStates } from './panel/state'
import type { PullActions } from './pull/actions'

export interface PullParts {
  ctx: PullsContext
  kit: Kit
  actions: PullActions
  states: DetailStates
  place: Sig<PullPlace | undefined>
  links: Derive<PullLink[]>
  arrangement: Derive<PullArrangement>
  primary: Derive<PullLink | undefined>
  focus: Sig<string | undefined>
  create(place: PullPlace): void
  open(link: PullLink, place: PullPlace): void
}
