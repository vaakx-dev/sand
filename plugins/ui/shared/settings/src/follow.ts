import type { SettingsPage } from './contract'
import { onAddressChange } from '@sand/dom'
import type { Context } from 'drydock'
import { requestedPage } from './address'

export const followAddress = (ctx: Context, pages: () => SettingsPage[], show: (id: string | undefined) => void) => {
  let wanted = requestedPage()
  let greeted = false

  const restore = () => {
    if (!wanted || !greeted || !pages().some(page => page.id === wanted)) return
    show(wanted)
    wanted = undefined
  }

  const sync = () => {
    wanted = requestedPage()
    if (!wanted) show(undefined)
    restore()
  }

  ctx.on('thread.select', () => {
    greeted = true
    sync()
  })
  ctx.effect(() => onAddressChange(sync))
  return restore
}
