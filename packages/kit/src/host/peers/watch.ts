import { debouncedWatch } from '../../fs/watch'

const target = 'remotes.json'

const isTarget = (filename: string | null) =>
  process.platform === 'win32' ? filename?.toLowerCase() === target : filename === target

export const watchRemotes = (home: string, onChange: () => void) => debouncedWatch(home, { only: isTarget }, onChange, 500)
