import type { KeyVal } from '@sand/keyval'
import { effect, onTimeout } from '@vaakx-dev/vrui'
import type { DraftStore } from '../contract'
import type { Model } from '../model'
import { createStore, isBlank, type Kept, type Saved } from './store'

export const dockDrafts = (key: string, model: Model, remote: () => DraftStore | undefined, local: KeyVal<Kept>, reconnected: () => Promise<void>) => {
  const store = createStore(remote, local, model.uploaded)
  let ready = false
  let loading = 0

  const loaded = async (run: number): Promise<Saved | undefined> => {
    try {
      return await store.load(key)
    } catch {
      await reconnected()
      return run === loading ? loaded(run) : undefined
    }
  }

  effect(() => {
    if (!remote()) return
    ready = false
    const run = ++loading
    void loaded(run).then(saved => {
      if (!saved || run !== loading) return
      if (!isBlank(saved) && model.empty.get()) model.fill(saved)
      ready = true
    })
    return () => {
      loading++
    }
  })

  effect(() => {
    const saved = model.draft()
    model.uploaded(saved.items)
    if (!ready) return
    return onTimeout(() => store.save(key, saved), 300)
  })
}
