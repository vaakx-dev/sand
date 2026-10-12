import type { Kit } from '@sand/ui-kit/contract'
import { div } from '@vaakx-dev/vrui'
import { historySections } from '../history/section'
import type { VersionsSource } from '../history/source'
import type { LibrarySource } from '../library/source'
import type { PluginSource } from '../source'
import { catalogSection } from './catalog'
import type { RowActions } from './catalog/row'
import { changesSection } from './changes'
import { installedSection } from './installed'

export const pluginsPage = (kit: Kit, source: PluginSource, library: LibrarySource, versions: VersionsSource, actions: RowActions): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    changesSection(kit, source),
    catalogSection(kit, library, actions),
    historySections(kit, versions),
    installedSection(kit, source),
  )
