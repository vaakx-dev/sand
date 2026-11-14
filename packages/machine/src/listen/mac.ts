import type { Listener } from './host'

const LSOF_TIMEOUT_MS = 5_000

const lsofOutput = async (pids: ReadonlySet<number>) => {
  const lsof = Bun.spawn(['lsof', '-nP', '-a', '-iTCP', '-sTCP:LISTEN', '-p', [...pids].join(','), '-F', 'pn'], { stdout: 'pipe', stderr: 'ignore', timeout: LSOF_TIMEOUT_MS })
  return new Response(lsof.stdout).text()
}

const endpointOf = (name: string) => {
  const colon = name.lastIndexOf(':')
  const host = name.slice(0, colon).replace(/^\[|\]$/g, '')
  return { host: host === '*' ? '::' : host, port: Number(name.slice(colon + 1)) }
}

const parsed = (output: string) => {
  const found: Listener[] = []
  let pid = 0
  for (const line of output.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    if (line.startsWith('n')) found.push({ pid, ...endpointOf(line.slice(1)) })
  }
  return found.filter(listener => Number.isInteger(listener.port) && listener.port > 0)
}

const macListeners = async (pids: ReadonlySet<number>) => parsed(await lsofOutput(pids))

export { macListeners }
