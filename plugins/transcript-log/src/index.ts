import type { Transcript } from '@sand/protocol'
import { jumpButton, markdownCss, nearEnd, openStates, rendererRegistry, threadItems, toEnd } from '@sand/conversation'
import { div, list, owned, place, sig, style } from '@sand/dom'
import { definePlugin } from 'drydock'
import { lineView, type StepOptions } from './line'
import { failedLine, itemLines, loadingLine, type Line } from './lines'

export default definePlugin({
  name: 'transcript-log',
  description: 'Dense terminal-style log: one line per message or tool call; tool lines open to show their output',
  inject: ['threads'],
  uses: { layout: 'lands loose on the stage' },
  apply(ctx) {
    style(ctx, markdownCss)
    const registry = rendererRegistry(() => render())
    const states = openStates()
    const options: StepOptions = key => ({ renderer: registry.toolRenderer, version: registry.version, ...states.get(key) })
    const lines = sig<Line[]>([])
    const jumpShown = sig(false)
    const scroller = owned(ctx, () =>
      div(
        {
          class: 'min-h-0 flex-1 overflow-auto px-3 pt-3 font-mono text-xs text-neutral-300 md:px-4',
          onScroll: () => jumpShown.set(!nearEnd(scroller)),
        },
        div({ style: { paddingBottom: 'var(--dock-h, 0px)' } }, list(lines, line => line.key, line => lineView(line, options), div({ class: 'mx-auto w-full max-w-5xl pb-6' }))),
      ),
    )
    const scrollToEnd = () => {
      toEnd(scroller)
      jumpShown.set(false)
    }
    const view = owned(ctx, () => div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, jumpButton(jumpShown, scrollToEnd)))
    let shown: string | undefined

    const render = () => {
      const thread = ctx.threads.current()
      const pinned = shown !== thread?.id || nearEnd(scroller)
      shown = thread?.id
      if (!thread) {
        lines.set([{ key: 'empty', tag: '·', tone: 'dim', text: 'new thread · type below to start' }])
      } else {
        const head: Line = { key: 'session', tag: 'thread', tone: 'dim', text: `${thread.info.title ?? 'untitled'} · ${thread.info.cwd}` }
        const items = threadItems(thread, ctx.threads.path(thread.id), type => Boolean(registry.entryRenderer(type)), settings => ctx.models?.summary(settings))
        const failure = thread.failed && !thread.loaded && !thread.entries.size ? [failedLine(thread.failed, () => void ctx.threads.load(thread.id))] : []
        const loadingNow = !thread.loaded && !thread.failed ? [loadingLine()] : []
        lines.set([head, ...failure, ...loadingNow, ...items.flatMap(item => itemLines(item, registry, thread.id))])
      }
      if (pinned) scrollToEnd()
      else jumpShown.set(!nearEnd(scroller))
    }

    const transcript: Transcript = { tool: registry.tool, entry: registry.entry, scrollToEnd }

    render()
    place(ctx, 'main', view, 1)
    ctx.on('thread.change', id => {
      if (id === ctx.threads.current()?.id) render()
    })
    ctx.on('thread.select', render)
    ctx.provide('transcript', transcript)
  },
})
