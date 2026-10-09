import type { HtmlPages, HtmlRenderEntry } from './contract'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { hostRoute } from './page/host'
import { columnWidth, maxHeight } from './page/limits'
import { load } from './page/load'
import { hostPath } from './page/protocol'
import { tokenTable } from './page/tokens'
import { renderStore } from './store'
import { entryType, renderTool } from './tool'

const skillDir = join(import.meta.dir, '..', 'skills', 'html-render')

export default definePlugin({
  name: 'html-render',
  description: 'html_render tool: the agent shows self-contained HTML pages (charts, tables, mockups) inline in the thread, in the app theme',
  inject: ['tools', 'cli'],
  uses: {
    server: 'pages are saved but no client can fetch them',
    skills: 'the agent gets no theme or layout guide',
    sessions: 'saved pages stay on disk after their threads are deleted',
  },
  apply(ctx) {
    const store = renderStore(join(ctx.cli.home, 'renders'))
    const pages: HtmlPages = { columnWidth, maxHeight, load }
    ctx.provide('htmlPages', pages)
    ctx.effect(() => ctx.tools.register(renderTool(store, pages, (session, artifact) => ctx.emit('artifact.saved', session, artifact))))
    ctx.watch('server', server => {
      if (!server) return
      const disposers = [server.handle('html.page', ({ render }) => store.read(render)), server.route(hostPath, hostRoute, { public: true })]
      return () => disposers.forEach(dispose => void dispose())
    })
    ctx.watch('skills', skills => skills?.register(skillDir, { tokens: tokenTable(), column: String(columnWidth), max_height: String(maxHeight) }))
    ctx.on('session.remove', () => {
      const entries = ctx.sessions?.entriesOfType?.(entryType)
      if (entries) store.keep(new Set(entries.map(entry => (entry.data as HtmlRenderEntry).id))).catch(error => ctx.report(error))
    })
  },
})
