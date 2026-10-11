import { keyedSerial } from '@sand/kit'

export const exclusive = keyedSerial()

export const readText = async (path: string) => {
  const file = Bun.file(path)
  if (!(await file.exists())) throw new Error(`File not found: ${path}`)
  return file.text()
}
