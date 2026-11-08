import type { Composer } from '@sand/composer/contract'
import type { DiffLayout, DiffView } from '@sand/git-diff-view/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { ChangesModel } from '../model/model'
import type { Slots } from './slots'

export interface ChangesServices {
  writer: Sig<Composer | undefined>
  diff: DiffView
  slots: Slots
}

export interface ViewParts extends ChangesServices {
  kit: Kit
  model: ChangesModel
  layout: DiffLayout
}
