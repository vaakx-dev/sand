import type { FileBlock } from '@sand/chats/contract'
import type { InputOf } from '@sand/host-hub/contract'
import type { Transfers } from '@sand/transfers/contract'
import type { attachmentsFinish } from '../contract'
import { mkdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { unpack } from '../unpack'
import { safeName } from './name'

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

export const finishUpload = async (transfers: Transfers, uploads: string, limit: number, { transfer, name, chunks, size }: InputOf<typeof attachmentsFinish>) => {
  if (size > limit) throw new Error(`Uploads are limited to ${Math.round(limit / 1024 ** 2)} MB`)
  try {
    const received = await transfers.received(transfer, chunks, size)
    if (!received) throw new Error('That file is empty')
    return await storeUpload(uploads, received, name)
  } finally {
    await transfers.release(transfer)
  }
}
