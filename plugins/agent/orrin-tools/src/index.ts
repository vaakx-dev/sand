import { join } from 'node:path'
import { attachments, type Attachments } from '@sand/attachments/contract'
import { orrin, type JobKind, type Orrin } from '@sand/orrin/contract'
import { skills } from '@sand/skills/contract'
import { toolFolder, tools, type Tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { deleteTool } from './change/delete'
import { moveTool } from './change/move'
import { patchTool } from './change/patch'
import { writeTool } from './change/write'
import { jobTool } from './jobs/tool'
import { findTool } from './look/find'
import { outlineTool } from './look/outline'
import { readTool } from './look/read'
import { searchTool } from './look/search'
import { whereTool } from './look/where'
import { orrinTool } from './scope'
import { createChatViews, type ChatViews } from './views'

const jobKinds: JobKind[] = ['build', 'run', 'test', 'screenshot', 'export']
const skillDir = join(import.meta.dir, '..', 'skills', 'orrin')

const registerAll = (registry: Tools, service: Orrin, media: Attachments, views: ChatViews) => {
  const tool = orrinTool(service, media, views)
  const all = [
    findTool(tool),
    searchTool(tool),
    readTool(tool),
    outlineTool(tool),
    whereTool(tool),
    patchTool(tool),
    writeTool(tool),
    moveTool(tool),
    deleteTool(tool),
    ...jobKinds.map(kind => jobTool(tool, kind)),
  ]
  return joinDisposers(...all.map(found => registry.register(found)))
}

export default definePlugin({
  name: 'orrin-tools',
  description: 'Project tools that go through Orrin when the chat is in an Orrin project, in place of the disk file tools',
  inject: { tools, attachments },
  apply(ctx) {
    let views: ChatViews | undefined
    ctx.on(toolFolder, (_cwd, session) => views?.folder(session))
    ctx.watch(orrin, found => {
      views = found && createChatViews(found)
      if (found && views) return registerAll(ctx.tools, found, ctx.attachments, views)
    })
    ctx.watch(skills, found => found?.register(skillDir))
  },
})
