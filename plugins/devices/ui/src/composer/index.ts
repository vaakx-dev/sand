import { composer } from '@sand/composer/contract'
import { effect } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'
import { connectionBanner } from './banner'
import { pcTab } from './pc-tab'
import { connectionState } from './state'
import { threadPlace } from './thread-pc'

export const composerParts = (ui: Ui) => {
  const place = threadPlace(ui)
  const state = connectionState(ui, place.pc)
  const tab = pcTab(ui, place)
  ui.ctx.watch(composer, found => {
    if (!found) return
    const unhold = found.hold(state.holdReason)
    const stopBanner = effect(() => (state.late.get() ? found.slot('banner', () => connectionBanner(ui, state)) : undefined))
    const stopTab = effect(() => (tab.visible.get() ? found.slot('tray-start', tab.view) : undefined))
    return () => {
      void unhold()
      stopBanner()
      stopTab()
    }
  })
}
