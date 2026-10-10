import type { Server } from '@sand/server/contract'
import type { Context } from 'drydock'
import type {} from '../contract'
import { sessionSource } from './sessions'
import { collectTree } from './tree'

export const serveChangedFiles = (ctx: Context, server: Server) =>
  server.handle('changes.files', request => {
    const session = ctx.sessions?.open(request.session)
    return session ? collectTree(sessionSource(ctx.sessions, session)).files.map(file => file.key) : []
  })
