import { isRecord } from '@sand/util'
import { contractFor } from '../find'

const serviceIds = (module: unknown) =>
  Object.values(isRecord(module) ? module : {}).flatMap(value =>
    isRecord(value) && value.kind === 'service' && typeof value.id === 'string' ? [value.id] : [],
  )

const declaredBy = async (dir: string) => {
  const contract = await contractFor(dir)
  if (!contract) return []
  try {
    return serviceIds(await import(contract))
  } catch {
    return []
  }
}

export const serviceOwners = async (plugins: Iterable<readonly [string, string]>) => {
  const listed = [...plugins]
  const declared = await Promise.all(listed.map(([, dir]) => declaredBy(dir)))
  return new Map(listed.flatMap(([plugin], index) => declared[index]!.map(service => [service, plugin] as const)))
}
