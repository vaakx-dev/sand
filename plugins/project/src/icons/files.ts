import type { Peers } from '@sand/devices-contract'
import { fileHash } from '@sand/util/fs'
import { projectIconPath } from './paths'

export const projectIconFileRoute = '/project-icon-file'

const fromPeer = async (peers: Peers, pc: string, hash: string) => {
  const name = peers.get(pc)?.name ?? pc
  const response = await peers.fetch(pc, `${projectIconFileRoute}?${new URLSearchParams({ hash })}`)
  if (!response.ok) throw new Error(`${name} does not have this icon`)
  const bytes = await response.bytes()
  if (fileHash(bytes) !== hash) throw new Error(`${name} sent a different icon`)
  return bytes
}

export const keepProjectIcon = async (home: string, hash: string, bytes: Uint8Array) => {
  const path = projectIconPath(home, hash)
  if (!(await Bun.file(path).exists())) await Bun.write(path, bytes)
}

export const projectIconFile = async (home: string, hash: string, peers: Peers | undefined) => {
  const path = projectIconPath(home, hash)
  if (await Bun.file(path).exists()) return Bun.file(path)
  const pcs = peers?.connected() ?? []
  const bytes = peers && (await Promise.any(pcs.map(pc => fromPeer(peers, pc, hash))).catch(() => undefined))
  if (!bytes) return undefined
  await Bun.write(path, bytes)
  return Bun.file(path)
}
