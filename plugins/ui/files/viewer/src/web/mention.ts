import { extensionOf } from '../contract'

const LONGEST = 260
const LOCATION = /(?::\d+(?:[:-]\d+)?|#L\d+(?:-L?\d+)?)$/
const NOT_A_PATH = /[\s()=,;<>*?|{}$@!"'`]|:\/\/|^-/
const NAMED_FILES = new Set(['makefile', 'dockerfile', 'readme', 'license', 'changelog', 'gemfile', 'procfile', '.gitignore', '.env'])

const nameOf = (path: string) => path.split(/[\\/]/).pop() ?? ''

const fileLike = (text: string, known: (extension: string) => boolean) => {
  const path = text.replace(LOCATION, '')
  if (!path || path.length > LONGEST || NOT_A_PATH.test(path) || path.endsWith('/')) return false
  const name = nameOf(path)
  if (NAMED_FILES.has(name.toLowerCase())) return true
  const extension = extensionOf(name)
  if (!extension || /^\d+$/.test(extension) || name.startsWith('.')) return false
  return known(extension) || /[\\/]/.test(path)
}

const isLocal = (target: string) => !/^[a-z][a-z\d+.-]*:/i.test(target) || /^file:/i.test(target) || /^[a-z]:[\\/]/i.test(target)

const isFileTarget = (target: string) => Boolean(target) && !target.startsWith('#') && isLocal(target)

export { fileLike, isFileTarget }
