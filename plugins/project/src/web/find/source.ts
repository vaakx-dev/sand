import type { PaletteSource } from '@sand/palette/contract'
import type { FindContext } from '../context'
import { filesPage } from './files'
import { grepPage } from './grep'

export const findSource = (ctx: FindContext): PaletteSource => ({
  id: 'find-files',
  order: 15,
  items(query) {
    if (!query.trim() || query.startsWith('/')) return []
    return [
      { id: 'files:goto', group: 'Actions', icon: 'file', label: 'Go to file', search: 'open find quick', page: () => filesPage(ctx) },
      { id: 'files:grep', group: 'Actions', icon: 'grep', label: 'Search in project', search: 'contents grep find in files text', page: () => grepPage(ctx) },
    ]
  },
})
