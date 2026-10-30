import type { ImageViewer } from '../../contract'
import type { Picture } from './gallery'
import { mount } from '@vaakx-dev/vrui'
import type { ImagesContext } from '../context'
import { galleryOf } from './gallery'
import { viewerDialog } from './view/dialog'
import { viewerModel } from './view/model'

export const createImageViewer = (ctx: ImagesContext): ImageViewer => {
  let closeOpen: (() => void) | undefined

  ctx.effect(() => () => closeOpen?.())

  return {
    open(thread, block) {
      const { images, start } = galleryOf(ctx.threads, thread, block)
      closeOpen?.()
      const picture: Picture = (shown, options) => ctx.mediaView.image({ block: shown }, thread, options)
      const close = () => {
        unmount()
        closeOpen = undefined
      }
      const unmount = mount(document.body, viewerDialog(ctx.kit, viewerModel(images, start), picture, close))
      closeOpen = close
    },
  }
}
