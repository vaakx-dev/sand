import type { ProjectIcon } from '@sand/host-projects/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { div, duneIcon, dynamicChild, icon, img, keys, plainButton, projectIcon, quietButton, show, span, type Sig } from '@sand/dom'
import { reportError, type ProjectsContext } from '../context'

export type Picking = { project: string; page: number } | undefined

const shapesPerPage = 6

const hues = ['Rose', 'Red', 'Orange', 'Amber', 'Olive', 'Green', 'Teal', 'Cyan', 'Sky', 'Blue', 'Violet', 'Pink'].map((name, step) => ({ name, hue: step * 30 }))

const shapesOn = (page: number) => Array.from({ length: shapesPerPage }, (_, index) => page * shapesPerPage + index)

const iconOf = (shape: number, hue?: number): ProjectIcon | null => {
  if (!shape && hue === undefined) return null
  return { ...(shape ? { shape } : {}), ...(hue === undefined ? {} : { hue }) }
}

const duneChoice = (src: string, size: string, chosen: boolean, label: string, onClick: () => void) =>
  plainButton(
    {
      class: ['flex shrink-0 rounded-full p-px', chosen ? 'ring-2 ring-neutral-100' : 'hover:ring-2 hover:ring-neutral-600'],
      title: label,
      'aria-label': label,
      'aria-pressed': String(chosen),
      onClick,
    },
    img({ src, alt: '', draggable: false, class: size }),
  )

const iconPicker = (ctx: ProjectsContext, group: ProjectGroup, picking: Sig<Picking>) => {
  const shape = group.icon?.shape ?? 0
  const hue = group.icon?.hue
  const save = (next: ProjectIcon | null) => ctx.projects.setIcon(group, next).catch(error => reportError(ctx, error))
  const moreIdeas = () => picking.set({ project: group.id, page: (picking.get()?.page ?? 0) + 1 })
  const shapeChoices = (page: number) =>
    div(
      { class: 'flex flex-wrap gap-2' },
      ...shapesOn(page).map(option =>
        duneChoice(duneIcon(group.name, { shape: option, hue }), 'h-8 w-8', option === shape, option ? `Dunes ${option}` : 'Default dunes', () => save(iconOf(option, hue))),
      ),
    )
  return div(
    {
      role: 'group',
      'aria-label': `Icon for ${group.name}`,
      class: 'mt-2 flex max-w-80 flex-col gap-3 rounded-xl bg-neutral-800 p-3',
      onKeyDown: keys({ Escape: () => picking.set(undefined) }),
    },
    div(
      { class: 'flex items-center justify-between gap-2' },
      span({ class: 'text-xs text-neutral-500' }, 'Shape'),
      quietButton({ size: 'sm', onClick: moreIdeas }, icon('reload', 12), 'New ideas'),
    ),
    dynamicChild(
      picking.map(value => value?.page ?? 0),
      shapeChoices,
    ),
    span({ class: 'text-xs text-neutral-500' }, 'Colour'),
    div(
      { class: 'flex flex-wrap gap-1' },
      ...hues.map(option => duneChoice(duneIcon(group.name, { shape, hue: option.hue }), 'h-4 w-4', option.hue === hue, option.name, () => save(iconOf(shape, option.hue)))),
    ),
    quietButton({ size: 'sm', class: 'self-start', disabled: !group.icon, onClick: () => save(null) }, icon('retry', 12), 'Reset to default'),
  )
}

export const iconChoice = (ctx: ProjectsContext, group: ProjectGroup, picking: Sig<Picking>) => {
  const file = ctx.projects.iconFile(group)
  if (file) return { toggle: projectIcon(group.name, file), picker: null }
  const opened = picking.map(value => value?.project === group.id)
  const toggle = plainButton(
    {
      class: 'flex shrink-0 rounded-full hover:ring-2 hover:ring-accent-500',
      title: 'Change icon',
      'aria-label': 'Change icon',
      'aria-expanded': () => String(opened.get()),
      onClick: () => picking.set(opened.get() ? undefined : { project: group.id, page: Math.floor((group.icon?.shape ?? 0) / shapesPerPage) }),
    },
    projectIcon(group.name, ctx.projects.groupIcon(group)),
  )
  return { toggle, picker: show(opened, () => iconPicker(ctx, group, picking)) }
}
