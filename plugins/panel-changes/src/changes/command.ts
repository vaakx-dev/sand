import type { Command } from '@sand/protocol'
import type { Context } from 'drydock'
import { sessionSource } from './sessions'
import { collectTree } from './tree'
import { matchFile } from './lines'
import { changesReport, fileReport } from './report'

export const changesCommand = (ctx: Context<'ui'>): Command => ({
  name: 'changes',
  title: 'Edits',
  description: 'Show the files the agent edited in this thread',
  args: '[path]',
  run(args) {
    const session = ctx.ui.session()
    if (!session) return ctx.ui.notify('No thread selected')
    const changes = collectTree(sessionSource(ctx.sessions, session))
    if (!changes.files.length) return ctx.ui.notify('No edits yet')
    const path = args.trim()
    if (!path) return ctx.ui.report('Edits', changesReport(changes))
    const file = matchFile(changes.files, path)
    if (!file) return ctx.ui.notify(`No edits to ${path}`, 'error')
    ctx.ui.report(`Edits to ${file.path}`, fileReport(file))
  },
})
