import { orrin, orrinChange } from '@sand/orrin/contract'
import { serial } from '@sand/util'
import { samePath } from '@sand/util/fs'
import type { Context } from 'drydock'
import { existingFolder } from '../registry/paths'
import type { Registry } from '../registry/registry'

export const throughOrrin = (ctx: Context, registry: Registry, device: string): Registry => {
  const queue = serial()
  const known = (path: string) =>
    registry.all().some(project => {
      const copy = project.copies[device]
      return copy !== undefined && samePath(copy.path, path)
    })

  const mirror = () =>
    queue(async () => {
      const service = ctx.get(orrin)
      if (!service?.available()) return
      for (const { view } of service.places()) if (!known(view.path)) await registry.add(view.path)
    })

  const add = (path: string, id?: string) =>
    queue(async () => {
      const full = await existingFolder(path)
      const service = ctx.get(orrin)
      if (service?.available() && !service.placeAt(full)) await service.call('projects.import', { path: full })
      return registry.add(full, id)
    })

  ctx.on(orrinChange, () => void mirror().catch(error => ctx.report(error)))
  mirror().catch(error => ctx.report(error))
  return { ...registry, add }
}
