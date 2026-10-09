import type { Command } from '@sand/protocol'
import { expandHome, scratchRoot } from '@sand/host'
import { isInside } from '@sand/kit'
import { homedir } from 'node:os'
import type { SessionsContext } from './types'

const isFolder = (path: string) =>
  Bun.file(path)
    .stat()
    .then(
      stats => stats.isDirectory(),
      () => false,
    )

export const newCommand = (ctx: SessionsContext): Command => ({
  name: 'new',
  title: 'New thread',
  description: 'Start a new thread, in another folder when one is given',
  args: '[folder]',
  async run(args) {
    const typed = args.trim()
    if (!typed) {
      const here = ctx.ui.cwd()
      return ctx.ui.open(undefined, undefined, here && !isInside(here, scratchRoot(ctx)) ? here : undefined)
    }
    const folder = expandHome(typed, ctx.ui.cwd() || homedir())
    if (!(await isFolder(folder))) return ctx.ui.notify(`${folder} is not a folder`, 'error')
    ctx.ui.open(undefined, undefined, folder)
  },
})
