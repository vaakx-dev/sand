import { pairUsed } from '@sand/host-devices/contract'
import { settings } from '@sand/settings/contract'
import { definePlugin } from 'drydock'
import { addPcDialog, type AddPcMode } from './add-pc/dialog'
import { pcHealthStore } from './health/state'
import { inject } from './inject'
import { overlaySlot } from './overlay-slot'
import { pairDialog } from './pair/dialog'
import { pcsPage } from './page'
import { deviceSource } from './source'
import { threadPc } from './thread-pc'
import { unpairedOverlay } from './unpaired'

export default definePlugin({
  name: 'devices',
  description: 'Devices: add and pair other PCs, pair phones and browsers, reach sand away from home, and pick which PC a new thread runs on',
  inject,
  apply(ctx) {
    const dialog = overlaySlot(ctx)
    let invites = new Set<number>()

    ctx.effect(() =>
      ctx.wire.on(pairUsed, ({ expires }) => {
        if (dialog.isOpen() && invites.has(expires)) dialog.close()
      }),
    )

    const source = deviceSource(ctx)

    const pair = () => {
      const shown = new Set<number>()
      invites = shown
      dialog.open(() => pairDialog(ctx, source, shown, dialog.close))
    }

    const addPc = (mode: AddPcMode = 'choose') => {
      invites = new Set()
      dialog.open(() => addPcDialog(ctx, source, dialog.close, mode))
    }

    unpairedOverlay(ctx)
    threadPc(ctx)

    const health = pcHealthStore(ctx)
    const actions = { pair, addPc: () => addPc(), pairAgain: () => addPc('join') }
    ctx.watch(settings, found =>
      found?.page({ id: 'devices', label: 'Devices', icon: 'laptop', order: 27, render: () => pcsPage(ctx, source, health, actions) }),
    )
  },
})
