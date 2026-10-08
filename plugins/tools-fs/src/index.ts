import { definePlugin } from 'drydock'
import { edit } from './edit'
import { glob } from './glob'
import { grep } from './grep'
import { readTool } from './read'
import { write } from './write'

export default definePlugin({
  name: 'tools-fs',
  inject: ['tools', 'attachments'],
  apply(ctx) {
    const read = readTool(() => ctx.attachments)
    for (const tool of [read, write, edit, glob, grep]) ctx.effect(() => ctx.tools.register(tool))
  },
})
