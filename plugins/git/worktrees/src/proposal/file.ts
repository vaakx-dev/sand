import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { SetupLines } from '../contract'
import { setupFileName } from '../setup/plan'

const list = (items: string[]) => `[${items.map(item => JSON.stringify(item)).join(', ')}]`

export const writeSetupFile = async (main: string, { copy, run }: SetupLines) => {
  const file = join(main, setupFileName)
  if (await Bun.file(file).exists()) return
  await mkdir(dirname(file), { recursive: true })
  await Bun.write(file, `copy = ${list(copy)}\nrun = ${list(run)}\n`)
}
