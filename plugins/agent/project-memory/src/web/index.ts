import { wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { markdown } from '@sand/markdown/contract'
import { memoryChangeWire, memoryLimit, memoryRead, memoryWrite, type MemoryRef } from '@sand/memory/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell } from '@sand/ui-shell/contract'
import { threads } from '@sand/web-client/contract'
import { derive, div, dynamicChild, sig } from '@vaakx-dev/vrui'
import { definePlugin, type Context } from 'drydock'
import { projectMemorySpace } from '../contract'

const inject = { inspector, kit, shell, markdown, threads, wire }

type ProjectMemoryContext = Context<typeof inject>

const TITLE = 'Project memory'

const firstLine = (text: string) => text.trim().split('\n', 1)[0]?.replace(/^#+\s*/, '') ?? ''

const memoryText = (ctx: ProjectMemoryContext, ref: MemoryRef) => {
  const text = sig('')
  void ctx.wire.call(memoryRead, ref).then(
    found => text.set(found),
    error => ctx.report(error),
  )
  const stop = ctx.wire.on(memoryChangeWire, ([changed, found]) => {
    if (changed.space === ref.space && changed.id === ref.id) text.set(found)
  })
  return { text, stop }
}

const openSheet = (ctx: ProjectMemoryContext, ref: MemoryRef) => {
  const { text, stop } = memoryText(ctx, ref)
  ctx.shell.sheet({
    label: TITLE,
    head: () => ctx.kit.sheetTitle(TITLE),
    body: () =>
      div(
        { class: 'flex flex-col gap-6 pt-2', onMount: () => stop },
        ctx.kit.editable({
          title: 'Memory',
          text: () => text.get(),
          view: written => div({ class: 'flex flex-col gap-2' }, ...ctx.markdown.nodes(written)),
          empty: 'Nothing remembered yet.',
          save: written => ctx.wire.call(memoryWrite, { ...ref, text: written }).then(() => text.set(written)),
          rows: 14,
          maxLength: memoryLimit,
          placeholder: 'What threads in this project should remember',
        }),
      ),
  })
}

const row = (ctx: ProjectMemoryContext, ref: MemoryRef) => {
  const { text, stop } = memoryText(ctx, ref)
  return div(
    { class: 'flex min-w-0 flex-col', onMount: () => stop },
    ctx.kit.cardCaption(TITLE),
    ctx.kit.cardItem({ lead: ctx.kit.icon('file', 'sm'), onClick: () => openSheet(ctx, ref) }, () => firstLine(text.get()) || 'Empty'),
  )
}

export default definePlugin({
  name: 'project-memory-view',
  description: "The inspector's project memory row: shows the memory the threads in a project share, and opens it to read and edit",
  inject,
  apply(ctx) {
    const projectOf = (session: string) => ctx.threads.get(session)?.info.project ?? undefined
    ctx.effect(() =>
      ctx.inspector.row({
        id: 'project-memory',
        group: 'project-memory',
        order: 70,
        shows: subject => subject.owner === 'thread' && projectOf(subject.session) !== undefined,
        render: subject =>
          dynamicChild(
            derive(() => projectOf(subject().session)),
            project => (project ? row(ctx, { space: projectMemorySpace, id: project }) : null),
          ),
      }),
    )
  },
})
