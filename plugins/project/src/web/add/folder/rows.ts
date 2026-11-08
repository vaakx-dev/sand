import type { Pulse } from '@sand/reactive'
import { div, show, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../../context'
import { absolute, join, split } from '../paths'
import type { FolderForm } from './form'

interface FolderRow {
  name: string
  fill: string
  project: boolean
}

const folderRows = (ctx: ProjectsContext, form: FolderForm): FolderRow[] => {
  const { pc, place } = form
  const { sep } = place
  const { dir, leaf } = split(form.path.get(), sep)
  if (dir === undefined) return []
  const listing = form.listing(dir)
  if (listing.state !== 'done' || !listing.value.exists) return []
  const known = new Set(ctx.projects.list().flatMap(project => (project.device === pc.id ? [project.path] : [])))
  const parent = split(dir, sep).dir
  const up = parent === undefined || parent === dir || leaf ? [] : [{ name: '..', fill: join(parent, '', sep), project: false }]
  const typed = leaf.toLowerCase()
  const folders = listing.value.folders
    .filter(name => name.toLowerCase().startsWith(typed))
    .map(name => {
      const full = join(dir, name, sep)
      return { name, fill: join(full, '', sep), project: known.has(absolute(full, place)) }
    })
  return [...up, ...folders]
}

const keepFocus = (event: MouseEvent) => event.preventDefault()

export const folderList = (ctx: ProjectsContext, changes: Pulse, form: FolderForm, titled: () => boolean) => {
  const { listRow, rowList, sectionHeading } = ctx.kit
  const rows = changes.read(() => folderRows(ctx, form))
  const row = (item: Sig<FolderRow>) =>
    listRow({
      surface: 'raised',
      touch: true,
      title: () => item.get().name,
      trail: () => (item.get().project ? 'Added' : ''),
      onMouseDown: keepFocus,
      onClick: () => form.path.set(item.get().fill),
    })
  return show(
    () => rows.get().length > 0,
    () => div({ class: 'flex flex-col gap-1' }, show(titled, () => sectionHeading('Folders')), div({ class: 'flex flex-col' }, rowList(rows, item => item.fill, row))),
  )
}
