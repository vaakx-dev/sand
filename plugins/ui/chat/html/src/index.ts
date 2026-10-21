import { cli } from '@sand/config/contract'
import { server as serverService } from '@sand/server/contract'
import { skills as skillsService } from '@sand/skills/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { artifactSaved, htmlPage, htmlPages, type HtmlPages } from './contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { hostRoute } from './page/host'
import { columnWidth, maxHeight } from './page/limits'
import { load } from './page/load'
import { hostPath } from './page/protocol'
import { tokenTable } from './page/tokens'
import { renderStore } from './store'
import { renderTool } from './tool'

const skillDir = join(import.meta.dir, '..', 'skills', 'html-render')

export default definePlugin({
  name: 'html',
  description: 'html_render tool: the agent shows self-contained HTML pages (charts, tables, mockups) inline in the chat, in the app theme',
  inject: { tools, cli },
  apply(ctx) {
    const store = renderStore(join(ctx.cli.home, 'renders'))
    const pages: HtmlPages = { columnWidth, maxHeight, load }
    ctx.provide(htmlPages, pages)
    ctx.effect(() => ctx.tools.group({ name: 'html', label: 'HTML pages', summary: 'show HTML pages (charts, tables, mockups) in the chat', load: 'on-demand' }))
    ctx.effect(() => ctx.tools.register(renderTool(store, pages, (session, artifact) => ctx.emit(artifactSaved, session, artifact))))
    ctx.watch(serverService, server =>
      server ? joinDisposers(server.handle(htmlPage, ({ render }) => store.read(render)), server.route(hostPath, hostRoute, { public: true })) : undefined,
    )
    ctx.watch(skillsService, skills => skills?.register(skillDir, { tokens: tokenTable(), column: String(columnWidth), max_height: String(maxHeight) }))
  },
})
