import type { Remote } from '@sand/protocol'
import { jsonListStore } from '@sand/host'

export const remoteStore = async (file: string) => {
  const store = await jsonListStore<Remote>(file)
  return {
    list: store.list,
    async put(remote: Remote) {
      await store.save([...store.list().filter(other => other.id !== remote.id), remote])
      return remote
    },
    remove: (id: string) => store.save(store.list().filter(remote => remote.id !== id)),
  }
}

export type RemoteStore = Awaited<ReturnType<typeof remoteStore>>
