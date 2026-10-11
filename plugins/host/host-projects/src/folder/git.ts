import { gitMaybe } from '@sand/kit/git'

const git = (folder: string, args: string[]) =>
  gitMaybe(folder, args).then(
    out => out || undefined,
    () => undefined,
  )

export const gitRemote = async (folder: string) => {
  const origin = await git(folder, ['remote', 'get-url', 'origin'])
  if (origin) return origin
  const first = (await git(folder, ['remote']))?.split(/\r?\n/)[0]?.trim()
  return first ? git(folder, ['remote', 'get-url', first]) : undefined
}
