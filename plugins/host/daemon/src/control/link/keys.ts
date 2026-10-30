import { loadPcIdentity, type PcKeys } from '@sand/devices-identity/pc'

const loaded = new Map<string, Promise<PcKeys>>()

export const pcKeys = (home: string) => {
  const known = loaded.get(home)
  if (known) return known
  const loading = loadPcIdentity(home)
  loaded.set(home, loading)
  loading.catch(() => loaded.delete(home))
  return loading
}
