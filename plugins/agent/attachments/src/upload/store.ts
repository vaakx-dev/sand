import type { FileBlock, UserContent } from '@sand/chats/contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Media } from '@sand/media/contract'
import type { Transfers } from '@sand/transfers/contract'
import type { attachmentsFinish } from '../contract'
import type { ImageLimits } from '../image'
import { mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { fit, stored, worthFitting } from '../file'
import { TooLarge } from '../fitted'
import { unpack } from '../unpack'
import { safeName } from './name'

export interface UploadPlace {
  transfers: Transfers
  media: Media
  uploads: string
  uploadBytes: number
  images: ImageLimits
}

const folderId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const mediaTypeOf = (path: string) => {
  const type = Bun.file(path).type.split(';')[0]
  return type && type !== 'application/octet-stream' ? type : undefined
}

const storeUpload = async (uploads: string, received: string, name: string): Promise<FileBlock> => {
  const folder = join(uploads, folderId())
  const saved = safeName(name)
  const path = join(folder, saved)
  await mkdir(folder, { recursive: true })
  await rename(received, path)
  const size = Bun.file(path).size
  const mediaType = mediaTypeOf(path)
  const unpacked = await unpack(path).catch(() => undefined)
  return { type: 'file', name: saved, path, size, ...(mediaType && { mediaType }), ...(unpacked && { unpacked }) }
}

const fitUpload = async (received: string, name: string, size: number, limits: ImageLimits) => {
  if (!worthFitting(name, size)) return undefined
  try {
    return await fit(await Bun.file(received).bytes(), name, limits)
  } catch (error) {
    if (error instanceof TooLarge) return undefined
    throw error
  }
}

export const finishUpload = async (place: UploadPlace, { transfer, name, chunks, size }: InputOf<typeof attachmentsFinish>): Promise<UserContent> => {
  if (size > place.uploadBytes) throw new Error(`Uploads are limited to ${Math.round(place.uploadBytes / 1024 ** 2)} MB`)
  try {
    const received = await place.transfers.received(transfer, chunks, size)
    if (!received) throw new Error('That file is empty')
    const fitted = await fitUpload(received, name, size, place.images)
    return fitted ? stored(place.media, fitted) : await storeUpload(place.uploads, received, name)
  } finally {
    await place.transfers.release(transfer)
  }
}
