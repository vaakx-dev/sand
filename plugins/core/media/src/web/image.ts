import type { ImageBlock } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, img, sig } from '@vaakx-dev/vrui'
import type { ImageOptions, ImageSource, MediaView } from './contract'
import type { Link, Signer } from './sign'
import { boxStyle, boxWidth, scaledSrc, sizeOf } from './size'

type Shown = { kind: 'signing' } | { kind: 'ready'; link: Link } | { kind: 'failed' }

const signing: Shown = { kind: 'signing' }

const onWeb = /^https?:\/\//i

const nameOf = (source: ImageSource) => ('block' in source ? source.block.name : source.src.split(/[\\/]/).pop())

const blockOf = (source: ImageSource, link: Link): ImageBlock | undefined => {
  if ('block' in source) return source.block
  return link.media && { type: 'image', ...link.media, name: nameOf(source) }
}

const placeholder = (kit: Kit, source: ImageSource, options: ImageOptions) => {
  const size = 'block' in source ? sizeOf(source.block) : undefined
  return size ? div({ class: options.class, style: boxStyle(size, options.maxHeight) }) : kit.loadingState({ flush: true })
}

const picture = (source: ImageSource, link: Link, options: ImageOptions, broke: () => void) => {
  const size = sizeOf('block' in source ? source.block : link.media)
  const block = blockOf(source, link)
  const open = options.open && block ? () => options.open?.(block) : undefined
  const { style, ...props } = options.props ?? {}
  return img({
    ...props,
    class: [options.class, size && 'h-auto', open && 'cursor-zoom-in'],
    alt: options.alt ?? nameOf(source) ?? 'image',
    ...(options.title !== undefined && { title: options.title }),
    loading: 'lazy',
    decoding: 'async',
    ...(size && { width: size.width, height: size.height }),
    style: { ...style, ...(size && { width: boxWidth(size, options.maxHeight) }) },
    src: scaledSrc(link.src, size?.height, options.maxHeight),
    onError: broke,
    ...(open && { onClick: open }),
  })
}

export const createImages = (kit: Kit, signer: Signer): MediaView => ({
  image(source, thread, options = {}) {
    const direct = 'src' in source && onWeb.test(source.src)
    const first = (): Shown => {
      if (direct) return { kind: 'ready', link: { src: source.src, expires: Infinity } }
      const link = signer.cached(source, thread)
      return link ? { kind: 'ready', link } : signing
    }
    const start = first()
    const shown = sig(start)
    let resigned = false

    const sign = (again: boolean) =>
      signer.sign(source, thread, again).then(
        link => shown.set({ kind: 'ready', link }),
        () => shown.set({ kind: 'failed' }),
      )

    const resign = () => {
      shown.set(signing)
      void sign(true)
    }

    const broke = () => {
      if (direct || resigned) return shown.set({ kind: 'failed' })
      resigned = true
      resign()
    }

    const retry = () => {
      resigned = false
      if (direct) shown.set(first())
      else resign()
    }

    if (start.kind === 'signing') void sign(false)
    return dynamicChild(shown, state => {
      if (state.kind === 'failed') return kit.errorState({ text: 'Image unavailable', retry })
      if (state.kind === 'signing') return placeholder(kit, source, options)
      return picture(source, state.link, options, broke)
    })
  },
})
