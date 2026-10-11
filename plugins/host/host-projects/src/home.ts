import { sandHomeName, sandHomeProject } from '@sand/kit'
import { projectAt } from './list'
import type { ProjectStore } from './store'

export const seedSandHome = async (store: ProjectStore, home: string, device: string) => {
  const known = store.get(sandHomeProject)
  if (known?.deleted || known?.copies[device] || projectAt(store.all(), device, home)) return
  const now = Date.now()
  const copy = { path: home, added: now, updated: now }
  await store.put({ id: sandHomeProject, name: known?.name ?? sandHomeName, copies: { ...known?.copies, [device]: copy }, updated: known?.updated ?? 0 })
}
