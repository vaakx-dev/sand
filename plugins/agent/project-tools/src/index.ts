import type {} from '@sand/folders/contract'
import type {} from '@sand/host-projects/contract'
import type {} from '@sand/pc-link/contract'
import type {} from '@sand/sync/contract'
import type {} from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { copyTool, moveTool } from './tools/copy'
import { removeTool, updateTool } from './tools/edit'
import { projectsTool } from './tools/list'
import { addTool, cloneTool, createTool } from './tools/make'

export default definePlugin({
  name: 'project-tools',
  description: 'Tools for the agent to list, create, clone, add, rename, hide, remove, copy and move projects on this PC and paired PCs',
  inject: ['tools', 'pcs'],
  apply(ctx) {
    const { pcs } = ctx
    ctx.effect(() =>
      ctx.tools.group({
        name: 'projects',
        label: 'Projects',
        summary: 'list, create, clone, add existing folders, rename, hide, remove, copy and move projects and their copies on this PC and paired PCs',
        load: 'on-demand',
        mainOnly: true,
      }),
    )
    const tools = [projectsTool(pcs), createTool(pcs), cloneTool(pcs), addTool(pcs), updateTool(pcs), removeTool(pcs), copyTool(pcs), moveTool(pcs)]
    for (const tool of tools) ctx.effect(() => ctx.tools.register(tool))
  },
})
