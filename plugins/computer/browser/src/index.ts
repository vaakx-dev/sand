import { computers } from '@sand/computers/contract'
import { cli, sandConfig } from '@sand/config/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { z } from 'zod'
import { browserComputer } from './computer'

const id = 'browser'

const schema = z.object({ headless: z.boolean().default(false) })

export default definePlugin({
  name: 'computer-browser',
  description: 'A Chrome or Edge browser computer driven over CDP, with a persistent profile under the sand home',
  inject: { computers, cli, sandConfig },
  apply(ctx) {
    const settings = schema.safeParse(ctx.sandConfig.section('browser') ?? {})
    if (!settings.success) ctx.report(new Error(`${ctx.sandConfig.path} [browser]: ${z.prettifyError(settings.error)}; showing the browser`))
    const computer = browserComputer({
      id,
      label: 'Browser',
      profile: join(ctx.cli.home, 'computers', id, 'profile'),
      headless: settings.data?.headless ?? false,
    })
    ctx.effect(() => ctx.computers.register(computer))
    ctx.effect(() => () => computer.close())
  },
})
