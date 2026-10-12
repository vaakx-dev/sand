import { derive, div, list, rowButton, textInput, type Derive, type Sig } from '@sand/dom'
import { grouped } from '@sand/kit'
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

const fileRow = (file: Sig<FileChange>, state: ChangesState) =>
  rowButton(
    { class: 'h-8 gap-2 rounded-md px-2 text-neutral-300 hover:bg-neutral-800', onClick: () => state.reveal(file.get()) },
    fileEntry(file.get().path, () => state.viewed.has(file.get())),
  )

const folderRows = (folder: Sig<Folder>, state: ChangesState) => {
  const [name] = folder.get()
  return div(
    div({ class: 'truncate px-2 pt-2 pb-1 font-mono text-neutral-500', title: name }, name || './'),
    list(
      folder.map(([, files]) => files),
      file => file.key,
      file => fileRow(file, state),
    ),
  )
}

export const fileTree = (files: Derive<FileChange[]>, state: ChangesState, display: Display) =>
  div(
    { class: 'flex w-48 shrink-0 flex-col overflow-y-auto border-r border-neutral-800 p-2 text-xs' },
    textInput({ placeholder: 'Filter files', 'aria-label': 'Filter files', bindValue: display.filter }),
    list(
      derive(() => byFolder(files.get())),
      ([name]) => name,
      folder => folderRows(folder, state),
    ),
  )
