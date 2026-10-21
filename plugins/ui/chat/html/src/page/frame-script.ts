import { join } from 'node:path'

const entry = join(import.meta.dir, '..', 'frame', 'index.ts')

let built: Promise<string> | undefined

const build = async () => {
  const { outputs } = await Bun.build({ entrypoints: [entry], target: 'browser', conditions: ['bun'], format: 'iife', minify: true })
  return outputs[0]!.text()
}

export const frameScript = () => (built ??= build())
