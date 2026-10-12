import { definePlugin } from 'drydock'
import { addPcDialog, type AddPcMode } from './add-pc/dialog'
import { pcHealthStore } from './health/state'
import { overlaySlot } from './overlay-slot'
import { pairDialog } from './pair/dialog'
import { pcsPage } from './page'
import { deviceSource } from './source'
import { unpairedOverlay } from './unpaired'

export default definePlugin({
  name: 'devices',
  description: 'Devices: add and pair other PCs, pair phones and browsers, and reach sand away from home',
  inject: ['wire'],
  uses: {
    commands: 'opens the pair dialog from a Devices button in the sidebar instead of /devices',
    nav: 'no sidebar button when there is no /devices command',
    settings: 'no Devices settings page',
    notify: 'no message when a device pairs or a request fails',
    picker: 'no Rename on phones and browsers',
  },
  apply(ctx) {
    const dialog = overlaySlot(ctx)
    let invites = new Set<number>()

    ctx.on('wire.event', event => {
      if (event.name !== 'pair.used' || !dialog.isOpen() || !invites.has(event.args[1])) return
      dialog.close()
      ctx.notify?.push(`${event.args[0].name} paired`)
    })

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

    const health = pcHealthStore(ctx)
    const actions = { pair, addPc: () => addPc(), pairAgain: () => addPc('join') }
    ctx.watch('settings', settings =>
      settings?.page({ id: 'devices', label: 'Devices', icon: 'laptop', order: 27, render: () => pcsPage(ctx, source, health, actions) }),
    )
    ctx.watch('commands', commands => commands?.add({ name: 'add-pc', description: 'Add another PC running sand', run: () => addPc() }))
    ctx.watch('commands', commands => {
      if (commands) return commands.add({ name: 'devices', description: 'Pair a phone or browser', run: pair })
      return ctx.watch('nav', nav => nav?.action({ id: 'devices', label: 'Devices', icon: 'smartphone', run: pair }))
    })
  },
})
