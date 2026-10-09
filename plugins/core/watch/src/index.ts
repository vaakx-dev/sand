import { debouncedWatch } from '@sand/kit/fs'
import { definePlugin } from 'drydock'
import type { Watcher } from './contract'
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

    const watcher: Watcher = {
      debounced: (dir, options, onChange) => track(debouncedWatch(dir, options, onChange)),
      folders(load, empty, changed) {
        const folders = watchedFolders(error => ctx.report(error), load, empty, changed)
        return { get: folders.get, close: track(folders.close) }
      },
    }

    ctx.effect(() => () => {
      for (const close of [...open]) close()
    })
    ctx.provide('watcher', watcher)
  },
})
