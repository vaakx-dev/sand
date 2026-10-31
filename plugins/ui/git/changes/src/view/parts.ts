import type { Composer } from '@sand/composer/contract'
import type { FilesPanel } from '@sand/files-panel/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Sig } from '@vaakx-dev/vrui'
import type { ChangesModel } from '../model/model'
import type { ViewLayout } from './layout'
import type { SectionIndex } from './sections'

export interface ChangesServices {
  writer: Sig<Composer | undefined>
  files: Sig<FilesPanel | undefined>
  markdown: Sig<Markdown | undefined>
}

export interface ViewParts extends ChangesServices {
  kit: Kit
  model: ChangesModel
  layout: ViewLayout
  sections: SectionIndex
}
