import type { Shell } from '@sand/ui-shell/contract'
import { bytes, errorMessage, tildeHome } from '@sand/util'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import type { FoundFile, OpenFile } from '../contract'
import type { Formats } from './formats'
import { type Ctx, unshown } from './offer'
import type { OpenFiles, Shown } from './state'

interface ViewParts {
  ctx: Ctx
  shell: Shell
  formats: Formats
  files: OpenFiles
  opened(thread: string, file: FoundFile): OpenFile
}

interface Where {
  thread(): string
  cwd(): string | undefined
}

type Rendered = { kind: 'loading' } | { kind: 'ready'; node: HTMLElement } | { kind: 'failed'; error: string }

const folderOf = (path: string) => path.replace(/[\\/][^\\/]*$/, '')

const comparable = (path: string) => path.replaceAll('\\', '/').toLowerCase()

const placeOf = (path: string, cwd: string | undefined) => {
  const folder = folderOf(path)
  if (!cwd || !`${comparable(folder)}/`.startsWith(`${comparable(cwd)}/`)) return tildeHome(folder)
  return folder.slice(cwd.length + 1) || (cwd.split(/[\\/]/).pop() ?? cwd)
}

const rendered = (parts: Pick<ViewParts, 'ctx' | 'formats'>, file: OpenFile) => {
  const format = parts.formats.formatOf(file)
  if (!format) return unshown(parts.ctx, file)
  const state = sig<Rendered>({ kind: 'loading' })
  format.render(file).then(
    node => state.set({ kind: 'ready', node }),
    (error: unknown) => state.set({ kind: 'failed', error: `Couldn't read ${file.name}: ${errorMessage(error)}` }),
  )
  return dynamicChild(state, value => {
    if (value.kind === 'ready') return value.node
    if (value.kind === 'failed') return parts.ctx.kit.errorState({ text: value.error, flush: false })
    return parts.ctx.kit.loadingState({})
  })
}

const body = (parts: ViewParts, where: Where, file: () => FoundFile) =>
  div(
    { class: 'min-h-0 min-w-0 flex-1' },
    dynamicChild(
      derive(() => [file().path, file().modified, parts.formats.formatOf(file())?.id ?? ''].join('|')),
      () => rendered(parts, parts.opened(where.thread(), file())),
    ),
  )

const fullScreen = (parts: ViewParts, where: Where, file: () => FoundFile) =>
  parts.shell.sheet({
    label: `Full screen ${file().name}`,
    title: () => file().name,
    look: 'viewer',
    body: () => div({ class: 'flex min-h-0 flex-1 flex-col overflow-auto' }, body(parts, where, file)),
  })

const head = (parts: ViewParts, where: Where, file: () => FoundFile) => {
  const { kit } = parts.ctx
  return div(
    { class: 'sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-neutral-800 bg-neutral-950 pr-2 pl-4' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col', title: () => tildeHome(file().path) },
      span({ class: 'truncate text-sm text-neutral-100' }, () => file().name),
      span({ class: 'truncate text-xs text-neutral-500' }, () => `${placeOf(file().path, where.cwd())} · ${bytes(file().size)}`),
    ),
    kit.iconButton({ title: 'Full screen', 'aria-label': 'Full screen', onClick: () => void fullScreen(parts, where, file) }, kit.icon('expand')),
  )
}

const note = (parts: ViewParts, text: string) => div({ class: 'p-4' }, parts.ctx.kit.emptyState({ text }))

const shownView = (parts: ViewParts, where: Where, first: Shown) => {
  if (first.kind === 'finding') return parts.ctx.kit.loadingState({ text: `Finding ${first.mention}…` })
  if (first.kind === 'missing') return note(parts, `Couldn't find ${first.mention} in this thread's folders.`)
  if (first.kind === 'failed') return parts.ctx.kit.errorState({ text: first.error })
  const file = () => {
    const now = parts.files.of(where.thread())
    return now?.kind === 'found' ? now.file : first.file
  }
  return div({ class: 'flex min-h-full flex-col' }, head(parts, where, file), body(parts, where, file))
}

const fileView = (parts: ViewParts, where: Where) =>
  dynamicChild(
    derive(() => {
      const shown = parts.files.of(where.thread())
      return shown?.kind === 'found' ? `found|${shown.file.path}` : JSON.stringify(shown ?? null)
    }),
    () => {
      const shown = parts.files.of(where.thread())
      return shown ? shownView(parts, where, shown) : null
    },
  )

export { fileView, rendered, type ViewParts }
