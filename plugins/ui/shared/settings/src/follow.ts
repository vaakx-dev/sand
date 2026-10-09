import type { SettingsPage } from '@sand/protocol'
import type { Context } from 'drydock'
import { requestedPage } from './address'

export const followThreads = (ctx: Context, pages: () => SettingsPage[], open: (id: string) => void, close: () => void) => {
  let wanted = requestedPage()
  let greeted = false
  let selected: string | undefined

  const restore = () => {
    if (!wanted || !greeted || !pages().some(page => page.id === wanted)) return
    open(wanted)
    wanted = undefined
  }

  ctx.on('thread.select', id => {
    const changed = greeted && id !== selected
    selected = id
    greeted = true
    if (changed) close()
    restore()
  })
  return restore
}
