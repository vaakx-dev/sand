import { service } from 'drydock'

export interface FilesPanel {
  open(path: string): void
}

export const filesPanel = service<FilesPanel>('filesPanel')
