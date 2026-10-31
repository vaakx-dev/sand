import type { GitHub } from '@sand/github/contract'
import type { ReviewFile, ReviewFileKind, ReviewFiles } from '../contract'
import type { PullNodes } from '../pull/node'
import { reviewOrder } from './order'
import { type FileSource, isBinary, listFiles, movedFrom, type RestFile, type RestFileStatus } from './rest'
import { readViewed } from './viewed'

const kinds: Record<RestFileStatus, ReviewFileKind> = {
  added: 'added',
  copied: 'added',
  removed: 'deleted',
  renamed: 'renamed',
  modified: 'modified',
  changed: 'modified',
  unchanged: 'modified',
}

const reviewFile = (file: RestFile, viewed: ReviewFile['viewed']): ReviewFile => ({
  path: file.filename,
  ...movedFrom(file),
  kind: kinds[file.status],
  add: file.additions,
  del: file.deletions,
  viewed,
  ...(isBinary(file) ? { binary: true } : {}),
})

export const readFiles = async (github: GitHub, nodes: PullNodes, source: FileSource): Promise<ReviewFiles> => {
  const [listed, viewed] = await Promise.all([listFiles(github, source), readViewed(github, source)])
  nodes.note(source, viewed.id)
  const files = reviewOrder(listed.map(file => reviewFile(file, viewed.states.get(file.filename) ?? 'unviewed')))
  return {
    repo: source.repo,
    number: source.number,
    head: viewed.head,
    ...(source.commit ? { commit: source.commit } : {}),
    files,
    viewed: files.filter(file => file.viewed === 'viewed').length,
    total: files.length,
  }
}
