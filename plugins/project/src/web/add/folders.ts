import { derive, div, show, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import type { AddForm } from './form'
import { absolute, join, split } from './paths'

interface FolderRow {
  name: string
  fill: string
  up: boolean
  project: boolean
}

const folderRows = (ctx: ProjectsContext, form: AddForm): FolderRow[] => {
  const pc = form.pc.get()
  if (!pc || form.kind.get() !== 'folder') return []
  const place = ctx.projects.place(pc.id)
  const { sep } = place
  const path = form.draftOf(pc.id).path
  const { dir, leaf } = split(path.get(), sep)
  if (dir === undefined) return []
  const listing = form.listing(pc.id, dir)
  if (listing.state !== 'done' || !listing.value.exists) return []
  const known = new Set(form.projects.get().flatMap(project => (project.device === pc.id ? [project.path] : [])))
  const parent = split(dir, sep).dir
  const up = parent === undefined || parent === dir || leaf ? [] : [{ name: '..', fill: join(parent, '', sep), up: true, project: false }]
  const typed = leaf.toLowerCase()
  const folders = listing.value.folders
    .filter(name => name.toLowerCase().startsWith(typed))
    .map(name => {
      const full = join(dir, name, sep)
      return { name, fill: join(full, '', sep), up: false, project: known.has(absolute(full, place)) }
    })
  return [...up, ...folders]
}

const keepFocus = (event: MouseEvent) => event.preventDefault()

export const folderList = (ctx: ProjectsContext, form: AddForm) => {
  const { icon, listRow, rowList } = ctx.kit
  const rows = derive(() => folderRows(ctx, form))
  const fill = (path: string) => {
    const device = form.device.get()
    if (device) form.draftOf(device).path.set(path)
  }
  const row = (item: Sig<FolderRow>) => {
    const { up, name, fill: path } = item.get()
    return listRow({
      surface: 'raised',
      touch: true,
      lead: icon(up ? 'up' : 'folder', 'md'),
      title: name,
      trail: () => (item.get().project ? 'Already a project' : ''),
      onMouseDown: keepFocus,
      onClick: () => fill(path),
    })
  }
  return show(
    () => rows.get().length > 0,
    () => div({ class: 'flex flex-col' }, rowList(rows, item => item.fill, row)),
  )
}
