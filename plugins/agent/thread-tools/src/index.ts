import type {} from '@sand/followups/contract'
import type {} from '@sand/pc-link/contract'
import type {} from '@sand/server/contract'
import type {} from '@sand/steering/contract'
import type {} from '@sand/tools/contract'
import type {} from '@sand/worktrees/contract'
import { definePlugin } from 'drydock'
import { createLater } from './move/later'
import { moveTool } from './move/tool'
import { pcsTool, threadsTool } from './tools/list'
import { forkTool, organizeTool, renameTool } from './tools/organize'
import { readTool } from './tools/read'
import { sendTool, stopTool } from './tools/send'
import { startTool } from './tools/start'
import { removeWorktreeTool, worktreesTool } from './tools/worktrees'

export default definePlugin({
  name: 'thread-tools',
  description:
    'Tools for the agent to list, search, read, start, message, stop, rename, fork, pin, archive and move threads, and to list and remove their worktrees, on this PC and paired PCs',
  inject: ['tools', 'pcs'],
  apply(ctx) {
    const { pcs } = ctx
    const later = createLater(ctx)
    ctx.effect(() =>
      ctx.tools.group({
        name: 'threads',
        label: 'Threads',
        summary: 'list, search, read, start, message, stop, rename, fork, pin, archive and move threads on this PC and paired PCs',
        load: 'on-demand',
        mainOnly: true,
      }),
    )
    ctx.effect(() =>
      ctx.tools.group({
        name: 'worktrees',
        label: 'Worktrees',
        summary: "list the git worktrees of a project or thread, and remove a thread's worktree, on this PC and paired PCs",
        load: 'on-demand',
        mainOnly: true,
      }),
    )
    const tools = [
      pcsTool(pcs),
      threadsTool(pcs),
      readTool(pcs),
      startTool(pcs),
      sendTool(pcs),
      stopTool(pcs),
      renameTool(pcs),
      forkTool(pcs),
      organizeTool(pcs),
      moveTool(pcs, later),
      worktreesTool(pcs),
      removeWorktreeTool(pcs),
    ]
    for (const tool of tools) ctx.effect(() => ctx.tools.register(tool))
  },
})
