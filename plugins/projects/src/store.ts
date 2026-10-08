import { jsonListStore } from '@sand/host'
import type { ProjectRecord } from './record'

export const projectStore = async (file: string) => {
  const store = await jsonListStore<ProjectRecord>(file)
  const find = (path: string) => store.list().find(record => record.path === path)
  return {
    list: store.list,
    find,
    async change(path: string, edit: (record: ProjectRecord) => ProjectRecord, added = Date.now()) {
      const next = edit(find(path) ?? { path, added, saved: false })
      await store.save([...store.list().filter(record => record.path !== path), next])
      return next
    },
    remove: (path: string) => store.save(store.list().filter(record => record.path !== path)),
  }
}

export type ProjectStore = Awaited<ReturnType<typeof projectStore>>
