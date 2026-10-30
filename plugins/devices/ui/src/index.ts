import { pcMarks } from '@sand/devices-contract'
import { owned } from '@sand/web-client/reactive'
import { derive, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { commandSheet } from './add/command-sheet'
import { reportJoins } from './add/joining'
import { addSheet } from './add/sheet'
import { anywherePrompt } from './anywhere/prompt'
import { approvals } from './approve/watch'
import { composerParts } from './composer'
import { createData } from './data'
import { detailsSheet } from './details/sheet'
import { diagnosisSheet } from './diagnosis/sheet'
import { inject } from './inject'
import { joinOffer } from './join-offer/watch'
import { devicesSettings } from './page'
import { overlaySlot } from './shared/overlay'
import { createToasts } from './shared/toasts'
import { createMarks } from './status/marks'
import type { AddStep, Openers, Ui } from './ui'
import { unpairedPage } from './unpaired/page'

export default definePlugin({
  name: 'devices-ui',
  description:
    'Everything you see about your devices: the Devices settings page, PC details with route order, why a PC can’t connect, the Add sheet, Allow prompts, the unpaired page, the composer’s PC banner and picker, and status dots other plugins can use',
  inject,
  apply(ctx) {
    owned(ctx, () => {
      const data = createData(ctx)
      const toasts = createToasts(ctx, ctx.kit)
      const sheet = overlaySlot(ctx)
      const why = overlaySlot(ctx, 130)
      const adding = sig(false)
      const phone = derive(() => {
        const state = data.paired.get()
        return state.phase === 'paired' && state.device.kind === 'phone'
      })

      const closeSheet = () => {
        adding.set(false)
        sheet.close()
      }
      const showSheet = (view: () => HTMLElement, isAdd = false) => {
        adding.set(isAdd)
        sheet.open(view)
      }
      const open: Openers = {
        details: pc => showSheet(() => detailsSheet(ui, pc, closeSheet)),
        why: pc => why.open(() => diagnosisSheet(ui, pc, why.close)),
        add: (step: AddStep = 'list') => showSheet(() => addSheet(ui, step, closeSheet), true),
        command: install => showSheet(() => commandSheet(ui, install, closeSheet)),
      }
      const ui: Ui = { ctx, kit: ctx.kit, data, toasts, open, device: () => (phone.get() ? 'This phone' : 'This browser') }

      ctx.provide(pcMarks, createMarks(ui))
      devicesSettings(ui)
      approvals(ui, () => adding.get())
      reportJoins(ui, () => adding.get())
      unpairedPage(ui)
      composerParts(ui)
      anywherePrompt(ui)
      joinOffer(ui)
    })
  },
})
