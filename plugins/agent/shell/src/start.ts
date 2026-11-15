import { drain, spawn, stream, unixNewlines, type SpawnOptions } from './process'

export const start = (argv: string[], onText: (text: string) => void, options: SpawnOptions) => {
  const { child, killTree } = spawn(argv, 'ignore', { ...options, killOnClose: true })
  const write = (text: string) => {
    if (text) onText(unixNewlines(text))
  }
  const streams = [stream(child.stdout, write), stream(child.stderr, write)]
  const exited = child.exited.then(async code => {
    await killTree()
    await drain(streams)
    return code
  })
  return { pid: child.pid, exited, kill: killTree }
}
