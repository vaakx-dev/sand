import type { ProjectRef } from '@sand/host-projects/contract'
import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { SyncPick } from '@sand/sync/contract'
import type { Sync } from '../../contract'
import type { FlowContext } from '../types'
import { mergePage } from './merge'
import { otherPcName, pcName, projectName } from './names'

const conflictItem = (file: string, here: string, other: string, pick: (file: string, side: SyncPick) => Promise<void>): PaletteItem => ({
  id: `file:${file}`,
  icon: 'file',
  label: file,
  detail: 'Changed on both PCs',
  fill: '',
  actions: [
    { label: 'Use this PC', run: () => pick(file, 'ours') },
    { label: `Use ${other}`, run: () => pick(file, 'theirs') },
  ],
})

export const resolvePage = (ctx: FlowContext, sync: Sync, ref: ProjectRef): PalettePage => {
  const name = projectName(ctx, ref)
  const here = pcName(ctx, ref.device)
  const other = otherPcName(ctx, ref)

  const pick = async (file: string, side: SyncPick) => {
    const resolved = await sync.resolve(ref, { [file]: side })
    if (resolved.remaining.length) return
    ctx.notify?.push(`${name} is merged on ${here}`)
    ctx.palette?.close()
  }

  return {
    id: 'resolve',
    title: `Merge ${name} on ${here}`,
    filter: false,
    items: async () => {
      const files = (await sync.refresh(ref))?.conflicts ?? []
      if (!files.length) return [{ id: 'resolved', icon: 'check', label: 'Everything is resolved', detail: `${name} has no conflicts on ${here}` }]
      return [
        { id: 'merge', icon: 'sparkles', label: 'Let sand merge them', detail: `Start a thread on ${here} that combines both versions`, page: () => mergePage(ctx, ref, files, here, other) },
        ...files.map(file => conflictItem(file, here, other, pick)),
      ]
    },
  }
}

export const openResolve = (ctx: FlowContext, sync: Sync, ref: ProjectRef) => ctx.palette?.open(resolvePage(ctx, sync, ref))
