import type { ImageViewer } from '../../contract'
import { mount } from '@vaakx-dev/vrui'
import type { ImagesContext } from '../context'
import { galleryOf, type Draw, type Picture } from './gallery'
import { viewerDialog } from './view/dialog'
import { viewerModel } from './view/model'

export const createImageViewer = (ctx: ImagesContext): ImageViewer => {
  let closeOpen: (() => void) | undefined

  ctx.effect(() => () => closeOpen?.())

  const show = (images: Picture[], start: number, thread?: string) => {
    closeOpen?.()
    const draw: Draw = (picture, options) => ctx.mediaView.image(picture.source, thread, { ...options, alt: picture.name })
    const close = () => {
      unmount()
      closeOpen = undefined
    }
    const unmount = mount(document.body, viewerDialog(ctx.kit, viewerModel(images, start), draw, close))
    closeOpen = close
  }

  return {
    open(thread, block) {
      const { images, start } = galleryOf(ctx.threads, thread, block)
      show(images, start, thread)
    },
    show(src, name) {
      show([{ source: { src }, sender: 'sand', name }], 0)
    },
  }
}
