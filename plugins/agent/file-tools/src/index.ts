import { attachments } from '@sand/attachments/contract'
import { cli } from '@sand/config/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { edit } from './edit'
import { dirname } from 'node:path'
import { globTool } from './glob'
import { grepTool } from './grep'
import { readTool } from './read'
import { ownRipgrep } from './search/ripgrep'
import { write } from './write'

export default definePlugin({
  name: 'file-tools',
  inject: { tools, attachments, cli },
  apply(ctx) {
    const read = readTool(() => ctx.attachments)
    const ripgrep = ownRipgrep(dirname(ctx.cli.builtins))
    for (const tool of [read, write, edit, globTool(ripgrep), grepTool(ripgrep)]) ctx.effect(() => ctx.tools.register(tool))
  },
})
