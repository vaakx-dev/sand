export const debounceMs = 400

const segmentsOf = (name: string) => name.split(/[\\/]/).filter(Boolean)

const skippedFolders = new Set(['node_modules', '.git'])

const gitFiles = new Set(['HEAD', 'index', 'packed-refs', 'MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'REBASE_HEAD'])

export const inWorkingTree = (name: string | null) => !name || !segmentsOf(name).some(segment => skippedFolders.has(segment))

export const inGitDir = (name: string | null) => {
  if (!name) return true
  const [first] = segmentsOf(name)
  return first === 'refs' || (!!first && gitFiles.has(first))
}
