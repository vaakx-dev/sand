import { place } from '@sand/layout/place'
import { settings } from '@sand/settings/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import type { Context, Dispose } from 'drydock'
import { confirmSheet, deleteConfirm, dropConfirm, removeConfirm, type Confirm } from './confirm'
import type { ProjectActions } from './project'
import type { ProjectSource } from './source'

const overlayOrder = 100

export const manageActions = (ctx: Context & { kit: Kit }, source: ProjectSource): ProjectActions => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const ask = (confirm: Confirm) => {
    close()
    unplace = place(ctx, 'overlay', () => confirmSheet(ctx.kit, confirm, close), overlayOrder)
  }

  return {
    open(project) {
      const found = ctx.get(threads)
      if (!found || !project.folder) return
      ctx.get(settings)?.close()
      void found.draft(project.folder, found.device()).catch(error => ctx.report(error))
    },
    remove: project => ask(removeConfirm(project, () => void source.remove(project.id))),
    delete: project => ask(deleteConfirm(ctx.kit, project, source.unlanded(project.id), () => void source.remove(project.id, true))),
    drop: worker => ask(dropConfirm(worker, () => void source.drop(worker.id))),
    busy: () => source.busy.get(),
  }
}
