import { join } from 'node:path'

const entry = join(import.meta.dir, 'entry.ts')

export const writePageScript = async (path: string) => {
  const { outputs, logs } = await Bun.build({ entrypoints: [entry], target: 'browser', conditions: ['bun'], format: 'iife', minify: true, throw: false })
  const script = outputs[0]
  if (!script) throw new AggregateError(logs, "Sand's kit page script did not build.")
  await Bun.write(path, script)
}
