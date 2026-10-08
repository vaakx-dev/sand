import { effect, errorMessage, overlay, place, pulse, show, sig } from '@sand/dom'
import { definePlugin, type Dispose } from 'drydock'
import { devicesView } from './dialog'
import { devicesPage } from './page'
import { deviceLinks } from './source'

export default definePlugin({
  name: 'devices',
  description: 'Links and a QR code to open this sand on a phone or another computer',
  inject: ['wire'],
  uses: {
    commands: 'opens from a Devices button in the sidebar instead of /devices',
    nav: 'no sidebar button when there is no /devices command',
    machines: 'no PCs on the Devices settings page',
    settings: 'no Devices settings page',
  },
  apply(ctx) {
    let unplace: Dispose | undefined
    const used = sig(0)
    ctx.on('wire.event', event => {
      if (event.name === 'pair.used') used.update(count => count + 1)
    })

    const close = () => {
      void unplace?.()
      unplace = undefined
    }

    const fail = (error: unknown) => {
      ctx.notify?.push(errorMessage(error), { level: 'error' })
      close()
    }

    const dialog = () => {
      const source = deviceLinks(ctx, used)
      effect(() => {
        const error = source.urls.error.get()
        if (error) queueMicrotask(() => fail(error))
      })
      return show(source.urls.data.map(Boolean), () => overlay(close, devicesView(source, close)))
    }

    const open = () => {
      close()
      unplace = place(ctx, 'overlay', dialog, 100)
    }

    ctx.effect(() => () => close())
    const changes = pulse(ctx, ['machines.change'], ['machines'])
    ctx.watch('settings', settings =>
      settings?.page({ id: 'devices', label: 'Devices', icon: 'smartphone', order: 40, render: () => devicesPage(ctx, changes, used) }),
    )
    ctx.watch('commands', commands => {
      if (commands) return commands.add({ name: 'devices', description: 'Open sand on a phone or another computer', run: open })
      return ctx.watch('nav', nav => nav?.action({ id: 'devices', label: 'Devices', icon: 'smartphone', run: open }))
    })
  },
})
