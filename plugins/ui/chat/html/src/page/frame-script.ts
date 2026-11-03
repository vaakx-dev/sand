import { join } from 'node:path'

const entry = join(import.meta.dir, 'integrations', 'index.ts')

let built: Promise<string> | undefined

const build = async () => {
  const { outputs } = await Bun.build({ entrypoints: [entry], target: 'browser', conditions: ['bun'], format: 'iife', minify: true })
  const script = outputs[0]
  if (!script) throw new Error('The HTML frame script did not build.')
  return script.text()
}

export const frameScript = () => (built ??= build())
