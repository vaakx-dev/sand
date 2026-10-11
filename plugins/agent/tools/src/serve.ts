import type { Server } from '@sand/server/contract'
import type { Context } from 'drydock'
import type { Tools } from './contract'
import { joinDisposers } from '@sand/kit'
import { z } from 'zod'

const load = z.enum(['always', 'on-demand', 'off'])

export const serveTools = (ctx: Context, server: Server, tools: Tools) =>
  joinDisposers(
    server.handle('tools.groups', () => tools.groups()),
    server.handle('tools.choose', async ({ group, load: chosen }) => {
      await tools.choose(group, load.parse(chosen))
      return tools.groups()
    }),
    ctx.on('tools.change', () => server.broadcast('tools.change', [tools.groups()])),
  )
