import { composer } from '@sand/composer/contract'
import { effect } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { connectionBanner } from './banner'
import { pcEntry } from './pc-entry'
import { connectionState } from './state'
import { threadPlace } from './thread-pc'

export const composerParts = (ui: Ui) => {
  const place = threadPlace(ui)
  const state = connectionState(ui, place.pc)
  const pcs = pcEntry(ui, place)
  ui.ctx.watch(composer, found => {
    if (!found) return
    const unhold = found.hold(state.holdReason)
    const stopBanner = effect(() => (state.late.get() ? found.slot('banner', () => connectionBanner(ui, state)) : undefined))
    const stopEntry = effect(() => (pcs.visible.get() ? found.plus(pcs.entry, 20) : undefined))
    return () => {
      void unhold()
      stopBanner()
      stopEntry()
    }
  })
}
