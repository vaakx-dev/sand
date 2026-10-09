import { place } from '@sand/dom'
import { definePlugin, type Dispose } from 'drydock'
import { addPcDialog, type AddPcMode } from './add-pc/dialog'
import { pcHealthStore } from './health/state'
import { pairDialog } from './pair/dialog'
import { pcsPage } from './page'
import { deviceSource } from './source'
import { unpairedOverlay } from './unpaired'

export default definePlugin({
  name: 'devices',
  description: 'Your PCs: add and pair other PCs, pair phones and browsers, and reach sand away from home',
  inject: ['wire'],
  uses: {
    commands: 'opens the pair dialog from a Devices button in the sidebar instead of /devices',
    nav: 'no sidebar button when there is no /devices command',
    settings: 'no Your PCs settings page',
    notify: 'no message when a device pairs or a request fails',
    picker: 'no Rename on phones and browsers',
  },
  apply(ctx) {
    let unplace: Dispose | undefined
    let shown = new Set<number>()

    const close = () => {
      void unplace?.()
      unplace = undefined
    }

    ctx.on('wire.event', event => {
      if (event.name !== 'pair.used' || !unplace || !shown.has(event.args[1])) return
      close()
      ctx.notify?.push(`${event.args[0].name} paired`)
    })

    const source = deviceSource(ctx)

    let unplaceAddPc: Dispose | undefined

    const closeAddPc = () => {
      void unplaceAddPc?.()
      unplaceAddPc = undefined
    }

    const open = () => {
      close()
      closeAddPc()
      shown = new Set()
      const invites = shown
      unplace = place(ctx, 'overlay', () => pairDialog(ctx, source, invites, close), 100)
    }

    const openAddPc = (mode: AddPcMode = 'choose') => {
      close()
      closeAddPc()
      unplaceAddPc = place(ctx, 'overlay', () => addPcDialog(ctx, source, closeAddPc, mode), 100)
    }

    ctx.effect(() => () => {
      close()
      closeAddPc()
    })
    unpairedOverlay(ctx)

    const health = pcHealthStore(ctx)
    const actions = { pair: open, addPc: () => openAddPc(), pairAgain: () => openAddPc('join') }
    ctx.watch('settings', settings =>
      settings?.page({ id: 'devices', label: 'Your PCs', icon: 'laptop', order: 27, render: () => pcsPage(ctx, source, health, actions) }),
    )
    ctx.watch('commands', commands => commands?.add({ name: 'add-pc', description: 'Add another PC running sand', run: () => openAddPc() }))
    ctx.watch('commands', commands => {
      if (commands) return commands.add({ name: 'devices', description: 'Pair a phone or browser', run: open })
      return ctx.watch('nav', nav => nav?.action({ id: 'devices', label: 'Devices', icon: 'smartphone', run: open }))
    })
  },
})
