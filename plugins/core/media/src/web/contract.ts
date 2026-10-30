import type { ImageBlock } from '@sand/chats/contract'
import type { ClassValue, Props, StyleMap } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export type ImageSource = { block: ImageBlock } | { src: string }

export type ImageProps = Omit<Props<HTMLImageElement>, 'class' | 'style' | 'src' | 'alt' | 'title' | 'width' | 'height' | 'loading'> & { style?: StyleMap }

export interface ImageOptions {
  class?: ClassValue
  alt?: string
  title?: string
  maxHeight?: number
  open?(block: ImageBlock): void
  props?: ImageProps
}

export interface MediaView {
  image(source: ImageSource, thread: string | undefined, options?: ImageOptions): HTMLElement
}

export const mediaView = service<MediaView>('mediaView')
