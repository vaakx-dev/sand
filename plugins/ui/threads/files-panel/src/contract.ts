import type { FileChangeKind } from '@sand/ui-kit/contract'
import { type Dispose, service } from 'drydock'

export interface FilesPanel {
  open(path: string): void
}

export const filesPanel = service<FilesPanel>('filesPanel')

export interface FilesFolder {
  cwd: string
  device: string
}

export type FileMarks = ReadonlyMap<string, FileChangeKind>

export interface FileMarksSource {
  follow(folder: FilesFolder, onChange: (marks: FileMarks | undefined) => void): Dispose
}

export const fileMarks = service<FileMarksSource>('fileMarks')
