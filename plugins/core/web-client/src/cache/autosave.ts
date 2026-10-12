import { owned } from '@sand/kit/web'
import { listen } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { after } from '../detached'
import { onIdle } from '../integrations/idle'
import { askPersistence } from '../integrations/storage'
import type { Store } from '../threads/store'
import { trimMemory } from './memory'
import { otherScopes, wipeScope } from './scope'
import type { Writer } from './writer'

const writeDelay = 1000

export const autosave = (ctx: Context, store: Store, writer: Writer) => {
  let pending: (() => void) | undefined
  let writing = false
  let tidied = false

  const tidy = (scope: string) => {
    if (tidied) return
    tidied = true
    askPersistence()
    void otherScopes(scope).then(keys => Promise.all(keys.map(wipeScope)), () => {})
  }

  const write = async () => {
    pending = undefined
    if (writing) return schedule()
    writing = true
    const scope = writer.scope()
    const wrote = await writer.flush()
    writing = false
    if (wrote && scope) tidy(scope)
    if (wrote || !writer.usable()) trimMemory(store, writer.opened)
    if (writer.busy()) schedule()
  }

  const schedule = () => {
    if (pending || !writer.scope()) return
    pending = after(writeDelay, () => onIdle(() => void write()))
  }

  const flushNow = () => {
    if (!writer.busy()) return
    pending?.()
    pending = undefined
    void write()
  }

  const hidden = () => {
    if (document.visibilityState === 'hidden') flushNow()
  }

  const unwatch = store.watch({
    changed(id) {
      writer.changed(id)
      schedule()
    },
    removed(id) {
      writer.removed(id)
      schedule()
    },
  })

  owned(ctx, () => {
    listen(window, 'visibilitychange', hidden)
    listen(window, 'pagehide', flushNow)
  })
  ctx.effect(() => () => {
    pending?.()
    unwatch()
  })

  return schedule
}
