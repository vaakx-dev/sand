import { errorMessage } from '@sand/dom'
import { joinDisposers } from '@sand/kit'
import type { Context } from 'drydock'
import { interrupt } from './send/submit'

export const bindLocalCommands = (ctx: Context<'threads' | 'turns'>, choose: () => void) =>
  ctx.watch('commands', commands => {
    if (!commands) return
    return joinDisposers(
      commands.add({ name: 'attach', description: 'Attach images, PDFs or text files', source: 'local', run: choose }),
      commands.add({
        name: 'stop',
        description: 'Stop the running turn',
        source: 'local',
        run: () => interrupt(ctx).catch(error => ctx.notify?.push(errorMessage(error), { level: 'error' })),
      }),
    )
  })
