import { debouncedWatch } from '@sand/util/fs'
import { definePlugin } from 'drydock'
import { type Watcher, watcher } from './contract'
import { watchedFolders } from './folders'

export default definePlugin({
  name: 'watch',
  description: 'Debounced folder watchers that plugins share and that close when they unload',
  apply(ctx) {
    const open = new Set<() => void>()
    const track = (close: () => void) => {
      const once = () => {
        if (open.delete(once)) close()
      }
      open.add(once)
      return once
    }

    const service: Watcher = {
      debounced: (dir, options, onChange, ms) => track(debouncedWatch(dir, options, onChange, ms)),
      folders(load, empty, changed) {
        const folders = watchedFolders(error => ctx.report(error), load, empty, changed)
        return { get: folders.get, close: track(folders.close) }
      },
    }

    ctx.effect(() => () => {
      for (const close of [...open]) close()
    })
    ctx.provide(watcher, service)
  },
})
