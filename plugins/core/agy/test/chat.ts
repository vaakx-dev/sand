import type { AppAsk, AppOutput } from '@sand/accounts/contract'
import type { Media } from '@sand/media/contract'
import { join } from 'node:path'
import { openSession } from '../src/session'

const media: Media = { put: () => ({ hash: '', size: 0, mediaType: '' }), path: () => '', data: () => undefined, exclude: () => {}, include: () => {}, inUse: () => () => {} }

const turnOutput = () => {
  const finished = Promise.withResolvers<void>()
  const output: AppOutput = {
    text() {},
    thinking() {},
    call() {},
    usage() {},
    context() {},
    pause() {},
    finish: () => finished.resolve(),
    fail: error => finished.reject(error),
    exit() {},
  }
  return { output, finished: finished.promise }
}

const chatThenAside = async (folder: string, said: string, ask: AppAsk) => {
  const { output, finished } = turnOutput()
  const setup = { model: 'gemini-test', system: 'Be brief.', tools: [], cwd: folder, persist: true }
  const session = await openSession(setup, output, { media, asides: join(folder, 'asides'), report() {} })
  session.send([{ type: 'text', text: said }])
  await finished
  const reply = await session.aside!(ask)
  await session.close()
  return reply
}

if (import.meta.main) {
  const [folder, said, ask] = process.argv.slice(2) as [string, string, string]
  console.log(JSON.stringify(await chatThenAside(folder, said, JSON.parse(ask))))
}
