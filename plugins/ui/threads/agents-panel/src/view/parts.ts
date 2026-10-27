import type { ContextMenu, Kit, MenuSpec } from '@sand/ui-kit/contract'
import { duration } from '@sand/util'
import type { Child, Sig } from '@vaakx-dev/vrui'
import type { Run } from '../runs/runs'

export interface Actions {
  open(id: string): void
  cancel(run: Run): Promise<boolean>
  copy(text: string): void
}

export interface Rows extends Actions {
  menu: ContextMenu
  kit: Kit
}

export interface RunLook {
  meta?: Child
  trail?: Child
  stoppable: boolean
  spec(): MenuSpec | undefined
}

export const since = (started: number, ended: number | undefined, now: number) => duration(Math.max(0, (ended ?? now) - started))

export const runRow = (rows: Rows, run: Sig<Run>, { meta, trail, stoppable, spec }: RunLook) =>
  rows.kit.listRow({
    title: run.map(value => value.title),
    meta,
    trail,
    disabled: () => !run.get().session && !stoppable,
    ...rows.menu.target(spec, () => {
      const session = run.get().session
      if (session) rows.open(session)
    }),
  })
