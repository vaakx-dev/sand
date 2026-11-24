import { appBinary } from '@sand/app-plan'
import { realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

const VENDORED = new Bun.Glob('node_modules/@openai/codex/node_modules/@openai/codex-*/vendor/*/bin/codex{,.exe}')
const NESTED = new Bun.Glob('node_modules/@openai/codex-*/vendor/*/bin/codex{,.exe}')
const SEARCHED_PARENTS = 4

const firstMatch = async (glob: Bun.Glob, cwd: string) => {
  for await (const found of glob.scan({ cwd, absolute: true, onlyFiles: true })) return found
  return undefined
}

const nativeNear = async (shim: string) => {
  const real = await realpath(shim).catch(() => shim)
  for (let folder = dirname(real), steps = 0; steps < SEARCHED_PARENTS; folder = dirname(folder), steps++) {
    const found = (await firstMatch(VENDORED, folder)) ?? (await firstMatch(NESTED, folder))
    if (found) return found
  }
  return undefined
}

export const codex = appBinary({ command: 'codex', app: 'Codex', install: 'https://developers.openai.com/codex/cli', installed: [], native: nativeNear })

export const codexHome = () => process.env.CODEX_HOME || join(homedir(), '.codex')
