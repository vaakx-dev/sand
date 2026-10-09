import { existsSync, watch } from 'node:fs'

const settle = 500
const target = 'remotes.json'

const isTarget = (filename: string | null) =>
  process.platform === 'win32' ? filename?.toLowerCase() === target : filename === target

export const watchRemotes = (home: string, onChange: () => void): (() => void) => {
  if (!existsSync(home)) return () => {}
  let timer: Timer | undefined
  const watcher = watch(home, (_, filename) => {
    if (!isTarget(filename)) return
    clearTimeout(timer)
    timer = setTimeout(onChange, settle)
  })
  watcher.on('error', () => {})
  return () => {
    clearTimeout(timer)
    watcher.close()
  }
}
