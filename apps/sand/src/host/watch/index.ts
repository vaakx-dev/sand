import { definePlugin } from 'drydock'
import { existsSync, watch, type FSWatcher } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const debounce = 1000

const ignored = (filename: string) => filename.split(/[\\/]/).some(part => part === 'node_modules' || part.startsWith('.'))

export const watchPlugin = definePlugin({
  name: 'watch',
  inject: ['hostOptions', 'runtimes'],
  apply(ctx) {
    const options = ctx.hostOptions
    if (!options.watch) return
    const repo = resolve(dirname(options.main), '..', '..', '..')
    const folders = [join(repo, 'plugins'), join(repo, 'packages'), join(options.home, 'plugins')].filter(existsSync)
    let timer: Timer | undefined
    const changed = (filename: string | null) => {
      if (filename && ignored(filename)) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        console.log('plugin files changed; starting a fresh runtime')
        void ctx.runtimes.swap('watch')
      }, debounce)
    }
    ctx.effect(() => {
      const watchers: FSWatcher[] = folders.map(folder => watch(folder, { recursive: true }, (_, filename) => changed(filename)))
      for (const watcher of watchers) watcher.on('error', () => {})
      return () => {
        clearTimeout(timer)
        for (const watcher of watchers) watcher.close()
      }
    })
  },
})
