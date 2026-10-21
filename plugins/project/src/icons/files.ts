import type { RemoteRecord } from '@sand/host-remotes/contract'
import { peerUrl, remoteStore } from '@sand/host-remotes/peers'
import { bearer } from '@sand/util/boot/wire'
import { fileHash } from '@sand/util/fs'
import { projectIconPath } from './paths'

export const projectIconFileRoute = '/project-icon-file'

const fromPeer = async (record: RemoteRecord, hash: string) => {
  const url = new URL(`${projectIconFileRoute}?${new URLSearchParams({ hash })}`, await peerUrl(record))
  const response = await fetch(url, { headers: bearer(record.key) })
  if (!response.ok) throw new Error(`${record.name} does not have this icon`)
  const bytes = await response.bytes()
  if (fileHash(bytes) !== hash) throw new Error(`${record.name} sent a different icon`)
  return bytes
}

export const keepProjectIcon = async (home: string, hash: string, bytes: Uint8Array) => {
  const path = projectIconPath(home, hash)
  if (!(await Bun.file(path).exists())) await Bun.write(path, bytes)
}

export const projectIconFile = async (home: string, hash: string) => {
  const path = projectIconPath(home, hash)
  if (await Bun.file(path).exists()) return Bun.file(path)
  const peers = (await remoteStore(home)).list()
  const bytes = await Promise.any(peers.map(record => fromPeer(record, hash))).catch(() => undefined)
  if (!bytes) return undefined
  await Bun.write(path, bytes)
  return Bun.file(path)
}
