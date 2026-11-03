import { listen } from '@vaakx-dev/vrui'
import { openImage } from '../protocol'
import { post } from './post'

const imageIn = (event: MouseEvent) => {
  const [target] = event.composedPath()
  if (!(target instanceof HTMLImageElement) || target.closest('a[href], button')) return undefined
  return target
}

const plainClick = (event: MouseEvent) =>
  event.isTrusted && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

export const forwardImages = () =>
  listen<MouseEvent>(window, 'click', event => {
    const image = plainClick(event) ? imageIn(event) : undefined
    const src = image?.currentSrc || image?.src
    if (src) post(openImage, { src, name: image?.alt || image?.title || '' })
  })
