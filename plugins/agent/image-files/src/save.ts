import type { ImageBlock, UserContent } from '@sand/chats/contract'
import { imageLabel, isImageLabel } from '@sand/chats/prompt'
import { join } from 'node:path'

const save = async (folder: string, data: string, mediaType: string) => {
  const path = join(folder, `${Bun.hash(data).toString(16)}.${mediaType.split('/')[1]}`)
  await Bun.write(path, Buffer.from(data, 'base64'))
  return path
}

const withPath = async (folder: string, image: ImageBlock): Promise<ImageBlock> =>
  image.data === undefined ? image : { ...image, path: await save(folder, image.data, image.mediaType) }

const labeled = async (folder: string, block: UserContent, next?: UserContent): Promise<UserContent[]> => {
  if (isImageLabel(block, next)) return []
  if (block.type !== 'image') return [block]
  const image = await withPath(folder, block)
  return [{ type: 'text', text: imageLabel(image) }, image]
}

export const saveImages = async (folder: string, content: UserContent[]) =>
  (await Promise.all(content.map((block, index) => labeled(folder, block, content[index + 1])))).flat()
