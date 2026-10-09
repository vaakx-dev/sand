import { div } from '@sand/dom'
import { historySections } from '../history/section'
import type { VersionsSource } from '../history/source'
import type { LibrarySource } from '../library/source'
import type { PluginSource } from '../source'
import { catalogSection } from './catalog'
import type { RowActions } from './catalog/warning'
import { changesSection } from './changes'
import { installedSection } from './installed'

export const pluginsPage = (source: PluginSource, library: LibrarySource, versions: VersionsSource, actions: RowActions): HTMLElement =>
  div(
    { class: 'flex flex-col gap-6' },
    changesSection(source),
    catalogSection(library, actions),
    historySections(versions),
    installedSection(source),
  )
