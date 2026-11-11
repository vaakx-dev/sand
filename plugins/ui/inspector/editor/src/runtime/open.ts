import type { EditorId } from '../contract'
import { commandOf, labelOf, type Where } from './editors'

export type Launch = (command: string[], folder: string) => void

const fullPath = (cwd: string, platform: NodeJS.Platform) => (platform === 'win32' ? /^[A-Za-z]:[\\/]/.test(cwd) : cwd.startsWith('/'))

export const openFolder = async ({ cwd, editor }: { cwd: string; editor: EditorId }, where: Where, launch: Launch) => {
  if (!fullPath(cwd, where.platform)) throw new Error(`${cwd} isn't a full folder path`)
  if (!(await where.isFolder(cwd))) throw new Error(`There's no folder at ${cwd} on this PC`)
  const command = commandOf(editor, where)
  if (!command) throw new Error(`${labelOf(editor, where.platform)} isn't installed on this PC`)
  launch(command, cwd)
}
