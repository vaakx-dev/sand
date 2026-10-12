import { grouped } from '@sand/kit'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, list, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { FileChange } from '../../changes/collect'
import type { Display } from '../display'
import type { ChangesState } from '../view'
import { fileEntry } from './entry'
import { folderOf } from './path'

type Folder = [name: string, files: FileChange[]]

const byFolder = (files: FileChange[]) => {
  const folders = new Map<string, FileChange[]>()
  for (const file of files) grouped(folders, folderOf(file.path), (): FileChange[] => []).push(file)
  return [...folders]
}

const fileRow = (kit: Kit, file: Sig<FileChange>, state: ChangesState) => {
  const { paneRow } = kit
  return paneRow({ onClick: () => state.reveal(file.get()) }, fileEntry(kit, file.get().path, () => state.viewed.has(file.get())))
}

const folderRows = (kit: Kit, folder: Sig<Folder>, state: ChangesState) => {
  const [name] = folder.get()
  return div(
    div({ class: 'truncate px-2 pt-2 pb-1 font-mono text-neutral-500', title: name }, name || './'),
    list(
      folder.map(([, files]) => files),
      file => file.key,
      file => fileRow(kit, file, state),
    ),
  )
}

export const fileTree = (kit: Kit, files: Derive<FileChange[]>, state: ChangesState, display: Display) => {
  const { textInput } = kit
  return div(
    { class: 'flex w-48 shrink-0 flex-col overflow-y-auto border-r border-neutral-800 p-2 text-xs' },
    textInput({ placeholder: 'Filter files', 'aria-label': 'Filter files', bindValue: display.filter }),
    list(
      derive(() => byFolder(files.get())),
      ([name]) => name,
      folder => folderRows(kit, folder, state),
    ),
  )
}
