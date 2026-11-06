import { cli } from '@sand/config/contract'
import { media } from '@sand/media/contract'
import { promptSections } from '@sand/prompt/contract'
import { server as serverService } from '@sand/server/contract'
import { skills as skillsService } from '@sand/skills/contract'
import { tools } from '@sand/tools/contract'
import { joinDisposers } from '@sand/util'
import { artifactSaved, htmlPage, htmlPages, type HtmlPages } from './contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { hostRoute } from './page/host'
import { columnWidth, maxHeight } from './page/limits'
import { load, prepare } from './page/load'
import { hostPath } from './page/protocol'
import { tokenTable } from './page/tokens'
import { capture } from './preview/capture'
import { visualReplies } from './prompt'
import { renderStore } from './store'
import { previewTool } from './tool/preview'
import { recentPages } from './tool/recent'
import { renderTool } from './tool/render'

const skillDir = join(import.meta.dir, '..', 'skills', 'html-render')

export default definePlugin({
  name: 'html',
  description: 'html_render and html_preview: the agent checks HTML pages in a headless browser and shows them inline in the chat, in the app theme',
  inject: { tools, cli, media },
  apply(ctx) {
    const store = renderStore(join(ctx.cli.home, 'renders'))
    const recent = recentPages()
    const pages: HtmlPages = { columnWidth, maxHeight, prepare, load, preview: capture }
    ctx.provide(htmlPages, pages)
    ctx.effect(() => ctx.tools.group({ name: 'html', label: 'HTML pages', summary: 'check HTML pages (charts, tables, mockups) and show them in the chat', load: 'on-demand' }))
    ctx.effect(() => ctx.tools.register(renderTool(store, pages, recent, (conversation, artifact) => ctx.emit(artifactSaved, conversation, artifact))))
    ctx.effect(() => ctx.tools.register(previewTool(pages, ctx.media, recent)))
    ctx.on(promptSections, sections => [...sections, visualReplies])
    ctx.watch(serverService, server =>
      server ? joinDisposers(server.handle(htmlPage, ({ render }) => store.read(render)), server.route(hostPath, hostRoute, { public: true })) : undefined,
    )
    ctx.watch(skillsService, skills => skills?.register(skillDir, { tokens: tokenTable(), column: String(columnWidth) }))
  },
})
