import type { BackgroundJobs } from '@sand/jobs/contract'
import type { ToolContext } from '@sand/tools/contract'
import { oneLine } from '@sand/kit'
import { maskedStream } from './mask'
import { createOutput } from './output'
import { drain, spawn, stream, unixNewlines, type SpawnOptions } from './process'

type Options = SpawnOptions & Required<Pick<SpawnOptions, 'env'>>

export const shellJobs = (jobs: () => BackgroundJobs | undefined, maxOutput: number) => {
  const running = new Set<() => Promise<void>>()

  const start = (command: string, argv: string[], { session, call }: ToolContext, options: Options) => {
    const background = jobs()
    if (!background) throw new Error('Background commands are not available')
    const { child, killTree } = spawn(argv, 'pipe', options)
    let killing: Promise<void> | undefined
    const kill = () => (killing ??= killTree())
    const output = createOutput()
    const secrets = Object.values(options.env)
    const masks = [maskedStream(secrets, output.add), maskedStream(secrets, output.add)]
    const streams = [child.stdout, child.stderr].map((source, index) => stream(source, text => masks[index]!.add(unixNewlines(text))))
    const job = background.start({
      kind: 'shell',
      parent: session,
      label: `shell: ${oneLine(command, 60)}`,
      origin: call.id,
      async work(signal) {
        const abort = () => void kill()
        signal.addEventListener('abort', abort, { once: true })
        const code = await child.exited
        signal.removeEventListener('abort', abort)
        await drain(streams)
        for (const mask of masks) mask.end()
        output.shrink(maxOutput)
        return `${output.tail(maxOutput) || '(no output)'}\n[exit code ${code}]`
      },
      read: (cursor = 0) => output.since(cursor, maxOutput),
      send(message, started) {
        if (started.status !== 'running') throw new Error(`${started.id} has ended`)
        child.stdin.write(`${message}\n`)
        child.stdin.flush()
        return `Sent to ${started.id}.`
      },
    })
    const stop = () => {
      job.cancel()
      return kill()
    }
    running.add(stop)
    void child.exited.then(() => running.delete(stop))
    return job
  }

  const stopAll = async () => {
    await Promise.all([...running].map(stop => stop()))
  }

  return { start, stopAll }
}

export type ShellJobs = ReturnType<typeof shellJobs>
