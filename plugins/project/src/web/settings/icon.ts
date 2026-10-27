import type { ProjectIcon } from '../../contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { ProjectGroup } from '@sand/web-client/contract'
import { div, dynamicChild, portal, show, span, type Child, type Sig } from '@vaakx-dev/vrui'
import type { ProjectsContext } from '../context'
import type { Entry } from './actions'

export type Picking = { project: string; page: number } | undefined

interface Tile {
  look: ProjectIcon
  chosen: boolean
  label: string
  pick(): void
}

const shapesPerPage = 6

const hues = ['Rose', 'Red', 'Orange', 'Amber', 'Olive', 'Green', 'Teal', 'Cyan', 'Sky', 'Blue', 'Violet', 'Pink'].map((name, step) => ({ name, hue: step * 30 }))

const shapesOn = (page: number) => Array.from({ length: shapesPerPage }, (_, index) => page * shapesPerPage + index)

const iconOf = (shape: number, hue?: number): ProjectIcon | null => {
  if (!shape && hue === undefined) return null
  return { ...(shape ? { shape } : {}), ...(hue === undefined ? {} : { hue }) }
}

const pickedMark = ({ icon }: Kit) => span({ class: 'absolute -top-1 -right-1 inline-flex rounded-full bg-neutral-900 p-px text-neutral-100' }, icon('check', 'xs'))

const tileProps = ({ chosen, label, pick }: Tile) => ({
  surface: 'raised' as const,
  active: chosen,
  title: label,
  'aria-label': label,
  'aria-pressed': String(chosen),
  onClick: pick,
})

const shapeTile = (kit: Kit, group: ProjectGroup, tile: Tile) =>
  kit.quietButton({ size: 'lg', ...tileProps(tile), class: 'relative px-1' }, kit.projectIcon(group.name, tile.look, 32), tile.chosen ? pickedMark(kit) : null)

const hueTile = (kit: Kit, group: ProjectGroup, tile: Tile) =>
  kit.iconButton({ ...tileProps(tile), class: 'relative w-full' }, kit.projectIcon(group.name, tile.look, 20), tile.chosen ? pickedMark(kit) : null)

const label = (text: string) => span({ class: 'text-xs text-neutral-500' }, text)

const tiles = (...children: Child[]) => div({ class: 'grid grid-cols-6 gap-2' }, ...children)

const iconPicker = (ctx: ProjectsContext, group: ProjectGroup, picking: Sig<Picking>) => {
  const { kit } = ctx
  const shape = group.icon?.shape ?? 0
  const hue = group.icon?.hue
  const save = (next: ProjectIcon | null) => ctx.projects.setIcon(group, next).catch(() => {})
  const moreIdeas = () => picking.set({ project: group.id, page: (picking.get()?.page ?? 0) + 1 })
  const shapeTiles = (page: number) =>
    tiles(
      ...shapesOn(page).map(option =>
        shapeTile(kit, group, { look: { shape: option, hue }, chosen: option === shape, label: option ? `Dunes ${option}` : 'Default dunes', pick: () => save(iconOf(option, hue)) }),
      ),
    )
  const close = () => picking.set(undefined)
  return kit.overlay(
    close,
    kit.sheet(
      { 'aria-label': `Icon for ${group.name}`, size: 'sm' },
      kit.sheetHead({ title: `Icon for ${group.name}`, close }),
      kit.sheetBody(
        {},
        div({ class: 'flex items-center justify-between gap-2' }, label('Shape'), kit.quietButton({ size: 'sm', surface: 'raised', onClick: moreIdeas }, 'More shapes')),
        dynamicChild(
          picking.map(value => value?.page ?? 0),
          shapeTiles,
        ),
        label('Colour'),
        tiles(
          ...hues.map(option =>
            hueTile(kit, group, { look: { shape, hue: option.hue }, chosen: option.hue === hue, label: option.name, pick: () => save(iconOf(shape, option.hue)) }),
          ),
        ),
        kit.quietButton({ size: 'sm', surface: 'raised', class: 'self-start', disabled: !group.icon, onClick: () => save(null) }, 'Reset to default'),
      ),
    ),
  )
}

export const iconEntries = (ctx: ProjectsContext, group: ProjectGroup, picking: Sig<Picking>): Entry[] => {
  const look = ctx.projects.groupIcon(group)
  if (look?.file || look?.app) return []
  const run = () => picking.set({ project: group.id, page: Math.floor((group.icon?.shape ?? 0) / shapesPerPage) })
  return [{ label: 'Change icon…', icon: 'sparkles', run }]
}

export const iconSheet = (ctx: ProjectsContext, group: ProjectGroup, picking: Sig<Picking>) =>
  show(
    picking.map(value => value?.project === group.id),
    () => portal(document.body, iconPicker(ctx, group, picking)),
  )
