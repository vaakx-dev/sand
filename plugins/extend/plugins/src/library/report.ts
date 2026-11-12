import { sig } from '@vaakx-dev/vrui'
import type { WireContext } from '../context'
import { type PluginRow, pluginsReport } from '../contract'
import { folderName } from '../folder'
import { whenShown } from '../shown'

const failureOf = (row: PluginRow) => row.problem ?? row.web?.problem ?? row.web?.browser?.error

const byFolder = (rows: PluginRow[]) => new Map(rows.flatMap(row => (row.folder ? [[folderName(row.folder), row] as const] : [])))

export const reportSource = (ctx: WireContext) => {
  const rows = sig(new Map<string, PluginRow>())

  const load = () => {
    ctx.wire.call(pluginsReport, {}).then(
      found => rows.set(byFolder(found)),
      () => rows.set(new Map()),
    )
  }

  whenShown(ctx, load)

  const row = (name: string) => rows.get().get(name)
  return {
    failure: (name: string) => {
      const found = row(name)
      return found && failureOf(found)
    },
    offNeeds: (name: string) => row(name)?.needs,
  }
}
