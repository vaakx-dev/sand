import { git } from '@sand/kit/git'

export const gitFiles = (cwd: string) =>
  git(cwd, ['ls-files', '--cached', '--others', '--exclude-standard', '-z']).then(
    ({ code, out }) => (code === 0 ? out.split('\0').filter(Boolean) : undefined),
    () => undefined,
  )
