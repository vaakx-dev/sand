import { pcs, pcsChange, wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { toasts } from '@sand/toasts/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloMomentsOff, helloPushKey, notifyMomentsOff, notifyNotice } from '../contract'
import { onNoticeOpen, permission, showNotice, support } from './browser'
import { notificationsPage } from './page'

export default definePlugin({
  name: 'devices-notify',
  description: 'Notifications on this device: the Settings page that turns them on, a notification when the page is hidden, and opening the thread when one is tapped',
  inject: { wire, pcs, kit, toasts },
  apply(ctx) {
    const record = () => {
      const pairing = ctx.pcs.pairing()
      return pairing.phase === 'paired' ? pairing.device : undefined
    }
    const on = sig(Boolean(record()?.push))
    ctx.on(pcsChange, () => on.set(Boolean(record()?.push)))
    const key = sig(ctx.wire.hello(helloPushKey))
    const off = sig(ctx.wire.hello(helloMomentsOff) ?? [])
    ctx.on(wireHello, () => {
      key.set(ctx.wire.hello(helloPushKey))
      off.set(ctx.wire.hello(helloMomentsOff) ?? [])
    })
    ctx.effect(() => ctx.wire.on(notifyMomentsOff, kinds => off.set(kinds)))

    const page = { kit: ctx.kit, wire: ctx.wire, toasts: ctx.toasts, on, key, off, device: () => record()?.name ?? 'This device' }
    ctx.watch(settings, found => found?.page({ id: 'notifications', label: 'Notifications', icon: 'bell', order: 26, render: () => notificationsPage(page) }))

    if (support() !== 'ready') return
    const shows = () => on.get() && document.visibilityState === 'hidden' && permission() === 'granted'
    ctx.effect(() =>
      ctx.wire.on(
        notifyNotice,
        notice => {
          if (shows()) showNotice(notice).catch(error => ctx.report(error))
        },
        { from: 'all' },
      ),
    )
    ctx.effect(() => onNoticeOpen(thread => void ctx.get(threads)?.select(thread)))
  },
})
