import type { DiffFile } from '@sand/git-diff/contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { ViewParts } from './parts'

const inFolder = (file: DiffFile, prefix: string) =>
  file.kind !== 'deleted' && file.path.startsWith(prefix) ? file.path.slice(prefix.length) : undefined

export const openFileButton = ({ kit, model, files }: ViewParts, file: Sig<DiffFile>) => {
  const path = derive(() => {
    const repo = model.repo.get()
    return repo && files.get() ? inFolder(file.get(), repo.prefix) : undefined
  })
  return dynamicChild(
    path,
    found =>
      found
        ? kit.iconButton({ size: 'sm', title: 'Open in Files', 'aria-label': 'Open in Files', onClick: () => files.get()?.open(found) }, kit.icon('file', 14))
        : null,
  )
}
