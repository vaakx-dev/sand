import { join } from 'node:path'

export interface Run {
  id: string
  dir: string
  script: string
  args: unknown
  results: Record<string, unknown>
  save(): Promise<void>
}

const open = async (dir: string, id: string, script: string, args: unknown): Promise<Run> => {
  const cacheFile = Bun.file(join(dir, 'cache.json'))
  const results: Record<string, unknown> = (await cacheFile.exists()) ? await cacheFile.json() : {}
  let saving = Promise.resolve()
  const save = () => {
    saving = saving.then(() => Bun.write(cacheFile, JSON.stringify(results, null, 2)).then(() => undefined))
    return saving
  }
  return { id, dir, script, args, results, save }
}

export const createRun = async (root: string, script: string, args: unknown) => {
  const id = `wf_${Bun.randomUUIDv7().slice(-10)}`
  const dir = join(root, id)
  await Bun.write(join(dir, 'script.ts'), script)
  await Bun.write(join(dir, 'args.json'), JSON.stringify(args ?? null))
  return open(dir, id, script, args)
}

export const resumeRun = async (root: string, id: string) => {
  const dir = join(root, id)
  const scriptFile = Bun.file(join(dir, 'script.ts'))
  if (!(await scriptFile.exists())) throw new Error(`No workflow run ${id}`)
  const argsFile = Bun.file(join(dir, 'args.json'))
  const args = (await argsFile.exists()) ? await argsFile.json() : undefined
  return open(dir, id, await scriptFile.text(), args)
}
