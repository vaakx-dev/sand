import type { ProjectLook } from '@sand/project/contract'
import type { Kit, Tint } from '@sand/ui-kit/contract'
import type { Monogram } from '@sand/ui-shell/contract'
import { tildeHome } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import { derive, dynamicChild, untrack, type Sig } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'
import { threadOwners } from '../contract'
import { placeOf, projectLook, projectName } from './place'

type Mark = { monogram: Monogram } | { project: string; look: ProjectLook | undefined }

export interface Lead {
  label: string
  path: string
  mark: Mark
}

const sand: Lead = { label: 'Sand', path: '', mark: { monogram: { initial: 'S', color: 'grey' } } }

const tints: Record<Tint, true> = { gold: true, sky: true, orange: true, green: true, red: true, grey: true }

const isTint = (color: string): color is Tint => Object.hasOwn(tints, color)

export const leadOf = (ctx: ChatContext, thread: Thread | undefined): Lead | undefined => {
  const owner = thread && ctx.get(threadOwners)?.owner(thread.id)
  if (owner) return { label: owner.label, path: '', mark: { monogram: { initial: owner.initial, color: owner.color } } }
  const place = placeOf(ctx, thread)
  if (!place) return undefined
  if (place.quick) return sand
  const label = projectName(ctx, place)
  return label ? { label, path: tildeHome(place.cwd), mark: { project: label, look: projectLook(ctx, place) } } : undefined
}

const markView = (kit: Kit, mark: Mark, size: 16 | 20) => {
  if (!('monogram' in mark)) return kit.projectIcon(mark.project, mark.look, size)
  const { initial, color } = mark.monogram
  return kit.monogram(initial, isTint(color) ? color : 'grey', size)
}

export const leadMark = (kit: Kit, lead: Sig<Lead | undefined>, size: 16 | 20) =>
  dynamicChild(
    derive(() => JSON.stringify(lead.get()?.mark ?? null)),
    () => {
      const mark = untrack(() => lead.get())?.mark
      return mark ? markView(kit, mark, size) : null
    },
  )
