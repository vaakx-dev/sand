import type { FileBlock, UserContent } from '@sand/chats/contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Media } from '@sand/media/contract'
import type { Transfers } from '@sand/transfers/contract'
import { errorMessage } from '@sand/util'
import type { attachmentsAdd, attachmentsUpload, Uploaded } from '../contract'
import type { ImageLimits } from '../image'
import { copyFile, mkdir, rename, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
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

type Upload = InputOf<typeof attachmentsUpload>

type Place = (source: string, target: string) => Promise<void>

interface Incoming {
  source: string
  name: string
  size: number
  place: Place
}

const folderId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12)

const mediaTypeOf = (path: string) => {
  const type = Bun.file(path).type.split(';')[0]
  return type && type !== 'application/octet-stream' ? type : undefined
}

const storeFile = async (uploads: string, { source, name, place }: Incoming): Promise<FileBlock> => {
  const folder = join(uploads, folderId())
  const saved = safeName(name)
  const path = join(folder, saved)
  await mkdir(folder, { recursive: true })
  await place(source, path)
  const size = Bun.file(path).size
  const mediaType = mediaTypeOf(path)
  const unpacked = await unpack(path).catch(() => undefined)
  return { type: 'file', name: saved, path, size, ...(mediaType && { mediaType }), ...(unpacked && { unpacked }) }
}

const fitFile = async ({ source, name, size }: Incoming, limits: ImageLimits) => {
  if (!worthFitting(name, size)) return undefined
  try {
    return await fit(await Bun.file(source).bytes(), name, limits)
  } catch (error) {
    if (error instanceof TooLarge) return undefined
    throw error
  }
}

const sizeProblem = (place: UploadPlace, size: number) => {
  if (size > place.uploadBytes) return `Uploads are limited to ${Math.round(place.uploadBytes / 1024 ** 2)} MB`
  if (!size) return 'That file is empty'
  return undefined
}

const keep = async (place: UploadPlace, incoming: Incoming): Promise<UserContent> => {
  const fitted = await fitFile(incoming, place.images)
  return fitted ? stored(place.media, fitted) : await storeFile(place.uploads, incoming)
}

const kept = async (place: UploadPlace, incoming: Incoming): Promise<Uploaded> => {
  try {
    return { added: await keep(place, incoming) }
  } catch (error) {
    return { refused: errorMessage(error) }
  }
}

const finishUpload = async (place: UploadPlace, { transfer, name, chunks, size }: Upload): Promise<Uploaded> => {
  try {
    const problem = sizeProblem(place, size)
    if (problem) return { refused: problem }
    const source = await place.transfers.received(transfer, chunks, size)
    if (!source) return { refused: 'That file is empty' }
    return await kept(place, { source, name, size, place: rename })
  } finally {
    await place.transfers.release(transfer)
  }
}

const sizeOf = async (path: string) => {
  const found = await stat(path).catch(() => undefined)
  if (!found?.isFile()) throw new Error(`No file at ${path}`)
  return found.size
}

const attachFile = async (place: UploadPlace, { path: given, cwd }: InputOf<typeof attachmentsAdd>) => {
  const path = cwd ? resolve(cwd, given) : given
  const size = await sizeOf(path)
  const problem = sizeProblem(place, size)
  if (problem) throw new Error(problem)
  return keep(place, { source: path, name: basename(path), size, place: copyFile })
}

export { attachFile, finishUpload }
