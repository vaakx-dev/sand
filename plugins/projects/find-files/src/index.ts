import type { PaletteSource } from '@sand/protocol'
import { definePlugin, type Context } from 'drydock'
import { filesPage } from './files'
import { grepPage } from './grep'

const source = (ctx: Context<'threads' | 'fileIndex'>): PaletteSource => ({
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

export default definePlugin({
  name: 'find-files',
  description: 'Go to file and Search in project in the palette; picking a file puts @path in the prompt',
  inject: ['threads', 'fileIndex'],
  uses: { palette: 'nothing is shown', composer: 'picked files cannot be added to a prompt' },
  apply(ctx) {
    ctx.watch('palette', palette => palette?.source(source(ctx)))
  },
})
