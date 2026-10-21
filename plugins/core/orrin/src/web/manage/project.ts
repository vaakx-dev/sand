import type { Kit } from '@sand/ui-kit/contract'
import { ago, plural } from '@sand/util'
import { div, dynamicChild, show, sig, type Sig } from '@vaakx-dev/vrui'
import type { OrrinManagedProject, OrrinWorker } from '../../contract'

export interface ProjectActions {
  open(project: OrrinManagedProject): void
  remove(project: OrrinManagedProject): void
  delete(project: OrrinManagedProject): void
  drop(worker: OrrinWorker): void
  busy(): boolean
}

const age = (verb: string, at?: number) => {
  const since = ago(at)
  return since === 'now' ? `${verb} just now` : `${verb} ${since} ago`
}

const projectDetail = (project: OrrinManagedProject) =>
  [
    project.homeHere ? 'home: this PC' : `home: ${project.homePc}`,
    `main ${project.main.slice(0, 8)}`,
    plural(project.workers.length, 'worker view'),
    project.changedAt ? age('last landed', project.changedAt) : 'nothing landed yet',
  ].join(' · ')

const workerRow = ({ secondaryAction, settingsRow }: Kit, worker: OrrinWorker, actions: ProjectActions) =>
  settingsRow(
    worker.owner,
    secondaryAction({ size: 'sm', disabled: actions.busy, onClick: () => actions.drop(worker) }, 'Drop'),
    `${worker.state} · ${age('opened', worker.createdAt)}`,
  )

const folderLine = (project: OrrinManagedProject) =>
  div({ class: 'truncate font-mono text-xs text-neutral-400', title: project.folder ?? '' }, project.folder ?? 'No folder on this PC')

const projectHead = (kit: Kit, project: OrrinManagedProject, open: Sig<boolean>, actions: ProjectActions) => {
  const { actionTones, controlButton, icon, itemRow, quietButton, secondaryAction, tile } = kit
  const { busy } = actions
  return itemRow(
    {},
    tile(icon('folder', 16)),
    project.name,
    div({ class: 'flex min-w-0 flex-col' }, folderLine(project), projectDetail(project)),
    project.workers.length
      ? quietButton({ size: 'sm', active: open, 'aria-expanded': () => String(open.get()), onClick: open.toggle() }, 'Views')
      : null,
    project.folder ? secondaryAction({ size: 'sm', onClick: () => actions.open(project) }, 'Open') : null,
    secondaryAction({ size: 'sm', disabled: busy, onClick: () => actions.remove(project) }, 'Remove'),
    project.folder ? controlButton(actionTones.danger, { size: 'sm', disabled: busy, onClick: () => actions.delete(project) }, 'Delete from disk') : null,
  )
}

const workerList = (kit: Kit, project: OrrinManagedProject, actions: ProjectActions) =>
  div({ class: 'flex flex-col gap-y-px border-t border-neutral-800 pl-10' }, ...project.workers.map(worker => workerRow(kit, worker, actions)))

export const projectRow = (kit: Kit, row: Sig<OrrinManagedProject>, actions: ProjectActions) => {
  const open = sig(false)
  return div(
    { class: 'contents' },
    dynamicChild(row, project =>
      div(
        { class: 'flex flex-col bg-neutral-900' },
        projectHead(kit, project, open, actions),
        show(
          () => open.get() && project.workers.length > 0,
          () => workerList(kit, project, actions),
        ),
      ),
    ),
  )
}
