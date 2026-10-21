import { expandHome } from '@sand/util/fs'
import type { Context } from 'drydock'
import { z } from 'zod'
import { orrin, orrinChange, orrinEvent } from './contract'
import { createLink } from './link'

export const orrinConfig = z.object({
  home: z.string().default('~/.orrin'),
  port: z.number().int().min(1).max(65535).optional(),
  releases: z.string().default('https://api.github.com/repos/vaakx-dev/orrin/releases'),
})

export type OrrinConfig = z.output<typeof orrinConfig>

export const orrinHome = (config: OrrinConfig) => expandHome(config.home)

export const provideLink = async (ctx: Context, home: string) => {
  const link = createLink(home, {
    changed: () => ctx.emit(orrinChange),
    event: event => ctx.emit(orrinEvent, event),
    failed: error => ctx.report(error),
  })
  ctx.effect(() => link.close)
  await link.connect().catch(error => ctx.report(error))
  ctx.provide(orrin, link.service)
  return link
}
