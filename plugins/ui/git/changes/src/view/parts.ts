import type { Composer } from '@sand/composer/contract'
import type { FilesPanel } from '@sand/files-panel/contract'
import type { DiffLayout, DiffView } from '@sand/git-diff-view/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { ChangesModel } from '../model/model'
import type { SectionIndex } from './sections'

export interface ChangesServices {
  writer: Sig<Composer | undefined>
  files: Sig<FilesPanel | undefined>
  diff: DiffView
}

export interface ViewParts extends ChangesServices {
  kit: Kit
  model: ChangesModel
  layout: DiffLayout
  sections: SectionIndex
}
