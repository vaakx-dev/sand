import { homedir } from 'node:os'
import { join } from 'node:path'
import { z } from 'zod'

const config = z.object({ plugins: z.object({ accounts: z.object({ prices: z.record(z.string(), z.unknown()) }).partial() }).partial() }).partial()

export const userPrices = async () => {
  const file = Bun.file(join(homedir(), '.sand', 'sand.toml'))
  if (!(await file.exists())) return {}
  return config.parse(Bun.TOML.parse(await file.text())).plugins?.accounts?.prices ?? {}
}
