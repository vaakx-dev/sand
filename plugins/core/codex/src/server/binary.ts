import { realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const installUrl = 'https://developers.openai.com/codex/cli'

const vendored = new Bun.Glob('node_modules/@openai/codex/node_modules/@openai/codex-*/vendor/*/bin/codex{,.exe}')
const nested = new Bun.Glob('node_modules/@openai/codex-*/vendor/*/bin/codex{,.exe}')

const firstMatch = async (glob: Bun.Glob, cwd: string) => {
  for await (const found of glob.scan({ cwd, absolute: true, onlyFiles: true })) return found
  return undefined
}

const nativeNear = async (shim: string) => {
  const real = await realpath(shim).catch(() => shim)
  for (let folder = dirname(real), steps = 0; steps < 4; folder = dirname(folder), steps++) {
    const found = (await firstMatch(vendored, folder)) ?? (await firstMatch(nested, folder))
    if (found) return found
  }
  return undefined
}

export const findCodex = async () => {
  const shim = Bun.which('codex')
  return shim && ((await nativeNear(shim)) ?? shim)
}

export const requireCodex = async () => {
  const found = await findCodex()
  if (!found) throw new Error(`Codex isn't installed on this PC. Install it from ${installUrl}, sign in with \`codex\`, then try again.`)
  return found
}

export const codexHome = () => process.env.CODEX_HOME || join(homedir(), '.codex')
