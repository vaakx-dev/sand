import type { ImageViewer } from '../../contract'
import { shell, type SheetHandle } from '@sand/ui-shell/contract'
import type { ImagesContext } from '../context'
import { galleryOf, type Draw, type Picture } from './gallery'
import { viewerDialog } from './view/dialog'
import { viewerModel } from './view/model'

export const createImageViewer = (ctx: ImagesContext): ImageViewer => {
  let open: SheetHandle | undefined

  ctx.effect(() => () => open?.close())

  const show = (images: Picture[], start: number, thread?: string) => {
    const before = open
    const draw: Draw = (picture, options) => ctx.mediaView.image(picture.source, thread, { ...options, alt: picture.name })
    open = ctx.get(shell)?.sheet(viewerDialog(ctx.kit, viewerModel(images, start), draw))
    before?.close()
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
