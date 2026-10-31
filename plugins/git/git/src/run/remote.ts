import { gitMaybe } from './run'

const output = (folder: string, args: string[]) =>
  gitMaybe(folder, args, { read: true }).then(
    out => out || undefined,
    () => undefined,
  )

export const remoteUrl = async (folder: string) => {
  const origin = await output(folder, ['remote', 'get-url', 'origin'])
  if (origin) return origin
  const first = (await output(folder, ['remote']))?.split(/\r?\n/)[0]?.trim()
  return first ? output(folder, ['remote', 'get-url', first]) : undefined
}
