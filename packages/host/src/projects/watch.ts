import { existsSync, watch } from 'node:fs'
import { basename } from 'node:path'
import { projectsPath } from './file'

export const watchProjects = (home: string, onChange: () => void): (() => void) => {
  if (!existsSync(home)) return () => {}
  const name = basename(projectsPath(home))
  const matches = (filename: string | null) =>
    process.platform === 'win32' ? filename?.toLowerCase() === name.toLowerCase() : filename === name
  let timer: Timer | undefined
  const watcher = watch(home, (_, filename) => {
    if (!matches(filename)) return
    clearTimeout(timer)
    timer = setTimeout(onChange, 150)
  })
  watcher.on('error', () => {})
  return () => {
    clearTimeout(timer)
    watcher.close()
  }
}
