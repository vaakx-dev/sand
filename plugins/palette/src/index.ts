import type { Palette, PalettePage, PaletteSource } from '@sand/protocol'
import { floating, show, sig } from '@sand/dom'
import { definePlugin } from 'drydock'
import { commandSource } from './commands'
import { merged, rootPage } from './root'
import { paletteSheet } from './sheet/sheet'

export default definePlugin({
  name: 'palette',
  description: 'Command palette (mod+k): threads, projects and commands, with pages you step through and go back from',
  uses: {
    commands: 'commands are not listed',
    keys: 'no mod+k shortcut; use the Search action',
    nav: 'no Search action',
    notify: 'errors from palette actions go to the console',
  },
  apply(ctx) {
    const sources = new Set<PaletteSource>([commandSource(ctx)])
    const root = rootPage(() => [...sources])
    const stack = sig<PalettePage[]>([])
    let query = ''

    const palette: Palette = {
      open(start = '') {
        query = typeof start === 'string' ? start : ''
        stack.set(typeof start === 'string' ? [root] : [start])
      },
      close: () => stack.set([]),
      source(source) {
        sources.add(source)
        return () => void sources.delete(source)
      },
      items: (page, typed) => merged([...sources].filter(source => source.page === page), typed),
    }

    const isOpen = stack.map(pages => pages.length > 0)
    floating(ctx, () => show(isOpen, () => paletteSheet(ctx, stack, () => query)))
    const toggle = () => (isOpen.get() ? palette.close() : palette.open())
    ctx.provide('palette', palette)
    ctx.watch('keys', keys => keys?.bind({ key: 'mod+k', description: 'Command palette', global: true, run: toggle }))
    ctx.watch('nav', nav => nav?.action({ id: 'search', label: 'Search', icon: 'search', order: 0, wide: true, run: () => palette.open() }))
  },
})
