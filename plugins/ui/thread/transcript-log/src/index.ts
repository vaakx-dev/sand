import { nearEnd, owned, place, toEnd } from '@sand/kit/web'
import { div, list, sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { lineView, type LineContext } from './line'
import { emptyLine, failedLine, itemLines, loadingLine, type Line } from './lines'

const revealDistance = 400

export default definePlugin({
  name: 'transcript-log',
  description: 'Dense terminal-style log: one line per message or tool call; tool lines open to show their output',
  inject: ['kit', 'threads', 'transcriptParts', 'markdown'],
  uses: { layout: 'lands loose on the stage', models: 'model switches show the raw model id' },
  apply(ctx) {
    const { dockFade, jumpButton } = ctx.kit
    const parts = ctx.transcriptParts
    const registry = parts.registry(() => render())
    const states = parts.openStates()
    const context: LineContext = {
      parts,
      markdown: ctx.markdown,
      options: key => ({ renderer: registry.toolRenderer, version: registry.version, ...states.get(key) }),
    }
    const lines = sig<Line[]>([])
    const jumpShown = sig(false)
    let shown: string | undefined

    const older = () => {
      const thread = ctx.threads.current()
      if (thread?.loaded && scroller.clientHeight && scroller.scrollTop < revealDistance && ctx.threads.older(thread.id)) void ctx.threads.page(thread.id)
    }

    const scrollToEnd = () => {
      toEnd(scroller)
      jumpShown.set(false)
    }

    const threadLines = (): Line[] => {
      const thread = ctx.threads.current()
      if (!thread) return [emptyLine()]
      const head: Line = { key: 'session', tag: 'thread', tone: 'dim', text: `${thread.info.title ?? 'untitled'} · ${thread.info.cwd}` }
      const items = parts.items(thread, ctx.threads.path(thread.id), type => Boolean(registry.entryRenderer(type)), settings => ctx.models?.summary(settings))
      const failure = thread.failed && !thread.loaded && !thread.entries.size ? [failedLine(ctx.kit, thread.failed, () => void ctx.threads.load(thread.id))] : []
      const loading = !thread.loaded && !thread.failed ? [loadingLine()] : []
      return [head, ...failure, ...loading, ...items.flatMap(item => itemLines(item, registry, thread.id, parts.sections))]
    }

    const render = () => {
      const id = ctx.threads.current()?.id
      const pinned = shown !== id || nearEnd(scroller)
      shown = id
      lines.set(threadLines())
      if (pinned) scrollToEnd()
      else jumpShown.set(!nearEnd(scroller))
      older()
    }

    const onScroll = () => {
      jumpShown.set(!nearEnd(scroller))
      older()
    }

    const scroller = owned(ctx, () =>
      div(
        { class: 'relative z-0 min-h-0 flex-1 overflow-auto px-3 pt-3 font-mono text-xs text-neutral-300 md:px-4', onScroll },
        div(list(lines, line => line.key, line => lineView(line, context), div({ class: 'mx-auto w-full max-w-5xl pb-6' })), dockFade()),
      ),
    )
    const view = owned(ctx, () => div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(jumpShown, scrollToEnd)))

    render()
    place(ctx, 'main', view, 1)
    ctx.on('thread.change', id => {
      if (id === ctx.threads.current()?.id) render()
    })
    ctx.on('thread.select', render)
    ctx.on('models.change', render)
    ctx.provide('transcript', { tool: registry.tool, entry: registry.entry })
  },
})
