import { sandHomeName, sandHomeProject } from '@sand/kit'
import { samePath } from '@sand/kit/fs'
import { localCopy } from './list'
import type { ProjectStore } from './store'

const listed = (store: ProjectStore, home: string, device: string) =>
  store.all().some(project => {
    const copy = localCopy(project, device)
    return copy !== undefined && samePath(copy.path, home)
  })

export const seedSandHome = async (store: ProjectStore, home: string, device: string) => {
  const known = store.get(sandHomeProject)
  if (known?.deleted || known?.copies[device] || listed(store, home, device)) return
  const now = Date.now()
  const copy = { path: home, added: now, updated: now }
  await store.put({ id: sandHomeProject, name: known?.name ?? sandHomeName, copies: { ...known?.copies, [device]: copy }, updated: known?.updated ?? 0 })
}
