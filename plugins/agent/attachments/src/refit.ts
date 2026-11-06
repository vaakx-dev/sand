import type { ImageBlock, ToolResultContent } from '@sand/chats/contract'
import type { Media } from '@sand/media/contract'
import { image, type ImageLimits } from './image'

const fits = ({ width, height, size }: ImageBlock, { imageEdge, imageBytes }: ImageLimits) =>
  width !== undefined && height !== undefined && Math.max(width, height) <= imageEdge && size <= imageBytes

const refit = async (media: Media, block: ImageBlock, limits: ImageLimits): Promise<ImageBlock> => {
  if (fits(block, limits)) return block
  const file = Bun.file(media.path(block))
  if (!(await file.exists())) return block
  const fitted = await image(await file.bytes(), block.name ?? 'image', limits)
  return fitted ? { ...block, ...media.put(fitted.bytes, fitted.block.mediaType) } : block
}

export const fitImages = (media: Media, content: ToolResultContent[], limits: ImageLimits) =>
  Promise.all(content.map(block => (block.type === 'image' ? refit(media, block, limits) : block)))
