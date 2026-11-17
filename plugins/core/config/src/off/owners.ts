import { z } from 'zod'
import { contractFor } from '../find'

const service = z.object({ kind: z.literal('service'), id: z.string() })

const serviceIds = (module: object) => Object.values(module).flatMap(value => service.safeParse(value).data?.id ?? [])

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
