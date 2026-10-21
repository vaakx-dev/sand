import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { historySections } from './history/section'
import type { VersionsSource } from './history/source'
import { catalogSection } from './library/catalog'
import type { RowActions } from './library/row'
import type { LibrarySource } from './library/source'
import { changesSection } from './sync/changes'
import { installedSection } from './sync/installed'
import type { SyncSource } from './sync/source'

export interface PageSources {
  sync: SyncSource
  library: LibrarySource
  versions: VersionsSource
  actions: RowActions
}

export const pluginsPage = (kit: Kit, { sync, library, versions, actions }: PageSources): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    changesSection(kit, sync),
    catalogSection(kit, library, actions),
    historySections(kit, versions),
    installedSection(kit, sync),
  )
