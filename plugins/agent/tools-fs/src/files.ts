import { keyedSerial } from '@sand/kit'
import { resolve } from 'node:path'

export const locate = (cwd: string, path: string) => resolve(cwd, path)

export const exclusive = keyedSerial()

export const readText = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return file.text()
}
