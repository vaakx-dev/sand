import type { PcIdentity, Registry, ThisPc } from '@sand/devices-contract'
import { signerOf } from '@sand/devices-identity'
import type { PcKeys } from '@sand/devices-identity/pc'
import type { BuildInfo } from '@sand/host-dist/contract'
import { hostname } from 'node:os'

interface ThisPcOptions {
  keys: PcKeys
  name?: string
  registry: Registry
  build(): Promise<BuildInfo | undefined>
}

export interface HostThisPc extends ThisPc {
  current(): PcIdentity
}

export const createThisPc = async ({ keys, name, registry, build }: ThisPcOptions): Promise<HostThisPc> => {
  const { id, publicKey } = keys
  const platform = process.platform
  const seedName = name?.trim() || hostname()
  if (!registry.get(id)) await registry.add({ kind: 'pc', name: seedName, platform, publicKey }, id)
  let known: BuildInfo | undefined

  const currentName = () => registry.get(id)?.name ?? seedName
  const current = (): PcIdentity => ({ id, name: currentName(), platform, publicKey, ...(known && { build: known }) })

  const identity = async () => {
    known = (await build().catch(() => undefined)) ?? known
    return current()
  }

  return {
    id,
    publicKey,
    platform,
    signer: signerOf(keys),
    name: currentName,
    current,
    identity,
    async rename(next) {
      await registry.rename(id, next, id)
      return identity()
    },
    onRename(listener) {
      let last = currentName()
      return registry.onChange(changed => {
        if (!changed.some(record => record.id === id) || currentName() === last) return
        last = currentName()
        listener(current())
      })
    },
  }
}
