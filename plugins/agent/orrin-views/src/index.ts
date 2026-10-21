import { sessionClosing, sessions } from '@sand/chats/contract'
import { orrin, orrinEvent } from '@sand/orrin/contract'
import { promptSections } from '@sand/prompt/contract'
import { steering } from '@sand/steering/contract'
import { toolFolder, tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { closeView } from './close'
import { placed, type Deps } from './deps'
import { landTool } from './land'
import { lazyViews } from './lazy'
import { pullTool } from './pull'
import { tellSkipped } from './skipped'

const section = Bun.file(join(import.meta.dir, 'prompt.md')).text()

export default definePlugin({
  name: 'orrin-views',
  description: 'Gives every project thread its own Orrin view, which its sub-agents share; land and pull tools; settling closes the view',
  inject: { sessions, tools },
  apply(ctx) {
    const deps: Deps = { sessions: ctx.sessions, orrin: () => ctx.get(orrin) }
    const ensureView = lazyViews(deps)
    for (const tool of [landTool(deps), pullTool(deps)]) ctx.effect(() => ctx.tools.register(tool))
    ctx.on(toolFolder, (_cwd, session) => ensureView(session), { priority: 1 })
    ctx.on(sessionClosing, session => closeView(deps, session))
    ctx.on(orrinEvent, event => tellSkipped(deps, ctx.get(steering), event))
    ctx.on(promptSections, async (sections, session) =>
      session.kind === 'thread' && placed(deps, session) ? [...sections, (await section).trimEnd()] : sections,
    )
  },
})
