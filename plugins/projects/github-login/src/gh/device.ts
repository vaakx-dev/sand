import { ghMissing, spawnGh } from './run'

const codeWait = 20_000
const loginWait = 16 * 60_000
const codePattern = /one-time code: ([A-Z0-9]{4}-[A-Z0-9]{4})/
const urlPattern = /(https:\/\/\S+\/login\/device)/

interface DeviceCode {
  code: string
  url: string
}

const lastLine = (text: string) =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !codePattern.test(line) && !urlPattern.test(line))
    .at(-1)

export const deviceLogin = () => {
  const child = spawnGh(['auth', 'login', '--web', '--hostname', 'github.com', '--git-protocol', 'https'], loginWait)
  if (!child) throw new Error(ghMissing)
  let output = ''
  const code = Promise.withResolvers<DeviceCode>()
  const failed = () => code.reject(new Error(lastLine(output) ?? 'gh did not show a sign-in code'))
  setTimeout(failed, codeWait)
  const decoder = new TextDecoder()
  const read = async (stream: ReadableStream<Uint8Array>) => {
    for await (const chunk of stream) {
      output += decoder.decode(chunk, { stream: true })
      const match = output.match(codePattern)
      if (match) code.resolve({ code: match[1]!, url: output.match(urlPattern)?.[1] ?? 'https://github.com/login/device' })
    }
  }
  const done = Promise.all([read(child.stdout), read(child.stderr), child.exited]).then(([, , exit]) => {
    if (exit !== 0) throw new Error(lastLine(output) ?? `gh auth login stopped (exit ${exit})`)
  })
  code.promise.catch(() => child.kill())
  done.then(failed, failed)
  return { code: code.promise, done, cancel: () => child.kill() }
}

export type DeviceLogin = ReturnType<typeof deviceLogin>
