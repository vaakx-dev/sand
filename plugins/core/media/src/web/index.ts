import { wire, wireHello } from '@sand/devices-contract'
import { onTimeout } from '@vaakx-dev/vrui'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { mediaView } from './contract'
import { createImages } from './image'
import { createSigner } from './sign'

const CONNECT_WAIT_MS = 15_000

export default definePlugin({
  name: 'media-view',
  description: "Shows the chat's images from the PC that holds them, through signed links the browser loads and caches",
  inject: { wire, threads, kit },
  apply(ctx) {
    const connected = (device?: string) =>
      new Promise<void>(resolve => {
        if (ctx.wire.ready(device)) return resolve()
        const done = () => {
          stopTimer()
          stopHello()
          resolve()
        }
        const stopTimer = onTimeout(done, CONNECT_WAIT_MS)
        const stopHello = ctx.on(wireHello, () => {
          if (ctx.wire.ready(device)) done()
        })
      })
    const signer = createSigner(ctx.wire, ctx.threads, connected)
    ctx.effect(() => signer.close)
    ctx.provide(mediaView, createImages(ctx.kit, signer))
  },
})
