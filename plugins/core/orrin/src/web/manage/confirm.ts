import type { Kit } from '@sand/ui-kit/contract'
import { div, p, sig, type Child } from '@vaakx-dev/vrui'
import type { OrrinManagedProject, OrrinWorker } from '../../contract'

export interface Confirm {
  title: string
  label: string
  body: Child[]
  run(): void
}

export const confirmSheet = (kit: Kit, { title, label, body, run }: Confirm, close: () => void) => {
  const { actionTones, controlButton, overlay, secondaryAction, sheet, sheetBody, sheetFoot, sheetHead } = kit
  const confirm = () => {
    close()
    run()
  }
  return overlay(
    close,
    sheet(
      { 'aria-label': title, size: 'md' },
      sheetHead({ title, close }),
      sheetBody({}, ...body),
      sheetFoot(
        secondaryAction({ onClick: close, onMount: node => node.focus() }, 'Cancel'),
        controlButton(actionTones.danger, { onClick: confirm }, label),
      ),
    ),
  )
}

const text = (...children: Child[]) => p({ class: 'text-sm text-neutral-300' }, ...children)

const folderLine = (folder: string) => div({ class: 'rounded-lg bg-neutral-900 px-3 py-2 font-mono text-xs break-all text-neutral-200' }, folder)

export const removeConfirm = (project: OrrinManagedProject, run: () => void): Confirm => ({
  title: `Remove ${project.name} from Orrin?`,
  label: 'Remove project',
  body: [text('Orrin forgets this project, its history and its worker views. The folder and its files stay on disk.')],
  run,
})

type Unlanded = number | 'checking' | 'unknown'

const unlandedText = (files: Unlanded) => {
  if (files === 'checking') return 'Checking the folder for changes that have not landed…'
  if (files === 'unknown') return 'Could not check the folder for changes that have not landed.'
  if (files === 0) return 'Every change in this folder has landed.'
  if (files === 1) return '1 file in this folder has changes that have not landed. It will be lost.'
  return `${files} files in this folder have changes that have not landed. They will be lost.`
}

export const deleteConfirm = (kit: Kit, project: OrrinManagedProject, unlanded: Promise<number>, run: () => void): Confirm => {
  const files = sig<Unlanded>('checking')
  void unlanded.then(
    count => files.set(count),
    () => files.set('unknown'),
  )
  return {
    title: `Delete ${project.name} from disk?`,
    label: 'Delete folder',
    body: [
      text('This removes the project from Orrin and permanently deletes this folder and everything in it:'),
      folderLine(project.folder ?? ''),
      kit.callout('danger', () => unlandedText(files.get())),
      text('This cannot be undone.'),
    ],
    run,
  }
}

export const dropConfirm = (worker: OrrinWorker, run: () => void): Confirm => ({
  title: 'Drop this worker view?',
  label: 'Drop',
  body: [text(`${worker.owner} loses its view and any changes in it that have not landed.`)],
  run,
})
