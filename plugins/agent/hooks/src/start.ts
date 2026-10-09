import { tildeHome } from '@sand/kit'
import type { Context } from 'drydock'
import { basename, join } from 'node:path'
import type { HookFileState, Hooks } from './contract'
import { hookFolders } from './load/folder'
import type { SharedEnv } from './load/module'
import { projectDir, projectLoader, projectMatcher } from './load/project'
import { trustStore } from './load/trust'
import { traceBook } from './trace'

export interface HooksRuntime {
  service: Hooks
  scan(cwd: string): Promise<void>
}

const visible = (file: HookFileState): HookFileState => ({
  ...file,
  status: file.status === 'active' && file.hooks.length && file.hooks.every(hook => hook.off) ? 'off' : file.status,
  hooks: file.hooks.map(({ name, off }) => (off ? { name, off } : { name })),
})

export const startHooks = (ctx: Context<'cli' | 'paths' | 'watcher'>, notify: SharedEnv['notify']): HooksRuntime => {
  const { home } = ctx.cli
  const homeDir = join(home, 'hooks')
  const book = traceBook()
  const noticed = new Set<string>()
  const shared: SharedEnv = { book, notify, slow: path => !noticed.has(path) && Boolean(noticed.add(path)) }
  const trust = trustStore(home)
  const homeFolders = hookFolders(ctx, shared, {
    scope: 'home',
    root: () => home,
    source: (_, file) => tildeHome(file.path),
    matches: () => () => true,
    allowed: async () => true,
  })
  const projectFolders = hookFolders(ctx, shared, {
    scope: 'project',
    root: dir => join(dir, '..', '..'),
    source: (root, file) => `${basename(root)}/.sand/hooks/${file.name}`,
    matches: projectMatcher(ctx.paths),
    allowed: (root, hash) => trust.matches(root, hash),
  })
  const loadProject = projectLoader(ctx, projectFolders, trust, homeDir)
  void homeFolders.get(homeDir)

  ctx.on('turn.prepare', async session => {
    book.begin(session)
    await homeFolders.get(homeDir)
    await loadProject(session)
    return undefined
  })
  ctx.on('turn.start', session => book.start(session), { priority: 1000 })
  ctx.on('turn.end', session => book.finish(session), { priority: -1000 })
  ctx.effect(() => () => book.clear())

  return {
    service: {
      files: () => [...homeFolders.states(), ...projectFolders.states()].map(visible),
      trusted: folder => projectDir(folder) === homeDir || projectFolders.trusted(folder),
    },
    async scan(cwd) {
      await homeFolders.get(homeDir)
      const dir = projectDir(ctx.paths.projectFolder(cwd))
      if (dir !== homeDir) await projectFolders.get(dir)
    },
  }
}
