import { existsSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'

const settle = 2000

const folders = new Set(['plugins', 'hooks'])

const ignored = (name: string | null) => !!name && name.split(/[\\/]/).some(part => part === 'node_modules' || part.startsWith('.'))

export const watchTargets = (home: string, changed: () => void) => {
  let timer: Timer | undefined
  const nested = new Map<string, FSWatcher>()

  const kick = (name: string | null) => {
    if (ignored(name)) return
    clearTimeout(timer)
    timer = setTimeout(changed, settle)
  }

  const arm = (folder: string) => {
    nested.get(folder)?.close()
    nested.delete(folder)
    const path = join(home, folder)
    if (!existsSync(path)) return
    try {
      const watcher = watch(path, { recursive: true }, (_, name) => kick(name))
      watcher.on('error', () => {})
      nested.set(folder, watcher)
    } catch {}
  }

  const top = watch(home, (_, name) => {
    if (name && folders.has(name)) arm(name)
    if (name && (folders.has(name) || name === 'loops.json')) kick(null)
  })
  top.on('error', () => {})
  for (const folder of folders) arm(folder)

  return () => {
    clearTimeout(timer)
    top.close()
    for (const watcher of nested.values()) watcher.close()
  }
}
