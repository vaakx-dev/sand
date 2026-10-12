import type { ImageViewer } from './contract'
import type { Picture } from './gallery'
import { img, mount } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { indexOfImage, threadImages } from './gallery'
import { viewerDialog } from './view/dialog'
import { viewerModel } from './view/model'

export default definePlugin({
  name: 'image-viewer',
  description: "Opens a thread's images full screen to zoom, pan and flip through",
  inject: ['threads', 'media', 'kit'],
  apply(ctx) {
    let closeOpen: (() => void) | undefined

    const viewer: ImageViewer = {
      open(thread, block) {
        const images = threadImages(ctx.threads, thread)
        const start = indexOfImage(images, block)
        if (start < 0) return
        closeOpen?.()
        const picture: Picture = (shown, props) => ctx.media.show(img({ alt: shown.name ?? 'image', ...props }), shown, thread)
        const close = () => {
          unmount()
          closeOpen = undefined
        }
        const unmount = mount(document.body, viewerDialog(ctx.kit, viewerModel(images, start), picture, close))
        closeOpen = close
      },
    }

    ctx.effect(() => () => closeOpen?.())
    ctx.provide('imageViewer', viewer)
  },
})
