import { safeFromEnv } from '@sand/boot'
import type { CliPlace } from '@sand/config/contract'
import { defaultHome, expandHome } from '@sand/util/fs'
import { parseArgs } from 'node:util'

const kernelOptions = {
  home: { type: 'string' },
  cwd: { type: 'string' },
  safe: { type: 'boolean' },
  print: { type: 'string', short: 'p' },
} as const

const processes: Record<string, CliPlace> = { host: 'host', runtime: 'runtime' }

const text = (value: unknown) => (typeof value === 'string' ? value : undefined)

const withoutKernelFlags = (argv: string[]) => {
  const { values, tokens } = parseArgs({ args: argv, options: kernelOptions, strict: false, allowPositionals: true, tokens: true })
  const taken = new Set<number>()
  for (const token of tokens) {
    if (token.kind !== 'option' || !(token.name in kernelOptions)) continue
    taken.add(token.index)
    if (token.value !== undefined && !token.inlineValue) taken.add(token.index + 1)
  }
  return { values, rest: argv.filter((_, index) => !taken.has(index)) }
}

const placeOf = (prompt: string | undefined, first: string | undefined): CliPlace => {
  if (prompt !== undefined) return 'print'
  return (first && processes[first]) || 'cli'
}

const blankHome = (source: string) => new Error(`${source} is empty. Give it a folder, or leave it out to use ~/.sand`)

const homeOf = (flag: unknown) => {
  if (flag !== undefined) {
    if (typeof flag !== 'string' || !flag.trim()) throw blankHome('--home')
    process.env.SAND_HOME = expandHome(flag)
  }
  const fromEnv = process.env.SAND_HOME
  if (fromEnv === undefined) return defaultHome()
  if (!fromEnv.trim()) throw blankHome('SAND_HOME')
  return expandHome(fromEnv)
}

export const readArgs = (argv: string[]) => {
  const { values, rest } = withoutKernelFlags(argv)
  const cwd = text(values.cwd)
  const prompt = text(values.print)
  if (prompt?.startsWith('--')) throw new Error(`-p takes the prompt right after it, so "${prompt}" was read as the prompt. Put other flags first: sand --home <folder> -p "<prompt>"`)
  const home = homeOf(values.home)
  if (cwd) process.chdir(cwd)
  const place = placeOf(prompt, rest[0])
  return {
    place,
    home,
    safe: values.safe === true || safeFromEnv(),
    args: place === 'host' || place === 'runtime' ? rest.slice(1) : rest,
    prompt,
  }
}
