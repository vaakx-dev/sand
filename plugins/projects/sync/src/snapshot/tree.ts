import { writeExclude } from '../folder/exclude'
import { hiddenLine, hiddenOut, initHidden, type Hidden } from '../folder/hidden'

const dropIgnored = async (hidden: Hidden) => {
  const ignored = await hiddenOut(hidden, ['ls-files', '-z', '-i', '-c', '--exclude-standard'])
  if (!ignored) return
  await hiddenOut(hidden, ['rm', '--cached', '-q', '--ignore-unmatch', '--pathspec-from-file=-', '--pathspec-file-nul'], { input: ignored })
}

export const prepareHidden = async (hidden: Hidden) => {
  await initHidden(hidden)
  await writeExclude(hidden)
}

export const folderTree = async (hidden: Hidden) => {
  await prepareHidden(hidden)
  await hiddenOut(hidden, ['add', '-A', '--ignore-errors', '--', '.'])
  await dropIgnored(hidden)
  return hiddenLine(hidden, ['write-tree'])
}

export const treeOf = (hidden: Hidden, commit: string) => hiddenLine(hidden, ['rev-parse', `${commit}^{tree}`])

export const commitTree = (hidden: Hidden, tree: string, parents: (string | null)[], message = 'sand sync') => {
  const unique = [...new Set(parents.filter((parent): parent is string => Boolean(parent)))]
  return hiddenLine(hidden, ['commit-tree', tree, ...unique.flatMap(parent => ['-p', parent]), '-m', message])
}
