import type { PullDetail } from '@sand/pull-detail/contract'
import type { Derive } from '@vaakx-dev/vrui'
import type { LinkedThread } from '../links/book'
import type { PageParts } from '../parts'
import type { PullActions } from './actions'
import type { DetailModel } from './model'

export interface Shown {
  parts: PageParts
  model: DetailModel
  actions: PullActions
  pull(): PullDetail
  linked: Derive<LinkedThread[]>
}
