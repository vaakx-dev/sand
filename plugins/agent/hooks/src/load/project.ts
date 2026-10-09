import type { Paths } from '@sand/paths/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import { join } from 'node:path'
import type { HookFolders } from './folder'
import type { TrustStore } from './trust'

export const projectDir = (root: string) => join(root, '.sand', 'hooks')

const sessionRoot = (paths: Paths, session: Session) => paths.projectFolder(session.cwd, session.project)

export const projectMatcher = (paths: Paths) => {
  const roots = new Map<string, string>()
  return (root: string) => (session: Session | undefined) => {
    if (!session?.cwd) return false
    const key = `${session.cwd}\0${session.project ?? ''}`
    let found = roots.get(key)
    if (found === undefined) roots.set(key, (found = sessionRoot(paths, session)))
    return found === root
  }
}

export const projectLoader = (ctx: Context<'paths'>, folders: HookFolders, trust: TrustStore, homeDir: string) => {
  const declined = new Set<string>()

  const ask = async (root: string, names: string[]) => {
    const files = `${names.length} ${names.length === 1 ? 'file' : 'files'}: ${names.join(', ')}`
    const items = [
      { label: 'Trust and run', value: true },
      { label: 'Not now', value: false },
    ]
    return (await ctx.ui?.pick(`Run the hook files in ${root}/.sand/hooks?`, items, { status: files })) === true
  }

  return async (session: Session) => {
    if (!session.cwd) return
    const root = sessionRoot(ctx.paths, session)
    const dir = projectDir(root)
    if (dir === homeDir) return
    const folder = await folders.get(dir)
    if (folder.trusted || !folder.files.length || declined.has(root) || session.kind === 'agent') return
    if (await ask(root, folder.files.map(file => file.name))) {
      await trust.save(root, folder.hash)
      return folders.trust(dir)
    }
    declined.add(root)
    ctx.ui?.notify(`The hook files in ${root}/.sand/hooks are not running because they are not trusted`)
  }
}
