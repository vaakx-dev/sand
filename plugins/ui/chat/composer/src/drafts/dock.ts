import { effect, onTimeout } from '@vaakx-dev/vrui'
import type { DraftStore } from '../contract'
import type { Model } from '../model'
import { createStore, isBlank } from './store'

export const dockDrafts = (key: string, model: Model, remote: () => DraftStore | undefined) => {
  const store = createStore(remote, model.upload)
  let ready = false

  effect(() => {
    if (!remote()) return
    ready = false
    void store.load(key).then(saved => {
      if (!isBlank(saved) && model.empty.get()) model.fill(saved)
      ready = true
    })
  })

  effect(() => {
    const saved = model.draft()
    if (!ready) return
    return onTimeout(() => store.save(key, saved), 300)
  })
}
